/**
 * Envio de email via Resend (https://resend.com).
 * Ativo só quando RESEND_API_KEY está presente no ambiente.
 * Falha silenciosa: notificação nunca pode quebrar um fluxo crítico.
 *
 * Para ativar em produção:
 *   1. Criar conta em resend.com, adicionar domínio
 *   2. Definir RESEND_API_KEY e RESEND_FROM no painel Vercel
 *   3. Pronto — todas as chamadas abaixo passam a disparar email real
 */

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? 'Soprano <noreply@soprano.local>';

  if (!apiKey) {
    // Dev / preview sem chave — só loga
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email:skip]', payload.subject, '→', payload.to);
    }
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        reply_to: payload.replyTo,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[email:error]', res.status, body);
      return { ok: false, error: `${res.status} ${body}` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[email:exception]', e?.message);
    return { ok: false, error: e?.message };
  }
}

// ---------------------------------------------------------------
// Templates simples (podem migrar para react-email no futuro)
// ---------------------------------------------------------------

const PRIMARY = '#0959C8';
const BG = '#0b1220';
const CARD = '#11162a';
const MUTED = '#9ca3af';

function shell(inner: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${BG};font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#e5e7eb">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="color:${PRIMARY};font-weight:700;letter-spacing:1px;font-size:18px;margin-bottom:4px">SOPRANO</div>
    <div style="color:${MUTED};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:24px">Zitrón Brasil · Linha 6 Laranja</div>
    <div style="background:${CARD};border:1px solid #1f2937;border-radius:8px;padding:24px">
      ${inner}
    </div>
    <div style="color:#4b5563;font-size:10px;margin-top:20px;text-align:center">
      Soprano — Registro digital rastreável de atividades
    </div>
  </div></body></html>`;
}

export function activitySubmittedEmail(opts: {
  clientEmail: string;
  clientName: string;
  description: string;
  activityUrl: string;
}) {
  return sendEmail({
    to: opts.clientEmail,
    subject: `Soprano · Atividade aguardando sua assinatura`,
    html: shell(`
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Olá, ${escapeHtml(opts.clientName)}</div>
      <p style="font-size:14px;line-height:1.5;color:#d1d5db">
        Uma atividade foi registrada e aguarda sua confirmação:
      </p>
      <div style="background:#0b1220;border-left:3px solid ${PRIMARY};padding:12px;border-radius:4px;margin:16px 0;font-size:14px">
        ${escapeHtml(opts.description)}
      </div>
      <a href="${opts.activityUrl}" style="display:inline-block;background:${PRIMARY};color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        Revisar e assinar →
      </a>
    `),
  });
}

export function activitySignedEmail(opts: {
  supervisorEmail: string;
  supervisorName: string;
  description: string;
  clientName: string;
  activityUrl: string;
}) {
  return sendEmail({
    to: opts.supervisorEmail,
    subject: `Soprano · "${truncate(opts.description, 40)}" foi assinada`,
    html: shell(`
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Atividade assinada ✓</div>
      <p style="font-size:14px;line-height:1.5;color:#d1d5db">
        <strong>${escapeHtml(opts.clientName)}</strong> assinou a atividade:
      </p>
      <div style="background:#0b1220;border-left:3px solid #10b981;padding:12px;border-radius:4px;margin:16px 0;font-size:14px">
        ${escapeHtml(opts.description)}
      </div>
      <a href="${opts.activityUrl}" style="display:inline-block;background:${PRIMARY};color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        Ver detalhes →
      </a>
    `),
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
