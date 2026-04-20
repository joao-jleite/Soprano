'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TABLES = ['activities', 'locations', 'activity_types', 'profiles'] as const;
type Table = (typeof ALLOWED_TABLES)[number];

const input = z.object({
  table: z.enum(ALLOWED_TABLES),
  id: z.string().uuid(),
});

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return { supabase, user, role: (me as any)?.role as 'admin' | 'supervisor' | 'cliente' | undefined };
}

export async function softDelete(arg: z.infer<typeof input>) {
  const { table, id } = input.parse(arg);
  const { supabase, role } = await requireAuth();

  // Apenas admin pode mover locais/tipos/profiles; supervisor pode apagar própria atividade
  if (table !== 'activities' && role !== 'admin') {
    throw new Error('Apenas admins podem excluir este recurso');
  }

  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  revalidatePath('/atividades');
  revalidatePath('/locais');
  revalidatePath('/equipe');
  revalidatePath('/equipe/lixeira');
  revalidatePath('/');
}

export async function restoreDeleted(arg: z.infer<typeof input>) {
  const { table, id } = input.parse(arg);
  const { supabase, role } = await requireAuth();
  if (role !== 'admin') throw new Error('Apenas admins');

  const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
  if (error) throw error;

  revalidatePath('/atividades');
  revalidatePath('/locais');
  revalidatePath('/equipe');
  revalidatePath('/equipe/lixeira');
}

export async function hardDelete(arg: z.infer<typeof input>) {
  const { table, id } = input.parse(arg);
  const { supabase, role } = await requireAuth();
  if (role !== 'admin') throw new Error('Apenas admins');

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;

  revalidatePath('/equipe/lixeira');
}
