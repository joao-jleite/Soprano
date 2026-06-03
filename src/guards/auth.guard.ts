import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { Role } from '@/lib/supabase/database.types';

type TypedClient = SupabaseClient<Database>;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/** Garante sessão ativa. Lança AuthError se não autenticado. */
export async function requireAuth(supabase: TypedClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new AuthError('Não autenticado');
  return user;
}

/** Garante que o usuário tem pelo menos um dos roles informados. */
export async function requireRole(supabase: TypedClient, userId: string, ...roles: Role[]) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) throw new PermissionError('Perfil não encontrado');
  if (!roles.includes(data.role)) {
    throw new PermissionError('Sem permissão para esta operação');
  }
  return data.role;
}

/** Garante autenticação + role em uma única chamada. */
export async function requireAuthAndRole(supabase: TypedClient, ...roles: Role[]) {
  const user = await requireAuth(supabase);
  const role = await requireRole(supabase, user.id, ...roles);
  return { user, role };
}
