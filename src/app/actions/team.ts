'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { softDelete } from './soft-delete';

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

export async function deleteProfileUser(targetId: string): Promise<{ error?: string }> {
  try {
    const id = z.string().uuid().parse(targetId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };
    if (user.id === id) return { error: 'Você não pode excluir a própria conta' };
    await softDelete({ table: 'profiles', id });
    return {};
  } catch (e: any) {
    return { error: e?.message ?? 'Erro ao excluir usuário' };
  }
}

export async function inviteUser(
  input: z.infer<typeof inviteSchema>,
): Promise<{ ok?: true; email?: string; inviteUrl?: string; isRecovery?: boolean; error?: string }> {
  try {
    const parsed = inviteSchema.parse(input);
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Não autenticado' };

    const { data: me } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if ((me as any)?.role !== 'admin') {
      return { error: 'Apenas admins podem convidar usuários' };
    }

    const admin = createServiceClient();
    if (!admin) {
      return { error: 'SUPABASE_SERVICE_ROLE_KEY não configurado — convites automáticos indisponíveis' };
    }

    // Determina a origin estável (x-forwarded-host no Vercel, nunca VERCEL_URL)
    const h = await headers();
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL;
    const fwdHost   = h.get('x-forwarded-host');
    const fwdProto  = h.get('x-forwarded-proto') ?? 'https';
    const reqHost   = h.get('host');
    const origin =
      (appUrl && !appUrl.includes('localhost') ? appUrl : null) ??
      (fwdHost ? `${fwdProto}://${fwdHost}` : null) ??
      (reqHost ? `https://${reqHost}` : null) ??
      'https://localhost:3000';
    // Link de convite (novo usuário) → callback server-side processa o token
    const redirectTo         = `${origin}/api/auth/callback?next=/pt/nova-senha`;
    // Link de recovery (usuário já confirmado) → página client-side preserva o hash
    const redirectToRecovery = `${origin}/pt/auth/confirmar?next=/pt/nova-senha`;

    // ── Se o usuário já existe no Auth, limpa o registro não-confirmado ───────
    const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = listData?.users?.find((u: any) => u.email === parsed.email);
    console.log('[inviteUser] existing auth user:', existing?.id ?? 'none', '| confirmed:', existing?.email_confirmed_at ?? 'no');

    if (existing?.email_confirmed_at) {
      // Conta confirmada — sincroniza o perfil e gera link de redefinição de senha
      // (útil para re-convidar alguém que nunca acessou de verdade ou que perdeu o link)
      await admin.from('profiles').upsert(
        { id: existing.id, email: parsed.email, full_name: parsed.full_name,
          role: parsed.role, company: parsed.company ?? null } as any,
        { onConflict: 'id' },
      );

      const recoveryRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
        body: JSON.stringify({
          type: 'recovery',
          email: parsed.email,
          redirect_to: redirectToRecovery, // client-side page — preserva o hash fragment
        }),
      });
      const recoveryJson = await recoveryRes.json();
      console.log('[inviteUser] recovery link status:', recoveryRes.status, '| action_link:', recoveryJson?.action_link ? 'present' : 'MISSING');

      revalidatePath('/equipe');
      return {
        ok: true,
        email: parsed.email,
        inviteUrl: recoveryJson?.action_link ?? undefined,
        isRecovery: true,
      };
    }

    if (existing && !existing.email_confirmed_at) {
      // Conta não confirmada — apaga para gerar link fresco
      const { error: delErr } = await admin.auth.admin.deleteUser(existing.id);
      if (delErr) console.error('[inviteUser] deleteUser error:', delErr.message);
    }

    // ── Gera o link de convite via REST direto no GoTrue ──────────────────────
    // Motivo: admin.auth.admin.generateLink() varia entre versões do client.
    // Chamada REST é direta, sempre funciona e retorna action_link garantido.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({
        type: 'invite',
        email: parsed.email,
        data: { full_name: parsed.full_name, invited_by: user.id },
        redirect_to: redirectTo,
      }),
    });

    const linkJson = await linkRes.json();
    console.log('[inviteUser] generate_link status:', linkRes.status, '| action_link:', linkJson?.action_link ? 'present' : 'MISSING', '| error:', linkJson?.msg ?? linkJson?.message ?? 'none');

    if (!linkRes.ok) {
      const errMsg = linkJson?.msg ?? linkJson?.message ?? `Erro ${linkRes.status} ao gerar link`;
      return { error: errMsg };
    }

    const inviteUrl: string | undefined = linkJson?.action_link;
    const userId: string | undefined    = linkJson?.id;

    if (!inviteUrl) {
      console.error('[inviteUser] action_link ausente na resposta:', JSON.stringify(linkJson));
      return { error: 'Link de convite não foi retornado — verifique as configurações do Supabase' };
    }

    // Sincroniza o perfil com role/empresa definidos pelo admin
    if (userId) {
      const { error: upsertErr } = await admin.from('profiles').upsert(
        {
          id: userId,
          email: parsed.email,
          full_name: parsed.full_name,
          role: parsed.role,
          company: parsed.company ?? null,
        } as any,
        { onConflict: 'id' },
      );
      if (upsertErr) return { error: upsertErr.message ?? 'Falha ao salvar perfil' };
    }

    revalidatePath('/equipe');
    return { ok: true, email: parsed.email, inviteUrl };
  } catch (e: any) {
    console.error('[inviteUser]', e?.message);
    return { error: e?.message ?? 'Erro inesperado ao enviar convite' };
  }
}

