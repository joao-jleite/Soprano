'use client';

/**
 * Diagrama esquemático da Linha 6 — Laranja.
 * Mostra estações, VSEs e SEs ao longo da linha.
 * Quando NEXT_PUBLIC_MAPBOX_TOKEN for configurado, substituir por mapa interativo.
 */

import { useMemo } from 'react';

type Stop = { id: string; name: string; kind: string; sort_order: number };

const KIND_CONFIG: Record<string, { dot: string; label: string; size: string }> = {
  estacao:   { dot: 'bg-orange-500 border-2 border-background ring-2 ring-primary/30', label: 'text-muted-foreground', size: 'h-3.5 w-3.5' },
  vse:       { dot: 'bg-primary border-2 border-background',                            label: 'text-primary/70',        size: 'h-2.5 w-2.5' },
  se:        { dot: 'bg-amber-400 border-2 border-background',                          label: 'text-amber-500/70',      size: 'h-2.5 w-2.5' },
  escadaria: { dot: 'bg-muted-foreground/40 border border-background',                  label: 'text-muted-foreground/50', size: 'h-2 w-2' },
  patio:     { dot: 'bg-muted-foreground/40 border border-background',                  label: 'text-muted-foreground/50', size: 'h-2 w-2' },
  outro:     { dot: 'bg-muted-foreground/40 border border-background',                  label: 'text-muted-foreground/50', size: 'h-2 w-2' },
};

export function Linha6Map({ stops }: { stops: Stop[] }) {
  // Ordena todos os pontos pelo sort_order
  const sorted = useMemo(
    () => [...stops].sort((a, b) => a.sort_order - b.sort_order),
    [stops],
  );

  const stations = useMemo(() => sorted.filter((s) => s.kind === 'estacao'), [sorted]);
  const vses     = useMemo(() => sorted.filter((s) => s.kind === 'vse'), [sorted]);
  const ses      = useMemo(() => sorted.filter((s) => s.kind === 'se'), [sorted]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card/40 p-5">
      <div className="absolute top-3 right-4 flex items-center gap-3 text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />Estação</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" />VSE</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />SE</span>
      </div>

      {/* Linha principal — estações */}
      <div className="relative mt-8 pb-2">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 opacity-80" />
        <ul className="relative flex justify-between">
          {stations.map((s, i) => (
            <li key={s.id} className="flex flex-col items-center group cursor-default">
              <div
                className={`${KIND_CONFIG.estacao.size} rounded-full ${KIND_CONFIG.estacao.dot} transition-transform group-hover:scale-150`}
                title={s.name}
              />
              <span className="mt-2 text-[8px] font-mono text-center max-w-[64px] leading-tight text-muted-foreground group-hover:text-foreground transition-colors">
                {s.name}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* VSE — poços de ventilação */}
      {vses.length > 0 && (
        <div className="mt-5 border-t border-border/50 pt-3">
          <p className="text-[9px] uppercase tracking-wider text-primary/60 mb-2 font-mono">
            VSE — Poços de ventilação ({vses.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {vses.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 group cursor-default">
                <div className={`${KIND_CONFIG.vse.size} rounded-full ${KIND_CONFIG.vse.dot} shrink-0`} title={s.name} />
                <span className="text-[9px] font-mono text-primary/70 group-hover:text-primary transition-colors truncate max-w-[120px]">
                  {s.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SE — saídas de emergência */}
      {ses.length > 0 && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <p className="text-[9px] uppercase tracking-wider text-amber-500/60 mb-2 font-mono">
            SE — Saídas de emergência ({ses.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {ses.map((s) => (
              <li key={s.id} className="flex items-center gap-1.5 group cursor-default">
                <div className={`${KIND_CONFIG.se.size} rounded-full ${KIND_CONFIG.se.dot} shrink-0`} title={s.name} />
                <span className="text-[9px] font-mono text-amber-500/70 group-hover:text-amber-500 transition-colors truncate max-w-[120px]">
                  {s.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Brasilândia</span>
        <span className="font-mono">Linha 6 · Laranja</span>
        <span>São Joaquim</span>
      </div>
    </div>
  );
}
