import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mocks dos limites externos: a action do servidor e o upload ao Storage.
// vi.hoisted porque vi.mock é içado para o topo do arquivo.
const { createActivity, uploadPhotoBlob } = vi.hoisted(() => ({
  createActivity: vi.fn(),
  uploadPhotoBlob: vi.fn(),
}));

vi.mock('@/app/actions/activities', () => ({ createActivity }));
vi.mock('@/lib/offline/photo-storage', () => ({ uploadPhotoBlob }));

import { offlineDb } from '../db';
import { enqueueActivity, listUnsynced, getPhotos, patchActivity } from '../queue';
import { syncPending, retryAllNow, MAX_SYNC_ATTEMPTS } from '../sync';

// Força navigator.onLine = true para que sync.ts trate o ambiente como online.
vi.stubGlobal('navigator', { onLine: true });

function baseActivity() {
  return {
    clientKey: 'draft-abc',
    locationId: '11111111-1111-1111-1111-111111111111',
    clientId: null,
    description: 'Inspeção de dutos',
    notes: undefined,
    evolucao: undefined,
    pendencias: undefined,
    continuationOf: undefined,
    startedAt: new Date('2026-06-09T12:00:00Z').toISOString(),
    endedAt: null,
    participants: [{ name: 'Fulano', role: 'Encarregado' }],
    activityTypeIds: ['22222222-2222-2222-2222-222222222222'],
  };
}

beforeEach(async () => {
  createActivity.mockReset();
  uploadPhotoBlob.mockReset();
  await offlineDb.pending_activities.clear();
  await offlineDb.pending_photos.clear();
});

describe('fila offline', () => {
  it('enfileira atividade + fotos como pendente', async () => {
    const localId = await enqueueActivity(baseActivity(), [
      { blob: new Blob(['x'], { type: 'image/jpeg' }), fileType: 'image/jpeg', caption: 'frente', lat: -23.5, lng: -46.6 },
    ]);

    const unsynced = await listUnsynced();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].status).toBe('pending');

    const photos = await getPhotos(localId);
    expect(photos).toHaveLength(1);
    expect(photos[0].uploaded).toBe(false);
    expect(photos[0].lat).toBe(-23.5);
  });
});

describe('syncPending', () => {
  it('sobe foto, cria no servidor e esvazia a fila ao reconectar', async () => {
    uploadPhotoBlob.mockResolvedValue('draft/abc/photo.jpg');
    createActivity.mockResolvedValue({ ids: ['srv-1'] });

    await enqueueActivity(baseActivity(), [
      { blob: new Blob(['x'], { type: 'image/jpeg' }), fileType: 'image/jpeg', caption: 'frente', lat: -23.5, lng: -46.6 },
    ]);

    await syncPending();

    // Subiu a foto e chamou a action com o storagePath + GPS + legenda.
    expect(uploadPhotoBlob).toHaveBeenCalledOnce();
    expect(createActivity).toHaveBeenCalledOnce();
    const payload = createActivity.mock.calls[0][0];
    expect(payload.photos).toEqual([
      { storagePath: 'draft/abc/photo.jpg', caption: 'frente', lat: -23.5, lng: -46.6 },
    ]);
    expect(payload.activityTypeIds).toEqual(baseActivity().activityTypeIds);
    // Idempotência: o clientKey da submissão vai para o servidor.
    expect(payload.clientKey).toBe('draft-abc');

    // Fila esvaziada após sucesso.
    expect(await listUnsynced()).toHaveLength(0);
  });

  it('marca erro e mantém na fila se a action falhar', async () => {
    uploadPhotoBlob.mockResolvedValue('draft/abc/photo.jpg');
    createActivity.mockResolvedValue({ error: 'RLS negou' });

    await enqueueActivity(baseActivity(), [
      { blob: new Blob(['x'], { type: 'image/jpeg' }), fileType: 'image/jpeg' },
    ]);

    await syncPending();

    const unsynced = await listUnsynced();
    expect(unsynced).toHaveLength(1);
    expect(unsynced[0].status).toBe('error');
    expect(unsynced[0].error).toContain('RLS');
    expect(unsynced[0].attempts).toBe(1);
  });

  it('não re-sobe foto já enviada no retry', async () => {
    uploadPhotoBlob.mockResolvedValue('draft/abc/photo.jpg');
    // 1ª tentativa: upload ok, mas a action falha.
    createActivity.mockResolvedValueOnce({ error: 'timeout' });
    // 2ª tentativa: action ok.
    createActivity.mockResolvedValueOnce({ ids: ['srv-1'] });

    await enqueueActivity(baseActivity(), [
      { blob: new Blob(['x'], { type: 'image/jpeg' }), fileType: 'image/jpeg' },
    ]);

    await syncPending(); // falha → erro
    await syncPending(); // retry → sucesso

    // A foto só foi enviada uma vez (idempotência via markPhotoUploaded).
    expect(uploadPhotoBlob).toHaveBeenCalledOnce();
    expect(createActivity).toHaveBeenCalledTimes(2);
    expect(await listUnsynced()).toHaveLength(0);
  });

  it('para de tentar após MAX_SYNC_ATTEMPTS e não chama mais a action', async () => {
    uploadPhotoBlob.mockResolvedValue('draft/abc/photo.jpg');
    createActivity.mockResolvedValue({ error: 'erro permanente' });

    const localId = await enqueueActivity(baseActivity(), [
      { blob: new Blob(['x'], { type: 'image/jpeg' }), fileType: 'image/jpeg' },
    ]);

    // Roda o sync além do limite; cada falha incrementa attempts.
    for (let i = 0; i < MAX_SYNC_ATTEMPTS + 3; i++) await syncPending();

    expect(createActivity).toHaveBeenCalledTimes(MAX_SYNC_ATTEMPTS);
    const [item] = await listUnsynced();
    expect(item.status).toBe('error');
    expect(item.attempts).toBe(MAX_SYNC_ATTEMPTS);
    expect(localId).toBeTruthy();
  });

  it('retryAllNow zera tentativas e ressincroniza um item esgotado', async () => {
    uploadPhotoBlob.mockResolvedValue('draft/abc/photo.jpg');
    createActivity.mockResolvedValue({ error: 'erro permanente' });

    await enqueueActivity(baseActivity(), [
      { blob: new Blob(['x'], { type: 'image/jpeg' }), fileType: 'image/jpeg' },
    ]);
    for (let i = 0; i < MAX_SYNC_ATTEMPTS; i++) await syncPending();
    expect((await listUnsynced())[0].attempts).toBe(MAX_SYNC_ATTEMPTS);

    // Agora o servidor aceita; o retry manual deve reprocessar e esvaziar a fila.
    createActivity.mockResolvedValue({ ids: ['srv-9'] });
    await retryAllNow();

    expect(await listUnsynced()).toHaveLength(0);
  });
});
