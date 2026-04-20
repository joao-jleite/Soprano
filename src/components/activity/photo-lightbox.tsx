'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

type Photo = { id: string; url: string; caption?: string | null };

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const open = openIdx !== null;

  const nav = React.useCallback(
    (dir: -1 | 1) => {
      setOpenIdx((idx) => {
        if (idx === null) return idx;
        const next = (idx + dir + photos.length) % photos.length;
        return next;
      });
    },
    [photos.length],
  );

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
      else if (e.key === 'Escape') setOpenIdx(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, nav]);

  const current = open ? photos[openIdx!] : null;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="relative aspect-square rounded-md overflow-hidden border border-border group focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Image
              src={p.url}
              alt={p.caption ?? ''}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized
            />
          </button>
        ))}
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && setOpenIdx(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <DialogPrimitive.Title className="sr-only">Visualizar foto</DialogPrimitive.Title>
            {current && (
              <>
                <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
                  <Image
                    src={current.url}
                    alt={current.caption ?? ''}
                    width={1600}
                    height={1200}
                    className="max-w-full max-h-full object-contain"
                    unoptimized
                  />
                </div>

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => nav(-1)}
                      aria-label="Anterior"
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => nav(1)}
                      aria-label="Próxima"
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                <DialogPrimitive.Close
                  aria-label="Fechar"
                  className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <X className="h-5 w-5" />
                </DialogPrimitive.Close>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-mono text-white/70">
                  {openIdx! + 1} / {photos.length}
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
