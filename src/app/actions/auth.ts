'use server';

import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/config';

/**
 * Login via Server Action — garante que os cookies de sessão são gravados
 * no servidor ANTES do redirect. Alternativa ao signInWithPassword + window.location
 * no client, que tem timing issue: o redirect pode disparar antes das cookies
 * sincronizarem, fazendo o server receber request sem sessão.
 *
 * IMPORTANTE: usa redirect do @/i18n/navigation (next-intl), passando href SEM
 * prefixo de locale. O next-intl adiciona o prefixo uma vez só. Usar
 * redirect('/pt') do next/navigation dentro do segmento [locale] resulta em
 * /pt/pt (o framework prefixa novamente).
 */
export async function loginAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const rawNext = String(formData.get('next') ?? '/');
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

  // Remove qualquer locale prefix do rawNext para que o next-intl possa adicionar
  // o prefixo correto apenas uma vez
  const stripped = rawNext.replace(/^\/(pt|en|es)(?=\/|$)/, '') || '/';

  // redirect do next-intl adiciona o prefixo de locale automaticamente.
  // href='/' + locale='pt' → '/pt'
  // href='/atividades' + locale='pt' → '/pt/atividades'
  redirect({ href: stripped, locale });
}
