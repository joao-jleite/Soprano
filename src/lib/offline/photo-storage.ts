'use client';

import { createClient } from '@/lib/supabase/client';

/** Bucket privado das fotos de atividade. */
const BUCKET = 'activity-photos';

function extFromType(fileType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
  };
  return map[fileType] ?? 'jpg';
}

/**
 * Sobe um blob de foto ao Storage e retorna o `storagePath`.
 *
 * Centraliza o caminho de upload usado tanto no save online quanto no sync
 * offline (Etapa 4). `folder` segue a convenção do PhotoUpload original:
 * o id da atividade quando já existe, ou `draft/<algo>` quando ainda é rascunho.
 */
export async function uploadPhotoBlob(
  blob: Blob,
  fileType: string,
  folder: string,
): Promise<string> {
  const supabase = createClient();
  const path = `${folder}/${crypto.randomUUID()}.${extFromType(fileType)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: fileType, upsert: false });
  if (error) throw error;
  return path;
}
