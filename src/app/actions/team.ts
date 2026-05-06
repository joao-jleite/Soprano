'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(2).optional(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(['admin', 'supervisor', 'cliente']).optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  role: z.enum(['admin', 'supervisor', 'cliente']),
  company: z.string().nullable().optional(),
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

export async function inviteUser(input: z.infer<typeof inviteSchema>) {
  const parsed = inviteSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if ((me as any)?.role !== 'admin') {
    throw new Error('Apenas admins podem convidar usuários');
  }

  const admin = createServiceClient();
  if (!admin) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurado — convites automáticos indisponíveis',
    );
  }

  // URL de redirecionamento após o usuário definir a senha
  // Prioridade: NEXT_PUBLIC_APP_URL (produção) > VERCEL_URL (auto-injetado pelo Vercel) > cabeçalho origin
  const h = await headers();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL; // formato: "myapp.vercel.app" (sem protocolo)
  const origin =
    (appUrl && !appUrl.includes('localhost') ? appUrl : null) ??
    (vercelUrl ? `https://${vercelUrl}` : null) ??
    h.get('origin') ??
    `https://${h.get('host') ?? 'localhost:3000'}`;
  const redirectTo = `${origin}/pt/login`;

  // Envia o convite — Supabase manda email com link mágico
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.email,
    {
      data: { full_name: parsed.full_name, invited_by: user.id },
      redirectTo,
    },
  );
  if (inviteErr) {
    // Se o usuário já existe, tenta apenas upsert do perfil
    if (!inviteErr.message?.includes('already been registered')) {
      throw inviteErr;
    }
  }

  const userId = invited?.user?.id;
  if (userId) {
    // Cria/atualiza o perfil com o papel correto
    const { error: upsertErr } = await admin.from('profiles').upsert(
      {
        id: userId,
        full_name: parsed.full_name,
        role: parsed.role,
        company: parsed.company ?? null,
      } as any,
      { onConflict: 'id' },
    );
    if (upsertErr) throw upsertErr;
  }

  revalidatePath('/equipe');
  return { ok: true, email: parsed.email };
}

