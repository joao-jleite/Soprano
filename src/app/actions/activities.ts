'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserEmail } from '@/lib/supabase/service';
import { activitySubmittedEmail } from '@/lib/notify/email';
import { headers } from 'next/headers';

const participantSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
});

const photoSchema = z.object({
  storagePath: z.string().min(1),
  caption: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const createActivitySchema = z.object({
  locationId: z.string().uuid(),
  activityTypeId: z.string().uuid(),
  clientId: z.string().uuid().nullable().optional(),
  description: z.string().min(3),
  notes: z.string().optional(),
  startedAt: z.string(),
  endedAt: z.string().optional().nullable(),
  participants: z.array(participantSchema).default([]),
  photos: z.array(photoSchema).default([]),
  submit: z.boolean().default(false),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export async function createActivity(input: CreateActivityInput) {
  const parsed = createActivitySchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Not authenticated');

  const status = parsed.submit ? 'enviada' : 'rascunho';
  const submittedAt = parsed.submit ? new Date().toISOString() : null;

  const { data: activity, error } = await supabase
    .from('activities')
    .insert({
      location_id: parsed.locationId,
      activity_type_id: parsed.activityTypeId,
      client_id: parsed.clientId ?? null,
      supervisor_id: user.id,
      description: parsed.description,
      notes: parsed.notes ?? null,
      started_at: parsed.startedAt,
      ended_at: parsed.endedAt ?? null,
      status,
      submitted_at: submittedAt,
    })
    .select('id')
    .single();

  if (error || !activity) throw error ?? new Error('Failed to create activity');

  if (parsed.participants.length) {
    await supabase.from('activity_participants').insert(
      parsed.participants.map((p) => ({
        activity_id: activity.id,
        name: p.name,
        role: p.role ?? null,
      })),
    );
  }

  if (parsed.photos.length) {
    await supabase.from('activity_photos').insert(
      parsed.photos.map((p) => ({
        activity_id: activity.id,
        storage_path: p.storagePath,
        caption: p.caption ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
      })),
    );
  }

  revalidatePath('/atividades');
  revalidatePath('/');
  return activity.id;
}

export async function submitActivityForSignature(activityId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('activities')
    .update({ status: 'enviada', submitted_at: new Date().toISOString() })
    .eq('id', activityId);
  if (error) throw error;

  // Notifica cliente por email (se configurado)
  try {
    const { data: act } = await supabase
      .from('activities')
      .select('description, client_id')
      .eq('id', activityId)
      .single();
    if ((act as any)?.client_id) {
      const { data: client } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', (act as any).client_id)
        .single();
      const email = await getUserEmail((act as any).client_id);
      if (email) {
        const h = await headers();
        const origin = h.get('origin') ?? h.get('referer')?.replace(/\/[^/]*$/, '') ?? '';
        await activitySubmittedEmail({
          clientEmail: email,
          clientName: (client as any)?.full_name ?? 'cliente',
          description: (act as any).description,
          activityUrl: `${origin}/pt/atividades/${activityId}`,
        });
      }
    }
  } catch (e) {
    console.warn('[notify] submit email failed', e);
  }

  revalidatePath(`/atividades/${activityId}`);
  revalidatePath('/atividades');
}

export async function createLocation(name: string, kind: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('locations')
    .insert({ name, kind: kind as any, created_by: user?.id ?? null, line: 'linha-6' })
    .select('id, name, kind')
    .single();
  if (error || !data) throw error ?? new Error('Failed to create location');
  revalidatePath('/locais');
  return data;
}

export async function createActivityType(input: {
  labelPt: string;
  labelEn?: string;
  labelEs?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const slug = slugify(input.labelPt);
  const { data, error } = await supabase
    .from('activity_types')
    .insert({
      slug,
      label_pt: input.labelPt,
      label_en: input.labelEn ?? input.labelPt,
      label_es: input.labelEs ?? input.labelPt,
      created_by: user?.id ?? null,
    })
    .select('id, slug, label_pt, label_en, label_es')
    .single();
  if (error || !data) throw error ?? new Error('Failed to create type');
  return data;
}

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
