import NextLink from 'next/link';
import { cn } from '@/lib/utils';

type Stop = { id: string; name: string; kind: string; sort_order: number };

const H = 240;
const LINE_Y = 110;

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {
  const sorted = [...stops].sort((a, b) => a.sort_order - b.sort_order);

  const minOrder = sorted[0]?.sort_order ?? 0;
  const maxOrder = sorted[sorted.length - 1]?.sort_order ?? 100;
  const range = Math.max(maxOrder - minOrder, 1);

  const getX = (order: number) => `${((order - minOrder) / range) * 88 + 6}%`;

  const stations = sorted.filter((s) => ['estacao', 'patio'].includes(s.kind));
  const vses = sorted.filter((s) => s.kind === 'vse');
  const ses = sorted.filter((s) => s.kind === 'se');

  const href = (id: string) => `/${locale}/atividades?location=${id}`;

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
    <div className="w-full rounded-xl border border-border bg-card/50">
      {/* Legenda */}
      <div className="flex items-center gap-5 px-5 pt-4 pb-2 justify-end">
        <LegendDot color="bg-orange-500" label="Estação" />
        <LegendDot color="bg-primary" label="VSE" />
        <LegendDot color="bg-amber-400" label="SE" />
      </div>

      {/* Diagrama */}
      <div className="overflow-x-auto px-2 pb-4">
        <div className="relative min-w-[860px]" style={{ height: `${H}px` }}>

          {/* Linha laranja */}
          <div
            className="absolute left-0 right-0 h-[5px] rounded-full"
            style={{
              top: LINE_Y - 2,
              background: 'linear-gradient(90deg, #ea580c 0%, #fb923c 40%, #fbbf24 70%, #ea580c 100%)',
              boxShadow: '0 0 16px rgba(249,115,22,0.5)',
            }}
          />

          {/* VSEs — acima da linha */}
          {vses.map((vse) => (
            <NextLink
              key={vse.id}
              href={href(vse.id)}
              className="absolute group flex flex-col items-center"
              style={{ left: getX(vse.sort_order), top: LINE_Y - 46, transform: 'translateX(-50%)' }}
              title={vse.name}
            >
              {/* Tooltip */}
              <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-popover border border-border shadow-md text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                {vse.name}
              </span>
              {/* Dot */}
              <span className="h-2.5 w-2.5 rounded-full bg-primary border-2 border-background group-hover:scale-150 transition-transform block" />
              {/* Tick */}
              <span className="w-px bg-primary/40 group-hover:bg-primary transition-colors block" style={{ height: 40 }} />
            </NextLink>
          ))}

          {/* SEs — abaixo da linha */}
          {ses.map((se) => (
            <NextLink
              key={se.id}
              href={href(se.id)}
              className="absolute group flex flex-col items-center"
              style={{ left: getX(se.sort_order), top: LINE_Y + 8, transform: 'translateX(-50%)' }}
              title={se.name}
            >
              {/* Tick */}
              <span className="w-px bg-amber-400/40 group-hover:bg-amber-400 transition-colors block" style={{ height: 28 }} />
              {/* Dot */}
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-background group-hover:scale-150 transition-transform block" />
              {/* Tooltip */}
              <span className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-popover border border-border shadow-md text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {se.name}
              </span>
            </NextLink>
          ))}

          {/* Estações */}
          {stations.map((s, i) => {
            const isTerminal = i === 0 || i === stations.length - 1;
            const labelAbove = i % 2 === 0;
            return (
              <NextLink
                key={s.id}
                href={href(s.id)}
                className="absolute group flex flex-col items-center"
                style={{ left: getX(s.sort_order), top: LINE_Y - 10, transform: 'translateX(-50%)', zIndex: 10 }}
              >
                {/* Círculo */}
                <span
                  className={cn(
                    'rounded-full border-2 border-background group-hover:scale-125 transition-transform block',
                    isTerminal
                      ? 'h-6 w-6 bg-orange-500'
                      : 'h-[18px] w-[18px] bg-orange-400',
                  )}
                  style={isTerminal ? { boxShadow: '0 0 12px rgba(249,115,22,0.6)' } : undefined}
                />
                {/* Label */}
                <span
                  className={cn(
                    'absolute text-center text-[9px] leading-tight w-[72px] group-hover:text-orange-400 transition-colors',
                    labelAbove ? 'bottom-[calc(100%+10px)]' : 'top-[calc(100%+10px)]',
                    isTerminal
                      ? 'font-semibold text-foreground'
                      : 'font-medium text-muted-foreground',
                  )}
                >
                  {s.name}
                </span>
              </NextLink>
            );
          })}
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
        <span>Brasilândia</span>
        <span>Linha 6 · Laranja · {stations.filter((s) => s.kind === 'estacao').length} estações</span>
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
