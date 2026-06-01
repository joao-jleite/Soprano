import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Callback de autenticação do Supabase Auth.
 *
 * IMPORTANTE: não usa createClient() de server.ts porque aquele helper
 * grava cookies no cookieStore do Next.js, mas o NextResponse.redirect()
 * que retornamos é um objeto separado — os cookies não seriam incluídos
 * na resposta e o browser continuaria com a sessão antiga.
 *
 * Aqui criamos o client inline passando o redirect como target dos cookies,
 * garantindo que a nova sessão chegue ao browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code       = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type       = searchParams.get('type') as 'invite' | 'recovery' | 'email' | 'signup' | null;
  const next       = searchParams.get('next') ?? '/pt/nova-senha';
  const error      = searchParams.get('error');
  const errorDesc  = searchParams.get('error_description');

  const safePath = (p: string) => (p.startsWith('/') ? p : '/pt/nova-senha');
  const destination = `${origin}${safePath(next)}`;

  // Supabase enviou erro explícito no link (ex: link expirado)
  if (error) {
    const url = new URL(`${origin}/pt/login`);
    url.searchParams.set('error', error);
    url.searchParams.set('error_description', errorDesc ?? '');
    return NextResponse.redirect(url);
  }

  // Helper: cria client cujos cookies são gravados diretamente no response
  function makeSupabaseForResponse(res: NextResponse) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            );
          },
        },
      },
    );
  }

  // ── Fluxo 1: PKCE (?code=XXX) ────────────────────────────────────────────
  if (code) {
    const redirectRes = NextResponse.redirect(destination);
    const supabase    = makeSupabaseForResponse(redirectRes);
    const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeErr) {
      return redirectRes; // carrega cookies da nova sessão
    }
    console.error('[callback] exchangeCodeForSession:', exchangeErr.message);
  }

  // ── Fluxo 2: OTP (?token_hash=XXX&type=invite) ───────────────────────────
  if (token_hash && type) {
    const redirectRes = NextResponse.redirect(destination);
    const supabase    = makeSupabaseForResponse(redirectRes);
    const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!otpErr) {
      return redirectRes; // carrega cookies da nova sessão
    }
    console.error('[callback] verifyOtp:', otpErr.message);
  }

  // ── Fluxo 3: Hash-based (#access_token) — servidor nunca recebe o hash ───
  if (!code && !token_hash) {
    const url = new URL(`${origin}/pt/auth/confirmar`);
    url.searchParams.set('next', safePath(next));
    return NextResponse.redirect(url);
  }

  // Fallback: link inválido ou expirado
  const fallback = new URL(`${origin}/pt/login`);
  fallback.searchParams.set('error', 'link_expired');
  fallback.searchParams.set(
    'error_description',
    'O link expirou ou já foi utilizado. Solicite um novo convite.',
  );
  return NextResponse.redirect(fallback);
}
