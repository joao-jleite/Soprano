'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireAuthAndRole } from '@/guards/auth.guard';
import { logger } from '@/lib/logger';

const log = logger.for('team');

// ── Schemas ────────────────────────────────────────────────────────────────

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

// ── updateProfile ──────────────────────────────────────────────────────────

export async function updateProfile(
  input: z.infer<typeof updateSchema>,
): Promise<{ error?: string }> {
  try {
    const parsed = updateSchema.parse(input);
    const supabase = await createClient();
    await requireAuthAndRole(supabase, 'admin');

    const patch: Record<string, unknown> = {};
    if (parsed.full_name !== undefined) patch.full_name = parsed.full_name;
    if (parsed.company !== undefined) patch.company = parsed.company;
    if (parsed.phone !== undefined) patch.phone = parsed.phone;
    if (parsed.role !== undefined) patch.role = parsed.role;

    const { error } = await supabase
      .from('profiles')
      .update(patch as any)
      .eq('id', parsed.id);

    if (error) {
      log.error('Falha ao atualizar perfil', { id: parsed.id, error: error.message });
      return { error: error.message };
    }

    revalidatePath('/equipe');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── inviteUser ─────────────────────────────────────────────────────────────

export async function inviteUser(
  input: z.infer<typeof inviteSchema>,
): Promise<{ ok?: boolean; email?: string; error?: string }> {
  try {
    const parsed = inviteSchema.parse(input);
    const supabase = await createClient();
    await requireAuthAndRole(supabase, 'admin');

    const admin = createServiceClient();
    if (!admin) {
      return { error: 'SUPABASE_SERVICE_ROLE_KEY não configurado — convites indisponíveis' };
    }

    // URL de redirecionamento após o usuário definir a senha
    const h = await headers();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const vercelUrl = process.env.VERCEL_URL;
    const origin =
      (appUrl && !appUrl.includes('localhost') ? appUrl : null) ??
      (vercelUrl ? `https://${vercelUrl}` : null) ??
      h.get('origin') ??
      `https://${h.get('host') ?? 'localhost:3000'}`;
    const redirectTo = `${origin}/api/auth/callback?next=/pt/nova-senha`;

    // Envia o convite — Supabase manda email com link mágico
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      parsed.email,
      {
        data: { full_name: parsed.full_name },
        redirectTo,
      },
    );

    if (inviteErr) {
      // Usuário já existe no Auth → prossegue para atualizar o perfil
      if (!inviteErr.message?.includes('already been registered')) {
        log.error('Falha ao enviar convite', { email: parsed.email, error: inviteErr.message });
        return { error: inviteErr.message };
      }
      log.warn('Usuário já registrado, atualizando perfil', { email: parsed.email });
    }

    // Cria/atualiza o perfil com o papel correto
    const userId = invited?.user?.id;
    if (userId) {
      const { error: upsertErr } = await admin.from('profiles').upsert(
        {
          id: userId,
          email: parsed.email,          // obrigatório — corrige falha silenciosa anterior
          full_name: parsed.full_name,
          role: parsed.role,
          company: parsed.company ?? null,
        } as any,
        { onConflict: 'id' },
      );

      if (upsertErr) {
        // Convite foi enviado com sucesso — não bloqueia, só avisa
        log.error('Falha ao criar perfil do convidado', { userId, error: upsertErr.message });
        return {
          ok: true,
          email: parsed.email,
          error: `Convite enviado, mas houve um problema ao salvar o perfil: ${upsertErr.message}`,
        };
      }
    }

    revalidatePath('/equipe');
    return { ok: true, email: parsed.email };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}
