/**
 * Linha6Map — Premium Metro Schematic
 * Inspired by: Linear · Apple · Tokyo Metro · Vercel
 *
 * Architecture:
 *  - Stations:  evenly spaced, labels HORIZONTAL alternating 2 heights above the line
 *  - VSE / SE:  positioned proportionally between stations, vertical labels below
 *  - Zero 45° angles — everything horizontal or vertical
 *  - Mathematical grid alignment throughout
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:        '#060b17',          // near-black navy
  bgCard:    '#070d1b',
  border:    '#0f1f3a',
  line:      '#f97316',          // orange-500 — clean, single color
  lineGlow:  'rgba(249,115,22,0.18)',

  stFill:    '#ffffff',          // station dot fill
  stStroke:  '#f97316',          // station dot border
  tmStroke:  '#ea580c',          // terminal dot border (darker)
  tmFill:    '#ea580c',          // terminal filled

  stLabel:   '#cbd5e1',          // station name — slate-300
  tmLabel:   '#ffffff',          // terminal name — white
  ptLabel:   '#f97316',          // pátio label — orange
  tick:      '#1e3a5f',          // connector tick — barely visible

  vseDot:    '#3b82f6',          // blue-500
  vseTxt:    '#7ca9f5',          // blue label — lighter
  seDot:     '#f59e0b',          // amber-400
  seTxt:     '#e8a93a',          // amber label

  muted:     '#334155',          // footer / legend text
  mutedMid:  '#4b6a8a',          // secondary label text
  mono:      "'Geist Mono','GeistMono',ui-monospace,monospace",
  sans:      "'Geist Sans',ui-sans-serif,system-ui,-apple-system,sans-serif",
} as const;

// ── Layout constants ──────────────────────────────────────────────────────────
const LINE_Y   = 100;             // y of the main line
const LEVEL_A  = LINE_Y - 62;    // station label — high row  (even index)
const LEVEL_B  = LINE_Y - 34;    // station label — low row   (odd index)
const VSE_Y0   = LINE_Y + 14;    // start of vertical VSE/SE labels
const FS_ST    = 10;             // station font size
const FS_TERM  = 11;             // terminal font size
const FS_SUB   = 7.5;            // VSE/SE font size

// ── Card styles ───────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background:   T.bgCard,
  borderRadius: '0.875rem',
  border:       `1px solid ${T.border}`,
  overflow:     'hidden',
  width:        '100%',
};
const headerStyle: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  padding:        '1rem 1.5rem 0.625rem',
  borderBottom:   `1px solid ${T.border}`,
};
const footerStyle: React.CSSProperties = {
  display:        'flex',
  justifyContent: 'space-between',
  padding:        '0.625rem 1.5rem',
  borderTop:      `1px solid ${T.border}`,
  fontFamily:     T.mono,
  fontSize:       '0.55rem',
  textTransform:  'uppercase',
  letterSpacing:  '0.2em',
  color:          T.muted,
};

// ─────────────────────────────────────────────────────────────────────────────

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {

  if (!stops || stops.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: T.mutedMid, fontSize: '0.875rem', margin: 0 }}>
          Nenhum local cadastrado para esta linha.
        </p>
      </div>
    );
  }

  // ── 1. Classify ────────────────────────────────────────────────────────────
  const sorted     = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const stItems    = sorted.filter(s => s.kind === 'estacao' || s.kind === 'patio');
  const subItems   = sorted.filter(s => s.kind === 'vse' || s.kind === 'se');
  const estacoes   = sorted.filter(s => s.kind === 'estacao');
  const firstEst   = estacoes[0];
  const lastEst    = estacoes[estacoes.length - 1];

  // ── 2. Station positions (even spacing) ────────────────────────────────────
  const N_ST    = stItems.length;
  const ST_GAP  = Math.max(96, Math.min(140, 1600 / Math.max(N_ST - 1, 1)));
  const posMap  = new Map<string, number>();

  stItems.forEach((s, i) => posMap.set(s.id, i * ST_GAP));

  // ── 3. VSE/SE: proportional between adjacent stations ─────────────────────
  subItems.forEach(s => {
    const prev = stItems.filter(st => st.sort_order < s.sort_order).at(-1);
    const next = stItems.find(st => st.sort_order > s.sort_order);
    const x0   = prev ? (posMap.get(prev.id) ?? 0) : -(ST_GAP / 2);
    const x1   = next ? (posMap.get(next.id) ?? x0 + ST_GAP) : x0 + ST_GAP;
    const sMin = prev?.sort_order ?? (s.sort_order - 10);
    const sMax = next?.sort_order ?? (s.sort_order + 10);
    const t    = sMax > sMin ? (s.sort_order - sMin) / (sMax - sMin) : 0.5;
    posMap.set(s.id, x0 + t * (x1 - x0));
  });

  // ── 4. Station label alternating level ────────────────────────────────────
  const stLevel = new Map<string, number>();
  stItems.forEach((s, i) => stLevel.set(s.id, i % 2 === 0 ? LEVEL_A : LEVEL_B));

  // ── 5. SVG dimensions ─────────────────────────────────────────────────────
  const allX    = [...posMap.values()];
  const minX    = Math.min(...allX);
  const maxX    = Math.max(...allX);

  const maxSubN = subItems.length ? Math.max(...subItems.map(s => s.name.length)) : 16;
  const BELOW   = Math.ceil(maxSubN * FS_SUB * 0.62) + 16; // vertical text height

  const maxStN  = stItems.length  ? Math.max(...stItems.map(s  => s.name.length)) : 12;
  const LABEL_HALF = Math.ceil(maxStN * FS_TERM * 0.58 / 2); // half label width

  const MX_L   = LABEL_HALF + 16;
  const MX_R   = LABEL_HALF + 32;
  const UW     = maxX - minX;
  const W      = MX_L + UW + MX_R;
  const H      = LINE_Y + BELOW + 16;

  const X    = (id: string) => MX_L + (posMap.get(id) ?? 0) - minX;
  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={cardStyle}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{
            fontFamily: T.sans, fontSize: '0.7rem', fontWeight: '600',
            color: '#e2e8f0', letterSpacing: '0.04em',
          }}>
            Linha 6 — Laranja
          </span>
          <span style={{
            fontFamily: T.mono, fontSize: '0.52rem', textTransform: 'uppercase',
            letterSpacing: '0.18em', color: T.muted,
          }}>
            Diagrama Esquemático · {stops.length} locais
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Legend color={T.stStroke}  label="Estação" mono={T.mono} />
          <Legend color={T.vseDot}    label="VSE"     mono={T.mono} />
          <Legend color={T.seDot}     label="SE"      mono={T.mono} />
        </div>
      </div>

      {/* ── SVG ─────────────────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto', padding: '0 4px 4px' }}>
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: W }}
          aria-label="Diagrama esquemático Linha 6 Laranja"
        >
          {/* background */}
          <rect width={W} height={H} fill={T.bg} />

          {/* ── Very subtle horizontal grid lines ─────────────────────── */}
          {[LEVEL_A, LEVEL_B].map(y => (
            <line key={y}
              x1={0} y1={y} x2={W} y2={y}
              stroke={T.border} strokeWidth="0.5" strokeOpacity="0.5"
              strokeDasharray="2 6"
            />
          ))}

          {/* ── Main line ─────────────────────────────────────────────── */}
          {/* glow layer */}
          <line
            x1={X(stItems[0]?.id ?? '')} y1={LINE_Y}
            x2={X(stItems[N_ST - 1]?.id ?? '')} y2={LINE_Y}
            stroke={T.lineGlow}
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* solid line */}
          <line
            x1={X(stItems[0]?.id ?? '')} y1={LINE_Y}
            x2={X(stItems[N_ST - 1]?.id ?? '')} y2={LINE_Y}
            stroke={T.line}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* ── VSE / SE — tick + vertical label below ────────────────── */}
          {subItems.map(item => {
            const isVse  = item.kind === 'vse';
            const dotC   = isVse ? T.vseDot : T.seDot;
            const txtC   = isVse ? T.vseTxt : T.seTxt;
            const x      = X(item.id);

            return (
              <a key={item.id} href={href(item.id)}>
                {/* micro tick on line */}
                <line
                  x1={x} y1={LINE_Y + 2}
                  x2={x} y2={VSE_Y0 - 2}
                  stroke={dotC}
                  strokeWidth="1"
                  strokeOpacity="0.5"
                />
                {/* vertical label: rotate 90° so text goes downward */}
                <text
                  x={x}
                  y={VSE_Y0}
                  transform={`rotate(90 ${x} ${VSE_Y0})`}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={FS_SUB}
                  fill={txtC}
                  fillOpacity="0.8"
                  fontFamily={T.mono}
                >
                  {item.name}
                </text>
              </a>
            );
          })}

          {/* ── Stations — dot + horizontal label above ───────────────── */}
          {stItems.map(s => {
            const x          = X(s.id);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;
            const levelY     = stLevel.get(s.id) ?? LEVEL_A;

            // dot sizing
            const r        = isPatio ? 10 : isTerminal ? 8 : 5.5;
            const fillC    = isPatio  ? T.bg
                           : isTerminal ? T.tmFill
                           : T.stFill;
            const strokeC  = isPatio  ? T.tmStroke
                           : isTerminal ? T.tmStroke
                           : T.stStroke;
            const strokeW  = isPatio || isTerminal ? 2.5 : 1.5;

            // label
            const fSize    = isTerminal ? FS_TERM : FS_ST;
            const fWeight  = isPatio || isTerminal ? '600' : '400';
            const lColor   = isPatio  ? T.ptLabel
                           : isTerminal ? T.tmLabel
                           : T.stLabel;

            return (
              <a key={s.id} href={href(s.id)}>

                {/* connector tick: dot top → label level */}
                <line
                  x1={x} y1={LINE_Y - r - 1}
                  x2={x} y2={levelY + 2}
                  stroke={T.tick}
                  strokeWidth="0.75"
                />

                {/* horizontal guide at label level */}
                <line
                  x1={x - 4} y1={levelY}
                  x2={x + 4} y2={levelY}
                  stroke={strokeC}
                  strokeWidth="1"
                  strokeOpacity="0.6"
                />

                {/* station dot */}
                {isPatio ? (
                  <>
                    <circle cx={x} cy={LINE_Y} r={r}     fill={T.bg}  stroke={strokeC} strokeWidth="2.5" />
                    <circle cx={x} cy={LINE_Y} r={r - 5} fill={strokeC} />
                  </>
                ) : (
                  <circle cx={x} cy={LINE_Y} r={r} fill={fillC} stroke={strokeC} strokeWidth={strokeW} />
                )}

                {/* station label — horizontal, centered on dot */}
                <text
                  x={x}
                  y={levelY - 4}
                  textAnchor="middle"
                  dominantBaseline="auto"
                  fontSize={fSize}
                  fontWeight={fWeight}
                  fill={lColor}
                  fontFamily={T.sans}
                >
                  {s.name}
                </text>

              </a>
            );
          })}

          {/* ── Terminal end caps ─────────────────────────────────────── */}
          {[stItems[0], stItems[N_ST - 1]].filter(Boolean).map(s => {
            const x = X(s.id);
            return (
              <circle key={`cap-${s.id}`}
                cx={x} cy={LINE_Y} r={3}
                fill={T.line}
              />
            );
          })}

        </svg>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={footerStyle}>
        <span>Brasilândia</span>
        <span>Linha 6 · Laranja · {estacoes.length} estações</span>
        <span>São Joaquim</span>
      </div>
    </div>
  );
}

// ── Legend chip ───────────────────────────────────────────────────────────────
function Legend({ color, label, mono }: { color: string; label: string; mono: string }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontFamily: mono, fontSize: '0.52rem',
      textTransform: 'uppercase', letterSpacing: '0.16em',
      color: '#475569',
    }}>
      <span style={{
        display: 'inline-block', width: 6, height: 6,
        borderRadius: '50%', background: color,
      }} />
      {label}
    </span>
  );
}
