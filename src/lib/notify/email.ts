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

import { logger } from '@/lib/logger';

const log = logger.for('email');

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
    log.debug('Email ignorado (sem RESEND_API_KEY)', { subject: payload.subject });
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
      log.error('Erro ao enviar email', { status: res.status, body });
      return { ok: false, error: `${res.status} ${body}` };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error('Exceção ao enviar email', { msg });
    return { ok: false, error: msg };
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

export function dailyReportSubmittedEmail(opts: {
  clientEmail: string;
  clientName: string;
  reportDate: string;
  reportUrl: string;
  supervisorName: string;
}) {
  return sendEmail({
    to: opts.clientEmail,
    subject: `Soprano · Resumo diário de ${opts.reportDate} aguardando sua assinatura`,
    html: shell(`
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Olá, ${escapeHtml(opts.clientName)}</div>
      <p style="font-size:14px;line-height:1.5;color:#d1d5db">
        O supervisor <strong>${escapeHtml(opts.supervisorName)}</strong> enviou o resumo diário para sua assinatura:
      </p>
      <div style="background:#0b1220;border-left:3px solid ${PRIMARY};padding:12px;border-radius:4px;margin:16px 0;font-size:14px">
        📋 Resumo de <strong>${escapeHtml(opts.reportDate)}</strong>
      </div>
      <p style="font-size:13px;color:${MUTED};margin-bottom:16px">
        Por favor, revise as atividades registradas e confirme sua assinatura eletrônica.
      </p>
      <a href="${opts.reportUrl}" style="display:inline-block;background:${PRIMARY};color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        Revisar e assinar →
      </a>
    `),
  });
}

export function dailyReportSignedEmail(opts: {
  supervisorEmail: string;
  supervisorName: string;
  reportDate: string;
  clientName: string;
  reportUrl: string;
}) {
  return sendEmail({
    to: opts.supervisorEmail,
    subject: `Soprano · Resumo de ${opts.reportDate} foi assinado`,
    html: shell(`
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Resumo assinado ✓</div>
      <p style="font-size:14px;line-height:1.5;color:#d1d5db">
        <strong>${escapeHtml(opts.clientName)}</strong> assinou o resumo diário:
      </p>
      <div style="background:#0b1220;border-left:3px solid #10b981;padding:12px;border-radius:4px;margin:16px 0;font-size:14px">
        📋 Resumo de <strong>${escapeHtml(opts.reportDate)}</strong>
      </div>
      <a href="${opts.reportUrl}" style="display:inline-block;background:${PRIMARY};color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        Ver detalhes →
      </a>
    `),
  });
}

// ---------------------------------------------------------------
// Reclamos (pleitos contratuais Zitrón → Acciona)
// ---------------------------------------------------------------

const ALERT = '#d97706'; // âmbar — reclamo é uma notificação formal, não um aviso comum

function formatBRL(amount: number) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

/** Notifica a Acciona (cliente) de um novo reclamo emitido pela Zitrón. */
export function claimNotificationEmail(opts: {
  clientEmail: string;
  clientName: string;
  refCode: string;
  typeLabel: string;
  title: string;
  description: string;
  eventDate: string;
  timeImpactDays?: number | null;
  costImpactAmount?: number | null;
  claimUrl: string;
}) {
  const impactRows: string[] = [];
  if (opts.timeImpactDays != null) {
    impactRows.push(`Impacto de prazo: <strong>${opts.timeImpactDays} dia(s)</strong>`);
  }
  if (opts.costImpactAmount != null) {
    impactRows.push(`Impacto de custo: <strong>${formatBRL(opts.costImpactAmount)}</strong>`);
  }
  const impactHtml = impactRows.length
    ? `<p style="font-size:13px;color:#d1d5db;margin:12px 0 0">${impactRows.join('<br/>')}</p>`
    : '';

  return sendEmail({
    to: opts.clientEmail,
    subject: `Soprano · Reclamo ${opts.refCode} — ${truncate(opts.title, 50)}`,
    html: shell(`
      <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${ALERT};margin-bottom:6px">
        Notificação de reclamo contratual
      </div>
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Prezados, ${escapeHtml(opts.clientName)}</div>
      <p style="font-size:14px;line-height:1.5;color:#d1d5db">
        A Zitrón Brasil registra formalmente o reclamo <strong>${escapeHtml(opts.refCode)}</strong>,
        com o seguinte fundamento: <strong>${escapeHtml(opts.typeLabel)}</strong>.
      </p>
      <div style="background:#0b1220;border-left:3px solid ${ALERT};padding:12px;border-radius:4px;margin:16px 0;font-size:14px">
        <div style="font-weight:600;margin-bottom:4px">${escapeHtml(opts.title)}</div>
        <div style="color:#9ca3af;font-size:13px;white-space:pre-wrap">${escapeHtml(truncate(opts.description, 400))}</div>
        <div style="color:#6b7280;font-size:12px;margin-top:8px">Data do evento: ${escapeHtml(opts.eventDate)}</div>
        ${impactHtml}
      </div>
      <p style="font-size:13px;color:${MUTED};margin-bottom:16px">
        Solicitamos o acuse de recebimento desta notificação diretamente no sistema.
      </p>
      <a href="${opts.claimUrl}" style="display:inline-block;background:${PRIMARY};color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
        Acessar o reclamo →
      </a>
    `),
  });
}

/** Avisa o autor (Zitrón) que a Acciona acusou o recebimento. */
export function claimAcknowledgedEmail(opts: {
  authorEmail: string;
  authorName: string;
  refCode: string;
  clientName: string;
  claimUrl: string;
}) {
  return sendEmail({
    to: opts.authorEmail,
    subject: `Soprano · Reclamo ${opts.refCode} — recebimento acusado`,
    html: shell(`
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Recebimento acusado ✓</div>
      <p style="font-size:14px;line-height:1.5;color:#d1d5db">
        <strong>${escapeHtml(opts.clientName)}</strong> acusou o recebimento do reclamo
        <strong>${escapeHtml(opts.refCode)}</strong>.
      </p>
      <a href="${opts.claimUrl}" style="display:inline-block;background:${PRIMARY};color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px">
        Ver detalhes →
      </a>
    `),
  });
}

/** Avisa o autor (Zitrón) que a Acciona respondeu ao reclamo. */
export function claimRespondedEmail(opts: {
  authorEmail: string;
  authorName: string;
  refCode: string;
  clientName: string;
  outcomeLabel: string;
  note: string;
  claimUrl: string;
}) {
  return sendEmail({
    to: opts.authorEmail,
    subject: `Soprano · Reclamo ${opts.refCode} — resposta: ${opts.outcomeLabel}`,
    html: shell(`
      <div style="font-size:18px;font-weight:600;margin-bottom:8px">Reclamo respondido</div>
      <p style="font-size:14px;line-height:1.5;color:#d1d5db">
        <strong>${escapeHtml(opts.clientName)}</strong> respondeu ao reclamo
        <strong>${escapeHtml(opts.refCode)}</strong>: <strong>${escapeHtml(opts.outcomeLabel)}</strong>.
      </p>
      <div style="background:#0b1220;border-left:3px solid ${PRIMARY};padding:12px;border-radius:4px;margin:16px 0;font-size:14px;white-space:pre-wrap">
        ${escapeHtml(truncate(opts.note, 400))}
      </div>
      <a href="${opts.claimUrl}" style="display:inline-block;background:${PRIMARY};color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
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
