/**
 * Operações da fila offline sobre o `offlineDb`.
 *
 * Camada fina e sem dependência de React — consumida pelo formulário
 * offline-first (Etapa 3) e pelo motor de sync (Etapa 4).
 */
import { offlineDb, type PendingActivity, type PendingPhoto, type SyncStatus } from './db';

/** Dados de uma foto ainda não enviada (capturada no formulário). */
export interface NewPhotoInput {
  blob: Blob;
  fileType: string;
  caption?: string;
  lat?: number;
  lng?: number;
}

/** Payload de uma atividade offline (espelha CreateActivityInput, sem fotos). */
export type NewActivityInput = Omit<
  PendingActivity,
  'localId' | 'status' | 'attempts' | 'createdAt' | 'updatedAt' | 'serverIds' | 'error'
>;

function uuid(): string {
  return crypto.randomUUID();
}

/**
 * Enfileira uma atividade + suas fotos numa única transação.
 * Retorna o `localId` da atividade criada.
 */
export async function enqueueActivity(
  input: NewActivityInput,
  photos: NewPhotoInput[],
): Promise<string> {
  const now = Date.now();
  const localId = uuid();

  const activity: PendingActivity = {
    ...input,
    localId,
    status: 'pending',
    attempts: 0,
    // Contagem de fotos para a tela "Pendentes" — sempre derivada do que entra.
    photoCount: photos.length,
    createdAt: now,
    updatedAt: now,
  };

  const photoRows: PendingPhoto[] = photos.map((p) => ({
    localId: uuid(),
    activityLocalId: localId,
    blob: p.blob,
    fileType: p.fileType,
    caption: p.caption,
    lat: p.lat,
    lng: p.lng,
    uploaded: false,
    createdAt: now,
  }));

  await offlineDb.transaction('rw', offlineDb.pending_activities, offlineDb.pending_photos, async () => {
    await offlineDb.pending_activities.add(activity);
    if (photoRows.length) await offlineDb.pending_photos.bulkAdd(photoRows);
  });

  return localId;
}

/** Todas as atividades ainda não sincronizadas, mais antigas primeiro. */
export async function listUnsynced(): Promise<PendingActivity[]> {
  const all = await offlineDb.pending_activities.orderBy('createdAt').toArray();
  return all.filter((a) => a.status !== 'synced');
}

/** Quantidade de itens aguardando sync (pendentes, em sync ou com erro). */
export async function countUnsynced(): Promise<number> {
  const all = await offlineDb.pending_activities.toArray();
  return all.filter((a) => a.status !== 'synced').length;
}

/** Fotos de uma atividade offline, mais antigas primeiro. */
export async function getPhotos(activityLocalId: string): Promise<PendingPhoto[]> {
  const rows = await offlineDb.pending_photos
    .where('activityLocalId')
    .equals(activityLocalId)
    .toArray();
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export function getActivity(localId: string): Promise<PendingActivity | undefined> {
  return offlineDb.pending_activities.get(localId);
}

/** Atualiza status (e campos extras) de uma atividade, tocando updatedAt. */
export async function patchActivity(
  localId: string,
  patch: Partial<PendingActivity> & { status?: SyncStatus },
): Promise<void> {
  await offlineDb.pending_activities.update(localId, { ...patch, updatedAt: Date.now() });
}

/** Marca uma foto como enviada e guarda o storagePath retornado. */
export async function markPhotoUploaded(photoLocalId: string, storagePath: string): Promise<void> {
  await offlineDb.pending_photos.update(photoLocalId, { uploaded: true, storagePath });
}

/** Remove uma atividade e suas fotos (após sync bem-sucedido ou descarte). */
export async function removeActivity(localId: string): Promise<void> {
  await offlineDb.transaction('rw', offlineDb.pending_activities, offlineDb.pending_photos, async () => {
    await offlineDb.pending_photos.where('activityLocalId').equals(localId).delete();
    await offlineDb.pending_activities.delete(localId);
  });
}
