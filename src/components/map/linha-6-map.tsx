/**
 * Linha6Map — Diagrama esquemático da Linha 6 Laranja (SVG server component)
 *
 * Estações: rótulo inclinado acima da linha.
 * VSEs / SEs: rótulo VERTICAL abaixo da linha — ocupa ~7px de largura,
 * eliminando a colisão de texto mesmo com pontos próximos.
 *
 * Inline-styles intencionais: renderização independente de purge/CSS vars.
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── Estilos do card ───────────────────────────────────────────────────────────
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
  fontFamily: "'Geist Mono','GeistMono',ui-monospace,monospace",
  fontSize: '0.6rem',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: '#475569',
};
const legendWrapStyle: React.CSSProperties = { display: 'flex', gap: '1.25rem' };
const footerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.625rem 1.5rem',
  borderTop: '1px solid #1a2030',
  fontFamily: "'Geist Mono','GeistMono',ui-monospace,monospace",
  fontSize: '0.6rem',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: '#2d3f56',
};

// ─────────────────────────────────────────────────────────────────────────────

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {
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

  // ── Dados ──────────────────────────────────────────────────────────────────
  const sorted   = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const minOrder = sorted[0]?.sort_order ?? 0;
  const maxOrder = sorted[sorted.length - 1]?.sort_order ?? 1;
  const range    = Math.max(maxOrder - minOrder, 1);

  const stations = sorted.filter(s => s.kind === 'estacao' || s.kind === 'patio');
  const estacoes = stations.filter(s => s.kind === 'estacao');
  const firstEst = estacoes[0];
  const lastEst  = estacoes[estacoes.length - 1];
  const subItems = sorted.filter(s => s.kind === 'vse' || s.kind === 'se');

  // ── Geometria (dinâmica conforme nº de locais) ─────────────────────────────
  const MX       = 100;                                   // margem lateral
  const LINE_Y   = 205;                                   // y da linha
  const PER_UNIT = 42;                                    // px por passo de ordem
  const UW       = Math.max(1500, range * PER_UNIT);      // largura útil
  const W        = UW + MX * 2;
  const maxSubLen = subItems.length
    ? Math.max(...subItems.map(s => s.name.length))
    : 12;
  const H = Math.ceil(LINE_Y + 16 + maxSubLen * 5.4 + 24); // altura ajustada ao texto

  const cx = (order: number) => MX + ((order - minOrder) / range) * UW;
  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={cardStyle}>

      {/* Cabeçalho */}
      <div style={headerStyle}>
        <span style={labelStyle}>Diagrama Esquemático · {stops.length} locais</span>
        <div style={legendWrapStyle}>
          <LegendDot color="#fb923c" label="Estação" />
          <LegendDot color="#3b82f6" label="VSE"     />
          <LegendDot color="#fbbf24" label="SE"      />
        </div>
      </div>

      {/* SVG */}
      <div style={{ overflowX: 'auto', padding: '0 4px 14px' }}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: W }}
          aria-label="Diagrama esquemático da Linha 6 — Laranja"
        >
          <rect width={W} height={H} fill="#0c1018" />

          <defs>
            <linearGradient id="lg6" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#c2410c" />
              <stop offset="40%"  stopColor="#ea580c" />
              <stop offset="70%"  stopColor="#fb923c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
          </defs>

          {/* Linha laranja */}
          <line
            x1={MX} y1={LINE_Y} x2={W - MX} y2={LINE_Y}
            stroke="url(#lg6)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="drop-shadow(0 0 12px rgba(249,115,22,0.45))"
          />

          {/* ── VSEs e SEs — rótulo vertical abaixo da linha ─────────────── */}
          {subItems.map(item => {
            const isVse   = item.kind === 'vse';
            const dot     = isVse ? '#3b82f6' : '#fbbf24';
            const txt     = isVse ? '#93c5fd' : '#fcd34d';
            const x       = cx(item.sort_order);
            const textY   = LINE_Y + 14;        // início do texto vertical
            const tx      = x - 3;              // centraliza coluna sob o ponto

            return (
              <a key={item.id} href={href(item.id)}>
                {/* conector curto */}
                <line
                  x1={x} y1={LINE_Y + 6}
                  x2={x} y2={textY - 2}
                  stroke={dot} strokeWidth="1.5" strokeOpacity="0.45"
                />
                {/* ponto */}
                <circle cx={x} cy={LINE_Y} r={5} fill={dot} />
                {/* rótulo vertical (rotação 90° = leitura de cima p/ baixo) */}
                <text
                  x={tx} y={textY}
                  transform={`rotate(90 ${tx} ${textY})`}
                  textAnchor="start"
                  fontSize="9"
                  fill={txt}
                  fontFamily="'Geist Mono','GeistMono',ui-monospace,monospace"
                >
                  {item.name}
                </text>
              </a>
            );
          })}

          {/* ── Estações e Pátio — rótulo inclinado acima ─────────────────── */}
          {stations.map(s => {
            const x          = cx(s.sort_order);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;
            const r          = isPatio ? 15 : isTerminal ? 13 : 9;
            const ty         = LINE_Y - r - 12;
            const fontSize   = isPatio || isTerminal ? 12.5 : 11;
            const fontW      = isPatio || isTerminal ? '600' : '500';

            return (
              <a key={s.id} href={href(s.id)}>
                {isPatio ? (
                  <>
                    <circle cx={x} cy={LINE_Y} r={r}     fill="none" stroke="#ea580c" strokeWidth="2.5" />
                    <circle cx={x} cy={LINE_Y} r={r - 5} fill="none" stroke="#ea580c" strokeWidth="1.5" />
                    <text
                      x={x} y={LINE_Y + 4}
                      textAnchor="middle"
                      fontSize="8" fontWeight="700"
                      fill="#ea580c"
                      fontFamily="'Geist Sans',ui-sans-serif,sans-serif"
                    >M</text>
                  </>
                ) : (
                  <>
                    <circle
                      cx={x} cy={LINE_Y} r={r}
                      fill={isTerminal ? '#ea580c' : '#fb923c'}
                      filter={isTerminal
                        ? 'drop-shadow(0 0 8px rgba(234,88,12,0.7))'
                        : 'drop-shadow(0 0 4px rgba(251,146,60,0.35))'}
                    />
                    <circle cx={x} cy={LINE_Y} r={r - 4} fill="#0c1018" fillOpacity="0.25" />
                  </>
                )}
                <text
                  x={x} y={ty}
                  transform={`rotate(-55 ${x} ${ty})`}
                  fontSize={fontSize}
                  fontWeight={fontW}
                  fill={isPatio ? '#fb923c' : '#f1f5f9'}
                  fontFamily="'Geist Sans',ui-sans-serif,system-ui,sans-serif"
                >
                  {s.name}
                </text>
              </a>
            );
          })}
        </svg>
      </div>

      {/* Rodapé */}
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
      fontFamily: "'Geist Mono','GeistMono',ui-monospace,monospace",
      fontSize: '0.6rem', textTransform: 'uppercase',
      letterSpacing: '0.1em', color: '#64748b',
    }}>
      <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
