'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserEmail } from '@/lib/supabase/service';
import { activitySignedEmail } from '@/lib/notify/email';

const signSchema = z.object({
  activityId: z.string().uuid(),
  svgData: z.string().min(10),
});

const rejectSchema = z.object({
  activityId: z.string().uuid(),
  reason: z.string().min(3),
  svgData: z.string().default('<svg/>'),
});

export async function signActivity(input: z.infer<typeof signSchema>) {
  const parsed = signSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();
  if (!profile) throw new Error('Profile not found');
  if (profile.role !== 'cliente') throw new Error('Only clients can sign');

  const h = await headers();
  const ua = h.get('user-agent') ?? null;
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const { error } = await supabase.from('signatures').insert({
    activity_id: parsed.activityId,
    signer_id: user.id,
    signer_name: profile.full_name,
    svg_data: parsed.svgData,
    user_agent: ua,
    ip_address: ip,
  });
  if (error) throw error;

  // Notifica supervisor
  try {
    const { data: act } = await supabase
      .from('activities')
      .select('description, supervisor_id')
      .eq('id', parsed.activityId)
      .single();
    const supId = (act as any)?.supervisor_id;
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
          supervisorName: (sup as any)?.full_name ?? 'supervisor',
          description: (act as any).description,
          clientName: profile.full_name,
          activityUrl: `${origin}/pt/atividades/${parsed.activityId}`,
        });
      }
    }
  } catch (e) {
    console.warn('[notify] sign email failed', e);
  }

  revalidatePath(`/atividades/${parsed.activityId}`);
  revalidatePath('/atividades');
  revalidatePath('/');
}

export async function rejectActivity(input: z.infer<typeof rejectSchema>) {
  const parsed = rejectSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'cliente') throw new Error('Only clients can reject');

  const { error } = await supabase.from('signatures').insert({
    activity_id: parsed.activityId,
    signer_id: user.id,
    signer_name: profile.full_name,
    svg_data: parsed.svgData,
    rejected: true,
    reject_reason: parsed.reason,
  });
  if (error) throw error;
  revalidatePath(`/atividades/${parsed.activityId}`);
}
