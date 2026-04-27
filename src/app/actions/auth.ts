'use server';

import { createClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/config';

/**
 * Login via Server Action — garante que os cookies de sessão são gravados
 * no servidor ANTES do redirect.
 *
 * Retorna { ok: true, href } com o path completo para o client navegar via
 * window.location.href. Evita qualquer ambiguidade de prefixo de locale
 * (o path retornado já inclui /{locale}/...).
 */
export async function loginAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; href?: string }> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const rawNext = String(formData.get('next') ?? '');
  const localeRaw = String(formData.get('locale') ?? 'pt');
  const locale = (['pt', 'en', 'es'] as const).includes(localeRaw as Locale)
    ? (localeRaw as Locale)
    : 'pt';

  if (!email || !password) {
    return { ok: false, error: 'Email e senha obrigatórios' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: 'Email ou senha inválidos' };
  }

  // Determina o destino:
  // - Remove prefixo de locale do next param (se houver)
  // - Garante que começa com /
  // - Prepende /{locale} exatamente uma vez
  const cleanNext = rawNext.replace(/^\/(pt|en|es)(\/|$)/, '/').replace(/^([^/])/, '/$1') || '/';
  const safePath = cleanNext.startsWith('/') ? cleanNext : `/${cleanNext}`;
  const href = `/${locale}${safePath === '/' ? '' : safePath}`;

  return { ok: true, href };
}
