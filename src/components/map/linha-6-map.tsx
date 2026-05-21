/**
 * Linha6Map — Diagrama esquemático Linha 6 Laranja
 *
 * Padrão visual Metro SP / CPTM:
 *  • Espaçamento UNIFORME por índice (ignora gaps de sort_order)
 *  • Estações: rótulo −48° acima, nasce do ponto, sobe à direita
 *  • VSE / SE:  rótulo +48° abaixo, 3 níveis de profundidade alternados
 *               para que labels adjacentes não colidam
 *
 * Inline-styles: renderização independente de purge/tailwind.
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── Geometria central ─────────────────────────────────────────────────────────
const ANGLE_DEG  = 48;
const ANGLE_RAD  = ANGLE_DEG * (Math.PI / 180);
const SIN_A      = Math.sin(ANGLE_RAD);
const COS_A      = Math.cos(ANGLE_RAD);

// Profundidade dos ticks VSE/SE (alterna 3 níveis → evita sobreposição)
const SUB_DEPTHS = [12, 36, 60] as const;
const MAX_DEPTH  = SUB_DEPTHS[2];

// Fontes
const FONT_ST   = 11;  // estações
const FONT_SUB  =  9;  // VSE / SE
const CHAR_W    = 0.62; // largura média por caractere (fração do fontSize)

// ── Cores ─────────────────────────────────────────────────────────────────────
const C = {
  bg:        '#0c1018',
  line1:     '#c2410c',
  line2:     '#fb923c',
  station:   '#fb923c',
  terminal:  '#ea580c',
  patio:     '#ea580c',
  subSt:     '#f1f5f9',
  termSt:    '#fdba74',
  patioBdr:  '#ea580c',
  vseDot:    '#3b82f6',
  vseTxt:    '#93c5fd',
  seDot:     '#fbbf24',
  seTxt:     '#fcd34d',
  tick:      '#4b5a72',
  tickTerm:  '#ea580c',
  border:    '#1e2535',
  hdivider:  '#1a2030',
  label:     '#475569',
  legend:    '#64748b',
  footer:    '#2d3f56',
} as const;

// ── Estilos do card ───────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: C.bg,
  borderRadius: '0.75rem',
  border: `1px solid ${C.border}`,
  overflow: 'hidden',
  width: '100%',
};
const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.875rem 1.25rem 0.5rem',
};
const monoSm: React.CSSProperties = {
  fontFamily: "'Geist Mono','GeistMono',ui-monospace,monospace",
  fontSize: '0.6rem',
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
};
const footerStyle: React.CSSProperties = {
  ...monoSm,
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.625rem 1.5rem',
  borderTop: `1px solid ${C.hdivider}`,
  color: C.footer,
};

// ─────────────────────────────────────────────────────────────────────────────

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {
  if (!stops || stops.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: '2.5rem', textAlign: 'center' }}>
        <p style={{ color: C.label, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Nenhum local cadastrado para esta linha.
        </p>
        <p style={{ color: C.footer, fontSize: '0.7rem', fontFamily: 'monospace' }}>
          Verifique se o seed da Linha 6 foi aplicado no banco de dados.
        </p>
      </div>
    );
  }

  // ── Classificação ──────────────────────────────────────────────────────────
  const sorted   = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const stations = sorted.filter(s => s.kind === 'estacao' || s.kind === 'patio');
  const estacoes = sorted.filter(s => s.kind === 'estacao');
  const subItems = sorted.filter(s => s.kind === 'vse' || s.kind === 'se');

  const firstEst = estacoes[0];
  const lastEst  = estacoes[estacoes.length - 1];

  // ── Posicionamento uniforme por índice ─────────────────────────────────────
  const N   = sorted.length;
  const GAP = Math.max(40, Math.min(56, 1800 / Math.max(N - 1, 1))); // px entre items
  const UW  = (N - 1) * GAP;                                          // largura útil

  const posX = new Map<string, number>();
  sorted.forEach((s, i) => posX.set(s.id, i * GAP));
  const cx = (id: string) => (posX.get(id) ?? 0);

  // ── Profundidade escalonada para VSE/SE ────────────────────────────────────
  let subIdx = 0;
  const depth = new Map<string, number>();
  sorted.forEach(s => {
    if (s.kind === 'vse' || s.kind === 'se') {
      depth.set(s.id, SUB_DEPTHS[subIdx % SUB_DEPTHS.length]);
      subIdx++;
    }
  });

  // ── Alturas dinâmicas ──────────────────────────────────────────────────────
  const maxStLen  = stations.length  ? Math.max(...stations.map(s  => s.name.length)) : 8;
  const maxSubLen = subItems.length  ? Math.max(...subItems.map(s  => s.name.length)) : 8;

  // Espaço acima: comprimento máx do label de estação × sin(48°) + gap
  const ABOVE = Math.ceil(maxStLen  * FONT_ST  * CHAR_W * SIN_A) + 60;
  // Espaço abaixo: comprimento máx do label VSE × sin(48°) + profundidade máx do tick
  const BELOW = Math.ceil(maxSubLen * FONT_SUB * CHAR_W * SIN_A) + MAX_DEPTH + 24;

  const LINE_Y = ABOVE;

  // Margem esquerda: suficiente para o pátio / primeiro item
  const MX_L  = 70;
  // Margem direita: acomoda o overhang horizontal dos labels do último item
  const MX_R  = 70 + Math.ceil(maxStLen * FONT_ST * CHAR_W * COS_A);

  const W = MX_L + UW + MX_R;
  const H = LINE_Y + BELOW + 16;

  const X    = (id: string) => MX_L + cx(id);
  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={cardStyle}>

      {/* Cabeçalho */}
      <div style={headerStyle}>
        <span style={{ ...monoSm, color: C.label }}>
          Diagrama Esquemático · {stops.length} locais
        </span>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <LegendDot color={C.station}  label="Estação" />
          <LegendDot color={C.vseDot}   label="VSE"     />
          <LegendDot color={C.seDot}    label="SE"      />
        </div>
      </div>

      {/* SVG */}
      <div style={{ overflowX: 'auto', padding: '0 6px 16px' }}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: W }}
          aria-label="Diagrama esquemático da Linha 6 — Laranja"
        >
          <rect width={W} height={H} fill={C.bg} />

          <defs>
            <linearGradient id="lg6" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={C.line1} />
              <stop offset="40%"  stopColor="#ea580c"  />
              <stop offset="70%"  stopColor={C.line2}  />
              <stop offset="100%" stopColor={C.line1} />
            </linearGradient>
          </defs>

          {/* ── Linha laranja ─────────────────────────────────────────────── */}
          <line
            x1={MX_L}        y1={LINE_Y}
            x2={MX_L + UW}   y2={LINE_Y}
            stroke="url(#lg6)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="drop-shadow(0 0 10px rgba(249,115,22,0.4))"
          />

          {/* ── VSE / SE — abaixo da linha, rótulo +48° ───────────────────── */}
          {subItems.map(item => {
            const isVse   = item.kind === 'vse';
            const dotC    = isVse ? C.vseDot : C.seDot;
            const txtC    = isVse ? C.vseTxt : C.seTxt;
            const x       = X(item.id);
            const tickLen = depth.get(item.id) ?? SUB_DEPTHS[0];
            const pivY    = LINE_Y + tickLen;   // pivot do rótulo

            return (
              <a key={item.id} href={href(item.id)} style={{ cursor: 'pointer' }}>
                {/* tick conector */}
                <line
                  x1={x} y1={LINE_Y + 5}
                  x2={x} y2={pivY - 1}
                  stroke={dotC}
                  strokeWidth="1.5"
                  strokeOpacity="0.45"
                />
                {/* ponto na linha */}
                <circle cx={x} cy={LINE_Y} r={4} fill={dotC} />
                {/* rótulo diagonal — pivot no início do texto */}
                <text
                  x={x} y={pivY}
                  transform={`rotate(${ANGLE_DEG} ${x} ${pivY})`}
                  textAnchor="start"
                  dominantBaseline="hanging"
                  fontSize={FONT_SUB}
                  fill={txtC}
                  fontFamily="'Geist Mono','GeistMono',ui-monospace,monospace"
                >
                  {item.name}
                </text>
              </a>
            );
          })}

          {/* ── Estações / Pátio — acima da linha, rótulo −48° ───────────── */}
          {stations.map(s => {
            const x          = X(s.id);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;

            const r        = isPatio ? 13 : isTerminal ? 11 : 7;
            const pivY     = LINE_Y - r - 10;   // pivot do rótulo
            const fontSize = isPatio || isTerminal ? 12 : FONT_ST;
            const fontW    = isPatio || isTerminal ? '600' : '500';
            const tickC    = isPatio || isTerminal ? C.tickTerm : C.tick;
            const labelC   = isPatio  ? C.patioBdr
                           : isTerminal ? C.termSt
                           : C.subSt;

            return (
              <a key={s.id} href={href(s.id)} style={{ cursor: 'pointer' }}>
                {/* tick conector */}
                <line
                  x1={x} y1={LINE_Y - r}
                  x2={x} y2={pivY + 2}
                  stroke={tickC}
                  strokeWidth="1.5"
                  strokeOpacity="0.5"
                />

                {/* símbolo na linha */}
                {isPatio ? (
                  <>
                    <circle cx={x} cy={LINE_Y} r={r}      fill="none" stroke={C.patioBdr} strokeWidth="2.5" />
                    <circle cx={x} cy={LINE_Y} r={r - 5}  fill="none" stroke={C.patioBdr} strokeWidth="1.5" />
                    <text
                      x={x} y={LINE_Y + 4}
                      textAnchor="middle"
                      fontSize="7" fontWeight="700"
                      fill={C.patioBdr}
                      fontFamily="'Geist Sans',ui-sans-serif,sans-serif"
                    >M</text>
                  </>
                ) : (
                  <>
                    <circle
                      cx={x} cy={LINE_Y} r={r}
                      fill={isTerminal ? C.terminal : C.station}
                      filter={isTerminal
                        ? 'drop-shadow(0 0 7px rgba(234,88,12,0.65))'
                        : 'drop-shadow(0 0 3px rgba(251,146,60,0.35))'}
                    />
                    {/* anel interior — visual de "buraco" clássico dos mapas metro */}
                    <circle cx={x} cy={LINE_Y} r={r - 3.5} fill={C.bg} fillOpacity="0.3" />
                  </>
                )}

                {/* rótulo diagonal — pivot no início do texto */}
                <text
                  x={x} y={pivY}
                  transform={`rotate(-${ANGLE_DEG} ${x} ${pivY})`}
                  textAnchor="start"
                  dominantBaseline="auto"
                  fontSize={fontSize}
                  fontWeight={fontW}
                  fill={labelC}
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

// ── LegendDot ─────────────────────────────────────────────────────────────────
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontFamily: "'Geist Mono','GeistMono',ui-monospace,monospace",
      fontSize: '0.6rem', textTransform: 'uppercase',
      letterSpacing: '0.1em', color: '#64748b',
    }}>
      <span style={{
        display: 'inline-block', width: 8, height: 8,
        borderRadius: '50%', background: color,
      }} />
      {label}
    </span>
  );
}
