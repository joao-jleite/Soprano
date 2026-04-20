'use client';

/**
 * Placeholder do mapa da Linha 6.
 * Quando NEXT_PUBLIC_MAPBOX_TOKEN for configurado, este componente
 * pode ser substituído por um mapa Mapbox GL real com as VSEs/estações.
 * Por ora, mostra um diagrama esquemático da linha.
 */

import { useMemo } from 'react';

type Stop = { id: string; name: string; kind: string; sort_order: number };

export function Linha6Map({ stops }: { stops: Stop[] }) {
  const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  const stations = useMemo(
    () => stops.filter((s) => s.kind === 'estacao').sort((a, b) => a.sort_order - b.sort_order),
    [stops],
  );

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card/40 p-6">
      {!hasToken && (
        <div className="absolute top-2 right-3 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
          Esquemático · Mapa interativo disponível quando configurar Mapbox
        </div>
      )}

      <div className="relative mt-6 pb-2">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />
        <ul className="relative flex justify-between">
          {stations.map((s, i) => (
            <li key={s.id} className="flex flex-col items-center group">
              <div
                className={`h-3.5 w-3.5 rounded-full border-2 border-background bg-orange-500 transition-transform group-hover:scale-150 ${
                  i === 0 || i === stations.length - 1 ? 'ring-2 ring-primary/50' : ''
                }`}
                title={s.name}
              />
              <span className="mt-2 text-[9px] font-mono text-center max-w-[70px] leading-tight text-muted-foreground group-hover:text-foreground transition-colors">
                {s.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Brasilândia</span>
        <span className="font-mono">Linha 6 · Laranja</span>
        <span>São Joaquim</span>
      </div>
    </div>
  );
}
