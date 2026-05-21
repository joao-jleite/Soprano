/**
 * Linha6Map — Diagrama esquemático Linha 6 Laranja
 *
 * Padrão visual Metro SP / CPTM:
 *  • Espaçamento uniforme por índice (ignora gaps de sort_order)
 *  • Estações: pivot fixo acima da linha, rótulo −45°
 *  • VSE / SE : 2 níveis de profundidade alternados [8 / 22 px]
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── Constantes de geometria ────────────────────────────────────────────────────
const DEG      = 45;
const RAD      = DEG * (Math.PI / 180);
const SIN      = Math.sin(RAD);   // ≈ 0.707
const COS      = Math.cos(RAD);   // ≈ 0.707

// Dois níveis de profundidade para VSE/SE (evita colisão entre labels adjacentes)
const DEPTHS   = [8, 22] as const;
const D_MAX    = DEPTHS[1];

// Distância fixa do centro da linha até o pivot dos labels de estação
const ST_PIVOT = 22;               // px acima da linha (independe do raio)

// Tamanhos de fonte
const FS_ST    = 10.5;             // estações
const FS_SUB   =  8.5;             // VSE / SE
const CW       = 0.60;             // largura média de char (× fontSize)

// ── Paleta ────────────────────────────────────────────────────────────────────
const BG       = '#0c1018';
const LINE_C   = 'url(#lg6)';

const ST_FILL  = '#fb923c';        // estação normal
const TM_FILL  = '#ea580c';        // terminal
const PA_FILL  = '#ea580c';        // pátio (borda)

const ST_LBL   = '#f1f5f9';        // label estação normal
const TM_LBL   = '#ffffff';        // label terminal
const PA_LBL   = '#fb923c';        // label pátio

const VSE_DOT  = '#3b82f6';        // ponto VSE
const VSE_TXT  = '#60a5fa';        // label VSE
const SE_DOT   = '#f59e0b';        // ponto SE
const SE_TXT   = '#fcd34d';        // label SE

const BORDER   = '#1e2535';
const DIVIDER  = '#1a2030';
const MUTED    = '#475569';
const FOOTER_C = '#334155';
const MONO     = "'Geist Mono','GeistMono',ui-monospace,monospace";
const SANS     = "'Geist Sans',ui-sans-serif,system-ui,sans-serif";

// ── Card styles ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: BG, borderRadius: '0.75rem',
  border: `1px solid ${BORDER}`, overflow: 'hidden', width: '100%',
};
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.875rem 1.25rem 0.5rem',
};
const monoXs: React.CSSProperties = {
  fontFamily: MONO, fontSize: '0.575rem',
  textTransform: 'uppercase', letterSpacing: '0.17em',
};
const footer: React.CSSProperties = {
  ...monoXs, color: FOOTER_C,
  display: 'flex', justifyContent: 'space-between',
  padding: '0.6rem 1.5rem', borderTop: `1px solid ${DIVIDER}`,
};

// ─────────────────────────────────────────────────────────────────────────────

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {

  // ── Vazio ──────────────────────────────────────────────────────────────────
  if (!stops || stops.length === 0) {
    return (
      <div style={{ ...card, padding: '2.5rem', textAlign: 'center' }}>
        <p style={{ color: MUTED, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Nenhum local cadastrado para esta linha.
        </p>
        <p style={{ color: FOOTER_C, fontSize: '0.7rem', fontFamily: MONO }}>
          Verifique se o seed da Linha 6 foi aplicado no banco de dados.
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
  const GAP = Math.max(38, Math.min(54, 1700 / Math.max(N - 1, 1)));
  const UW  = (N - 1) * GAP;

  const posMap = new Map<string, number>();
  sorted.forEach((s, i) => posMap.set(s.id, i * GAP));
  const px = (id: string) => posMap.get(id) ?? 0;

  // ── Profundidade alternada para VSE/SE ────────────────────────────────────
  let subN = 0;
  const depthMap = new Map<string, number>();
  sorted.forEach(s => {
    if (s.kind === 'vse' || s.kind === 'se') {
      depthMap.set(s.id, DEPTHS[subN % DEPTHS.length]);
      subN++;
    }
  });

  // ── Dimensões do SVG ──────────────────────────────────────────────────────
  const maxStLen  = stations.length  ? Math.max(...stations.map(s  => s.name.length)) : 8;
  const maxSubLen = subItems.length  ? Math.max(...subItems.map(s  => s.name.length)) : 8;

  // Espaço acima = comprimento máx do label de estação × sin(45°)
  const ABOVE = Math.ceil(maxStLen  * FS_ST  * CW * SIN) + ST_PIVOT + 24;
  // Espaço abaixo = label VSE × sin(45°) + tick mais fundo
  const BELOW = Math.ceil(maxSubLen * FS_SUB * CW * SIN) + D_MAX + 20;

  const LINE_Y = ABOVE;

  const MX_L  = 72;
  // margem direita absorve o overhang horizontal do último label de estação
  const MX_R  = 72 + Math.ceil(maxStLen * FS_ST * CW * COS);

  const W = MX_L + UW + MX_R;
  const H = LINE_Y + BELOW + 14;

  const X    = (id: string) => MX_L + px(id);
  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={card}>

      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div style={header}>
        <span style={{ ...monoXs, color: MUTED }}>
          Diagrama Esquemático · {stops.length} locais
        </span>
        <div style={{ display: 'flex', gap: '1.1rem' }}>
          <Chip color={ST_FILL}  label="Estação" />
          <Chip color={VSE_DOT}  label="VSE"     />
          <Chip color={SE_DOT}   label="SE"      />
        </div>
      </div>

      {/* ── SVG ────────────────────────────────────────────────────────── */}
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
              <stop offset="0%"   stopColor="#b45309" />
              <stop offset="35%"  stopColor="#ea580c" />
              <stop offset="65%"  stopColor="#fb923c" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>

          {/* ── Linha laranja ────────────────────────────────────────── */}
          <line
            x1={MX_L} y1={LINE_Y}
            x2={MX_L + UW} y2={LINE_Y}
            stroke={LINE_C}
            strokeWidth="7"
            strokeLinecap="round"
            filter="drop-shadow(0 0 9px rgba(251,146,60,0.38))"
          />

          {/* ── VSE / SE — abaixo, rótulo +45° ──────────────────────── */}
          {subItems.map(item => {
            const isVse = item.kind === 'vse';
            const dotC  = isVse ? VSE_DOT : SE_DOT;
            const txtC  = isVse ? VSE_TXT : SE_TXT;
            const x     = X(item.id);
            const d     = depthMap.get(item.id) ?? DEPTHS[0];
            const pivY  = LINE_Y + d;

            return (
              <a key={item.id} href={href(item.id)}>
                {/* tick */}
                <line
                  x1={x} y1={LINE_Y + 4}
                  x2={x} y2={pivY}
                  stroke={dotC}
                  strokeWidth="1"
                  strokeOpacity="0.35"
                />
                {/* ponto — pequeno para hierarquia visual */}
                <circle cx={x} cy={LINE_Y} r={2.5} fill={dotC} />
                {/* rótulo */}
                <text
                  x={x} y={pivY}
                  transform={`rotate(${DEG} ${x} ${pivY})`}
                  textAnchor="start"
                  dominantBaseline="hanging"
                  fontSize={FS_SUB}
                  fill={txtC}
                  fontFamily={MONO}
                >
                  {item.name}
                </text>
              </a>
            );
          })}

          {/* ── Estações / Pátio — acima, rótulo −45° ───────────────── */}
          {stations.map(s => {
            const x          = X(s.id);
            const isPatio    = s.kind === 'patio';
            const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;

            const r      = isPatio ? 12 : isTerminal ? 10 : 7;
            const pivY   = LINE_Y - ST_PIVOT;   // pivot FIXO para todos
            const fSize  = isPatio || isTerminal ? 11.5 : FS_ST;
            const fW     = isPatio || isTerminal ? '600' : '400';
            const lColor = isPatio ? PA_LBL : isTerminal ? TM_LBL : ST_LBL;

            return (
              <a key={s.id} href={href(s.id)}>
                {/* tick variável pelo raio */}
                <line
                  x1={x} y1={LINE_Y - r}
                  x2={x} y2={pivY}
                  stroke={isPatio || isTerminal ? TM_FILL : '#374151'}
                  strokeWidth="1"
                  strokeOpacity={isPatio || isTerminal ? 0.5 : 0.35}
                />

                {/* marcador na linha */}
                {isPatio ? (
                  <>
                    <circle cx={x} cy={LINE_Y} r={r}     fill="none" stroke={PA_FILL} strokeWidth="2.5" />
                    <circle cx={x} cy={LINE_Y} r={r - 5} fill="none" stroke={PA_FILL} strokeWidth="1.5" />
                    <text
                      x={x} y={LINE_Y + 4.5}
                      textAnchor="middle" fontSize="7" fontWeight="700"
                      fill={PA_FILL} fontFamily={SANS}
                    >M</text>
                  </>
                ) : (
                  <>
                    <circle
                      cx={x} cy={LINE_Y} r={r}
                      fill={isTerminal ? TM_FILL : ST_FILL}
                      filter={isTerminal
                        ? 'drop-shadow(0 0 6px rgba(234,88,12,0.6))'
                        : 'drop-shadow(0 0 3px rgba(251,146,60,0.3))'}
                    />
                    {/* anel branco interno — visual clássico metro */}
                    <circle cx={x} cy={LINE_Y} r={r - 3.5} fill="#ffffff" fillOpacity="0.12" />
                  </>
                )}

                {/* rótulo */}
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

      {/* ── Rodapé ─────────────────────────────────────────────────────── */}
      <div style={footer}>
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
      textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED,
    }}>
      <span style={{
        display: 'inline-block', width: 7, height: 7,
        borderRadius: '50%', background: color,
        boxShadow: `0 0 4px ${color}88`,
      }} />
      {label}
    </span>
  );
}
