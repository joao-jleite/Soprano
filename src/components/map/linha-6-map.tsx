'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Stop = { id: string; name: string; kind: string; sort_order: number };

// Altura total do diagrama em px
const H = 240;
// Centro da linha laranja
const LINE_Y = 110;

export function Linha6Map({ stops }: { stops: Stop[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...stops].sort((a, b) => a.sort_order - b.sort_order),
    [stops],
  );

  const minOrder = sorted[0]?.sort_order ?? 0;
  const maxOrder = sorted[sorted.length - 1]?.sort_order ?? 100;
  const range = Math.max(maxOrder - minOrder, 1);

  // Posição horizontal (%) dentro de 4%–96% para dar margem nas bordas
  const getX = (order: number) => `${((order - minOrder) / range) * 90 + 5}%`;

  const stations = sorted.filter((s) =>
    ['estacao', 'patio'].includes(s.kind),
  );
  const vses = sorted.filter((s) => s.kind === 'vse');
  const ses = sorted.filter((s) => s.kind === 'se');

  if (stops.length === 0) {
    return (
      <div className="w-full rounded-xl border border-dashed border-border bg-card/30 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhum local cadastrado para esta linha.</p>
        <p className="text-xs text-muted-foreground/50 mt-1 font-mono">
          Verifique se o seed da Linha 6 foi aplicado no banco de dados.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card/50 overflow-hidden">
      {/* Legenda */}
      <div className="flex items-center gap-5 px-5 pt-4 pb-2 justify-end">
        <LegendDot color="bg-orange-500" label="Estação" />
        <LegendDot color="bg-primary" label="VSE" />
        <LegendDot color="bg-amber-400" label="SE" />
      </div>

      {/* Diagrama com scroll horizontal em telas pequenas */}
      <div className="overflow-x-auto px-2 pb-4">
        <div
          className="relative min-w-[860px]"
          style={{ height: `${H}px` }}
        >
          {/* ─── Linha laranja ─── */}
          <div
            className="absolute left-0 right-0 h-[5px] rounded-full shadow-[0_0_16px_rgba(249,115,22,0.5)]"
            style={{
              top: LINE_Y - 2,
              background: 'linear-gradient(90deg, #ea580c 0%, #fb923c 40%, #fbbf24 70%, #ea580c 100%)',
            }}
          />

          {/* ─── VSEs: tick + dot acima da linha ─── */}
          {vses.map((vse) => {
            const isHov = hoveredId === vse.id;
            const shortName = vse.name.replace(/^VSE\s*/i, '');
            return (
              <Link
                key={vse.id}
                href={`/atividades?location=${vse.id}`}
                className="absolute group"
                style={{ left: getX(vse.sort_order), top: LINE_Y - 46, transform: 'translateX(-50%)' }}
                onMouseEnter={() => setHoveredId(vse.id)}
                onMouseLeave={() => setHoveredId(null)}
                title={vse.name}
              >
                {/* Label on hover */}
                <div
                  className={cn(
                    'absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-popover border border-border shadow-md text-foreground transition-all duration-150 pointer-events-none',
                    isHov ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
                  )}
                >
                  {vse.name}
                </div>
                {/* Dot */}
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full bg-primary border border-background transition-transform duration-150 mx-auto',
                    isHov ? 'scale-150' : 'scale-100',
                  )}
                />
                {/* Tick */}
                <div className={cn(
                  'w-px mx-auto bg-primary/40 transition-colors duration-150',
                  isHov ? 'bg-primary' : '',
                )}
                  style={{ height: 40 }}
                />
              </Link>
            );
          })}

          {/* ─── SEs: dot + tick abaixo da linha ─── */}
          {ses.map((se) => {
            const isHov = hoveredId === se.id;
            return (
              <Link
                key={se.id}
                href={`/atividades?location=${se.id}`}
                className="absolute group flex flex-col items-center"
                style={{ left: getX(se.sort_order), top: LINE_Y + 8, transform: 'translateX(-50%)' }}
                onMouseEnter={() => setHoveredId(se.id)}
                onMouseLeave={() => setHoveredId(null)}
                title={se.name}
              >
                {/* Tick */}
                <div
                  className={cn('w-px bg-amber-400/40 transition-colors duration-150', isHov ? 'bg-amber-400' : '')}
                  style={{ height: 28 }}
                />
                {/* Dot */}
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full bg-amber-400 border border-background transition-transform duration-150',
                    isHov ? 'scale-150' : 'scale-100',
                  )}
                />
                {/* Label on hover */}
                <div
                  className={cn(
                    'mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-popover border border-border shadow-md text-foreground transition-all duration-150 pointer-events-none',
                    isHov ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
                  )}
                >
                  {se.name}
                </div>
              </Link>
            );
          })}

          {/* ─── Estações ─── */}
          {stations.map((s, i) => {
            const isHov = hoveredId === s.id;
            const isTerminal = i === 0 || i === stations.length - 1;
            const labelAbove = i % 2 === 0;

            return (
              <Link
                key={s.id}
                href={`/atividades?location=${s.id}`}
                className="absolute group flex flex-col items-center"
                style={{
                  left: getX(s.sort_order),
                  top: LINE_Y - 10,
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                }}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Círculo da estação */}
                <div
                  className={cn(
                    'rounded-full border-2 border-background transition-all duration-150',
                    isTerminal
                      ? 'h-6 w-6 bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]'
                      : 'h-[18px] w-[18px] bg-orange-400',
                    isHov
                      ? 'scale-125 shadow-[0_0_16px_rgba(249,115,22,0.8)]'
                      : isTerminal
                      ? 'scale-100'
                      : 'scale-100',
                  )}
                />

                {/* Label — alterna acima/abaixo */}
                <span
                  className={cn(
                    'absolute text-center text-[9px] font-medium leading-tight w-[72px] transition-colors duration-150',
                    labelAbove
                      ? 'bottom-[calc(100%+10px)]'
                      : 'top-[calc(100%+10px)]',
                    isHov ? 'text-orange-400' : 'text-muted-foreground',
                    isTerminal && 'font-semibold text-foreground',
                  )}
                >
                  {s.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
        <span>Brasilândia</span>
        <span>Linha 6 · Laranja · {stations.length} estações</span>
        <span>São Joaquim</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
      <span className={cn('inline-block h-2.5 w-2.5 rounded-full', color)} />
      {label}
    </span>
  );
}
