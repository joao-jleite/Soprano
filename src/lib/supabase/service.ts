import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Client com service-role — bypass RLS.
 * Usar SOMENTE em server actions / route handlers para operações
 * administrativas (lookup de email para notificação, etc).
 *
 * Retorna null se SUPABASE_SERVICE_ROLE_KEY não estiver configurado,
 * permitindo que features opcionais (email) degradem graciosamente.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createServiceClient();
  if (!admin) return null;
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}
