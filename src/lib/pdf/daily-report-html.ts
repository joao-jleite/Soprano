/**
 * Gera o HTML do Resumo Diário para impressão via Puppeteer.
 *
 * Mesma estética de "folha técnica de engenharia" do PDF de atividade:
 * IBM Plex, azul Zitrón #1095D6, tinta #16181D, fio duplo no masthead,
 * marca d'água RASCUNHO, sem cantos arredondados/gradientes/emojis.
 */

export type PdfReportActivity = {
  id: string;
  description: string;
  started_at: string;
  location_name?: string;
  location_sort_order?: number;
  type_label?: string;
  participants?: { name: string; role?: string | null }[];
  evolucao?: string | null;
  notes?: string | null;
  pendencias?: string | null;
  photos?: { url: string; caption?: string | null }[];
};

export type PdfReportSignature = {
  signer_name: string;
  signed_at: string;
  svg_data?: string | null;
  verification_code: string;
  ip_address?: string | null;
};

export type BuildDailyReportHtmlOptions = {
  report: {
    id: string;
    report_date: string;
    notes?: string | null;
    status: string;
  };
  supervisorName?: string;
  clientName?: string;
  activities: PdfReportActivity[];
  signature?: PdfReportSignature | null;
  qrDataUrl?: string;
  verifyUrl?: string;
  generatedAt: string;
};

const TZ = 'America/Sao_Paulo'; // servidor Vercel roda em UTC
const DASH = '—';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: TZ,
    });
  } catch { return iso; }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: TZ,
    });
  } catch { return iso; }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  } catch { return ''; }
}

/** Escapa texto do usuário antes de interpolar no HTML renderizado pelo Puppeteer. */
function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Selo de status no estilo mono contornado. */
function statusSeal(status: string): { label: string; color: string } {
  if (status === 'assinado') return { label: 'Assinado', color: '#1f5d4c' };
  if (status === 'cancelado' || status === 'rejeitado') return { label: 'Cancelado', color: '#9a3412' };
  if (status === 'rascunho') return { label: 'Rascunho', color: '#1095D6' };
  return { label: 'Aguardando assinatura', color: '#92400e' };
}

/** Marca Soprano — rotor com S vazado, embutido como SVG inline (papel branco). */
const SOPRANO_MARK = `
  <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" style="height:38px;width:38px;display:block;">
    <circle cx="48" cy="48" r="34" fill="#1095D6"/>
    <path d="M 55.42 30.08 A 10.5 10.5 0 1 0 48 48 A 10.5 10.5 0 1 1 40.58 65.92" stroke="#FFFFFF" stroke-width="8.5" fill="none" stroke-linecap="round"/>
  </svg>`;

// Agrupa atividades por local (sort_order → name) e ordena
function groupByLocation(activities: PdfReportActivity[]) {
  const sorted = [...activities].sort((a, b) => {
    const sa = a.location_sort_order ?? 9999;
    const sb = b.location_sort_order ?? 9999;
    if (sa !== sb) return sa - sb;
    return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
  });

  const groups: { locName: string; items: PdfReportActivity[] }[] = [];
  let last = '';
  for (const act of sorted) {
    const loc = act.location_name ?? 'Sem local';
    if (loc !== last) { groups.push({ locName: loc, items: [] }); last = loc; }
    groups[groups.length - 1].items.push(act);
  }
  return groups;
}

export function buildDailyReportHtml(opts: BuildDailyReportHtmlOptions): string {
  const { report, supervisorName, clientName, activities, signature, qrDataUrl, verifyUrl, generatedAt } = opts;

  const assinado = report.status === 'assinado' && !!signature;
  const isRascunho = report.status === 'rascunho';
  const seal = statusSeal(report.status);
  const tituloData = fmtDate(report.report_date + 'T12:00:00');
  const emissao = fmt(generatedAt);

  /* ── Bloco de progresso (evolução/observações/pendências) por atividade ──── */
  const progresso = (label: string, value?: string | null) =>
    value
      ? `<div style="margin-top:6px;padding-left:8px;border-left:2px solid #c7cdd6;">
          <span style="font:600 7.5px/1 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#5b6470;">${label}</span>
          <div style="margin-top:2px;font-size:11.5px;line-height:1.45;color:#16181d;white-space:pre-wrap;">${escapeHtml(value)}</div>
        </div>`
      : '';

  /* ── Atividades agrupadas por local ──────────────────────────────────────── */
  const groups = groupByLocation(activities);
  let globalNum = 0;

  const activitiesHtml = groups
    .map((group) => {
      const locHeader = `
        <div style="display:flex;align-items:center;gap:10px;margin:18px 0 4px;">
          <span style="font:600 9px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#16181d;white-space:nowrap;">${escapeHtml(group.locName)}</span>
          <span style="flex:1;height:1px;background:#dfe3ea;"></span>
        </div>`;

      const items = group.items
        .map((a) => {
          globalNum++;
          const num = String(globalNum).padStart(2, '0');
          const teamStr = (a.participants ?? [])
            .map((p) => (p.role ? `${p.name} (${p.role})` : p.name))
            .join(', ');

          const fotos = (a.photos ?? []).slice(0, 4);
          const fotosHtml = fotos.length
            ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:9px;">
                ${fotos
                  .map((ph, i) => {
                    const fig = String(i + 1).padStart(2, '0');
                    return `<figure class="avoid-break" style="margin:0;">
                      <div style="border:1px solid #c7cdd6;padding:3px;background:#fff;">
                        <img src="${ph.url}" alt="${escapeHtml(ph.caption ?? '')}" style="display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#eef1f5;">
                      </div>
                      <figcaption style="display:flex;gap:6px;align-items:baseline;margin-top:5px;">
                        <span style="font:600 8px/1.2 'IBM Plex Mono',monospace;letter-spacing:.08em;color:var(--ac);white-space:nowrap;">FIG.${fig}</span>
                        <span style="font-size:9px;line-height:1.3;color:#5b6470;">${ph.caption ? escapeHtml(ph.caption) : DASH}</span>
                      </figcaption>
                    </figure>`;
                  })
                  .join('')}
              </div>`
            : '';

          return `
            <div class="avoid-break" style="padding:12px 0;border-bottom:1px solid #eef1f5;">
              <div style="display:flex;gap:12px;align-items:baseline;">
                <span style="font:700 11px/1.3 'IBM Plex Mono',monospace;color:var(--ac);white-space:nowrap;">${num}</span>
                <div style="flex:1;">
                  <div style="font-size:14px;font-weight:600;color:#16181d;line-height:1.3;">${escapeHtml(a.description)}</div>
                  <div style="margin-top:2px;font:500 9px/1.3 'IBM Plex Mono',monospace;letter-spacing:.06em;text-transform:uppercase;color:#9aa2ad;">
                    ${a.type_label ? escapeHtml(a.type_label) : DASH}${a.started_at ? ` · ${fmtTime(a.started_at)}` : ''}
                  </div>
                  ${teamStr ? `<div style="margin-top:5px;font-size:11.5px;color:#5b6470;"><span style="font:600 7.5px/1 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#9aa2ad;">Equipe</span> &nbsp;${escapeHtml(teamStr)}</div>` : ''}
                  ${progresso('Evolução', a.evolucao)}
                  ${progresso('Observações', a.notes)}
                  ${progresso('Pendências', a.pendencias)}
                  ${fotosHtml}
                </div>
              </div>
            </div>`;
        })
        .join('');

      return locHeader + items;
    })
    .join('');

  /* ── Assinatura ──────────────────────────────────────────────────────────── */
  const assinaturaHtml = assinado && signature
    ? `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:30px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          ${signature.svg_data ? `<div style="max-height:80px;overflow:hidden;margin-bottom:8px;"><img src="data:image/svg+xml;base64,${Buffer.from(signature.svg_data).toString('base64')}" alt="Assinatura" style="max-height:80px;width:auto;display:block;"></div>` : ''}
          <div style="font-size:22px;color:#16181d;border-bottom:1px solid #16181d;padding-bottom:6px;min-width:240px;">${escapeHtml(signature.signer_name)}</div>
          <div class="lbl" style="letter-spacing:.18em;margin-top:8px;">Nome / Assinatura do representante do cliente</div>
        </div>
        <div style="text-align:right;">
          <div style="font:600 10px/1 'IBM Plex Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:#1f5d4c;">Assinado digitalmente</div>
          <div style="font:400 11px/1.4 'IBM Plex Mono',monospace;color:#5b6470;margin-top:5px;">${fmt(signature.signed_at)}</div>
          ${signature.ip_address ? `<div style="font:400 10px/1.4 'IBM Plex Mono',monospace;color:#9aa2ad;margin-top:3px;">IP ${escapeHtml(signature.ip_address)}</div>` : ''}
        </div>
      </div>
      ${qrDataUrl || verifyUrl || signature.verification_code ? `
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid #dfe3ea;display:flex;gap:16px;align-items:flex-start;">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR de verificação" style="width:64px;height:64px;flex:none;border:1px solid #dfe3ea;">` : ''}
        <div>
          <div class="lbl" style="letter-spacing:.18em;">Verificação de autenticidade</div>
          ${verifyUrl ? `<div style="margin-top:6px;font:400 11px/1.5 'IBM Plex Mono',monospace;color:var(--ac);word-break:break-all;">${escapeHtml(verifyUrl)}</div>` : ''}
          <div style="margin-top:4px;font:400 11px/1.5 'IBM Plex Mono',monospace;color:#5b6470;">Código <strong style="color:var(--ac);letter-spacing:.06em;">${escapeHtml(signature.verification_code)}</strong></div>
        </div>
      </div>` : ''}`
    : `
      <p style="margin:0 0 18px;font-size:11.5px;line-height:1.6;color:#5b6470;max-width:78ch;">
        Ao assinar abaixo, o representante do cliente declara que todas as atividades listadas neste
        resumo diário foram realizadas conforme descrito, em conformidade com o contrato vigente entre
        as partes. Esta assinatura tem validade jurídica nos termos da Lei 14.063/2020.
      </p>
      <div style="display:grid;grid-template-columns:2fr 1.4fr 1fr;gap:28px;">
        <div style="padding-top:46px;"><div style="border-bottom:1px solid #16181d;"></div><div class="lbl" style="letter-spacing:.16em;margin-top:7px;">Assinatura do representante</div></div>
        <div style="padding-top:46px;"><div style="border-bottom:1px solid #16181d;"></div><div class="lbl" style="letter-spacing:.16em;margin-top:7px;">Nome legível / CPF</div></div>
        <div style="padding-top:46px;"><div style="border-bottom:1px solid #16181d;"></div><div class="lbl" style="letter-spacing:.16em;margin-top:7px;">Data e hora</div></div>
      </div>
      <p style="margin:16px 0 0;padding-top:10px;border-top:1px solid #dfe3ea;font:400 10px/1.5 'IBM Plex Mono',monospace;color:#9aa2ad;">
        ID do resumo: ${escapeHtml(report.id)} · Gerado em ${escapeHtml(emissao)}
      </p>`;

  /* ── CSS (load-bearing para a paginação A4) ──────────────────────────────── */
  const css = `
    body{margin:0;background:#fff;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
    :root{--ac:#1095D6;}
    .doc{box-sizing:border-box;max-width:210mm;margin:0 auto;padding:40px 16mm 76px;position:relative;z-index:1;
         font-family:'IBM Plex Sans',system-ui,sans-serif;color:#3a4048;font-size:14px;line-height:1.62;}
    .doc-frame{width:100%;border-collapse:collapse;} .doc-frame td{padding:0;}
    .running-hdr,.running-ftr,.hdr-space,.ftr-space{display:none;}
    h1,h2,h3{text-wrap:balance;} p,li{text-wrap:pretty;}
    .lbl{font:500 9px/1 'IBM Plex Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:#9aa2ad;}
    .sec{display:flex;align-items:center;gap:14px;margin:34px 0 14px;}
    .sec .t{font:600 11px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:var(--ac);white-space:nowrap;}
    .sec .r{flex:1;height:1px;background:#dfe3ea;}
    .sec .n{font:500 10px/1 'IBM Plex Mono',monospace;color:#9aa2ad;white-space:nowrap;}
    .rascunho{position:fixed;inset:0;z-index:0;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:hidden;}
    .rascunho b{font:700 134px 'IBM Plex Sans',sans-serif;color:rgba(16,149,214,.06);letter-spacing:.12em;transform:rotate(-28deg);white-space:nowrap;}
    .notes-box{border:1px solid #c7cdd6;border-left:3px solid var(--ac);padding:11px 14px;font-size:13px;line-height:1.55;color:#16181d;white-space:pre-wrap;}
    @page{size:A4;margin:0;}
    @media print{
      html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      html,body{margin:0;padding:0;}
      .doc{max-width:none;padding:0 16mm;}
      .hdr-space,.ftr-space{display:table-cell;height:16mm;}
      .running-hdr,.running-ftr{display:flex;justify-content:space-between;align-items:baseline;position:fixed;left:0;right:0;
          font:500 9px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#9aa2ad;}
      .running-hdr{top:0;padding:9mm 16mm 0;} .running-ftr{bottom:0;padding:0 16mm 9mm;}
      h1,h2,h3,h4{break-after:avoid;} figure,img,.avoid-break{break-inside:avoid;} p,li{orphans:3;widows:3;}
    }
  `;

  /* ── Documento ───────────────────────────────────────────────────────────── */
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<main class="doc">
  ${isRascunho ? `<div class="rascunho" aria-hidden="true"><b>RASCUNHO</b></div>` : ''}
  <div class="running-hdr"><span>Soprano · Resumo Diário — Zitrón Brasil</span><span>Linha 6 · São Paulo</span></div>
  <div class="running-ftr"><span style="text-transform:capitalize;">${escapeHtml(tituloData)}</span><span>${clientName ? escapeHtml(clientName) : 'Linha 6 · São Paulo'}</span></div>
  <table class="doc-frame" role="presentation">
  <thead><tr><td class="hdr-space"></td></tr></thead>
  <tbody><tr><td>

    <!-- MASTHEAD -->
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:28px;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${SOPRANO_MARK}
        <div style="display:flex;flex-direction:column;gap:3px;">
          <span style="font:700 17px/1 'IBM Plex Sans',sans-serif;letter-spacing:.24em;color:#16181d;">SOPRANO</span>
          <span style="font:500 8px/1 'IBM Plex Mono',monospace;letter-spacing:.3em;text-transform:uppercase;color:#5b6470;">Registro vivo de obra</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:9px;text-align:right;">
        <span style="font:600 10px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:${seal.color};border:1.5px solid ${seal.color};padding:6px 11px;">${escapeHtml(seal.label)}</span>
        <span style="font:500 8px/1.5 'IBM Plex Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:#5b6470;">Zitrón Brasil · Sistemas de ventilação</span>
      </div>
    </header>

    <!-- fio duplo do masthead -->
    <div style="height:3px;background:#16181d;margin-top:16px;"></div>
    <div style="height:1px;background:#16181d;margin-top:3px;"></div>

    <div style="height:22px;"></div>
    <h1 style="margin:0;font-size:30px;line-height:1.08;font-weight:600;letter-spacing:-.012em;color:#16181d;text-transform:capitalize;">${escapeHtml(tituloData)}</h1>

    <div style="height:22px;"></div>

    <!-- FAIXA DE REFERÊNCIA -->
    <div style="border:1px solid #c7cdd6;display:grid;grid-template-columns:1.3fr 1fr 1fr;">
      <div style="padding:11px 14px;border-right:1px solid #dfe3ea;"><div class="lbl">Projeto</div><div style="margin-top:6px;font-size:13px;color:#16181d;font-weight:500;">Zitrón Brasil · Linha 6 Laranja</div></div>
      <div style="padding:11px 14px;border-right:1px solid #dfe3ea;"><div class="lbl">Supervisor</div><div style="margin-top:6px;font-size:13px;color:#16181d;font-weight:500;">${supervisorName ? escapeHtml(supervisorName) : DASH}</div></div>
      <div style="padding:11px 14px;"><div class="lbl">Cliente</div><div style="margin-top:6px;font-size:13px;color:#16181d;font-weight:500;">${clientName ? escapeHtml(clientName) : DASH}</div></div>
      <div style="grid-column:1/-1;padding:9px 14px;border-top:1px solid #dfe3ea;display:flex;gap:18px;align-items:baseline;flex-wrap:wrap;">
        <span style="display:flex;gap:8px;align-items:baseline;"><span class="lbl">Documento Nº</span><span style="font:400 11px/1 'IBM Plex Mono',monospace;color:#5b6470;">${escapeHtml(report.id)}</span></span>
        <span style="display:flex;gap:8px;align-items:baseline;"><span class="lbl">Atividades</span><span style="font:400 11px/1 'IBM Plex Mono',monospace;color:#5b6470;">${activities.length}</span></span>
        <span style="display:flex;gap:8px;align-items:baseline;"><span class="lbl">Emissão</span><span style="font:400 11px/1 'IBM Plex Mono',monospace;color:#5b6470;">${escapeHtml(emissao)}</span></span>
      </div>
    </div>

    ${report.notes ? `
    <!-- OBSERVAÇÕES GERAIS -->
    <div class="sec"><span class="t">Observações gerais do dia</span><span class="r"></span></div>
    <div class="notes-box avoid-break">${escapeHtml(report.notes)}</div>` : ''}

    <!-- ATIVIDADES -->
    <div class="sec"><span class="t">Atividades realizadas</span><span class="r"></span><span class="n">${activities.length} ${activities.length === 1 ? 'registro' : 'registros'}</span></div>
    ${activities.length === 0
      ? `<p style="margin:0;font:400 12.5px/1.4 'IBM Plex Mono',monospace;color:#9aa2ad;">${DASH} Nenhuma atividade registrada neste resumo.</p>`
      : activitiesHtml}

    <!-- ASSINATURA -->
    <div class="sec" style="margin-top:38px;"><span class="t">Assinatura do cliente</span><span class="r"></span></div>
    <div class="avoid-break" style="border:1px solid #c7cdd6;padding:26px 24px 18px;">
      ${assinaturaHtml}
    </div>

    <!-- RODAPÉ DE FECHO -->
    <div style="margin-top:30px;padding-top:14px;border-top:1px solid #dfe3ea;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;">
      <span style="font:400 10px/1.5 'IBM Plex Mono',monospace;letter-spacing:.1em;color:#9aa2ad;">SOPRANO · ZITRÓN BRASIL — SISTEMAS DE VENTILAÇÃO · LINHA 6 — LARANJA</span>
      <span style="font:400 10px/1.5 'IBM Plex Mono',monospace;color:#9aa2ad;">Gerado em ${escapeHtml(emissao)}</span>
    </div>

  </td></tr></tbody>
  <tfoot><tr><td class="ftr-space"></td></tr></tfoot>
  </table>
</main>
</body>
</html>`;
}
