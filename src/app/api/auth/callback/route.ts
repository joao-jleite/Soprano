import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Callback PKCE do Supabase Auth.
 * Handles: convites de novos usuários e redefinição de senha.
 *
 * Supabase redireciona aqui com ?code=XXX após o usuário clicar no link do email.
 * Nós trocamos o code por uma sessão e redirecionamos para a página correta.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/pt/nova-senha';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Supabase pode redirecionar com erro (ex: link expirado)
  if (error) {
    const url = new URL(`${origin}/pt/login`);
    url.searchParams.set('error', error);
    url.searchParams.set('error_description', errorDescription ?? '');
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // Redireciona para onde o link mandou (default: /pt/nova-senha)
      const redirectUrl = next.startsWith('/')
        ? `${origin}${next}`
        : next;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Fallback: link inválido ou expirado
  const fallback = new URL(`${origin}/pt/login`);
  fallback.searchParams.set('error', 'link_expired');
  return NextResponse.redirect(fallback);
}
