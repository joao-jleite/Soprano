/** Gera o HTML completo da atividade para impressão via Puppeteer */

export type PdfActivity = {
  id: string;
  description: string;
  notes?: string | null;
  started_at: string;
  ended_at?: string | null;
  status: string;
  location_name?: string;
  type_label?: string;
  supervisor_name?: string;
  client_name?: string;
  participants?: { name: string; role?: string | null }[];
};

export type PdfSignature = {
  signer_name: string;
  signed_at: string;
  verification_code: string;
  ip_address?: string | null;
  svg_data?: string;
};

export type PdfPhoto = {
  signedUrl: string;
  caption?: string | null;
};

export type BuildHtmlOptions = {
  activity: PdfActivity;
  signature?: PdfSignature | null;
  qrDataUrl?: string;
  verifyUrl?: string;
  generatedAt: string;
  photos?: PdfPhoto[];
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function statusMeta(s: string): { label: string; color: string; bg: string } {
  if (s === 'assinada')  return { label: 'Assinada',  color: '#166534', bg: '#dcfce7' };
  if (s === 'rejeitada') return { label: 'Rejeitada', color: '#991b1b', bg: '#fee2e2' };
  if (s === 'enviada')   return { label: 'Enviada',   color: '#92400e', bg: '#fef3c7' };
  return                        { label: 'Rascunho',  color: '#1e40af', bg: '#dbeafe' };
}

export function buildActivityHtml(opts: BuildHtmlOptions): string {
  const { activity, signature, qrDataUrl, verifyUrl, generatedAt, photos = [] } = opts;
  const sm = statusMeta(activity.status);

  /* ── helpers ─────────────────────────────────────────────────── */
  const field = (label: string, value: string) => `
    <div class="field">
      <div class="field-label">${label}</div>
      <div class="field-value">${value || '—'}</div>
    </div>`;

  const participantsHtml = (activity.participants ?? []).map(p => `
    <div class="chip">
      <span class="chip-name">${p.name}</span>
      ${p.role ? `<span class="chip-role">${p.role}</span>` : ''}
    </div>`).join('');

  const photosHtml = photos.map(p => `
    <div class="photo-cell">
      <img src="${p.signedUrl}" alt="${p.caption ?? ''}" />
      ${p.caption ? `<div class="photo-caption">${p.caption}</div>` : ''}
    </div>`).join('');

  const sigHtml = signature ? `
    <div class="sig-box">
      <div class="sig-name">${signature.signer_name}</div>
      ${signature.svg_data ? `<div class="sig-drawing">${signature.svg_data}</div>` : ''}
      <div class="sig-meta">
        <span>Assinado em ${fmt(signature.signed_at)}</span>
        ${signature.ip_address ? `<span>IP: ${signature.ip_address}</span>` : ''}
      </div>
      ${qrDataUrl || verifyUrl ? `
      <div class="verify-row">
        ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" />` : ''}
        <div class="verify-text">
          <div class="verify-title">Verificação de autenticidade</div>
          ${verifyUrl ? `<div class="verify-url">${verifyUrl}</div>` : ''}
          <div class="verify-code">Código: <strong>${signature.verification_code}</strong></div>
        </div>
      </div>` : ''}
    </div>` : `
    <p class="no-sig">Este documento ainda não possui assinatura registrada.</p>`;

  /* ── CSS ──────────────────────────────────────────────────────── */
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

    /* ── Page layout ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      page-break-after: always;
    }
    .page:last-child { page-break-after: avoid; }

    /* ── Header bar ── */
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

    /* ── Body content ── */
    .body { padding: 22pt 28pt 24pt; }

    /* ── Status + title ── */
    .status-row { display: flex; align-items: center; gap: 8pt; margin-bottom: 6pt; }
    .badge {
      display: inline-block;
      padding: 2pt 9pt;
      border-radius: 20pt;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .type-label { font-size: 8pt; color: #64748b; letter-spacing: 0.5px; }
    .title { font-size: 20pt; font-weight: 800; line-height: 1.2; margin-bottom: 2pt; color: #0f172a; }
    .id-line { font-size: 7pt; color: #94a3b8; font-family: monospace; margin-bottom: 18pt; }

    /* ── Section ── */
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

    /* ── Fields grid ── */
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 6pt; }
    .fields.cols3 { grid-template-columns: 1fr 1fr 1fr; }
    .field {
      background: #f8fafc;
      border: 0.5pt solid #e2e8f0;
      border-radius: 4pt;
      padding: 8pt 10pt;
    }
    .field-label { font-size: 6.5pt; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 3pt; }
    .field-value { font-size: 10pt; font-weight: 600; color: #0f172a; }

    /* ── Notes ── */
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

    /* ── Participants ── */
    .chips { display: flex; flex-wrap: wrap; gap: 6pt; }
    .chip {
      background: #eff6ff;
      border: 0.5pt solid #bfdbfe;
      border-radius: 4pt;
      padding: 5pt 10pt;
      display: flex;
      flex-direction: column;
    }
    .chip-name { font-size: 8.5pt; font-weight: 600; color: #1e40af; }
    .chip-role { font-size: 7pt; color: #64748b; margin-top: 1pt; }

    /* ── Signature ── */
    .sig-box {
      border: 1pt solid #bfdbfe;
      border-radius: 6pt;
      padding: 14pt;
      background: #f8fafc;
    }
    .sig-name { font-size: 13pt; font-weight: 700; margin-bottom: 8pt; }
    .sig-drawing { max-height: 90pt; margin: 8pt 0; overflow: hidden; }
    .sig-drawing svg { max-height: 90pt; width: auto; }
    .sig-meta { display: flex; gap: 16pt; font-size: 7.5pt; color: #64748b; margin-top: 6pt; }
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
    .no-sig { font-size: 9pt; color: #94a3b8; font-style: italic; }

    /* ── Photos ── */
    .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; }
    .photo-cell { border: 0.5pt solid #e2e8f0; border-radius: 4pt; overflow: hidden; break-inside: avoid; }
    .photo-cell img { width: 100%; height: 160pt; object-fit: cover; display: block; }
    .photo-caption { font-size: 7.5pt; color: #64748b; padding: 5pt 8pt; background: #f8fafc; }

    /* ── Footer ── */
    .footer {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 20pt;
      padding: 0 28pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7pt;
      color: #94a3b8;
      border-top: 0.5pt solid #e2e8f0;
      background: #fff;
    }

    /* ── Print ── */
    @media print {
      body { margin: 0; }
      .page { page-break-after: always; }
      .page:last-child { page-break-after: avoid; }
    }
  `;

  /* ── Page 1: activity ─────────────────────────────────────────── */
  const page1 = `
  <div class="page">
    <div class="header">
      <div>
        <div class="brand">SOPRANO</div>
        <div class="brand-sub">Zitrón Brasil · Linha 6 Laranja</div>
      </div>
      <div class="doc-meta">
        <div>ID: ${activity.id}</div>
        <div>Gerado em ${fmt(generatedAt)}</div>
      </div>
    </div>

    <div class="body">
      <div class="status-row">
        <span class="badge" style="color:${sm.color};background:${sm.bg}">${sm.label}</span>
        ${activity.type_label ? `<span class="type-label">${activity.type_label}</span>` : ''}
      </div>
      <div class="title">${activity.description}</div>
      <div class="id-line">${activity.id}</div>

      <div class="section-title">Identificação</div>
      <div class="fields">
        ${field('Local', activity.location_name ?? '')}
        ${field('Supervisor', activity.supervisor_name ?? '')}
        ${field('Cliente', activity.client_name ?? '')}
        ${field('Início', fmt(activity.started_at))}
        ${activity.ended_at ? field('Fim', fmt(activity.ended_at)) : ''}
      </div>

      ${(activity.participants ?? []).length > 0 ? `
      <div class="section-title">Equipe em campo</div>
      <div class="chips">${participantsHtml}</div>` : ''}

      ${activity.notes ? `
      <div class="section-title">Observações</div>
      <div class="notes-box">${activity.notes}</div>` : ''}

      <div class="section-title">Assinatura do cliente</div>
      ${sigHtml}
    </div>

    <div class="footer">
      <span>Soprano · Registro de atividades — Zitrón Brasil</span>
      <span>Linha 6 · São Paulo</span>
    </div>
  </div>`;

  /* ── Photo pages ──────────────────────────────────────────────── */
  const photoPageCount = Math.ceil(photos.length / 4);
  const photoPages = Array.from({ length: photoPageCount }, (_, i) => {
    const pagePhotos = photos.slice(i * 4, i * 4 + 4);
    return `
    <div class="page">
      <div class="header">
        <div>
          <div class="brand">SOPRANO</div>
          <div class="brand-sub">Registro fotográfico · ${activity.description.slice(0, 48)}</div>
        </div>
        <div class="doc-meta">
          <div>ID: ${activity.id.slice(0, 8)}</div>
          <div>Fotos ${i * 4 + 1}–${Math.min((i + 1) * 4, photos.length)} de ${photos.length}</div>
        </div>
      </div>
      <div class="body">
        <div class="photo-grid">
          ${pagePhotos.map(p => `
            <div class="photo-cell">
              <img src="${p.signedUrl}" />
              ${p.caption ? `<div class="photo-caption">${p.caption}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>
      <div class="footer">
        <span>Soprano · Registro de atividades — Zitrón Brasil</span>
        <span>Linha 6 · São Paulo</span>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  ${page1}
  ${photoPages}
</body>
</html>`;
}
