'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2).optional(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['admin', 'supervisor', 'cliente']).optional(),
});

export async function updateProfile(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if ((me as any)?.role !== 'admin') throw new Error('Apenas admins podem editar perfis');

  const patch: any = {};
  if (parsed.full_name !== undefined) patch.full_name = parsed.full_name;
  if (parsed.company !== undefined) patch.company = parsed.company;
  if (parsed.phone !== undefined) patch.phone = parsed.phone;
  if (parsed.role !== undefined) patch.role = parsed.role;

  const { error } = await supabase.from('profiles').update(patch).eq('id', parsed.id);
  if (error) throw error;

  revalidatePath('/equipe');
}
