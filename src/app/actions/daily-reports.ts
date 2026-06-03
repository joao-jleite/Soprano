'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, getUserEmail } from '@/lib/supabase/service';
import { dailyReportSubmittedEmail, dailyReportSignedEmail } from '@/lib/notify/email';

// ── Criar resumo diário ────────────────────────────────────────────────────

const createReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clientId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
});

export async function createDailyReport(input: z.infer<typeof createReportSchema>) {
  const parsed = createReportSchema.parse(input);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await (supabase as any)
    .from('daily_reports')
    .insert({
      report_date: parsed.reportDate,
      station_id: null,
      client_id: parsed.clientId ?? null,
      supervisor_id: user.id,
      notes: parsed.notes ?? null,
    })
    .select('id')
    .single();

  if (error || !data) throw error ?? new Error('Falha ao criar resumo');

  revalidatePath('/resumo-diario');
  return data.id as string;
}

// ── Adicionar / remover atividade do resumo ────────────────────────────────

export async function addActivityToReport(reportId: string, activityId: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const aId = z.string().uuid().parse(activityId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };
    const { error } = await (supabase as any)
      .from('daily_report_activities')
      .insert({ daily_report_id: rId, activity_id: aId });
    if (error) return { error: error.message };
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
    const { error } = await (supabase as any)
      .from('daily_report_activities')
      .delete()
      .eq('daily_report_id', rId)
      .eq('activity_id', aId);
    if (error) return { error: error.message };
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const { count, error: countError } = await (supabase as any)
      .from('daily_report_activities')
      .select('*', { count: 'exact', head: true })
      .eq('daily_report_id', rId);

    if (countError) return { error: countError.message ?? 'Erro ao verificar atividades' };
    if (!count || count === 0) return { error: 'Adicione pelo menos uma atividade antes de enviar' };

    // Tenta update com sent_at; se falhar (coluna não existe), tenta sem
    let updatedReport: any = null;
    const withSentAt = await (supabase as any)
      .from('daily_reports')
      .update({ status: 'aguardando_assinatura', sent_at: new Date().toISOString() })
      .eq('id', rId)
      .select('client_id, report_date, supervisor_id')
      .single();

    if (withSentAt.error) {
      // Fallback sem sent_at
      const withoutSentAt = await (supabase as any)
        .from('daily_reports')
        .update({ status: 'aguardando_assinatura' })
        .eq('id', rId)
        .select('client_id, report_date, supervisor_id')
        .single();
      if (withoutSentAt.error) return { error: withoutSentAt.error.message ?? 'Erro ao enviar resumo' };
      updatedReport = withoutSentAt.data;
    } else {
      updatedReport = withSentAt.data;
    }

    // Atualiza status das atividades do resumo para 'enviada' (service role bypassa RLS)
    try {
      const adminClient = createServiceClient();
      if (adminClient) {
        const { data: reportActivities } = await (adminClient as any)
          .from('daily_report_activities')
          .select('activity_id')
          .eq('daily_report_id', rId);
        if (reportActivities && reportActivities.length > 0) {
          const activityIds = reportActivities.map((ra: any) => ra.activity_id);
          await (adminClient as any)
            .from('activities')
            .update({ status: 'enviada' })
            .in('id', activityIds);
        }
      }
    } catch (_) { /* silencioso — não bloqueia o envio */ }

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
            clientName: (clientProfile.data as any)?.full_name ?? 'Cliente',
            reportDate: updatedReport.report_date,
            reportUrl: `${origin}/pt/resumo-diario/${rId}`,
            supervisorName: (supervisorProfile.data as any)?.full_name ?? 'Supervisor',
          });
        }
      }
    } catch (_) { /* email nunca quebra */ }

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
    if ((profile as any).role !== 'cliente') return { error: 'Apenas clientes podem assinar' };

    // Verifica que o cliente é o designado e o resumo está aguardando
    const { data: report } = await (supabase as any)
      .from('daily_reports')
      .select('client_id, status, supervisor_id, report_date')
      .eq('id', parsed.reportId)
      .single();
    if (!report) return { error: 'Resumo não encontrado' };
    if (report.client_id !== user.id) return { error: 'Sem permissão para assinar este resumo' };
    if (report.status !== 'aguardando_assinatura') return { error: 'Resumo não está aguardando assinatura' };

    const h = await headers();
    const ua = h.get('user-agent') ?? null;
    const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? null;

    const { error: sigError } = await (supabase as any)
      .from('daily_report_signatures')
      .insert({
        daily_report_id: parsed.reportId,
        signer_id: user.id,
        signer_name: (profile as any).full_name,
        svg_data: parsed.svgData,
        ip_address: ip,
        user_agent: ua,
      });

    if (sigError) return { error: sigError.message ?? 'Falha ao registrar assinatura' };

    // Atualiza status via service role (bypass RLS — autorização já verificada acima)
    const admin = createServiceClient();
    if (admin) {
      const now = new Date().toISOString();
      const { error: updError } = await (admin as any)
        .from('daily_reports')
        .update({ status: 'assinado', signed_at: now })
        .eq('id', parsed.reportId);
      if (updError) return { error: updError.message ?? 'Falha ao atualizar status' };
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
            supervisorName: (supProfile.data as any)?.full_name ?? 'Supervisor',
            reportDate: report.report_date,
            clientName: (profile as any).full_name,
            reportUrl: `${origin}/pt/resumo-diario/${parsed.reportId}`,
          });
        }
      }
    } catch (_) { /* email nunca quebra o fluxo */ }

    // Sem revalidatePath — todas as páginas são force-dynamic (buscam dados frescos a cada request).
    // Qualquer revalidatePath inline pode falhar e vazar o erro genérico do Next.js para o cliente.
    // A navegação com router.push já garante dados atualizados.
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

    if ((profile as any)?.role !== 'cliente') return { error: 'Apenas clientes podem cancelar' };

    const { data: report } = await (supabase as any)
      .from('daily_reports')
      .select('client_id, status')
      .eq('id', parsed.reportId)
      .single();
    if (!report) return { error: 'Resumo não encontrado' };
    if (report.client_id !== user.id) return { error: 'Sem permissão para cancelar este resumo' };
    if (report.status !== 'aguardando_assinatura') return { error: 'Resumo não está aguardando assinatura' };

    const h = await headers();
    const ua = h.get('user-agent') ?? null;
    const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? null;

    const { error: cancelSigError } = await (supabase as any)
      .from('daily_report_signatures')
      .insert({
        daily_report_id: parsed.reportId,
        signer_id: user.id,
        signer_name: (profile as any).full_name,
        svg_data: null,
        cancelled: true,
        cancel_reason: parsed.reason,
        ip_address: ip,
        user_agent: ua,
      });

    if (cancelSigError) return { error: cancelSigError.message ?? 'Falha ao registrar cancelamento' };

    // Atualiza status via service role (bypass RLS)
    const adminForCancel = createServiceClient();
    if (adminForCancel) {
      await (adminForCancel as any)
        .from('daily_reports')
        .update({ status: 'cancelado', cancellation_reason: parsed.reason })
        .eq('id', parsed.reportId);

      // Marca atividades do resumo como 'rejeitada'
      try {
        const { data: reportActivities } = await (adminForCancel as any)
          .from('daily_report_activities')
          .select('activity_id')
          .eq('daily_report_id', parsed.reportId);
        if (reportActivities && reportActivities.length > 0) {
          const activityIds = reportActivities.map((ra: any) => ra.activity_id);
          await (adminForCancel as any)
            .from('activities')
            .update({ status: 'rejeitada' })
            .in('id', activityIds);
        }
      } catch (_) { /* silencioso */ }
    }

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };
    const { error } = await (supabase as any)
      .from('daily_reports')
      .update({ notes })
      .eq('id', rId);
    if (error) return { error: error.message ?? 'Falha ao salvar observações' };
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = (profile as any)?.role;
    if (!['admin', 'supervisor'].includes(role)) return { error: 'Sem permissão para excluir resumos' };

    // Supervisores só podem excluir os próprios resumos
    if (role === 'supervisor') {
      const { data: existingReport } = await (supabase as any)
        .from('daily_reports')
        .select('supervisor_id')
        .eq('id', rId)
        .single();
      if (existingReport?.supervisor_id !== user.id) return { error: 'Sem permissão para excluir este resumo' };
    }

    // Usa service role para bypassar RLS — permissões já validadas acima
    const adminClient = createServiceClient();
    const { error: updateError, data: updated } = await (adminClient as any)
      .from('daily_reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', rId)
      .is('deleted_at', null)
      .select('id');

    if (updateError) {
      console.error('[delete] code=' + updateError.code + ' msg=' + updateError.message);
      return { error: updateError.message ?? 'Falha ao excluir resumo' };
    }

    if (!updated || updated.length === 0) {
      return { error: 'Resumo não encontrado ou já excluído' };
    }

    revalidatePath('/resumo-diario');
    return {};
  } catch (e: any) {
    console.error('[delete] unexpected:', e?.message);
    return { error: e?.message ?? 'Erro inesperado' };
  }
}

// ── Reenviar resumo cancelado ─────────────────────────────────────────────

export async function resendReport(reportId: string): Promise<{ error?: string }> {
  try {
    const rId = z.string().uuid().parse(reportId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const adminResend = createServiceClient();
    if (!adminResend) return { error: 'Configuração de servidor ausente' };

    // Remove assinaturas do resumo (bypass RLS via service role)
    await (adminResend as any)
      .from('daily_report_signatures')
      .delete()
      .eq('daily_report_id', rId);

    // Reativa o resumo
    const { error } = await (adminResend as any)
      .from('daily_reports')
      .update({ status: 'aguardando_assinatura', cancellation_reason: null })
      .eq('id', rId);

    if (error) return { error: error.message ?? 'Erro ao reenviar resumo' };

    // Busca atividades do resumo e volta para 'enviada', removendo assinaturas individuais
    try {
      const { data: reportActivities } = await (adminResend as any)
        .from('daily_report_activities')
        .select('activity_id')
        .eq('daily_report_id', rId);
      if (reportActivities && reportActivities.length > 0) {
        const activityIds = reportActivities.map((ra: any) => ra.activity_id);
        await (adminResend as any)
          .from('activities')
          .update({ status: 'enviada' })
          .in('id', activityIds);
        // Remove assinaturas individuais anteriores
        await (adminResend as any)
          .from('signatures')
          .delete()
          .in('activity_id', activityIds)
          .eq('rejected', false);
      }
    } catch (_) { /* silencioso */ }

    revalidatePath('/resumo-diario');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}
