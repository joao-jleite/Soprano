'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Login via Server Action — garante que os cookies de sessão são gravados
 * no servidor ANTES do redirect. Alternativa ao signInWithPassword + window.location
 * no client, que tem timing issue: o redirect pode disparar antes das cookies
 * sincronizarem, fazendo o server receber request sem sessão.
 */
export async function loginAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const rawNext = String(formData.get('next') ?? '/');
  const locale = String(formData.get('locale') ?? 'pt');

  if (!email || !password) {
    return { ok: false, error: 'Email e senha obrigatórios' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: 'Email ou senha inválidos' };
  }

  // Cookies JÁ foram setadas pelo createClient (via cookieStore.set)
  // Monta destino com prefixo de locale
  const stripped = rawNext.replace(/^\/(pt|en|es)(?=\/|$)/, '') || '/';
  const target = stripped === '/' ? `/${locale}` : `/${locale}${stripped}`;

  // redirect() em server action lança NEXT_REDIRECT que o framework trata
  redirect(target);
}
