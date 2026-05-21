/**
 * Linha6Map — Diagrama esquemático da Linha 6 Laranja (SVG server component)
 *
 * Usa inline-styles intencionalmente para garantir renderização independente
 * de purge ou resolução de variáveis CSS no servidor.
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── Dimensões do canvas ───────────────────────────────────────────────────────
const W      = 1800;    // largura total do SVG
const H      = 460;     // altura total
const LINE_Y = 200;     // y da linha laranja (espaço generoso acima para rótulos)
const MX     = 80;      // margem esquerda / direita
const UW     = W - MX * 2; // largura útil

// ── Rotações ─────────────────────────────────────────────────────────────────
const rotUp   = (x: number, y: number) => `rotate(-60 ${x} ${y})`;
const rotDown = (x: number, y: number) => `rotate(60 ${x} ${y})`;

// ── Posição X ────────────────────────────────────────────────────────────────
function posX(order: number, min: number, range: number): number {
  return MX + ((order - min) / range) * UW;
}

// ── Estilos fixos (inline para garantir visibilidade independente de Tailwind) ─
const cardStyle: React.CSSProperties = {
  background: '#0c1018',
  borderRadius: '0.75rem',
  border: '1px solid #1e2535',
  overflow: 'hidden',
  width: '100%',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.875rem 1.25rem 0.5rem',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Geist Mono', 'GeistMono', ui-monospace, monospace",
  fontSize: '0.6rem',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: '#475569',
};

const legendWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.25rem',
};

const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.625rem 1.5rem',
  borderTop: '1px solid #1a2030',
  fontFamily: "'Geist Mono', 'GeistMono', ui-monospace, monospace",
  fontSize: '0.6rem',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: '#2d3f56',
};

// ─────────────────────────────────────────────────────────────────────────────

export function Linha6Map({
  stops,
  locale = 'pt',
}: {
  stops: Stop[];
  locale?: string;
}) {
  // Estado vazio — banco sem seed aplicado
  if (!stops || stops.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Nenhum local cadastrado para esta linha.
        </p>
        <p style={{ color: '#2d3f56', fontSize: '0.7rem', fontFamily: 'monospace' }}>
          Verifique se o seed da Linha 6 foi aplicado no banco de dados.
        </p>
      </div>
    );
  }

  // ── Prepara dados ─────────────────────────────────────────────────────────
  const sorted   = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const minOrder = sorted[0]?.sort_order ?? 0;
  const maxOrder = sorted[sorted.length - 1]?.sort_order ?? 1;
  const range    = Math.max(maxOrder - minOrder, 1);

  const x = (order: number) => posX(order, minOrder, range);

  const stations = sorted.filter(s => s.kind === 'estacao' || s.kind === 'patio');
  const vses     = sorted.filter(s => s.kind === 'vse');
  const ses      = sorted.filter(s => s.kind === 'se');
  const estacoes = stations.filter(s => s.kind === 'estacao');
  const firstEst = estacoes[0];
  const lastEst  = estacoes[estacoes.length - 1];

  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={cardStyle}>

      {/* ── Cabeçalho com legenda ───────────────────────────────────────── */}
      <div style={headerStyle}>
        <span style={labelStyle}>Diagrama Esquemático · {stops.length} locais</span>
        <div style={legendWrapStyle}>
          <LegendDot color="#fb923c" label="Estação" />
          <LegendDot color="#3b82f6" label="VSE"     />
          <LegendDot color="#fbbf24" label="SE"      />
        </div>
      </div>

      {/* ── Mapa SVG ────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', padding: '0 4px 16px' }}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: W }}
          aria-label="Diagrama esquemático da Linha 6 — Laranja"
        >
          {/* Fundo explícito — garante visibilidade em qualquer contexto */}
          <rect width={W} height={H} fill="#0c1018" />

          {/* Gradiente da linha */}
          <defs>
            <linearGradient id="linha6grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"    stopColor="#c2410c" />
              <stop offset="30%"   stopColor="#ea580c" />
              <stop offset="70%"   stopColor="#fb923c" />
              <stop offset="100%"  stopColor="#c2410c" />
            </linearGradient>
          </defs>

          {/* ── Linha laranja ─────────────────────────────────────────── */}
          <line
            x1={MX}     y1={LINE_Y}
            x2={W - MX} y2={LINE_Y}
            stroke="url(#linha6grad)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="drop-shadow(0 0 10px rgba(249,115,22,0.5))"
          />

          {/* ── VSEs — ponto azul + conector + rótulo inclinado abaixo ── */}
          {vses.map(vse => {
            const cx = x(vse.sort_order);
            const ty = LINE_Y + 20;
            return (
              <a key={vse.id} href={href(vse.id)}>
                <circle cx={cx} cy={LINE_Y} r={4.5} fill="#3b82f6" />
                <line
                  x1={cx} y1={LINE_Y + 6}
                  x2={cx} y2={ty - 2}
                  stroke="#3b82f6" strokeWidth="1.5"
                  strokeDasharray="3 2" strokeOpacity="0.5"
                />
                <text
                  x={cx + 2} y={ty}
                  transform={rotDown(cx + 2, ty)}
                  fontSize="9.5"
                  fill="#64748b"
                  fontFamily="'Geist Mono', 'GeistMono', ui-monospace, monospace"
                >
                  {vse.name}
                </text>
              </a>
            );
          })}

          {/* ── SEs — ponto âmbar + conector + rótulo inclinado abaixo ── */}
          {ses.map(se => {
            const cx = x(se.sort_order);
            const ty = LINE_Y + 20;
            return (
              <a key={se.id} href={href(se.id)}>
                <circle cx={cx} cy={LINE_Y} r={4.5} fill="#fbbf24" />
                <line
                  x1={cx} y1={LINE_Y + 6}
                  x2={cx} y2={ty - 2}
                  stroke="#fbbf24" strokeWidth="1.5"
                  strokeDasharray="3 2" strokeOpacity="0.5"
                />
                <text
                  x={cx + 2} y={ty}
                  transform={rotDown(cx + 2, ty)}
                  fontSize="9.5"
                  fill="#78350f"
                  fontFamily="'Geist Mono', 'GeistMono', ui-monospace, monospace"
                >
                  {se.name}
                </text>
              </a>
            );
          })}

          {/* ── Estações e Pátio — círculo + rótulo inclinado acima ───── */}
          {stations.map(s => {
            const cx         = x(s.sort_order);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;
            const r          = isPatio ? 14 : isTerminal ? 12 : 8;
            const ty         = LINE_Y - r - 10;

            return (
              <a key={s.id} href={href(s.id)}>
                {isPatio ? (
                  <>
                    <circle cx={cx} cy={LINE_Y} r={r}     fill="none" stroke="#ea580c" strokeWidth="2.5" />
                    <circle cx={cx} cy={LINE_Y} r={r - 5} fill="none" stroke="#ea580c" strokeWidth="1.5" />
                    <text
                      x={cx} y={LINE_Y + 3.5}
                      textAnchor="middle"
                      fontSize="8" fontWeight="700"
                      fill="#ea580c"
                      fontFamily="'Geist Sans', ui-sans-serif, sans-serif"
                    >M</text>
                  </>
                ) : (
                  <circle
                    cx={cx} cy={LINE_Y} r={r}
                    fill={isTerminal ? '#ea580c' : '#fb923c'}
                    filter={isTerminal ? 'drop-shadow(0 0 6px rgba(234,88,12,0.6))' : undefined}
                  />
                )}

                {/* Rótulo inclinado -60° acima da linha */}
                <text
                  x={cx} y={ty}
                  transform={rotUp(cx, ty)}
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

      {/* ── Rodapé ──────────────────────────────────────────────────────── */}
      <div style={footerStyle}>
        <span>Brasilândia</span>
        <span>Linha 6 · Laranja · {estacoes.length} estações</span>
        <span>São Joaquim</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontFamily: "'Geist Mono', 'GeistMono', ui-monospace, monospace",
      fontSize: '0.6rem', textTransform: 'uppercase',
      letterSpacing: '0.1em', color: '#64748b',
    }}>
      <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
