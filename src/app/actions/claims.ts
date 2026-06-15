'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, getUserEmail } from '@/lib/supabase/service';
import {
  claimNotificationEmail,
  claimAcknowledgedEmail,
  claimRespondedEmail,
} from '@/lib/notify/email';
import { requireAuthAndRole } from '@/guards/auth.guard';
import { logger } from '@/lib/logger';
import type { ClaimType, ClaimOutcome } from '@/lib/supabase/database.types';

const log = logger.for('claims');

// Rótulos PT para uso server-side (email/timeline). A UI usa i18n próprio.
const CLAIM_TYPE_LABELS_PT: Record<ClaimType, string> = {
  suspensao_conveniencia: 'Suspensão dos trabalhos por conveniência',
  suspensao_falta_pagamento: 'Suspensão por falta de pagamento (90 dias)',
  falta_acesso_area: 'Falha em dar acesso à área de trabalho',
  interferencia_terceiros: 'Interferência de outras contratistas',
  alteracao_escopo: 'Alteração do alcance do trabalho',
  risco_geotecnico_ambiental: 'Materialização de riscos geotécnicos ou ambientais',
  forca_maior: 'Caso fortuito ou força maior',
  suspensao_poder_concedente: 'Suspensão por ordem do poder concedente',
};

const OUTCOME_LABELS_PT: Record<ClaimOutcome, string> = {
  aceito: 'Aceito',
  rejeitado: 'Rejeitado',
  parcial: 'Parcial',
};

const CLAIM_TYPES = [
  'suspensao_conveniencia',
  'suspensao_falta_pagamento',
  'falta_acesso_area',
  'interferencia_terceiros',
  'alteracao_escopo',
  'risco_geotecnico_ambiental',
  'forca_maior',
  'suspensao_poder_concedente',
] as const;

function appBaseUrl(h: Headers) {
  return h.get('origin') ?? h.get('x-forwarded-host') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
}

function clientMeta(h: Headers) {
  const ua = h.get('user-agent') ?? null;
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  return { ua, ip };
}

// ── Criar reclamo (rascunho) ────────────────────────────────────────────────

const createClaimSchema = z.object({
  claimType: z.enum(CLAIM_TYPES),
  title: z.string().min(3),
  description: z.string().min(10),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeImpactDays: z.number().int().min(0).nullable().optional(),
  costImpactAmount: z.number().min(0).nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  activityId: z.string().uuid().nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
});

export async function createClaim(
  input: z.infer<typeof createClaimSchema>,
): Promise<{ id?: string; error?: string }> {
  try {
    const parsed = createClaimSchema.parse(input);
    const supabase = await createClient();
    const { user } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('claims')
      .insert({
        claim_type: parsed.claimType,
        title: parsed.title,
        description: parsed.description,
        event_date: parsed.eventDate,
        time_impact_days: parsed.timeImpactDays ?? null,
        cost_impact_amount: parsed.costImpactAmount ?? null,
        location_id: parsed.locationId ?? null,
        activity_id: parsed.activityId ?? null,
        client_id: parsed.clientId ?? null,
        author_id: user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      log.error('Falha ao criar reclamo', { error: error?.message });
      return { error: error?.message ?? 'Falha ao criar reclamo' };
    }

    await supabase.from('claim_timeline').insert({
      claim_id: data.id,
      event: 'created',
      actor_id: user.id,
      actor_name: profile?.full_name ?? null,
    });

    revalidatePath('/reclamos');
    return { id: data.id };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── Editar reclamo (rascunho) ───────────────────────────────────────────────

const updateClaimSchema = createClaimSchema.extend({ id: z.string().uuid() });

export async function updateClaim(
  input: z.infer<typeof updateClaimSchema>,
): Promise<{ error?: string }> {
  try {
    const parsed = updateClaimSchema.parse(input);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data: existing } = await supabase
      .from('claims')
      .select('author_id, status')
      .eq('id', parsed.id)
      .single();

    if (!existing) return { error: 'Reclamo não encontrado' };
    if (role === 'supervisor' && existing.author_id !== user.id) {
      return { error: 'Sem permissão para editar este reclamo' };
    }
    if (existing.status !== 'rascunho') {
      return { error: 'Apenas rascunhos podem ser editados' };
    }

    const { error } = await supabase
      .from('claims')
      .update({
        claim_type: parsed.claimType,
        title: parsed.title,
        description: parsed.description,
        event_date: parsed.eventDate,
        time_impact_days: parsed.timeImpactDays ?? null,
        cost_impact_amount: parsed.costImpactAmount ?? null,
        location_id: parsed.locationId ?? null,
        activity_id: parsed.activityId ?? null,
        client_id: parsed.clientId ?? null,
      })
      .eq('id', parsed.id);

    if (error) return { error: error.message };

    revalidatePath(`/reclamos/${parsed.id}`);
    revalidatePath('/reclamos');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── Enviar reclamo à Acciona ────────────────────────────────────────────────

export async function sendClaim(claimId: string): Promise<{ error?: string }> {
  try {
    const id = z.string().uuid().parse(claimId);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data: claim } = await supabase
      .from('claims')
      .select(
        'author_id, client_id, status, ref_code, claim_type, title, description, event_date, time_impact_days, cost_impact_amount',
      )
      .eq('id', id)
      .single();

    if (!claim) return { error: 'Reclamo não encontrado' };
    if (role === 'supervisor' && claim.author_id !== user.id) {
      return { error: 'Sem permissão para enviar este reclamo' };
    }
    if (claim.status !== 'rascunho') return { error: 'Reclamo já foi enviado' };
    if (!claim.client_id) return { error: 'Selecione o destinatário antes de enviar' };

    const { error: updError } = await supabase
      .from('claims')
      .update({ status: 'enviado', notified_at: new Date().toISOString() })
      .eq('id', id);

    if (updError) return { error: updError.message ?? 'Erro ao enviar reclamo' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await supabase.from('claim_timeline').insert({
      claim_id: id,
      event: 'sent',
      actor_id: user.id,
      actor_name: profile?.full_name ?? null,
    });

    // Notifica a Acciona por email (silencioso — nunca quebra o envio)
    try {
      const [clientEmail, clientProfile, h] = await Promise.all([
        getUserEmail(claim.client_id),
        supabase.from('profiles').select('full_name').eq('id', claim.client_id).single(),
        headers(),
      ]);
      if (clientEmail) {
        const origin = appBaseUrl(h);
        await claimNotificationEmail({
          clientEmail,
          clientName: clientProfile.data?.full_name ?? 'Cliente',
          refCode: claim.ref_code ?? '',
          typeLabel: CLAIM_TYPE_LABELS_PT[claim.claim_type],
          title: claim.title,
          description: claim.description,
          eventDate: claim.event_date,
          timeImpactDays: claim.time_impact_days,
          costImpactAmount: claim.cost_impact_amount,
          claimUrl: `${origin}/pt/reclamos/${id}`,
        });
      }
    } catch (e: unknown) {
      log.warn('Email de notificação de reclamo falhou', {
        msg: e instanceof Error ? e.message : String(e),
      });
    }

    revalidatePath(`/reclamos/${id}`);
    revalidatePath('/reclamos');
    revalidatePath('/');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao enviar' };
  }
}

// ── Acusar recebimento (Acciona / cliente) ──────────────────────────────────

export async function acknowledgeClaim(claimId: string): Promise<{ error?: string }> {
  try {
    const id = z.string().uuid().parse(claimId);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();
    if (!profile) return { error: 'Perfil não encontrado' };
    if (profile.role !== 'cliente') return { error: 'Apenas o destinatário pode acusar o recebimento' };

    const { data: claim } = await supabase
      .from('claims')
      .select('client_id, status, author_id, ref_code')
      .eq('id', id)
      .single();
    if (!claim) return { error: 'Reclamo não encontrado' };
    if (claim.client_id !== user.id) return { error: 'Sem permissão para acusar este reclamo' };
    if (claim.status !== 'enviado') return { error: 'Reclamo não está aguardando acuse' };

    // Acuse passa pelo service client: a policy de UPDATE do cliente é restrita
    // de propósito (evita que o cliente altere outros campos).
    const admin = createServiceClient();
    if (!admin) return { error: 'Configuração de servidor ausente' };

    const h = await headers();
    const { ua, ip } = clientMeta(h);

    const { error: updError } = await admin
      .from('claims')
      .update({
        status: 'recebido',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user.id,
        ack_ip: ip,
        ack_user_agent: ua,
      })
      .eq('id', id);
    if (updError) return { error: updError.message ?? 'Falha ao registrar acuse' };

    await admin.from('claim_timeline').insert({
      claim_id: id,
      event: 'acknowledged',
      actor_id: user.id,
      actor_name: profile.full_name,
      detail: { ip },
    });

    // Avisa o autor (Zitrón) por email — silencioso
    try {
      if (claim.author_id) {
        const [authorEmail, authorProfile] = await Promise.all([
          getUserEmail(claim.author_id),
          supabase.from('profiles').select('full_name').eq('id', claim.author_id).single(),
        ]);
        if (authorEmail) {
          await claimAcknowledgedEmail({
            authorEmail,
            authorName: authorProfile.data?.full_name ?? 'Equipe Zitrón',
            refCode: claim.ref_code ?? '',
            clientName: profile.full_name,
            claimUrl: `${appBaseUrl(h)}/pt/reclamos/${id}`,
          });
        }
      }
    } catch (_) { /* email nunca quebra */ }

    revalidatePath(`/reclamos/${id}`);
    revalidatePath('/reclamos');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao acusar' };
  }
}

// ── Responder reclamo (Acciona / cliente) ───────────────────────────────────

const respondClaimSchema = z.object({
  claimId: z.string().uuid(),
  outcome: z.enum(['aceito', 'rejeitado', 'parcial']),
  note: z.string().min(3),
});

export async function respondClaim(
  input: z.infer<typeof respondClaimSchema>,
): Promise<{ error?: string }> {
  try {
    const parsed = respondClaimSchema.parse(input);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();
    if (!profile) return { error: 'Perfil não encontrado' };
    if (profile.role !== 'cliente') return { error: 'Apenas o destinatário pode responder' };

    const { data: claim } = await supabase
      .from('claims')
      .select('client_id, status, author_id, ref_code')
      .eq('id', parsed.claimId)
      .single();
    if (!claim) return { error: 'Reclamo não encontrado' };
    if (claim.client_id !== user.id) return { error: 'Sem permissão para responder este reclamo' };
    if (!['enviado', 'recebido', 'em_analise'].includes(claim.status)) {
      return { error: 'Reclamo não está em estado que permita resposta' };
    }

    const admin = createServiceClient();
    if (!admin) return { error: 'Configuração de servidor ausente' };

    const { error: updError } = await admin
      .from('claims')
      .update({
        status: 'respondido',
        response_at: new Date().toISOString(),
        response_outcome: parsed.outcome,
        response_note: parsed.note,
        responded_by: user.id,
      })
      .eq('id', parsed.claimId);
    if (updError) return { error: updError.message ?? 'Falha ao registrar resposta' };

    await admin.from('claim_timeline').insert({
      claim_id: parsed.claimId,
      event: 'responded',
      actor_id: user.id,
      actor_name: profile.full_name,
      detail: { outcome: parsed.outcome },
    });

    // Avisa o autor (Zitrón) por email — silencioso
    try {
      if (claim.author_id) {
        const [authorEmail, authorProfile, h] = await Promise.all([
          getUserEmail(claim.author_id),
          supabase.from('profiles').select('full_name').eq('id', claim.author_id).single(),
          headers(),
        ]);
        if (authorEmail) {
          await claimRespondedEmail({
            authorEmail,
            authorName: authorProfile.data?.full_name ?? 'Equipe Zitrón',
            refCode: claim.ref_code ?? '',
            clientName: profile.full_name,
            outcomeLabel: OUTCOME_LABELS_PT[parsed.outcome],
            note: parsed.note,
            claimUrl: `${appBaseUrl(h)}/pt/reclamos/${parsed.claimId}`,
          });
        }
      }
    } catch (_) { /* email nunca quebra */ }

    revalidatePath(`/reclamos/${parsed.claimId}`);
    revalidatePath('/reclamos');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao responder' };
  }
}

// ── Excluir reclamo (soft-delete — admin/supervisor autor) ──────────────────

export async function deleteClaim(claimId: string): Promise<{ error?: string }> {
  try {
    const id = z.string().uuid().parse(claimId);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    if (role === 'supervisor') {
      const { data: existing } = await supabase
        .from('claims')
        .select('author_id')
        .eq('id', id)
        .single();
      if (existing?.author_id !== user.id) {
        return { error: 'Sem permissão para excluir este reclamo' };
      }
    }

    const admin = createServiceClient();
    if (!admin) return { error: 'Configuração de servidor ausente' };

    const { data: updated, error } = await admin
      .from('claims')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id');

    if (error) return { error: error.message ?? 'Falha ao excluir reclamo' };
    if (!updated || updated.length === 0) return { error: 'Reclamo não encontrado ou já excluído' };

    revalidatePath('/reclamos');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}
