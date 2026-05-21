/**
 * Linha6Map — Diagrama esquemático "espinha de peixe" (fishbone metro style)
 *
 * Estações / Pátio : rótulo diagonal −48° acima da linha  (nasce do ponto → sobe à direita)
 * VSEs / SEs       : rótulo diagonal +48° abaixo da linha (nasce do ponto → desce à direita)
 *
 * Inspirado no padrão visual CPTM / Metro de São Paulo (Linha Uni, etc.).
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

  // ── Geometria ──────────────────────────────────────────────────────────────
  const ANGLE    = 48;                               // graus de inclinação fishbone
  const SIN_A    = Math.sin(ANGLE * Math.PI / 180);
  const COS_A    = Math.cos(ANGLE * Math.PI / 180);

  const FONT_ST  = 11;   // fontSize estações
  const FONT_SUB = 9;    // fontSize VSE/SE
  const CHAR_W   = 0.62; // largura aprox por char (fração do fontSize)

  // Espaço vertical necessário acima da linha para rótulos de estações
  const maxStLen  = stations.length  ? Math.max(...stations.map(s  => s.name.length)) : 8;
  const maxSubLen = subItems.length  ? Math.max(...subItems.map(s  => s.name.length)) : 8;

  const ABOVE = Math.ceil(maxStLen  * FONT_ST  * CHAR_W * SIN_A) + 55;
  const BELOW = Math.ceil(maxSubLen * FONT_SUB * CHAR_W * SIN_A) + 35;

  const LINE_Y   = ABOVE;
  const PER_UNIT = 44;                               // px por passo de sort_order
  const UW       = Math.max(1500, range * PER_UNIT); // largura útil
  const MX_L     = 80;                               // margem esquerda fixa
  // margem direita: acomoda o overhang horizontal dos rótulos do último ponto
  const MX_R     = MX_L + Math.ceil(maxStLen * FONT_ST * CHAR_W * COS_A) + 20;
  const W        = MX_L + UW + MX_R;
  const H        = LINE_Y + BELOW + 20;

  const cx   = (order: number) => MX_L + ((order - minOrder) / range) * UW;
  const href = (id: string)    => `/${locale}/atividades?location=${id}`;

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
            x1={MX_L} y1={LINE_Y}
            x2={MX_L + UW} y2={LINE_Y}
            stroke="url(#lg6)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="drop-shadow(0 0 12px rgba(249,115,22,0.45))"
          />

          {/* ── VSEs e SEs — rótulo diagonal abaixo +48° ─────────────────── */}
          {subItems.map(item => {
            const isVse  = item.kind === 'vse';
            const dot    = isVse ? '#3b82f6' : '#fbbf24';
            const txt    = isVse ? '#93c5fd' : '#fcd34d';
            const x      = cx(item.sort_order);
            const tickY  = LINE_Y + 16;  // fim do conector / pivot do texto

            return (
              <a key={item.id} href={href(item.id)}>
                {/* conector (tick) */}
                <line
                  x1={x} y1={LINE_Y + 5}
                  x2={x} y2={tickY - 1}
                  stroke={dot}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                />
                {/* ponto */}
                <circle cx={x} cy={LINE_Y} r={4.5} fill={dot} />
                {/* rótulo diagonal: nasce do pivot, vai para baixo-direita */}
                <text
                  x={x}
                  y={tickY}
                  transform={`rotate(${ANGLE} ${x} ${tickY})`}
                  textAnchor="start"
                  dominantBaseline="hanging"
                  fontSize={FONT_SUB}
                  fill={txt}
                  fontFamily="'Geist Mono','GeistMono',ui-monospace,monospace"
                >
                  {item.name}
                </text>
              </a>
            );
          })}

          {/* ── Estações e Pátio — rótulo diagonal acima −48° ────────────── */}
          {stations.map(s => {
            const x          = cx(s.sort_order);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;
            const r          = isPatio ? 14 : isTerminal ? 12 : 8;
            const tickY      = LINE_Y - r - 10;   // fim do conector / pivot do texto
            const fontSize   = isPatio || isTerminal ? 12 : 11;
            const fontW      = isPatio || isTerminal ? '600' : '500';
            const connColor  = isPatio || isTerminal ? '#ea580c' : '#4b5a72';

            return (
              <a key={s.id} href={href(s.id)}>
                {/* conector (tick) */}
                <line
                  x1={x} y1={LINE_Y - r}
                  x2={x} y2={tickY + 2}
                  stroke={connColor}
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
                />

                {/* símbolo na linha */}
                {isPatio ? (
                  <>
                    <circle cx={x} cy={LINE_Y} r={r}     fill="none" stroke="#ea580c" strokeWidth="2.5" />
                    <circle cx={x} cy={LINE_Y} r={r - 5} fill="none" stroke="#ea580c" strokeWidth="1.5" />
                    <text
                      x={x} y={LINE_Y + 4}
                      textAnchor="middle"
                      fontSize="7" fontWeight="700"
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
                    <circle cx={x} cy={LINE_Y} r={r - 3.5} fill="#0c1018" fillOpacity="0.22" />
                  </>
                )}

                {/* rótulo diagonal: nasce do pivot, vai para cima-direita */}
                <text
                  x={x}
                  y={tickY}
                  transform={`rotate(-${ANGLE} ${x} ${tickY})`}
                  textAnchor="start"
                  dominantBaseline="auto"
                  fontSize={fontSize}
                  fontWeight={fontW}
                  fill={isPatio ? '#fb923c' : isTerminal ? '#fdba74' : '#f1f5f9'}
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
