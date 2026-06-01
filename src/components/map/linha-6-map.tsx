/**
 * Linha6Map — Diagrama horizontal da Linha 6-Laranja
 * Suporta modo claro e escuro via CSS variables + .dark class (Tailwind).
 * Itens clicáveis com área de toque expandida, hover com pill highlight + scale no dot.
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

const LINE_PEACH = '#f5b87a';   // linha principal — visível em ambos os modos
const ORANGE     = '#ee7203';   // dots das estações
const SANS = "'Geist Sans',ui-sans-serif,system-ui,-apple-system,sans-serif";
const MONO = "'Geist Mono','GeistMono',ui-monospace,monospace";

function interchange(name: string): { ring: string; sub: string } | null {
  const n = name.toLowerCase();
  if (n.includes('freguesia')) return { ring: '#a3238e', sub: '#e2231a' };
  if (n.includes('higien'))    return { ring: '#f5a800', sub: '#f5a800' };
  if (n.includes('joaquim'))   return { ring: '#0a3d91', sub: '#4c8ef7' };
  return null;
}

const PAD_L  = 130;
const GAP    = 88;
const PAD_R  = 260;
const LINE_Y = 230;
const HEIGHT = 470;
const ANGLE  = 40;

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {
  if (!stops || stops.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" style={{ fontFamily: SANS }}>
        Nenhum local cadastrado para esta linha.
      </p>
    );
  }

  const sorted   = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const stations = sorted.filter(s => s.kind === 'estacao' || s.kind === 'patio');
  const shafts   = sorted.filter(s => s.kind === 'vse' || s.kind === 'se');

  const firstEst = stations.find(s => s.kind === 'estacao');
  const lastEst  = [...stations].reverse().find(s => s.kind === 'estacao');

  const stationX = (i: number) => PAD_L + i * GAP;
  const lineX0   = stationX(0);
  const lineX1   = stationX(Math.max(0, stations.length - 1));
  const vbWidth  = lineX1 + PAD_R;

  const segIndexOf = (shaft: Stop) => {
    let idx = 0;
    for (let i = 0; i < stations.length; i++) {
      if ((stations[i].sort_order ?? 0) < (shaft.sort_order ?? 0)) idx = i;
      else break;
    }
    return idx;
  };
  const bySeg: Record<number, Stop[]> = {};
  shafts.forEach(s => { (bySeg[segIndexOf(s)] ||= []).push(s); });

  const shaftPos: { s: Stop; x: number }[] = [];
  Object.entries(bySeg).forEach(([k, arr]) => {
    const i  = Number(k);
    const x0 = stationX(i);
    const x1 = i + 1 < stations.length ? stationX(i + 1) : x0 + GAP;
    arr.forEach((s, j) => {
      shaftPos.push({ s, x: x0 + (x1 - x0) * ((j + 1) / (arr.length + 1)) });
    });
  });

  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={{ width: '100%' }}>
      {/* CSS variables por tema */}
      <style>{`
        :root {
          --l6-label:       #1e293b;
          --l6-label-hover: ${ORANGE};
          --l6-patio-label: #c2590a;
          --l6-vse:         #64748b;
          --l6-vse-hover:   #334155;
          --l6-dot-conn:    #cbd5e1;
          --l6-pill-bg:     rgba(238,114,3,0.10);
          --l6-pill-border: rgba(238,114,3,0.30);
          --l6-head:        #0f172a;
          --l6-sub:         #64748b;
        }
        .dark {
          --l6-label:       #e2e8f0;
          --l6-label-hover: #fbbf72;
          --l6-patio-label: #f6a04a;
          --l6-vse:         #7c8fa3;
          --l6-vse-hover:   #c8d3df;
          --l6-dot-conn:    #3d4f63;
          --l6-pill-bg:     rgba(238,114,3,0.15);
          --l6-pill-border: rgba(238,114,3,0.35);
          --l6-head:        #f1f5f9;
          --l6-sub:         #7c8fa3;
        }

        /* Nó clicável */
        .l6-node { cursor: pointer; }

        /* Dot — scale no hover via transform-box fill-box */
        .l6-node .l6-dot {
          transform-box: fill-box;
          transform-origin: center;
          transition: transform 140ms ease, filter 140ms ease;
        }
        .l6-node:hover .l6-dot { transform: scale(1.30); filter: brightness(1.15); }

        /* Label estação */
        .l6-node .l6-stn {
          fill: var(--l6-label);
          transition: fill 120ms ease;
        }
        .l6-node .l6-patio-stn {
          fill: var(--l6-patio-label);
          transition: fill 120ms ease;
        }
        .l6-node:hover .l6-stn,
        .l6-node:hover .l6-patio-stn { fill: var(--l6-label-hover); }

        /* Pill de destaque atrás do label */
        .l6-node .l6-pill {
          opacity: 0;
          transition: opacity 140ms ease;
        }
        .l6-node:hover .l6-pill { opacity: 1; }

        /* Label VSE/SE */
        .l6-node .l6-vse {
          fill: var(--l6-vse);
          transition: fill 120ms ease;
        }
        .l6-node:hover .l6-vse { fill: var(--l6-vse-hover); }

        /* Conector pontilhado */
        .l6-conn { stroke: var(--l6-dot-conn); }
      `}</style>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '0.85rem' }}>
        <h2 style={{
          fontFamily: SANS, fontSize: '1.05rem', fontWeight: 700,
          color: 'var(--l6-head)', letterSpacing: '-0.01em', margin: 0,
        }}>
          Linha 6 — Laranja
        </h2>
        <p style={{ fontFamily: SANS, fontSize: '0.7rem', color: 'var(--l6-sub)', margin: '0.15rem 0 0' }}>
          Brasilândia ↔ São Joaquim · {stations.filter(s => s.kind === 'estacao').length} estações · {stops.length} locais
        </p>
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${vbWidth} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', fontFamily: SANS, overflow: 'visible' }}
        aria-label="Mapa da Linha 6 Laranja"
      >
        {/* Linha pêssego */}
        <line
          x1={lineX0} y1={LINE_Y} x2={lineX1} y2={LINE_Y}
          stroke={LINE_PEACH} strokeWidth={10} strokeLinecap="round"
        />

        {/* ── VSE / SE (abaixo) ─────────────────────────────────────────── */}
        {shaftPos.map(({ s, x }) => (
          <a key={s.id} href={href(s.id)} className="l6-node" aria-label={s.name}>
            {/* Área de toque expandida */}
            <rect x={x - 20} y={LINE_Y - 10} width={40} height={120} fill="transparent" />

            <circle cx={x} cy={LINE_Y} r={3} className="l6-conn" fill="currentColor" />
            <line x1={x} y1={LINE_Y + 3} x2={x} y2={LINE_Y + 20}
              className="l6-conn" strokeWidth={1.2} strokeDasharray="2.5 3" stroke="currentColor" />

            {/* Pill hover atrás do label */}
            <g transform={`translate(${x}, ${LINE_Y + 24}) rotate(-${ANGLE})`}>
              <rect className="l6-pill"
                x={-108} y={-13} width={110} height={17} rx={4}
                fill="var(--l6-pill-bg)" stroke="var(--l6-pill-border)" strokeWidth={0.8}
              />
              <text
                className="l6-vse"
                textAnchor="end" fontSize={12} fontFamily={MONO}
              >
                {s.name}
              </text>
            </g>
          </a>
        ))}

        {/* ── Estações + Pátio (acima) ──────────────────────────────────── */}
        {stations.map((s, i) => {
          const x          = stationX(i);
          const isPatio    = s.kind === 'patio';
          const isTerminal = s.id === firstEst?.id || s.id === lastEst?.id;
          const ic         = interchange(s.name);
          const labelClass = isPatio ? 'l6-patio-stn' : 'l6-stn';

          return (
            <a key={s.id} href={href(s.id)} className="l6-node" aria-label={s.name}>
              {/* Área de toque expandida */}
              <rect x={x - 20} y={LINE_Y - 130} width={40} height={150} fill="transparent" />

              {/* Label + pill de hover */}
              <g transform={`translate(${x}, ${LINE_Y - 24}) rotate(-${ANGLE})`}>
                <rect className="l6-pill"
                  x={-4} y={-15} width={160} height={19} rx={4}
                  fill="var(--l6-pill-bg)" stroke="var(--l6-pill-border)" strokeWidth={0.8}
                />
                <text
                  className={labelClass}
                  textAnchor="start"
                  fontSize={15}
                  fontWeight={isPatio || isTerminal ? 700 : 600}
                >
                  {s.name}
                </text>
              </g>

              {/* Marcador na linha */}
              {isPatio ? (
                <>
                  <circle className="l6-dot" cx={x} cy={LINE_Y} r={11}
                    fill="transparent" stroke={ORANGE} strokeWidth={3.5} />
                  <circle cx={x} cy={LINE_Y} r={4} fill={ORANGE} />
                </>
              ) : ic ? (
                <>
                  <rect className="l6-dot"
                    x={x - 7} y={LINE_Y - 17} width={14} height={34} rx={7}
                    fill={ic.ring}
                  />
                  <rect
                    x={x - 5.5} y={LINE_Y + 22} width={11} height={11} rx={2}
                    fill={ic.sub}
                    transform={`rotate(45 ${x} ${LINE_Y + 27.5})`}
                  />
                </>
              ) : isTerminal ? (
                <>
                  <circle cx={x} cy={LINE_Y} r={11}
                    fill="transparent" stroke={ORANGE} strokeWidth={2.5} />
                  <circle className="l6-dot" cx={x} cy={LINE_Y} r={6.5} fill={ORANGE} />
                </>
              ) : (
                <circle className="l6-dot" cx={x} cy={LINE_Y} r={7.5} fill={ORANGE} />
              )}
            </a>
          );
        })}
      </svg>
    </div>
  );
}
