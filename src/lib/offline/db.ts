/**
 * Banco local offline (IndexedDB via Dexie).
 *
 * Guarda atividades criadas sem internet e suas fotos (como blobs) até que o
 * sync as replique para o Supabase. O payload de `PendingActivity` espelha
 * `CreateActivityInput` de `src/app/actions/activities.ts` — exceto as fotos,
 * que ficam em `pending_photos` porque só viram `storagePath` após o upload.
 *
 * Uso APENAS no browser (Client Components). O IndexedDB não existe no server.
 */
import Dexie, { type Table } from 'dexie';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

export interface PendingParticipant {
  name: string;
  role?: string;
}

/** Uma atividade registrada offline, aguardando sync. */
export interface PendingActivity {
  /** UUID gerado no cliente — chave primária local (IndexedDB). */
  localId: string;
  /**
   * Chave de idempotência estável da submissão (o draftId do formulário).
   * Vai ao servidor no sync para impedir duplicatas — é a MESMA usada se o
   * envio começou online e caiu para a fila, garantindo dedupe entre os dois
   * caminhos. Distinta de `localId` (que é só a PK local).
   */
  clientKey: string;

  // ── payload espelhando CreateActivityInput (fotos à parte) ──
  locationId: string;
  clientId?: string | null;
  description: string;
  notes?: string;
  evolucao?: string;
  pendencias?: string;
  continuationOf?: string | null;
  startedAt: string;
  endedAt?: string | null;
  participants: PendingParticipant[];
  /** Cada tipo vira uma atividade (rascunho) no servidor, como no create online. */
  activityTypeIds: string[];

  // ── rótulos só para exibição na tela "Pendentes" (não vão ao servidor) ──
  /** Nome do local escolhido, capturado no save para a lista ficar legível. */
  locationLabel?: string;
  /** Rótulos dos tipos selecionados. */
  typeLabels?: string[];
  /** Quantas fotos acompanham a atividade (preenchido no enqueue). */
  photoCount?: number;

  // ── metadados de sincronização ──
  status: SyncStatus;
  /** Última mensagem de erro do sync, se houver. */
  error?: string;
  /** Quantas tentativas de sync já ocorreram (para backoff/limite). */
  attempts: number;
  createdAt: number;
  updatedAt: number;
  /** IDs retornados pelo servidor após o create — evita recriar no retry. */
  serverIds?: string[];
}

/** Foto de uma atividade offline. O blob é guardado direto no IndexedDB. */
export interface PendingPhoto {
  /** UUID gerado no cliente — chave primária. */
  localId: string;
  /** FK → PendingActivity.localId. */
  activityLocalId: string;
  blob: Blob;
  /** MIME (ex.: image/jpeg) — usado no upload e para recriar o preview. */
  fileType: string;
  caption?: string;
  /** GPS capturado no momento da foto, quando disponível (mesmo offline). */
  lat?: number;
  lng?: number;
  /** Preenchido após o upload ao Storage durante o sync. */
  storagePath?: string;
  uploaded: boolean;
  createdAt: number;
}

class SopranoOfflineDB extends Dexie {
  pending_activities!: Table<PendingActivity, string>;
  pending_photos!: Table<PendingPhoto, string>;

  constructor() {
    super('soprano-offline');
    // Índices: status e activityLocalId são consultados pela fila de sync.
    this.version(1).stores({
      pending_activities: 'localId, status, createdAt',
      pending_photos: 'localId, activityLocalId, uploaded',
    });
  }
}

/**
 * Instância única do banco. Lazy: só abre o IndexedDB na primeira operação,
 * então importar este módulo não quebra no SSR — apenas não o use no server.
 */
export const offlineDb = new SopranoOfflineDB();
