'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, getUserEmail } from '@/lib/supabase/service';
import { dailyReportSubmittedEmail, dailyReportSignedEmail } from '@/lib/notify/email';
import { requireAuthAndRole } from '@/guards/auth.guard';
import { logger } from '@/lib/logger';

const log = logger.for('daily-reports');

// ── Criar resumo diário ────────────────────────────────────────────────────

const createReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

export async function createDailyReport(
  input: z.infer<typeof createReportSchema>,
): Promise<{ id?: string; error?: string }> {
  try {
    const parsed = createReportSchema.parse(input);
    const supabase = await createClient();
    const { user } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data, error } = await supabase
      .from('daily_reports')
      .insert({
        report_date: parsed.reportDate,
        client_id: parsed.clientId ?? null,
        supervisor_id: user.id,
        notes: parsed.notes ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      log.error('Falha ao criar resumo diário', { error: error?.message });
      return { error: error?.message ?? 'Falha ao criar resumo' };
    }

    revalidatePath('/resumo-diario');
    return { id: data.id };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── Adicionar / remover atividade do resumo ────────────────────────────────

// Helper: verifica ownership do resumo (admin passa sempre, supervisor precisa ser dono)
async function assertReportOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rId: string,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  const role = profile?.role;
  if (!role || !['admin', 'supervisor'].includes(role)) return 'Sem permissão para modificar resumos';
  if (role === 'supervisor') {
    const { data: rep } = await supabase
      .from('daily_reports')
      .select('supervisor_id, status')
      .eq('id', rId)
      .single();
    if (!rep) return 'Resumo não encontrado';
    if (rep.supervisor_id !== userId) return 'Sem permissão para modificar este resumo';
    if (!['rascunho', 'cancelado'].includes(rep.status)) return 'Resumo não pode ser modificado neste estado';
  }
  return null;
}

// Helper: garante que as atividades pertencem ao mesmo supervisor/cliente do resumo.
// Evita que um supervisor adicione atividade de outro supervisor/cliente ao seu resumo.
async function assertActivitiesBelongToReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rId: string,
  activityIds: string[],
  userId: string,
): Promise<string | null> {
  const [{ data: rep }, { data: acts }, { data: me }] = await Promise.all([
    supabase.from('daily_reports').select('supervisor_id, client_id').eq('id', rId).single(),
    supabase.from('activities').select('id, supervisor_id, client_id').in('id', activityIds),
    supabase.from('profiles').select('role').eq('id', userId).single(),
  ]);
  if (!rep) return 'Resumo não encontrado';
  if (!acts || acts.length !== activityIds.length) return 'Atividade não encontrada';
  const isAdmin = me?.role === 'admin';
  for (const a of acts) {
    if (!isAdmin && a.supervisor_id !== rep.supervisor_id) {
      return 'Atividade não pertence ao supervisor deste resumo';
    }
    if (rep.client_id && a.client_id && a.client_id !== rep.client_id) {
      return 'Atividade pertence a outro cliente';
    }
  }
  return null;
}

export async function addActivityToReport(reportId: string, activityId: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const aId = z.string().uuid().parse(activityId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };
    const ownershipError = await assertReportOwnership(supabase, rId, user.id);
    if (ownershipError) return { error: ownershipError };
    const activityError = await assertActivitiesBelongToReport(supabase, rId, [aId], user.id);
    if (activityError) return { error: activityError };
    const { error } = await supabase
      .from('daily_report_activities')
      .insert({ daily_report_id: rId, activity_id: aId });
    if (error) return { error: error.message };
    revalidatePath(`/resumo-diario/${rId}`);
    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

export async function addAllActivitiesToReport(reportId: string, activityIds: string[]): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const aIds = z.array(z.string().uuid()).min(1).parse(activityIds);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };
    const ownershipError = await assertReportOwnership(supabase, rId, user.id);
    if (ownershipError) return { error: ownershipError };
    const activityError = await assertActivitiesBelongToReport(supabase, rId, aIds, user.id);
    if (activityError) return { error: activityError };
    const rows = aIds.map((activity_id) => ({ daily_report_id: rId, activity_id }));
    const { error } = await supabase.from('daily_report_activities').insert(rows);
    if (error) return { error: error.message };
    revalidatePath(`/resumo-diario/${rId}`);
    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

export async function removeActivityFromReport(reportId: string, activityId: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const aId = z.string().uuid().parse(activityId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };
    const ownershipError = await assertReportOwnership(supabase, rId, user.id);
    if (ownershipError) return { error: ownershipError };
    const { error } = await supabase
      .from('daily_report_activities')
      .delete()
      .eq('daily_report_id', rId)
      .eq('activity_id', aId);
    if (error) return { error: error.message };
    revalidatePath(`/resumo-diario/${rId}`);
    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── Enviar para assinatura ─────────────────────────────────────────────────

export async function sendReportForSignature(reportId: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data: existingReport } = await supabase
      .from('daily_reports')
      .select('supervisor_id, client_id, report_date')
      .eq('id', rId)
      .single();

    if (!existingReport) return { error: 'Resumo não encontrado' };
    if (role === 'supervisor' && existingReport.supervisor_id !== user.id) {
      return { error: 'Sem permissão para enviar este resumo' };
    }

    const { count, error: countError } = await supabase
      .from('daily_report_activities')
      .select('*', { count: 'exact', head: true })
      .eq('daily_report_id', rId);

    if (countError) return { error: countError.message ?? 'Erro ao verificar atividades' };
    if (!count || count === 0) return { error: 'Adicione pelo menos uma atividade antes de enviar' };

    const { data: updatedReport, error: updError } = await supabase
      .from('daily_reports')
      .update({ status: 'aguardando_assinatura', sent_at: new Date().toISOString() })
      .eq('id', rId)
      .select('client_id, report_date, supervisor_id')
      .single();

    if (updError) return { error: updError.message ?? 'Erro ao enviar resumo' };

    // Notifica cliente por email (silencioso)
    try {
      if (updatedReport?.client_id) {
        const [clientEmail, clientProfile, supervisorProfile, h] = await Promise.all([
          getUserEmail(updatedReport.client_id),
          supabase.from('profiles').select('full_name').eq('id', updatedReport.client_id).single(),
          supabase.from('profiles').select('full_name').eq('id', updatedReport.supervisor_id).single(),
          headers(),
        ]);
        if (clientEmail) {
          const origin = h.get('origin') ?? h.get('x-forwarded-host') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
          await dailyReportSubmittedEmail({
            clientEmail,
            clientName: clientProfile.data?.full_name ?? 'Cliente',
            reportDate: updatedReport.report_date,
            reportUrl: `${origin}/resumo-diario/${rId}`,
            supervisorName: supervisorProfile.data?.full_name ?? 'Supervisor',
          });
        }
      }
    } catch (_) { /* email nunca quebra */ }

    revalidatePath(`/resumo-diario/${rId}`);
    revalidatePath('/resumo-diario');
    revalidatePath('/');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao enviar' };
  }
}

// ── Assinar resumo (cliente) ───────────────────────────────────────────────

const signReportSchema = z.object({
  reportId: z.string().uuid(),
  svgData: z.string().min(10),
});

export async function signDailyReport(
  input: z.infer<typeof signReportSchema>,
): Promise<{ error?: string }> {
  try {
    const parsed = signReportSchema.parse(input);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (!profile) return { error: 'Perfil não encontrado' };
    if (profile.role !== 'cliente') return { error: 'Apenas clientes podem assinar' };

    const { data: report } = await supabase
      .from('daily_reports')
      .select('client_id, status, supervisor_id, report_date')
      .eq('id', parsed.reportId)
      .single();

    if (!report) return { error: 'Resumo não encontrado' };
    if (report.client_id !== user.id) return { error: 'Sem permissão para assinar este resumo' };
    if (report.status !== 'aguardando_assinatura') return { error: 'Resumo não está aguardando assinatura' };

    const h = await headers();
    const ua = h.get('user-agent') ?? null;
    const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const { error: sigError } = await supabase
      .from('daily_report_signatures')
      .insert({
        daily_report_id: parsed.reportId,
        signer_id: user.id,
        signer_name: profile.full_name,
        svg_data: parsed.svgData,
        ip_address: ip,
        user_agent: ua,
      });

    if (sigError) return { error: sigError.message ?? 'Falha ao registrar assinatura' };

    // Garante status 'assinado'. Em bancos com o trigger (migration 0013) isso já
    // ocorreu no insert acima; o update via service role é defesa redundante.
    const admin = createServiceClient();
    if (admin) {
      await admin
        .from('daily_reports')
        .update({ status: 'assinado', signed_at: new Date().toISOString() })
        .eq('id', parsed.reportId);
    }

    // Confirma que o resumo ficou de fato assinado (via trigger OU service role).
    // Evita retornar sucesso silencioso quando o status não pôde ser atualizado.
    const { data: confirm } = await supabase
      .from('daily_reports')
      .select('status')
      .eq('id', parsed.reportId)
      .single();
    if (confirm?.status !== 'assinado') {
      return { error: 'Assinatura registrada, mas o status não pôde ser confirmado. Contate o suporte.' };
    }

    // Notifica supervisor por email (silencioso)
    try {
      if (report.supervisor_id) {
        const [supEmail, supProfile] = await Promise.all([
          getUserEmail(report.supervisor_id),
          supabase.from('profiles').select('full_name').eq('id', report.supervisor_id).single(),
        ]);
        const origin = h.get('origin') ?? h.get('x-forwarded-host') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
        if (supEmail) {
          await dailyReportSignedEmail({
            supervisorEmail: supEmail,
            supervisorName: supProfile.data?.full_name ?? 'Supervisor',
            reportDate: report.report_date,
            clientName: profile.full_name,
            reportUrl: `${origin}/resumo-diario/${parsed.reportId}`,
          });
        }
      }
    } catch (_) { /* email nunca quebra o fluxo */ }

    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao assinar' };
  }
}

// ── Cancelar assinatura (cliente) ──────────────────────────────────────────

const cancelReportSchema = z.object({
  reportId: z.string().uuid(),
  reason: z.string().min(3),
});

export async function cancelDailyReport(
  input: z.infer<typeof cancelReportSchema>,
): Promise<{ error?: string }> {
  try {
    const parsed = cancelReportSchema.parse(input);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'cliente') return { error: 'Apenas clientes podem cancelar' };

    const { data: report } = await supabase
      .from('daily_reports')
      .select('client_id, status')
      .eq('id', parsed.reportId)
      .single();

    if (!report) return { error: 'Resumo não encontrado' };
    if (report.client_id !== user.id) return { error: 'Sem permissão para cancelar este resumo' };
    if (report.status !== 'aguardando_assinatura') return { error: 'Resumo não está aguardando assinatura' };

    const h = await headers();
    const ua = h.get('user-agent') ?? null;
    const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

    const adminForCancel = createServiceClient();
    if (!adminForCancel) return { error: 'Configuração de servidor ausente' };

    // Remove assinatura anterior (evita unique constraint em tentativas parciais)
    await adminForCancel
      .from('daily_report_signatures')
      .delete()
      .eq('daily_report_id', parsed.reportId);

    const { error: cancelSigError } = await adminForCancel
      .from('daily_report_signatures')
      .insert({
        daily_report_id: parsed.reportId,
        signer_id: user.id,
        signer_name: profile?.full_name ?? '',
        svg_data: null,
        cancelled: true,
        cancel_reason: parsed.reason,
        ip_address: ip,
        user_agent: ua,
      } as any);

    if (cancelSigError) return { error: cancelSigError.message ?? 'Falha ao registrar cancelamento' };

    await adminForCancel
      .from('daily_reports')
      .update({ status: 'cancelado', cancellation_reason: parsed.reason })
      .eq('id', parsed.reportId);

    revalidatePath(`/resumo-diario/${parsed.reportId}`);
    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao cancelar' };
  }
}

// ── Atualizar observações (supervisor) ────────────────────────────────────

export async function updateReportNotes(reportId: string, notes: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    if (role === 'supervisor') {
      const { data: rep } = await supabase
        .from('daily_reports')
        .select('supervisor_id')
        .eq('id', rId)
        .single();
      if (rep?.supervisor_id !== user.id) return { error: 'Sem permissão para editar este resumo' };
    }

    const { error } = await supabase
      .from('daily_reports')
      .update({ notes })
      .eq('id', rId);

    if (error) return { error: error.message ?? 'Falha ao salvar observações' };

    revalidatePath(`/resumo-diario/${rId}`);
    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── Excluir resumo (soft-delete — admin/supervisor) ───────────────────────

export async function deleteDailyReport(reportId: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    if (role === 'supervisor') {
      const { data: existingReport } = await supabase
        .from('daily_reports')
        .select('supervisor_id')
        .eq('id', rId)
        .single();
      if (existingReport?.supervisor_id !== user.id) {
        return { error: 'Sem permissão para excluir este resumo' };
      }
    }

    const adminClient = createServiceClient();
    const { error: updateError, data: updated } = await adminClient
      ?.from('daily_reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', rId)
      .is('deleted_at', null)
      .select('id') ?? { error: new Error('Service client indisponível'), data: null };

    if (updateError) {
      log.error('Falha ao excluir resumo', { id: rId, error: (updateError as any)?.message });
      return { error: (updateError as any)?.message ?? 'Falha ao excluir resumo' };
    }

    if (!updated || (updated as any[]).length === 0) {
      return { error: 'Resumo não encontrado ou já excluído' };
    }

    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── Reenviar resumo cancelado ─────────────────────────────────────────────

export async function resendReport(reportId: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const supabase = await createClient();
    const { user, role } = await requireAuthAndRole(supabase, 'admin', 'supervisor');

    const { data: existingForResend } = await supabase
      .from('daily_reports')
      .select('supervisor_id, client_id, report_date')
      .eq('id', rId)
      .single();

    if (!existingForResend) return { error: 'Resumo não encontrado' };
    if (role === 'supervisor' && existingForResend.supervisor_id !== user.id) {
      return { error: 'Sem permissão para reenviar este resumo' };
    }

    const adminResend = createServiceClient();
    if (!adminResend) return { error: 'Configuração de servidor ausente' };

    await adminResend
      .from('daily_report_signatures')
      .delete()
      .eq('daily_report_id', rId);

    const { error } = await adminResend
      .from('daily_reports')
      .update({ status: 'aguardando_assinatura', cancellation_reason: null })
      .eq('id', rId);

    if (error) return { error: error.message ?? 'Erro ao reenviar resumo' };

    // Notifica cliente por email (silencioso)
    try {
      if (existingForResend.client_id) {
        const [clientEmail, clientProfile, supervisorProfile, h] = await Promise.all([
          getUserEmail(existingForResend.client_id),
          supabase.from('profiles').select('full_name').eq('id', existingForResend.client_id).single(),
          supabase.from('profiles').select('full_name').eq('id', existingForResend.supervisor_id).single(),
          headers(),
        ]);
        if (clientEmail) {
          const origin = h.get('origin') ?? h.get('x-forwarded-host') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
          await dailyReportSubmittedEmail({
            clientEmail,
            clientName: clientProfile.data?.full_name ?? 'Cliente',
            reportDate: existingForResend.report_date,
            reportUrl: `${origin}/resumo-diario/${rId}`,
            supervisorName: supervisorProfile.data?.full_name ?? 'Supervisor',
          });
        }
      }
    } catch (_) { /* email nunca quebra */ }

    revalidatePath(`/resumo-diario/${rId}`);
    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}
