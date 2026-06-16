'use client';

import * as React from 'react';
import { ImagePlus, MapPin, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Foto capturada no formulário, ainda como blob local (não enviada).
 * O upload ao Storage acontece só no "salvar" (online) ou no sync (offline),
 * seguindo o modelo "estilo WhatsApp": anexa agora, envia depois.
 */
export type CapturedPhoto = {
  /** id local para chave de render/remoção. */
  id: string;
  blob: Blob;
  fileType: string;
  /** object URL para preview (revogado ao remover/desmontar). */
  previewUrl: string;
  caption: string;
  lat?: number;
  lng?: number;
};

/** Maior dimensão (px) para a qual a foto é reduzida antes de enviar. */
const MAX_DIMENSION = 1600;

/**
 * Normaliza a foto para JPEG e reduz a resolução antes de guardar/enviar.
 *
 * Motivo: câmeras de celular (especialmente iPhone) salvam em HEIC e/ou em
 * resoluções enormes. HEIC não renderiza em <img> fora do Safari nem no
 * Chromium que gera o PDF — a foto aparece quebrada na tela e some do PDF,
 * enquanto JPEGs antigos funcionam. Aqui decodificamos respeitando a
 * orientação EXIF (corrige fotos giradas) e re-exportamos como JPEG já
 * redimensionado. O GPS é capturado à parte (lat/lng), então perder o EXIF
 * não afeta a localização. Em qualquer falha, mantém o arquivo original.
 */
async function normalizeImage(file: File): Promise<{ blob: Blob; fileType: string }> {
  const fallback = { blob: file as Blob, fileType: file.type || 'image/jpeg' };
  if (typeof document === 'undefined') return fallback;
  if (file.type && !file.type.startsWith('image/')) return fallback;

  // Decodifica via <img> (e não createImageBitmap): o Safari do iPhone decodifica
  // HEIC neste caminho, enquanto createImageBitmap costuma falhar/travar com HEIC.
  // Navegadores modernos já aplicam a orientação EXIF ao desenhar o <img>.
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement('img');
    img.decoding = 'async';
    const loaded = new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
    img.src = url;
    // Rede de segurança: nunca trava a captura se o decode não responder.
    const ok = await Promise.race([
      loaded,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 15000)),
    ]);
    if (!ok || !img.naturalWidth || !img.naturalHeight) return fallback;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback;
    ctx.drawImage(img, 0, 0, w, h);
    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
    );
    return jpeg && jpeg.size > 0 ? { blob: jpeg, fileType: 'image/jpeg' } : fallback;
  } catch {
    return fallback;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lê a posição GPS uma vez, tolerando ausência/negação de permissão. */
function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

type Props = {
  value: CapturedPhoto[];
  onChange: (next: CapturedPhoto[]) => void;
};

export function PhotoCapture({ value, onChange }: Props) {
  const t = useTranslations('photo');

  // Revoga os object URLs ao desmontar para não vazar memória.
  React.useEffect(() => {
    return () => {
      value.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // Intencional: só no unmount. A remoção individual revoga em `remove`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Captura GPS uma vez para o lote de fotos adicionado.
    const pos = await getPosition();
    const lat = pos?.coords.latitude;
    const lng = pos?.coords.longitude;

    const added: CapturedPhoto[] = await Promise.all(
      Array.from(files).map(async (file) => {
        const { blob, fileType } = await normalizeImage(file);
        return {
          id: crypto.randomUUID(),
          blob,
          fileType,
          previewUrl: URL.createObjectURL(blob),
          caption: '',
          lat,
          lng,
        };
      }),
    );
    onChange([...value, ...added]);
  }

  function remove(photo: CapturedPhoto) {
    URL.revokeObjectURL(photo.previewUrl);
    onChange(value.filter((p) => p.id !== photo.id));
  }

  function setCaption(id: string, caption: string) {
    onChange(value.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {value.map((p) => (
          <div key={p.id} className="space-y-1.5">
            <div className="relative aspect-square rounded-md overflow-hidden border border-border group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt={p.caption} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(p)}
                className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                aria-label={t('remove')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {p.lat != null && p.lng != null && (
                <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-white">
                  <MapPin className="h-3 w-3" /> GPS
                </span>
              )}
            </div>
            <Input
              value={p.caption}
              onChange={(e) => setCaption(p.id, e.target.value)}
              placeholder={t('captionPlaceholder')}
              className="h-8 text-xs"
            />
          </div>
        ))}

        <label
          className={cn(
            'aspect-square rounded-md border border-dashed border-border cursor-pointer',
            'flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground',
            'hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors',
          )}
        >
          <ImagePlus className="h-5 w-5" />
          <span>{t('upload')}</span>
          {/* Sem `capture`: o celular abre o menu nativo com Câmera E Galeria.
              Com `capture="environment"` ficava preso só na câmera. */}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}
