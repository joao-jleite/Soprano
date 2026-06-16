'use client';

import * as React from 'react';
import { ImagePlus, MapPin, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
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

/**
 * Lê a posição GPS uma vez. NUNCA trava nem lança: tem um teto rígido de 6s e
 * cai para null em qualquer erro (inclusive quando bloqueada por Permissions
 * Policy). Crucial porque o GPS roda em segundo plano e não pode segurar a foto.
 */
function getPositionSafe(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: GeolocationPosition | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    setTimeout(() => done(null), 6000);
    try {
      if (!('geolocation' in navigator)) return done(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => done(pos),
        () => done(null),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
      );
    } catch {
      done(null);
    }
  });
}

type Props = {
  value: CapturedPhoto[];
  onChange: (next: CapturedPhoto[]) => void;
};

export function PhotoCapture({ value, onChange }: Props) {
  const t = useTranslations('photo');
  // Espelho sempre-atualizado do value para a atualização em segundo plano
  // (GPS/conversão) não usar uma cópia velha do array.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Revoga os object URLs ao desmontar para não vazar memória.
  React.useEffect(() => {
    return () => {
      value.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // Intencional: só no unmount. A remoção individual revoga em `remove`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(fileList: FileList | null) {
    // Snapshot SÍNCRONO da seleção, ANTES de qualquer await. No celular, o
    // `e.target.value = ''` que roda logo após esta chamada esvazia a FileList.
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;

    try {
      // 1) Mostra a miniatura NA HORA, a partir do arquivo original. Antes a
      //    foto só era adicionada depois do GPS + conversão — se qualquer um
      //    deles travasse, nada aparecia. Agora o preview é imediato.
      const fresh: CapturedPhoto[] = files.map((file) => ({
        id: crypto.randomUUID(),
        blob: file,
        fileType: file.type || 'image/jpeg',
        previewUrl: URL.createObjectURL(file),
        caption: '',
      }));
      onChange([...valueRef.current, ...fresh]);

      // 2) Em segundo plano (não bloqueia o preview): GPS + conversão p/ JPEG.
      const [pos, norms] = await Promise.all([
        getPositionSafe(),
        Promise.all(
          fresh.map(async (item) => ({
            id: item.id,
            norm: await normalizeImage(item.blob as File).catch(() => null),
          })),
        ),
      ]);
      const lat = pos?.coords.latitude;
      const lng = pos?.coords.longitude;
      const normById = new Map(norms.map((n) => [n.id, n.norm] as const));

      // Atualiza só os itens recém-adicionados; preserva o resto e nunca remove
      // um item que ainda esteja no formulário (merge seguro contra corrida).
      const applyEnhancements = (p: CapturedPhoto): CapturedPhoto => {
        if (!normById.has(p.id)) return p;
        let next: CapturedPhoto = lat != null ? { ...p, lat, lng } : p;
        const norm = normById.get(p.id);
        if (norm) {
          URL.revokeObjectURL(p.previewUrl);
          next = { ...next, blob: norm.blob, fileType: norm.fileType, previewUrl: URL.createObjectURL(norm.blob) };
        }
        return next;
      };
      const current = valueRef.current;
      const seen = new Set(current.map((p) => p.id));
      const merged = current.map(applyEnhancements);
      // Garante que nenhum item recém-adicionado se perca (corrida rara de render).
      for (const item of fresh) {
        if (!seen.has(item.id)) merged.push(applyEnhancements(item));
      }
      onChange(merged);
    } catch {
      toast.error('Não foi possível anexar a foto. Tente novamente.');
    }
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
