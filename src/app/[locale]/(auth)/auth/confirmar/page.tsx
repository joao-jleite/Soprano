'use client';

/**
 * Página client-side universal para receber links do Supabase Auth.
 *
 * Trata quatro cenários possíveis:
 *   1. PKCE      — ?code=XXX
 *   2. OTP       — ?token_hash=XXX&type=...
 *   3. Hash      — #access_token=...&refresh_token=... (implicit flow)
 *   4. Nenhum    — token expirado → login com erro
 */

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';

function ConfirmarInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const next      = searchParams.get('next') ?? '/pt/nova-senha';
  const code      = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type      = searchParams.get('type');

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const destination = next.startsWith('/') ? next : '/pt/nova-senha';
    const loginErr =
      '/pt/login?error=link_expired&error_description=' +
      encodeURIComponent('O link expirou ou já foi utilizado. Solicite um novo link.');

    async function handle() {
      try {
        // ── 1. PKCE (?code=XXX) ─────────────────────────────────────────────
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          router.replace(error ? loginErr : destination);
          return;
        }

        // ── 2. OTP (?token_hash=XXX&type=...) ──────────────────────────────
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          router.replace(error ? loginErr : destination);
          return;
        }

        // ── 3. Hash (#access_token=...&refresh_token=...) ───────────────────
        // createBrowserClient (SSR) não processa o hash automaticamente —
        // precisamos parsear e chamar setSession explicitamente.
        const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
        if (hash) {
          const params        = new URLSearchParams(hash);
          const accessToken   = params.get('access_token');
          const refreshToken  = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token:  accessToken,
              refresh_token: refreshToken,
            });
            router.replace(error ? loginErr : destination);
            return;
          }
        }

        // ── 4. Nenhum token encontrado ──────────────────────────────────────
        router.replace(loginErr);
      } catch (e: any) {
        console.error('[confirmar]', e?.message);
        router.replace(loginErr);
      }
    }

    handle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Verificando acesso…</p>
    </div>
  );
}

const Fallback = (
  <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    <p className="text-sm text-muted-foreground">Verificando acesso…</p>
  </div>
);

export default function ConfirmarPage() {
  return <Suspense fallback={Fallback}><ConfirmarInner /></Suspense>;
}
