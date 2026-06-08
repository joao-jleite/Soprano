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

    // URL de redirecionamento após o usuário clicar no link do email.
    // Usa apenas o caminho base do callback — sem parâmetros extras — para
    // evitar problemas de double-encoding pelo Supabase Auth.
    // O callback já tem /pt/nova-senha como destino padrão.
    const h = await headers();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const vercelUrl = process.env.VERCEL_URL;
    const origin =
      (appUrl && !appUrl.includes('localhost') ? appUrl : null) ??
      (vercelUrl ? `https://${vercelUrl}` : null) ??
      h.get('origin') ??
      `https://${h.get('host') ?? 'localhost:3000'}`;
    const redirectTo = `${origin}/api/auth/callback`;

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
          email: parsed.email,
          full_name: parsed.full_name,
          role: parsed.role,
          company: parsed.company ?? null,
        } as any,
        { onConflict: 'id' },
      );

      if (upsertErr) {
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

// ── deleteUser ─────────────────────────────────────────────────────────────

/**
 * Desativa um usuário: soft-delete no perfil + ban no Supabase Auth.
 * O usuário some da lista mas fica na lixeira e pode ser restaurado.
 */
export async function deleteUser(userId: string): Promise<{ error?: string }> {
  try {
    const id = z.string().uuid().parse(userId);
    const supabase = await createClient();
    const { user } = await requireAuthAndRole(supabase, 'admin');

    if (user.id === id) {
      return { error: 'Você não pode desativar sua própria conta' };
    }

    const admin = createServiceClient();
    if (!admin) return { error: 'Service client não configurado' };

    // Soft-delete do perfil via service role (bypass RLS para ver deleted_at)
    const { error: delErr } = await admin
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (delErr) {
      log.error('Falha ao desativar perfil', { id, error: delErr.message });
      return { error: delErr.message };
    }

    // Bane o usuário no Auth para bloquear login (10 anos = efetivamente permanente)
    const { error: banErr } = await admin.auth.admin.updateUserById(id, {
      ban_duration: '87600h',
    });
    if (banErr) {
      log.warn('Perfil desativado mas ban no auth falhou', { id, error: banErr.message });
      // Não reverte — perfil já foi soft-deleted
    }

    revalidatePath('/equipe');
    revalidatePath('/equipe/lixeira');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── restoreUser ────────────────────────────────────────────────────────────

/**
 * Reativa um usuário: restaura o perfil + remove o ban no Auth.
 */
export async function restoreUser(userId: string): Promise<{ error?: string }> {
  try {
    const id = z.string().uuid().parse(userId);
    const supabase = await createClient();
    await requireAuthAndRole(supabase, 'admin');

    const admin = createServiceClient();
    if (!admin) return { error: 'Service client não configurado' };

    // Restaura o perfil via service role
    const { error: restErr } = await admin
      .from('profiles')
      .update({ deleted_at: null } as any)
      .eq('id', id);

    if (restErr) {
      log.error('Falha ao restaurar perfil', { id, error: restErr.message });
      return { error: restErr.message };
    }

    // Remove o ban do Auth
    const { error: unbanErr } = await admin.auth.admin.updateUserById(id, {
      ban_duration: 'none',
    });
    if (unbanErr) {
      log.warn('Perfil restaurado mas unban no auth falhou', { id, error: unbanErr.message });
    }

    revalidatePath('/equipe');
    revalidatePath('/equipe/lixeira');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}

// ── hardDeleteUser ─────────────────────────────────────────────────────────

/**
 * Exclusão permanente: remove o perfil da tabela + deleta o usuário do Auth.
 * Irreversível — use somente quando o usuário nunca deve poder ser recuperado.
 */
export async function hardDeleteUser(userId: string): Promise<{ error?: string }> {
  try {
    const id = z.string().uuid().parse(userId);
    const supabase = await createClient();
    const { user } = await requireAuthAndRole(supabase, 'admin');

    if (user.id === id) {
      return { error: 'Você não pode excluir permanentemente sua própria conta' };
    }

    const admin = createServiceClient();
    if (!admin) return { error: 'Service client não configurado' };

    // Hard delete do perfil
    const { error: delErr } = await admin.from('profiles').delete().eq('id', id);
    if (delErr) {
      log.error('Falha ao excluir perfil permanentemente', { id, error: delErr.message });
      return { error: delErr.message };
    }

    // Remove o usuário do Auth
    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) {
      log.warn('Perfil excluído mas remoção do auth falhou', { id, error: authErr.message });
    }

    revalidatePath('/equipe/lixeira');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}
