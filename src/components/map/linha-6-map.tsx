/**
 * Linha6Map — Vertical transit-style stop list
 * Inspired by: Citymapper · Google Maps transit · Linear
 *
 * Layout: vertical orange line on the left, stops listed downward.
 * Stations: large row, prominent dot, readable name.
 * VSE/SE:  compact row, small dot, muted label.
 * Zero angles — everything horizontal. Labels always readable.
 */

type Stop = { id: string; name: string; kind: string; sort_order: number };

// ── Tokens ────────────────────────────────────────────────────────────────────
const BG        = '#070d1b';
const BG_CARD   = '#080e1d';
const BORDER    = '#0e1e38';
const ORANGE    = '#f97316';
const ORANGE_D  = '#c2410c';
const WHITE     = '#ffffff';
const SLATE_200 = '#e2e8f0';
const SLATE_400 = '#94a3b8';
const SLATE_600 = '#475569';
const BLUE_400  = '#60a5fa';
const AMBER_400 = '#fbbf24';
const MONO      = "'Geist Mono','GeistMono',ui-monospace,monospace";
const SANS      = "'Geist Sans',ui-sans-serif,system-ui,-apple-system,sans-serif";

// ─────────────────────────────────────────────────────────────────────────────

export function Linha6Map({ stops, locale = 'pt' }: { stops: Stop[]; locale?: string }) {

  if (!stops || stops.length === 0) {
    return (
      <div style={{
        background: BG_CARD, borderRadius: '0.875rem',
        border: `1px solid ${BORDER}`, padding: '3rem', textAlign: 'center',
      }}>
        <p style={{ color: SLATE_600, fontSize: '0.875rem', margin: 0 }}>
          Nenhum local cadastrado para esta linha.
        </p>
      </div>
    );
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  const sorted   = [...stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const estacoes = sorted.filter(s => s.kind === 'estacao');
  const firstEst = estacoes[0];
  const lastEst  = estacoes[estacoes.length - 1];

  const href = (id: string) => `/${locale}/atividades?location=${id}`;

  return (
    <div style={{
      background: BG_CARD,
      borderRadius: '0.875rem',
      border: `1px solid ${BORDER}`,
      overflow: 'hidden',
      width: '100%',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1rem 1.25rem 0.875rem',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div>
          <div style={{
            fontFamily: SANS, fontSize: '0.8125rem', fontWeight: '600',
            color: SLATE_200, letterSpacing: '-0.01em', marginBottom: '2px',
          }}>
            Linha 6 — Laranja
          </div>
          <div style={{
            fontFamily: MONO, fontSize: '0.5625rem', textTransform: 'uppercase',
            letterSpacing: '0.18em', color: SLATE_600,
          }}>
            {estacoes.length} estações · {stops.length} locais
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          {[
            { color: ORANGE,    label: 'Estação' },
            { color: BLUE_400,  label: 'VSE'     },
            { color: AMBER_400, label: 'SE'      },
          ].map(({ color, label }) => (
            <span key={label} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontFamily: MONO, fontSize: '0.5rem',
              textTransform: 'uppercase', letterSpacing: '0.15em', color: SLATE_600,
            }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6,
                borderRadius: '50%', background: color, flexShrink: 0,
              }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stop list ───────────────────────────────────────────────────── */}
      <style>{`
        .l6-row { transition: background 120ms ease; text-decoration: none; display: flex; align-items: center; }
        .l6-row:hover { background: rgba(255,255,255,0.028); }
        .l6-scroll::-webkit-scrollbar { width: 3px; }
        .l6-scroll::-webkit-scrollbar-track { background: transparent; }
        .l6-scroll::-webkit-scrollbar-thumb { background: #1a2e4a; border-radius: 2px; }
      `}</style>

      <div
        className="l6-scroll"
        style={{
          maxHeight: '540px',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 0',
        }}
      >
        {/* Relative wrapper for the vertical line */}
        <div style={{ position: 'relative', padding: '0 20px 0 0' }}>

          {/* Vertical orange line */}
          <div style={{
            position: 'absolute',
            left:  '32px',
            top:   '0',
            bottom: '0',
            width: '3px',
            background: `linear-gradient(to bottom, ${ORANGE_D} 0%, ${ORANGE} 40%, ${ORANGE} 60%, ${ORANGE_D} 100%)`,
            borderRadius: '2px',
            boxShadow: `0 0 10px rgba(249,115,22,0.25)`,
          }} />

          {sorted.map((stop) => {
            const isStation  = stop.kind === 'estacao' || stop.kind === 'patio';
            const isPatio    = stop.kind === 'patio';
            const isVse      = stop.kind === 'vse';
            const isSe       = stop.kind === 'se';
            const isTerminal = stop.id === firstEst?.id || stop.id === lastEst?.id;
            const isSub      = isVse || isSe;

            const rowHeight  = isStation ? '56px' : '26px';
            const dotSize    = isPatio  ? 14
                             : isTerminal ? 13
                             : isStation  ? 11
                             : 6;

            const dotBg      = isPatio    ? BG_CARD
                             : isTerminal ? ORANGE
                             : isStation  ? WHITE
                             : isVse      ? BLUE_400
                             : AMBER_400;

            const dotBorder  = isPatio    ? `2.5px solid ${ORANGE}`
                             : isTerminal ? `2px solid ${ORANGE_D}`
                             : isStation  ? `2px solid ${ORANGE}`
                             : 'none';

            const labelColor = isPatio    ? ORANGE
                             : isTerminal ? WHITE
                             : isStation  ? SLATE_200
                             : isVse      ? BLUE_400
                             : AMBER_400;

            const fontSize   = isStation ? '0.875rem' : '0.6875rem';
            const fontWeight = isTerminal || isPatio ? '700' : isStation ? '500' : '400';
            const fontFamily = isStation ? SANS : MONO;
            const indent     = isSub ? '4px' : '0';

            return (
              <a
                key={stop.id}
                href={href(stop.id)}
                className="l6-row"
                style={{ minHeight: rowHeight }}
              >
                {/* Left: dot column */}
                <div style={{
                  width: '64px',
                  flexShrink: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  alignSelf: 'stretch',
                }}>
                  {/* Dot */}
                  <div style={{
                    width:  `${dotSize}px`,
                    height: `${dotSize}px`,
                    borderRadius: '50%',
                    background: dotBg,
                    border: dotBorder,
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                    // Patio inner ring via box-shadow
                    boxShadow: isPatio
                      ? `0 0 0 3px ${BG_CARD}, 0 0 0 5px ${ORANGE}`
                      : isTerminal
                      ? `0 0 8px rgba(249,115,22,0.5)`
                      : 'none',
                  }} />
                </div>

                {/* Right: text */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  paddingLeft: indent,
                  paddingRight: '16px',
                }}>
                  <span style={{
                    fontFamily,
                    fontSize,
                    fontWeight,
                    color: labelColor,
                    lineHeight: '1.3',
                    letterSpacing: isSub ? '0.02em' : '-0.01em',
                  }}>
                    {stop.name}
                  </span>

                  {/* Terminal badge */}
                  {isTerminal && (
                    <span style={{
                      fontFamily: MONO,
                      fontSize: '0.45rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: ORANGE,
                      border: `1px solid ${ORANGE}33`,
                      borderRadius: '3px',
                      padding: '1px 5px',
                      background: `${ORANGE}0f`,
                      flexShrink: 0,
                    }}>
                      Terminal
                    </span>
                  )}

                  {/* Patio badge */}
                  {isPatio && (
                    <span style={{
                      fontFamily: MONO,
                      fontSize: '0.45rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      color: ORANGE,
                      border: `1px solid ${ORANGE}33`,
                      borderRadius: '3px',
                      padding: '1px 5px',
                      background: `${ORANGE}0f`,
                      flexShrink: 0,
                    }}>
                      Pátio
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.625rem 1.25rem',
        borderTop: `1px solid ${BORDER}`,
        fontFamily: MONO,
        fontSize: '0.525rem',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: SLATE_600,
      }}>
        <span>↑ Brasilândia</span>
        <div style={{
          width: '32px', height: '3px',
          borderRadius: '2px',
          background: `linear-gradient(to right, ${ORANGE_D}, ${ORANGE}, ${ORANGE_D})`,
        }} />
        <span>São Joaquim ↓</span>
      </div>
    </div>
  );
}
