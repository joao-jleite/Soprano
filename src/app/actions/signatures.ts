'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserEmail } from '@/lib/supabase/service';
import { activitySignedEmail } from '@/lib/notify/email';
import { logger } from '@/lib/logger';

const log = logger.for('signatures');

const signSchema = z.object({
  activityId: z.string().uuid(),
  svgData: z.string().min(10),
});

const rejectSchema = z.object({
  activityId: z.string().uuid(),
  reason: z.string().min(3),
  svgData: z.string().default('<svg/>'),
});

export async function signActivity(
  input: z.infer<typeof signSchema>,
): Promise<{ error?: string }> {
  try {
  const parsed = signSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();
  if (!profile) return { error: 'Perfil não encontrado' };
  if (profile.role !== 'cliente') return { error: 'Apenas clientes podem assinar' };

  // Confere ownership e estado antes de assinar (defesa em app, além da RLS).
  const { data: target } = await supabase
    .from('activities')
    .select('client_id, status')
    .eq('id', parsed.activityId)
    .single();
  if (!target) return { error: 'Atividade não encontrada' };
  if (target.client_id !== user.id) return { error: 'Sem permissão para assinar esta atividade' };
  if (target.status !== 'enviada') return { error: 'Atividade não está aguardando assinatura' };

  const h = await headers();
  const ua = h.get('user-agent') ?? null;
  const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const { error } = await supabase.from('signatures').insert({
    activity_id: parsed.activityId,
    signer_id: user.id,
    signer_name: profile.full_name,
    svg_data: parsed.svgData,
    user_agent: ua,
    ip_address: ip,
  });
  if (error) return { error: error.message };

  // Notifica supervisor
  try {
    const { data: act } = await supabase
      .from('activities')
      .select('description, supervisor_id')
      .eq('id', parsed.activityId)
      .single();
    const supId = act?.supervisor_id;
    if (supId) {
      const { data: sup } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', supId)
        .single();
      const email = await getUserEmail(supId);
      if (email) {
        const origin = h.get('origin') ?? '';
        await activitySignedEmail({
          supervisorEmail: email,
          supervisorName: sup?.full_name ?? 'supervisor',
          description: act?.description ?? '',
          clientName: profile.full_name,
          activityUrl: `${origin}/pt/atividades/${parsed.activityId}`,
        });
      }
    }
  } catch (e: unknown) {
    log.warn('Email de notificação falhou', { msg: e instanceof Error ? e.message : String(e) });
  }

  revalidatePath(`/atividades/${parsed.activityId}`);
  revalidatePath('/atividades');
  revalidatePath('/');
  return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao assinar' };
  }
}

export async function rejectActivity(
  input: z.infer<typeof rejectSchema>,
): Promise<{ error?: string }> {
  try {
  const parsed = rejectSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();
  if (!profile) return { error: 'Perfil não encontrado' };
  if (profile.role !== 'cliente') return { error: 'Apenas clientes podem recusar' };

  const { data: target } = await supabase
    .from('activities')
    .select('client_id, status')
    .eq('id', parsed.activityId)
    .single();
  if (!target) return { error: 'Atividade não encontrada' };
  if (target.client_id !== user.id) return { error: 'Sem permissão para recusar esta atividade' };
  if (target.status !== 'enviada') return { error: 'Atividade não está aguardando assinatura' };

  const { error } = await supabase.from('signatures').insert({
    activity_id: parsed.activityId,
    signer_id: user.id,
    signer_name: profile.full_name,
    svg_data: parsed.svgData,
    rejected: true,
    reject_reason: parsed.reason,
  });
  if (error) return { error: error.message };
  revalidatePath(`/atividades/${parsed.activityId}`);
  return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado ao recusar' };
  }
}
