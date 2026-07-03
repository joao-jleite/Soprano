/*
 * Linha6Scheme — esquema horizontal da linha (design system Zitrón).
 * Linha laranja com estações (círculos + rótulo a -42°), VSEs (ticks azuis)
 * e SEs (losangos ciano). Todo stop clicável → atividades filtradas por local.
 * Puro SVG server-side; cores via tokens CSS pra respeitar o tema.
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

const W = 1120;
const H = 216;
const X0 = 40;
const X1 = 1084;
const LINE_Y = 92;
const ORANGE = '#F08A1D';

export function Linha6Scheme({
  stops,
  locale,
  legend,
}: {
  stops: Stop[];
  locale: string;
  legend: { station: string; vse: string; se: string; note: string };
}) {
  const sorted = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (sorted.length === 0) return null;

  const span = sorted.length > 1 ? sorted.length - 1 : 1;
  const xOf = (i: number) => X0 + ((X1 - X0) * i) / span;
  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card px-5 pb-3.5 pt-6">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[980px]">
          <path
            d={`M${X0} ${LINE_Y} H${X1}`}
            stroke={ORANGE}
            strokeWidth="7"
            strokeLinecap="round"
          />

          {sorted.map((s, i) => {
            const x = xOf(i);
            if (s.kind === 'vse') {
              return (
                <a key={s.id} href={href(s.id)}>
                  <title>{s.name}</title>
                  <rect
                    x={x - 2}
                    y={62}
                    width="4"
                    height="16"
                    rx="2"
                    className="fill-primary"
                  />
                </a>
              );
            }
            if (s.kind === 'se') {
              return (
                <a key={s.id} href={href(s.id)}>
                  <title>{s.name}</title>
                  <rect
                    x={x - 5.5}
                    y={55}
                    width="11"
                    height="11"
                    rx="2"
                    fill="none"
                    strokeWidth="2.4"
                    className="stroke-zitron-cyan"
                    transform={`rotate(45 ${x} 60.5)`}
                  />
                </a>
              );
            }
            // estação, pátio e demais — círculo na linha + rótulo inclinado
            const isStation = s.kind === 'estacao';
            return (
              <a key={s.id} href={href(s.id)}>
                <title>{s.name}</title>
                <circle
                  cx={x}
                  cy={LINE_Y}
                  r="8"
                  stroke={isStation ? ORANGE : 'hsl(var(--zitron-steel))'}
                  strokeWidth="3.4"
                  className="fill-card"
                />
                <text
                  x={x}
                  y={118}
                  transform={`rotate(-42 ${x} 118)`}
                  textAnchor="end"
                  fontSize="12.5"
                  fontWeight={isStation ? 500 : 400}
                  className={isStation ? 'fill-foreground' : 'fill-muted-foreground'}
                >
                  {s.name}
                </text>
              </a>
            );
          })}
        </svg>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border px-2 pb-1.5 pt-2.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground/70">
          <span
            className="h-2.5 w-2.5 rounded-full border-[2.5px]"
            style={{ borderColor: ORANGE }}
          />
          {legend.station}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground/70">
          <span className="h-3 w-[3.5px] rounded-sm bg-primary" />
          {legend.vse}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.1em] text-muted-foreground/70">
          <span className="h-[9px] w-[9px] rotate-45 border-2 border-zitron-cyan" />
          {legend.se}
        </span>
        <span className="ml-auto font-mono text-[9px] text-muted-foreground/60">
          {legend.note}
        </span>
      </div>
    </div>
  );
}
