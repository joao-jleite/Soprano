'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

// ── Criar resumo diário ────────────────────────────────────────────────────

const createReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  stationId: z.string().uuid(),
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
      station_id: parsed.stationId,
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

export async function addActivityToReport(reportId: string, activityId: string) {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('daily_report_activities')
    .insert({ daily_report_id: reportId, activity_id: activityId });

  if (error) throw error;
  revalidatePath(`/resumo-diario/${reportId}`);
}

export async function removeActivityFromReport(reportId: string, activityId: string) {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('daily_report_activities')
    .delete()
    .eq('daily_report_id', reportId)
    .eq('activity_id', activityId);

  if (error) throw error;
  revalidatePath(`/resumo-diario/${reportId}`);
}

// ── Enviar para assinatura ─────────────────────────────────────────────────

export async function sendReportForSignature(reportId: string) {
  const supabase = await createClient();

  const { count, error: countError } = await (supabase as any)
    .from('daily_report_activities')
    .select('*', { count: 'exact', head: true })
    .eq('daily_report_id', reportId);

  if (countError) throw countError;
  if (!count || count === 0) throw new Error('Adicione pelo menos uma atividade antes de enviar');

  const { error } = await (supabase as any)
    .from('daily_reports')
    .update({ status: 'aguardando_assinatura' })
    .eq('id', reportId);

  if (error) throw error;

  revalidatePath(`/resumo-diario/${reportId}`);
  revalidatePath('/resumo-diario');
  revalidatePath('/');
}

// ── Assinar resumo (cliente) ───────────────────────────────────────────────

const signReportSchema = z.object({
  reportId: z.string().uuid(),
  svgData: z.string().min(10),
});

export async function signDailyReport(input: z.infer<typeof signReportSchema>) {
  const parsed = signReportSchema.parse(input);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Perfil não encontrado');
  if ((profile as any).role !== 'cliente') throw new Error('Apenas clientes podem assinar');

  const h = await headers();
  const ua = h.get('user-agent') ?? null;
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const { error } = await (supabase as any)
    .from('daily_report_signatures')
    .insert({
      daily_report_id: parsed.reportId,
      signer_id: user.id,
      signer_name: (profile as any).full_name,
      svg_data: parsed.svgData,
      ip_address: ip,
      user_agent: ua,
    });

  if (error) throw error;

  revalidatePath(`/resumo-diario/${parsed.reportId}`);
  revalidatePath('/resumo-diario');
  revalidatePath('/');
}

// ── Cancelar assinatura (cliente) ──────────────────────────────────────────

const cancelReportSchema = z.object({
  reportId: z.string().uuid(),
  reason: z.string().min(3),
});

export async function cancelDailyReport(input: z.infer<typeof cancelReportSchema>) {
  const parsed = cancelReportSchema.parse(input);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if ((profile as any)?.role !== 'cliente') throw new Error('Apenas clientes podem cancelar');

  const h = await headers();
  const ua = h.get('user-agent') ?? null;
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const { error } = await (supabase as any)
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

  if (error) throw error;

  revalidatePath(`/resumo-diario/${parsed.reportId}`);
  revalidatePath('/resumo-diario');
  revalidatePath('/');
}

// ── Atualizar observações (supervisor) ────────────────────────────────────

export async function updateReportNotes(reportId: string, notes: string) {
  const supabase = await createClient();

  const { error } = await (supabase as any)
    .from('daily_reports')
    .update({ notes })
    .eq('id', reportId);

  if (error) throw error;
  revalidatePath(`/resumo-diario/${reportId}`);
}

// ── Reenviar resumo cancelado ─────────────────────────────────────────────

export async function resendReport(reportId: string) {
  const supabase = await createClient();

  // Remove assinatura de cancelamento anterior
  await (supabase as any)
    .from('daily_report_signatures')
    .delete()
    .eq('daily_report_id', reportId);

  const { error } = await (supabase as any)
    .from('daily_reports')
    .update({ status: 'aguardando_assinatura', cancellation_reason: null })
    .eq('id', reportId);

  if (error) throw error;

  revalidatePath(`/resumo-diario/${reportId}`);
  revalidatePath('/resumo-diario');
}
