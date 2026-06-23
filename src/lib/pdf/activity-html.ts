/**
 * Gera o HTML da atividade para impressão via Puppeteer.
 *
 * Estética de "folha técnica de engenharia / dossiê de obra": fios finos,
 * rótulos em IBM Plex Mono maiúsculo, azul royal de marca (--ac: #163d8a),
 * sem cantos arredondados, gradientes ou emojis.
 */

export type PdfActivity = {
  id: string;
  description: string;
  notes?: string | null;
  evolucao?: string | null;
  pendencias?: string | null;
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

const DASH = '—';

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo', // servidor Vercel roda em UTC
    });
  } catch { return iso; }
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

/** Valor de campo: travessão quando vazio (nunca deixa em branco). */
function val(s?: string | null): string {
  const t = (s ?? '').toString().trim();
  return t ? escapeHtml(t) : DASH;
}

/** Selo de status no estilo mono contornado. */
function statusSeal(status: string): { label: string; color: string } {
  if (status === 'assinada') return { label: 'Assinado', color: '#1f5d4c' };
  if (status === 'rejeitada') return { label: 'Rejeitado', color: '#9a3412' };
  if (status === 'enviada') return { label: 'Enviada', color: '#163d8a' };
  return { label: 'Rascunho', color: '#163d8a' };
}

/** Marca/logotipo Soprano embutido como SVG inline (sem requisição externa). */
const SOPRANO_MARK = `
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="height:26px;width:26px;display:block;">
    <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9" stroke="#163d8a" stroke-opacity="0.28"/>
    <path d="M27.5 12.5c-1.6-2.2-4.6-3.5-7.5-3.5-4.4 0-8 3-8 6.5 0 3.6 3 5.5 7 6.5 4 1 7 2.9 7 6.5 0 3.5-3.6 6.5-8 6.5-2.9 0-5.9-1.3-7.5-3.5" stroke="#163d8a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="12.5" cy="32.5" r="1.25" fill="#163d8a"/>
    <circle cx="27.5" cy="7.5" r="1.25" fill="#163d8a"/>
  </svg>`;

export function buildActivityHtml(opts: BuildHtmlOptions): string {
  const { activity, signature, qrDataUrl, verifyUrl, generatedAt, photos = [] } = opts;

  // ── Mapeia o registro real para o shape do template ───────────────────────
  const assinado = activity.status === 'assinada' && !!signature;
  const isRascunho = activity.status === 'rascunho';
  const seal = statusSeal(activity.status);

  // Título = tipo da atividade (curto); resumo = descrição (frase). Se não há
  // tipo, a descrição vira o título e o resumo fica vazio (não duplica).
  const titulo = activity.type_label?.trim() || activity.description?.trim() || DASH;
  const resumo =
    activity.type_label?.trim() && activity.description?.trim()
      ? activity.description.trim()
      : '';

  const projeto = 'Zitrón Brasil · Linha 6 Laranja';
  const localFaixa = activity.location_name?.trim()
    ? `${activity.location_name.trim()} · São Paulo`
    : 'São Paulo';
  const emissao = fmt(generatedAt);

  const identificacao = [
    { label: 'Local', value: activity.location_name },
    { label: 'Supervisor', value: activity.supervisor_name },
    { label: 'Cliente', value: activity.client_name },
    { label: 'Início', value: activity.started_at ? fmt(activity.started_at) : '' },
    { label: 'Fim', value: activity.ended_at ? fmt(activity.ended_at) : '' },
  ];

  const equipe = activity.participants ?? [];

  // Evolução é um textarea livre → cada linha vira um item de lista.
  const evolucaoItems = (activity.evolucao ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  /* ── Blocos ──────────────────────────────────────────────────────────────── */

  const identificacaoHtml = identificacao
    .map(
      (f) => `
      <div style="padding:11px 0;border-bottom:1px solid #dfe3ea;">
        <div class="lbl" style="letter-spacing:.18em;">${escapeHtml(f.label)}</div>
        <div style="margin-top:5px;font-size:14px;color:#16181d;">${val(f.value)}</div>
      </div>`,
    )
    .join('');

  const equipeHtml = equipe.length
    ? equipe
        .map(
          (p) => `
        <div style="display:flex;flex-direction:column;gap:2px;padding:9px 0;border-bottom:1px solid #eef1f5;">
          ${p.role ? `<span style="font:500 9px/1 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ac);">${escapeHtml(p.role)}</span>` : ''}
          <span style="font-size:13.5px;color:#16181d;">${escapeHtml(p.name)}</span>
        </div>`,
        )
        .join('')
    : `<div style="padding:9px 0;border-bottom:1px solid #eef1f5;font-size:13.5px;color:#9aa2ad;">${DASH}</div>`;

  const fotosHtml = photos.length
    ? photos
        .map((p, i) => {
          const fig = String(i + 1).padStart(2, '0');
          return `
        <figure class="avoid-break" style="margin:0;">
          <div style="border:1px solid #c7cdd6;padding:4px;background:#fff;">
            <img src="${p.signedUrl}" alt="${escapeHtml(p.caption ?? '')}" style="display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#eef1f5;">
          </div>
          <figcaption style="display:flex;gap:9px;align-items:baseline;margin-top:8px;">
            <span style="font:600 10px/1.3 'IBM Plex Mono',monospace;letter-spacing:.1em;color:var(--ac);white-space:nowrap;">FIG.${fig}</span>
            <span style="font-size:12.5px;line-height:1.35;color:#5b6470;">${p.caption ? escapeHtml(p.caption) : DASH}</span>
          </figcaption>
        </figure>`;
        })
        .join('')
    : '';

  const evolucaoHtml = evolucaoItems.length
    ? evolucaoItems
        .map(
          (item) => `
      <div style="display:flex;gap:12px;align-items:baseline;padding:6px 0;border-bottom:1px solid #eef1f5;">
        <span style="width:6px;height:6px;background:var(--ac);flex:none;transform:translateY(-1px);"></span>
        <span style="font-size:14px;color:#16181d;white-space:pre-wrap;">${escapeHtml(item)}</span>
      </div>`,
        )
        .join('')
    : `<div style="padding:6px 0;font-size:14px;color:#9aa2ad;">${DASH}</div>`;

  // ── Assinatura ────────────────────────────────────────────────────────────
  const verifyRow =
    qrDataUrl || verifyUrl || signature?.verification_code
      ? `
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid #dfe3ea;display:flex;gap:16px;align-items:flex-start;">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR de verificação" style="width:64px;height:64px;flex:none;border:1px solid #dfe3ea;">` : ''}
        <div>
          <div class="lbl" style="letter-spacing:.18em;">Verificação de autenticidade</div>
          ${verifyUrl ? `<div style="margin-top:6px;font:400 11px/1.5 'IBM Plex Mono',monospace;color:var(--ac);word-break:break-all;">${escapeHtml(verifyUrl)}</div>` : ''}
          ${signature?.verification_code ? `<div style="margin-top:4px;font:400 11px/1.5 'IBM Plex Mono',monospace;color:#5b6470;">Código <strong style="color:var(--ac);letter-spacing:.06em;">${escapeHtml(signature.verification_code)}</strong></div>` : ''}
        </div>
      </div>`
      : '';

  const assinaturaHtml = assinado && signature
    ? `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:30px;flex-wrap:wrap;">
        <div style="flex:1;min-width:240px;">
          ${signature.svg_data ? `<div style="max-height:80px;overflow:hidden;margin-bottom:8px;"><img src="data:image/svg+xml;base64,${Buffer.from(signature.svg_data).toString('base64')}" alt="Assinatura" style="max-height:80px;width:auto;display:block;"></div>` : ''}
          <div style="font-size:22px;color:#16181d;border-bottom:1px solid #16181d;padding-bottom:6px;min-width:240px;">${escapeHtml(signature.signer_name)}</div>
          <div class="lbl" style="letter-spacing:.18em;margin-top:8px;">Nome / Assinatura</div>
        </div>
        <div style="text-align:right;">
          <div style="font:600 10px/1 'IBM Plex Mono',monospace;letter-spacing:.18em;text-transform:uppercase;color:#1f5d4c;">Assinado digitalmente</div>
          <div style="font:400 11px/1.4 'IBM Plex Mono',monospace;color:#5b6470;margin-top:5px;">${fmt(signature.signed_at)}</div>
          ${signature.ip_address ? `<div style="font:400 10px/1.4 'IBM Plex Mono',monospace;color:#9aa2ad;margin-top:3px;">IP ${escapeHtml(signature.ip_address)}</div>` : ''}
        </div>
      </div>
      ${verifyRow}`
    : `
      <div style="display:flex;gap:40px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;"><div style="height:34px;border-bottom:1px solid #b8c0cb;"></div><div class="lbl" style="letter-spacing:.18em;margin-top:8px;">Nome / Assinatura</div></div>
        <div style="width:160px;"><div style="height:34px;border-bottom:1px solid #b8c0cb;"></div><div class="lbl" style="letter-spacing:.18em;margin-top:8px;">Data</div></div>
      </div>
      <p style="margin:18px 0 0;font:400 11.5px/1.4 'IBM Plex Mono',monospace;color:#9aa2ad;">Este documento ainda não possui assinatura registrada.</p>`;

  /* ── CSS (load-bearing para a paginação A4) ──────────────────────────────── */
  const css = `
    body{margin:0;background:#fff;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
    :root{--ac:#163d8a;}
    .doc{box-sizing:border-box;max-width:210mm;margin:0 auto;padding:40px 16mm 76px;position:relative;z-index:1;
         font-family:'IBM Plex Sans',system-ui,sans-serif;color:#3a4048;font-size:14px;line-height:1.62;}
    .doc-frame{width:100%;border-collapse:collapse;} .doc-frame td{padding:0;}
    .running-hdr,.running-ftr,.hdr-space,.ftr-space{display:none;}
    h1,h2,h3{text-wrap:balance;} p,li{text-wrap:pretty;}
    .lbl{font:500 9px/1 'IBM Plex Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:#9aa2ad;}
    .sec{display:flex;align-items:center;gap:14px;margin:34px 0 14px;}
    .sec .t{font:600 11px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:var(--ac);white-space:nowrap;}
    .sec .r{flex:1;height:1px;background:#dfe3ea;}
    .rascunho{position:fixed;inset:0;z-index:0;pointer-events:none;display:flex;align-items:center;justify-content:center;overflow:hidden;}
    .rascunho b{font:700 134px 'IBM Plex Sans',sans-serif;color:rgba(22,61,138,.05);letter-spacing:.12em;transform:rotate(-28deg);white-space:nowrap;}
    @page{size:A4;margin:0;}
    @media print{
      html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      html,body{margin:0;padding:0;}
      .doc{max-width:none;padding:0 16mm;}
      .hdr-space,.ftr-space{display:table-cell;height:16mm;}
      .running-hdr,.running-ftr{display:flex;justify-content:space-between;align-items:baseline;position:fixed;left:0;right:0;
          font:500 9px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#9aa2ad;}
      .running-hdr{top:0;padding:9mm 16mm 0;} .running-ftr{bottom:0;padding:0 16mm 9mm;}
      h1,h2,h3,h4{break-after:avoid;} figure,img,tr,.avoid-break{break-inside:avoid;} p,li{orphans:3;widows:3;}
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
  <div class="running-hdr"><span>Soprano · Registro de atividades — Zitrón Brasil</span><span>Linha 6 · São Paulo</span></div>
  <div class="running-ftr"><span>${escapeHtml(titulo)}</span><span>${escapeHtml(localFaixa)}</span></div>
  <table class="doc-frame" role="presentation">
  <thead><tr><td class="hdr-space"></td></tr></thead>
  <tbody><tr><td>

    <!-- MASTHEAD -->
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:28px;">
      <div style="display:flex;flex-direction:column;gap:13px;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${SOPRANO_MARK}
          <span style="font:700 19px/1 'IBM Plex Sans',sans-serif;letter-spacing:-.01em;color:#16181d;">SOPRANO</span>
        </div>
        <span class="lbl" style="letter-spacing:.26em;">Registro de atividades de campo</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:9px;text-align:right;">
        <span style="font:600 10px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:${seal.color};border:1px solid ${seal.color};padding:6px 11px;">${escapeHtml(seal.label)}</span>
        <span style="font:500 10px/1.5 'IBM Plex Mono',monospace;color:#9aa2ad;">Sistema Soprano</span>
      </div>
    </header>

    <div style="height:22px;"></div>
    <h1 style="margin:0;font-size:33px;line-height:1.05;font-weight:600;letter-spacing:-.012em;color:#16181d;">${escapeHtml(titulo)}</h1>
    ${resumo ? `<p style="margin:11px 0 0;font-size:15px;line-height:1.5;color:#5b6470;max-width:62ch;white-space:pre-wrap;">${escapeHtml(resumo)}</p>` : ''}

    <div style="height:22px;"></div>

    <!-- FAIXA DE REFERÊNCIA -->
    <div style="border:1px solid #c7cdd6;display:grid;grid-template-columns:1.3fr 1fr 1fr;">
      <div style="padding:11px 14px;border-right:1px solid #dfe3ea;"><div class="lbl">Projeto</div><div style="margin-top:6px;font-size:13px;color:#16181d;font-weight:500;">${escapeHtml(projeto)}</div></div>
      <div style="padding:11px 14px;border-right:1px solid #dfe3ea;"><div class="lbl">Local</div><div style="margin-top:6px;font-size:13px;color:#16181d;font-weight:500;">${escapeHtml(localFaixa)}</div></div>
      <div style="padding:11px 14px;"><div class="lbl">Emissão</div><div style="margin-top:6px;font-size:13px;color:#16181d;font-weight:500;">${escapeHtml(emissao)}</div></div>
      <div style="grid-column:1/-1;padding:9px 14px;border-top:1px solid #dfe3ea;display:flex;gap:8px;align-items:baseline;">
        <span class="lbl">Documento Nº</span>
        <span style="font:400 11px/1 'IBM Plex Mono',monospace;color:#5b6470;">${escapeHtml(activity.id)}</span>
      </div>
    </div>

    <!-- IDENTIFICAÇÃO -->
    <div class="sec"><span class="t">Identificação</span><span class="r"></span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:40px;border-top:1px solid #dfe3ea;">
      ${identificacaoHtml}
    </div>

    <!-- EQUIPE -->
    <div style="margin-top:22px;">
      <div class="lbl" style="letter-spacing:.18em;margin-bottom:10px;">Equipe em campo</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:0 28px;border-top:1px solid #dfe3ea;">
        ${equipeHtml}
      </div>
    </div>

    <!-- REGISTRO FOTOGRÁFICO -->
    <div class="sec" style="margin-top:36px;"><span class="t">Registro fotográfico</span><span class="r"></span>
      <span style="font:500 10px/1 'IBM Plex Mono',monospace;color:#9aa2ad;white-space:nowrap;">${photos.length} ${photos.length === 1 ? 'registro' : 'registros'}</span></div>
    ${photos.length
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 16px;">${fotosHtml}</div>`
      : `<p style="margin:0;font:400 12.5px/1.4 'IBM Plex Mono',monospace;color:#9aa2ad;">${DASH} Sem registros fotográficos.</p>`}

    <!-- EVOLUÇÃO -->
    <div class="sec"><span class="t">Evolução</span><span class="r"></span></div>
    <div class="avoid-break">${evolucaoHtml}</div>

    <!-- OBSERVAÇÕES -->
    <div class="sec"><span class="t">Observações</span><span class="r"></span></div>
    <div class="avoid-break">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#16181d;white-space:pre-wrap;">${val(activity.notes)}</p>
    </div>

    <!-- PENDÊNCIAS -->
    <div class="sec"><span class="t">Pendências</span><span class="r"></span></div>
    <p class="avoid-break" style="margin:0;font-size:14px;line-height:1.6;color:#16181d;white-space:pre-wrap;">${val(activity.pendencias)}</p>

    <!-- ASSINATURA -->
    <div class="sec" style="margin-top:38px;"><span class="t">Assinatura do cliente</span><span class="r"></span></div>
    <div class="avoid-break" style="border:1px solid #c7cdd6;padding:26px 24px 18px;">
      ${assinaturaHtml}
    </div>

    <!-- RODAPÉ DE FECHO -->
    <div style="margin-top:30px;padding-top:14px;border-top:1px solid #dfe3ea;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;">
      <span style="font:400 10px/1.5 'IBM Plex Mono',monospace;color:#9aa2ad;">Soprano · Registro de atividades — Zitrón Brasil · Linha 6 Laranja</span>
      <span style="font:400 10px/1.5 'IBM Plex Mono',monospace;color:#9aa2ad;">Gerado em ${escapeHtml(emissao)}</span>
    </div>

  </td></tr></tbody>
  <tfoot><tr><td class="ftr-space"></td></tr></tfoot>
  </table>
</main>
</body>
</html>`;
}
