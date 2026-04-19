'use client';

import * as React from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export type UploadedPhoto = {
  id?: string;
  storagePath: string;
  url: string;
  caption?: string;
};

type Props = {
  activityId?: string;
  value: UploadedPhoto[];
  onChange: (next: UploadedPhoto[]) => void;
  /** Quando o supervisor ainda está criando a atividade, subimos numa pasta temporária. */
  draftId?: string;
};

export function PhotoUpload({ activityId, draftId, value, onChange }: Props) {
  const t = useTranslations('photo');
  const [uploading, setUploading] = React.useState(false);
  const supabase = createClient();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: UploadedPhoto[] = [];
      for (const file of Array.from(files)) {
        const folder = activityId ?? `draft/${draftId ?? 'tmp'}`;
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from('activity-photos')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;

        const { data: urlData } = supabase.storage.from('activity-photos').getPublicUrl(path);
        uploaded.push({ storagePath: path, url: urlData.publicUrl });
      }
      onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  async function remove(photo: UploadedPhoto) {
    await supabase.storage.from('activity-photos').remove([photo.storagePath]);
    onChange(value.filter((p) => p.storagePath !== photo.storagePath));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {value.map((p) => (
          <div
            key={p.storagePath}
            className="relative aspect-square rounded-md overflow-hidden border border-border group"
          >
            <Image src={p.url} alt={p.caption ?? ''} fill className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => remove(p)}
              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              aria-label={t('remove')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <label
          className={cn(
            'aspect-square rounded-md border border-dashed border-border cursor-pointer',
            'flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground',
            'hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors',
            uploading && 'pointer-events-none opacity-60',
          )}
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span>{uploading ? t('uploading') : t('upload')}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
