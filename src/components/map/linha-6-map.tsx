import { cn } from '@/lib/utils';

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── dimensões do SVG ──────────────────────────────────────────────────────────
const W        = 1800;   // largura total
const H        = 440;    // altura total
const LINE_Y   = 178;    // y da linha laranja
const MX       = 72;     // margem esquerda / direita
const UW       = W - MX * 2; // largura útil

// ── rotação dos rótulos ───────────────────────────────────────────────────────
// acima da linha → gira anti-horário (estações)
const rotUp   = (x: number, y: number) => `rotate(-65 ${x} ${y})`;
// abaixo da linha → gira horário (VSE / SE)
const rotDown = (x: number, y: number) => `rotate(65 ${x} ${y})`;

// ── posição X a partir do sort_order ─────────────────────────────────────────
function makeGetX(min: number, range: number) {
  return (order: number) => MX + ((order - min) / range) * UW;
}

export function Linha6Map({
  stops,
  locale = 'pt',
}: {
  stops: Stop[];
  locale?: string;
}) {
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

  const sorted = [...stops].sort((a, b) => a.sort_order - b.sort_order);
  const minOrder = sorted[0].sort_order;
  const maxOrder = sorted[sorted.length - 1].sort_order;
  const getX = makeGetX(minOrder, Math.max(maxOrder - minOrder, 1));

  const stations = sorted.filter(s => ['estacao', 'patio'].includes(s.kind));
  const vses     = sorted.filter(s => s.kind === 'vse');
  const ses      = sorted.filter(s => s.kind === 'se');

  const estacoes  = stations.filter(s => s.kind === 'estacao');
  const firstEst  = estacoes[0];
  const lastEst   = estacoes[estacoes.length - 1];

  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div className="w-full rounded-xl border border-border bg-card/50">

      {/* ── Legenda ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-5 pt-4 pb-2 justify-end">
        <LegendDot color="#fb923c" label="Estação" />
        <LegendDot color="#3b82f6" label="VSE" />
        <LegendDot color="#fbbf24" label="SE" />
      </div>

      {/* ── Mapa SVG ────────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-4 px-1">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: W }}
          aria-label="Diagrama esquemático da Linha 6 — Laranja"
        >
          {/* Estilos SVG — usa variáveis CSS do tema */}
          <defs>
            <linearGradient id="linha6grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#c2410c" />
              <stop offset="35%"  stopColor="#ea580c" />
              <stop offset="65%"  stopColor="#fb923c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
          </defs>

          {/* ── Linha laranja ─────────────────────────────────────── */}
          <line
            x1={MX} y1={LINE_Y}
            x2={W - MX} y2={LINE_Y}
            stroke="url(#linha6grad)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="drop-shadow(0 0 8px rgba(249,115,22,0.45))"
          />

          {/* ── VSEs (acima da linha, rótulo abaixo) ──────────────── */}
          {vses.map(vse => {
            const x = getX(vse.sort_order);
            const anchorY = LINE_Y + 16;
            return (
              <a key={vse.id} href={href(vse.id)}>
                {/* Dot na linha */}
                <circle cx={x} cy={LINE_Y} r={4} fill="#3b82f6" />
                {/* Conector tracejado */}
                <line
                  x1={x} y1={LINE_Y + 5}
                  x2={x} y2={anchorY - 2}
                  stroke="#3b82f6" strokeWidth="1.5"
                  strokeDasharray="3 2" strokeOpacity="0.55"
                />
                {/* Rótulo inclinado */}
                <text
                  x={x + 2} y={anchorY}
                  transform={rotDown(x + 2, anchorY)}
                  fontSize="9.5"
                  fill="#64748b"
                  fontFamily="'GeistMono', 'Geist Mono', ui-monospace, monospace"
                >
                  {vse.name}
                </text>
              </a>
            );
          })}

          {/* ── SEs (abaixo da linha, rótulo abaixo) ──────────────── */}
          {ses.map(se => {
            const x = getX(se.sort_order);
            const anchorY = LINE_Y + 16;
            return (
              <a key={se.id} href={href(se.id)}>
                <circle cx={x} cy={LINE_Y} r={4} fill="#fbbf24" />
                <line
                  x1={x} y1={LINE_Y + 5}
                  x2={x} y2={anchorY - 2}
                  stroke="#fbbf24" strokeWidth="1.5"
                  strokeDasharray="3 2" strokeOpacity="0.55"
                />
                <text
                  x={x + 2} y={anchorY}
                  transform={rotDown(x + 2, anchorY)}
                  fontSize="9.5"
                  fill="#92400e"
                  fontFamily="'GeistMono', 'Geist Mono', ui-monospace, monospace"
                >
                  {se.name}
                </text>
              </a>
            );
          })}

          {/* ── Estações e Pátio ──────────────────────────────────── */}
          {stations.map(s => {
            const x      = getX(s.sort_order);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;
            const r          = isPatio ? 13 : isTerminal ? 11 : 8;
            const anchorY    = LINE_Y - r - 6;

            return (
              <a key={s.id} href={href(s.id)}>
                {/* ── Ícone ─────────────────────────────── */}
                {isPatio ? (
                  /* Pátio: círculo duplo com "M" */
                  <>
                    <circle cx={x} cy={LINE_Y} r={r}   fill="none" stroke="#ea580c" strokeWidth="2.5" />
                    <circle cx={x} cy={LINE_Y} r={r - 5} fill="none" stroke="#ea580c" strokeWidth="1.5" />
                    <text
                      x={x} y={LINE_Y + 3.5}
                      textAnchor="middle"
                      fontSize="8" fontWeight="700"
                      fill="#ea580c"
                      fontFamily="'Geist Sans', ui-sans-serif, sans-serif"
                    >M</text>
                  </>
                ) : (
                  <circle
                    cx={x} cy={LINE_Y} r={r}
                    fill={isTerminal ? '#ea580c' : '#fb923c'}
                    filter={isTerminal ? 'drop-shadow(0 0 6px rgba(234,88,12,0.5))' : undefined}
                  />
                )}

                {/* ── Rótulo inclinado acima ─────────────── */}
                <text
                  x={x} y={anchorY}
                  transform={rotUp(x, anchorY)}
                  fontSize={isPatio || isTerminal ? '11.5' : '10.5'}
                  fontWeight={isPatio || isTerminal ? '600' : '400'}
                  fill={isPatio ? '#fb923c' : '#e2e8f0'}
                  fontFamily="'Geist Sans', ui-sans-serif, system-ui, sans-serif"
                >
                  {s.name}
                </text>
              </a>
            );
          })}
        </svg>
      </div>

      {/* ── Rodapé ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
        <span>Brasilândia</span>
        <span>Linha 6 · Laranja · {estacoes.length} estações</span>
        <span>São Joaquim</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
