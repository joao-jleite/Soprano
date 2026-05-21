/**
 * Linha6Map — Diagrama esquemático Linha 6 Laranja
 *
 * Estilo Metro SP / CPTM oficial:
 *  • Estações  → círculo branco com borda laranja (sem glow, sem fill sólido)
 *  • Terminais → círculo branco, borda mais grossa
 *  • Pátio     → duplo anel
 *  • VSE / SE  → tick perpendicular colorido (sem dot sobre a linha)
 *  • Labels    → 45°, monospace para VSE, sans para estações
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── Geometria ─────────────────────────────────────────────────────────────────
const DEG  = 45;
const RAD  = DEG * (Math.PI / 180);
const SIN  = Math.sin(RAD);
const COS  = Math.cos(RAD);

// Profundidade do pivot (label VSE/SE): 2 níveis alternados
const DEPTHS  = [10, 24] as const;
const D_MAX   = DEPTHS[1];

// Pivot das estações: fixo acima da linha
const ST_PIV  = 20;   // px acima do centro da linha

// Tamanhos
const FS_ST   = 10.5;  // font estações
const FS_SUB  =  8;    // font VSE / SE
const CW      = 0.60;  // char-width ratio

// ── Paleta ────────────────────────────────────────────────────────────────────
const BG      = '#0c1018';
const ORANGE  = '#fb923c';
const ORANGE2 = '#ea580c';
const WHITE   = '#ffffff';
const MONO    = "'Geist Mono','GeistMono',ui-monospace,monospace";
const SANS    = "'Geist Sans',ui-sans-serif,system-ui,sans-serif";

// ── Styles ────────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: BG,
  borderRadius: '0.75rem',
  border: '1px solid #1e2535',
  overflow: 'hidden',
  width: '100%',
};
const hdr: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.875rem 1.25rem 0.5rem',
};
const monoXs: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: '0.575rem',
  textTransform: 'uppercase',
  letterSpacing: '0.17em',
};
const ftr: React.CSSProperties = {
  ...monoXs,
  color: '#334155',
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.6rem 1.5rem',
  borderTop: '1px solid #1a2030',
};

// ─────────────────────────────────────────────────────────────────────────────

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {

  if (!stops || stops.length === 0) {
    return (
      <div style={{ ...card, padding: '2.5rem', textAlign: 'center' }}>
        <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Nenhum local cadastrado para esta linha.
        </p>
        <p style={{ color: '#334155', fontSize: '0.7rem', fontFamily: MONO }}>
          Verifique se o seed foi aplicado.
        </p>
      </div>
    );
  }

  // ── Classificação ──────────────────────────────────────────────────────────
  const sorted   = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const estacoes = sorted.filter(s => s.kind === 'estacao');
  const stations = sorted.filter(s => s.kind === 'estacao' || s.kind === 'patio');
  const subItems = sorted.filter(s => s.kind === 'vse' || s.kind === 'se');

  const firstEst = estacoes[0];
  const lastEst  = estacoes[estacoes.length - 1];

  // ── Espaçamento uniforme por índice ───────────────────────────────────────
  const N   = sorted.length;
  const GAP = Math.max(36, Math.min(52, 1700 / Math.max(N - 1, 1)));
  const UW  = (N - 1) * GAP;

  const posMap = new Map<string, number>();
  sorted.forEach((s, i) => posMap.set(s.id, i * GAP));
  const px = (id: string) => posMap.get(id) ?? 0;

  // ── Profundidade alternada VSE/SE ─────────────────────────────────────────
  let subN = 0;
  const depthMap = new Map<string, number>();
  sorted.forEach(s => {
    if (s.kind === 'vse' || s.kind === 'se') {
      depthMap.set(s.id, DEPTHS[subN % DEPTHS.length]);
      subN++;
    }
  });

  // ── Dimensões ─────────────────────────────────────────────────────────────
  const maxStLen  = stations.length  ? Math.max(...stations.map(s  => s.name.length)) : 8;
  const maxSubLen = subItems.length  ? Math.max(...subItems.map(s  => s.name.length)) : 8;

  const ABOVE  = Math.ceil(maxStLen  * FS_ST  * CW * SIN) + ST_PIV + 22;
  const BELOW  = Math.ceil(maxSubLen * FS_SUB * CW * SIN) + D_MAX + 16;

  const LINE_Y = ABOVE;
  const MX_L   = 70;
  const MX_R   = 70 + Math.ceil(maxStLen * FS_ST * CW * COS);
  const W      = MX_L + UW + MX_R;
  const H      = LINE_Y + BELOW + 12;

  const X    = (id: string) => MX_L + px(id);
  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={card}>

      {/* Cabeçalho */}
      <div style={hdr}>
        <span style={{ ...monoXs, color: '#475569' }}>
          Diagrama Esquemático · {stops.length} locais
        </span>
        <div style={{ display: 'flex', gap: '1.1rem' }}>
          <Chip color={ORANGE}   label="Estação" />
          <Chip color="#3b82f6"  label="VSE"     />
          <Chip color="#f59e0b"  label="SE"      />
        </div>
      </div>

      {/* SVG */}
      <div style={{ overflowX: 'auto', padding: '0 6px 14px' }}>
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', minWidth: W }}
          aria-label="Diagrama esquemático Linha 6 Laranja"
        >
          <rect width={W} height={H} fill={BG} />

          <defs>
            <linearGradient id="lg6" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#92400e" />
              <stop offset="30%"  stopColor="#c2410c" />
              <stop offset="60%"  stopColor="#ea580c" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>

          {/* ── Linha laranja ──────────────────────────────────────────── */}
          <line
            x1={MX_L}       y1={LINE_Y}
            x2={MX_L + UW}  y2={LINE_Y}
            stroke="url(#lg6)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* ── VSE / SE: tick perpendicular + rótulo 45° abaixo ───────── */}
          {subItems.map(item => {
            const isVse  = item.kind === 'vse';
            const color  = isVse ? '#60a5fa' : '#fbbf24';
            const x      = X(item.id);
            const d      = depthMap.get(item.id) ?? DEPTHS[0];
            const pivY   = LINE_Y + d;

            return (
              <a key={item.id} href={href(item.id)}>
                {/* tick perpendicular à linha */}
                <line
                  x1={x} y1={LINE_Y + 3}
                  x2={x} y2={pivY}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
                />
                {/* cabeça do tick (pequeno traço horizontal) */}
                <line
                  x1={x - 3} y1={LINE_Y + 3}
                  x2={x + 3} y2={LINE_Y + 3}
                  stroke={color}
                  strokeWidth="1.5"
                  strokeOpacity="0.55"
                />
                {/* rótulo */}
                <text
                  x={x} y={pivY + 1}
                  transform={`rotate(${DEG} ${x} ${pivY + 1})`}
                  textAnchor="start"
                  dominantBaseline="hanging"
                  fontSize={FS_SUB}
                  fill={color}
                  fillOpacity="0.85"
                  fontFamily={MONO}
                >
                  {item.name}
                </text>
              </a>
            );
          })}

          {/* ── Estações / Pátio: marcador + rótulo −45° acima ────────── */}
          {stations.map(s => {
            const x          = X(s.id);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;

            // raios
            const r      = isPatio ? 11 : isTerminal ? 8 : 5;
            const pivY   = LINE_Y - ST_PIV;

            // visual do marcador
            const strokeC = isPatio ? ORANGE2 : isTerminal ? ORANGE2 : ORANGE;
            const strokeW = isPatio ? 2.5 : isTerminal ? 2.5 : 2;

            // label
            const fSize  = isPatio || isTerminal ? 11 : FS_ST;
            const fW     = isPatio || isTerminal ? '600' : '400';
            const lColor = isPatio  ? ORANGE
                         : isTerminal ? WHITE
                         : '#e2e8f0';

            return (
              <a key={s.id} href={href(s.id)}>
                {/* tick conector da linha ao pivot */}
                <line
                  x1={x} y1={LINE_Y - r}
                  x2={x} y2={pivY}
                  stroke={strokeC}
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />

                {/* marcador ───────────────────────────────────────────── */}
                {isPatio ? (
                  // Pátio: duplo anel vazio
                  <>
                    <circle cx={x} cy={LINE_Y} r={r}     fill={BG}  stroke={ORANGE2} strokeWidth="2.5" />
                    <circle cx={x} cy={LINE_Y} r={r - 5} fill={BG}  stroke={ORANGE2} strokeWidth="1.5" />
                    <text
                      x={x} y={LINE_Y + 4.5}
                      textAnchor="middle" fontSize="6.5" fontWeight="700"
                      fill={ORANGE2} fontFamily={SANS}
                    >M</text>
                  </>
                ) : (
                  // Estação: círculo branco com borda laranja — estilo metro oficial
                  <circle
                    cx={x} cy={LINE_Y} r={r}
                    fill={WHITE}
                    stroke={strokeC}
                    strokeWidth={strokeW}
                  />
                )}

                {/* rótulo inclinado −45° */}
                <text
                  x={x} y={pivY}
                  transform={`rotate(-${DEG} ${x} ${pivY})`}
                  textAnchor="start"
                  dominantBaseline="auto"
                  fontSize={fSize}
                  fontWeight={fW}
                  fill={lColor}
                  fontFamily={SANS}
                >
                  {s.name}
                </text>
              </a>
            );
          })}
        </svg>
      </div>

      {/* Rodapé */}
      <div style={ftr}>
        <span>Brasilândia</span>
        <span>Linha 6 · Laranja · {estacoes.length} estações</span>
        <span>São Joaquim</span>
      </div>
    </div>
  );
}

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      fontFamily: MONO, fontSize: '0.575rem',
      textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b',
    }}>
      <span style={{
        display: 'inline-block', width: 7, height: 7,
        borderRadius: '50%', background: color,
      }} />
      {label}
    </span>
  );
}
