'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/guards/auth.guard';
import { logger } from '@/lib/logger';

const log = logger.for('profile');

const nameSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
});

/**
 * Atualiza o NOME do PRÓPRIO usuário (self-service) e marca name_confirmed.
 *
 * Usado pelo onboarding (pop-up de primeiro+último nome) e pela edição em
 * Configurações. A RLS profiles_self_update permite o usuário editar a própria
 * linha; o trigger de 0019 só bloqueia mudança de `role`, então alterar o nome
 * é seguro mesmo para supervisor/cliente.
 */
export async function updateMyName(input: z.infer<typeof nameSchema>): Promise<{ error?: string }> {
  try {
    const { fullName } = nameSchema.parse(input);
    const supabase = await createClient();
    const user = await requireAuth(supabase);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, name_confirmed: true })
      .eq('id', user.id);

    if (error) {
      log.error('Falha ao salvar nome do perfil', { error: error.message });
      return { error: error.message };
    }

    // Revalida o layout inteiro: topbar, sidebar e qualquer tela que mostre o nome.
    revalidatePath('/', 'layout');
    return {};
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro inesperado' };
  }
}
