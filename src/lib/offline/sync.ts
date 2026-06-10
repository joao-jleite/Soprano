'use client';

/**
 * Motor de sincronização da fila offline.
 *
 * Replica cada `PendingActivity` para o Supabase quando há conexão:
 *  1. sobe as fotos ainda não enviadas ao Storage (idempotente — uma foto já
 *     enviada guarda seu storagePath e não sobe de novo no retry);
 *  2. chama o Server Action `createActivity` com o payload + fotos;
 *  3. remove a atividade da fila local em caso de sucesso, ou marca 'error'.
 *
 * Roda em foreground: no carregamento do app, ao voltar a conexão (evento
 * `online`) e quando disparado manualmente. Concorrência protegida por lock.
 */
import { createActivity } from '@/app/actions/activities';
import { uploadPhotoBlob } from './photo-storage';
import {
  getPhotos,
  listUnsynced,
  markPhotoUploaded,
  patchActivity,
  removeActivity,
} from './queue';
import type { PendingActivity } from './db';

/** Máximo de tentativas automáticas antes de o item exigir retry manual. */
export const MAX_SYNC_ATTEMPTS = 5;

type Listener = () => void;
const listeners = new Set<Listener>();
let running = false;

/** Inscreve um callback chamado sempre que a fila muda (para a UI da Etapa 5). */
export function onSyncChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

/** Sincroniza uma atividade. Lança em caso de falha (o caller decide seguir). */
async function syncOne(activity: PendingActivity): Promise<void> {
  await patchActivity(activity.localId, { status: 'syncing' });
  notify();

  const photos = await getPhotos(activity.localId);
  const photoPayload: { storagePath: string; caption?: string; lat?: number; lng?: number }[] = [];

  for (const ph of photos) {
    let path = ph.storagePath;
    if (!ph.uploaded || !path) {
      path = await uploadPhotoBlob(ph.blob, ph.fileType, `draft/${activity.localId}`);
      await markPhotoUploaded(ph.localId, path);
    }
    photoPayload.push({ storagePath: path, caption: ph.caption, lat: ph.lat, lng: ph.lng });
  }

  const result = await createActivity({
    locationId: activity.locationId,
    clientId: activity.clientId,
    description: activity.description,
    notes: activity.notes,
    evolucao: activity.evolucao,
    pendencias: activity.pendencias,
    continuationOf: activity.continuationOf,
    startedAt: activity.startedAt,
    endedAt: activity.endedAt,
    participants: activity.participants,
    photos: photoPayload,
    activityTypeIds: activity.activityTypeIds,
    // Idempotência: o servidor dedupe pelo clientKey, então re-tentar é seguro.
    clientKey: activity.clientKey,
  });

  if (result.error) throw new Error(result.error);

  // Sucesso → tira da fila local.
  await removeActivity(activity.localId);
}

/**
 * Tenta sincronizar tudo que está pendente. Seguro chamar a qualquer momento:
 * sai cedo se já estiver rodando ou se estiver offline.
 */
export async function syncPending(): Promise<void> {
  if (running) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  running = true;
  notify();

  try {
    const items = await listUnsynced();
    for (const item of items) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;
      // Item esgotou as tentativas automáticas → espera retry manual do usuário.
      // Sem isto, um item com erro permanente re-tentaria a cada evento online /
      // foco de aba, gastando banda e bateria em campo.
      if (item.attempts >= MAX_SYNC_ATTEMPTS) continue;
      try {
        await syncOne(item);
      } catch (e) {
        await patchActivity(item.localId, {
          status: 'error',
          error: e instanceof Error ? e.message : 'Falha ao sincronizar',
          attempts: item.attempts + 1,
        });
      } finally {
        notify();
      }
    }
  } finally {
    running = false;
    notify();
  }
}

/**
 * Retry manual disparado pelo usuário (toque na pílula de erro). Zera o contador
 * de tentativas dos itens em erro — inclusive os que esgotaram o limite — e roda
 * o sync de novo, dando a eles um orçamento novo de tentativas.
 */
export async function retryAllNow(): Promise<void> {
  const items = await listUnsynced();
  await Promise.all(
    items
      .filter((i) => i.status === 'error')
      .map((i) => patchActivity(i.localId, { status: 'pending', attempts: 0, error: undefined })),
  );
  notify();
  await syncPending();
}

/** Reenvio manual de UM item específico (botão na tela de pendentes). */
export async function retryItem(localId: string): Promise<void> {
  await patchActivity(localId, { status: 'pending', attempts: 0, error: undefined });
  notify();
  await syncPending();
}
