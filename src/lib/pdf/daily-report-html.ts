/** Gera o HTML completo do Resumo Diário para impressão via Puppeteer */

export type PdfReportActivity = {
  id: string;
  description: string;
  started_at: string;
  location_name?: string;
  location_sort_order?: number;
  type_label?: string;
  participants?: { name: string; role?: string | null }[];
  notes?: string | null;
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

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

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

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #0f172a;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }

    .header {
      background: #0959C8;
      color: #fff;
      padding: 18pt 28pt 16pt;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand { font-size: 22pt; font-weight: 800; letter-spacing: 2px; line-height: 1; }
    .brand-sub { font-size: 7pt; opacity: 0.7; margin-top: 4px; letter-spacing: 1.5px; text-transform: uppercase; }
    .doc-meta { text-align: right; font-size: 7pt; opacity: 0.75; line-height: 1.7; }

    .body { padding: 22pt 28pt 80pt; }

    .report-date {
      font-size: 9pt;
      color: #64748b;
      text-transform: capitalize;
      margin-bottom: 4pt;
    }
    .report-title {
      font-size: 20pt;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 18pt;
    }

    .section-title {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #94a3b8;
      margin: 18pt 0 8pt;
      padding-bottom: 4pt;
      border-bottom: 0.5pt solid #e2e8f0;
    }

    /* Meta cards */
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6pt; margin-bottom: 6pt; }
    .meta-card {
      background: #f8fafc;
      border: 0.5pt solid #e2e8f0;
      border-radius: 4pt;
      padding: 8pt 10pt;
    }
    .meta-label { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 3pt; }
    .meta-value { font-size: 10pt; font-weight: 600; color: #0f172a; }

    /* Location group header */
    .loc-header td {
      background: #f1f5f9;
      font-size: 8pt;
      font-weight: 700;
      color: #334155;
      padding: 6pt 8pt;
      border-bottom: 1pt solid #e2e8f0;
      letter-spacing: 0.3px;
    }

    /* Activities table */
    .act-table { width: 100%; border-collapse: collapse; }
    .act-table th {
      background: #f1f5f9;
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      padding: 6pt 8pt;
      text-align: left;
      font-weight: 700;
      border-bottom: 1pt solid #e2e8f0;
    }
    .act-table td {
      padding: 9pt 8pt;
      font-size: 9pt;
      vertical-align: top;
      border-bottom: 0.5pt solid #f1f5f9;
    }
    .act-table tr:last-child td { border-bottom: none; }
    .act-num {
      font-size: 8pt;
      color: #94a3b8;
      font-family: monospace;
      font-weight: 700;
      width: 20pt;
    }
    .act-desc { font-weight: 600; color: #0f172a; }
    .act-sub { font-size: 7.5pt; color: #64748b; margin-top: 2pt; }
    .act-team { font-size: 7.5pt; color: #64748b; margin-top: 2pt; font-style: italic; }
    .act-notes {
      font-size: 7.5pt;
      color: #475569;
      margin-top: 3pt;
      padding-left: 6pt;
      border-left: 2pt solid #bfdbfe;
      font-style: italic;
    }

    /* Photos */
    .photo-grid {
      display: flex;
      gap: 5pt;
      flex-wrap: wrap;
      margin-top: 7pt;
    }
    .photo-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .photo-img {
      width: 90pt;
      height: 68pt;
      object-fit: cover;
      border-radius: 3pt;
      border: 0.5pt solid #e2e8f0;
      display: block;
    }
    .photo-caption {
      font-size: 6pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 2pt;
      max-width: 90pt;
      line-height: 1.3;
    }

    /* Observations */
    .notes-box {
      background: #f8fafc;
      border: 0.5pt solid #e2e8f0;
      border-left: 3pt solid #0959C8;
      border-radius: 4pt;
      padding: 10pt 12pt;
      font-size: 9.5pt;
      line-height: 1.6;
      color: #334155;
    }

    /* Signature — digital */
    .sig-box {
      border: 1pt solid #bfdbfe;
      border-radius: 6pt;
      padding: 14pt;
      background: #f0f9ff;
    }
    .sig-verified {
      display: flex;
      align-items: center;
      gap: 6pt;
      font-size: 8pt;
      font-weight: 700;
      color: #166534;
      margin-bottom: 8pt;
    }
    .sig-verified-dot {
      width: 8pt;
      height: 8pt;
      border-radius: 50%;
      background: #16a34a;
      flex-shrink: 0;
    }
    .sig-name { font-size: 13pt; font-weight: 700; margin-bottom: 6pt; }
    .sig-drawing { max-height: 80pt; margin: 8pt 0; overflow: hidden; }
    .sig-drawing svg { max-height: 80pt; width: auto; }
    .sig-meta { display: flex; gap: 16pt; font-size: 7.5pt; color: #64748b; margin-top: 6pt; flex-wrap: wrap; }
    .verify-row {
      display: flex; gap: 14pt; align-items: flex-start;
      margin-top: 12pt; padding-top: 10pt;
      border-top: 0.5pt dashed #cbd5e1;
    }
    .qr { width: 64pt; height: 64pt; flex-shrink: 0; }
    .verify-text { font-size: 7.5pt; color: #475569; line-height: 1.6; }
    .verify-title { font-weight: 700; color: #0f172a; margin-bottom: 3pt; }
    .verify-url { color: #0959C8; word-break: break-all; }
    .verify-code { margin-top: 4pt; }
    .verify-code strong { font-family: monospace; font-size: 9pt; color: #0959C8; letter-spacing: 1px; }

    /* Signature — blank/manual */
    .sig-blank-box {
      border: 1pt solid #e2e8f0;
      border-radius: 6pt;
      padding: 16pt;
      background: #fafafa;
    }
    .sig-blank-instruction {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 20pt;
      line-height: 1.6;
    }
    .sig-blank-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 24pt; }
    .sig-blank-field { padding-top: 52pt; }
    .sig-blank-line { border-bottom: 1pt solid #334155; width: 100%; }
    .sig-blank-label { font-size: 7pt; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-top: 5pt; }
    .sig-consent {
      margin-top: 16pt;
      font-size: 7.5pt;
      color: #64748b;
      font-style: italic;
      line-height: 1.6;
      border-top: 0.5pt dashed #e2e8f0;
      padding-top: 10pt;
    }

    /* footer removido — gerado via footerTemplate do Puppeteer para evitar páginas em branco */

    @media print {
      body { margin: 0; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
    }
  `;

  // Agrupamento por local
  const groups = groupByLocation(activities);

  let globalNum = 0;
  const activityRows = groups.map(group => {
    const locRow = `<tr class="loc-header"><td></td><td>📍 ${group.locName}</td></tr>`;
    const itemRows = group.items.map(a => {
      globalNum++;
      const teamStr = (a.participants ?? [])
        .map(p => p.role ? `${p.name} (${p.role})` : p.name)
        .join(', ');

      const photosHtml = (a.photos ?? []).length > 0
        ? `<div class="photo-grid">
            ${(a.photos ?? []).slice(0, 4).map(ph =>
              `<div class="photo-item">
                <img class="photo-img" src="${ph.url}" />
                ${ph.caption ? `<div class="photo-caption">${ph.caption}</div>` : ''}
              </div>`
            ).join('')}
          </div>`
        : '';

      return `
        <tr>
          <td class="act-num">${globalNum}</td>
          <td>
            <div class="act-desc">${a.description}</div>
            <div class="act-sub">
              ${a.type_label ? `${a.type_label}` : ''}
              ${a.started_at ? ` · ${fmtTime(a.started_at)}` : ''}
            </div>
            ${teamStr ? `<div class="act-team">Equipe: ${teamStr}</div>` : ''}
            ${a.notes ? `<div class="act-notes">${a.notes}</div>` : ''}
            ${photosHtml}
          </td>
        </tr>`;
    }).join('');
    return locRow + itemRows;
  }).join('');

  // Signature block
  const sigHtml = signature ? `
    <div class="sig-box">
      <div class="sig-verified">
        <div class="sig-verified-dot"></div>
        Documento assinado eletronicamente
      </div>
      <div class="sig-name">${signature.signer_name}</div>
      ${signature.svg_data ? `<div class="sig-drawing">${signature.svg_data}</div>` : ''}
      <div class="sig-meta">
        <span>Assinado em ${fmt(signature.signed_at)}</span>
        ${signature.ip_address ? `<span>IP: ${signature.ip_address}</span>` : ''}
        <span>Código: <strong style="font-family:monospace;color:#0959C8">${signature.verification_code}</strong></span>
      </div>
      ${qrDataUrl || verifyUrl ? `
      <div class="verify-row">
        ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" />` : ''}
        <div class="verify-text">
          <div class="verify-title">Verificação de autenticidade</div>
          <div class="verify-url">${verifyUrl ?? ''}</div>
          <div class="verify-code">Código: <strong>${signature.verification_code}</strong></div>
        </div>
      </div>` : ''}
    </div>` : `
    <div class="sig-blank-box">
      <p class="sig-blank-instruction">
        Ao assinar abaixo, o representante do cliente declara que todas as atividades listadas neste
        resumo diário foram realizadas conforme descrito, em conformidade com o contrato vigente entre
        as partes. Esta assinatura tem validade jurídica nos termos da Lei 14.063/2020.
      </p>
      <div class="sig-blank-grid">
        <div class="sig-blank-field">
          <div class="sig-blank-line"></div>
          <div class="sig-blank-label">Assinatura do representante do cliente</div>
        </div>
        <div class="sig-blank-field">
          <div class="sig-blank-line"></div>
          <div class="sig-blank-label">Nome legível / CPF</div>
        </div>
        <div class="sig-blank-field">
          <div class="sig-blank-line"></div>
          <div class="sig-blank-label">Data e hora</div>
        </div>
      </div>
      <p class="sig-consent">
        Documento gerado pelo sistema Soprano · Zitrón Brasil · Linha 6 · São Paulo.<br>
        ID do resumo: ${report.id} · Gerado em ${fmt(generatedAt)}
      </p>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">SOPRANO</div>
        <div class="brand-sub">Zitrón Brasil · Linha 6 Laranja · Resumo Diário</div>
      </div>
      <div class="doc-meta">
        <div>ID: ${report.id.slice(0, 8)}</div>
        <div>Gerado em ${fmt(generatedAt)}</div>
      </div>
    </div>

    <div class="body">
      <div class="report-date">Resumo diário de obras</div>
      <div class="report-title">${fmtDate(report.report_date + 'T12:00:00')}</div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">Supervisor</div>
          <div class="meta-value">${supervisorName ?? '—'}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Cliente</div>
          <div class="meta-value">${clientName ?? '—'}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Total de atividades</div>
          <div class="meta-value">${activities.length}</div>
        </div>
      </div>

      ${report.notes ? `
      <div class="section-title">Observações gerais do dia</div>
      <div class="notes-box">${report.notes}</div>` : ''}

      <div class="section-title">Atividades realizadas</div>
      ${activities.length === 0
        ? `<p style="font-size:9pt;color:#94a3b8;font-style:italic">Nenhuma atividade registrada neste resumo.</p>`
        : `<table class="act-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Atividade</th>
              </tr>
            </thead>
            <tbody>
              ${activityRows}
            </tbody>
          </table>`}

      <div class="section-title">Assinatura do cliente</div>
      ${sigHtml}
    </div>

  </div>
</body>
</html>`;

  return html;
}
