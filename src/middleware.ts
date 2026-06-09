import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/login', '/verify', '/nova-senha', '/esqueci-senha'];

// Propaga cookies do supaResponse (refresh tokens etc) para qualquer redirect
// que a gente faça no middleware — senão a sessão é perdida e vira loop.
function redirectWithCookies(url: URL, supaResponse: NextResponse) {
  const res = NextResponse.redirect(url);
  supaResponse.cookies.getAll().forEach((c) => {
    res.cookies.set(c.name, c.value, c);
  });
  return res;
}

export async function middleware(request: NextRequest) {
  const { response: supaResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Extrai locale da URL para propagar header que o next-intl lê
  const localeMatch = pathname.match(/^\/(pt|en|es)(?=\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'pt';

  // Root → locale default (com ou sem auth)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    if (url.searchParams.get('code')) {
      url.pathname = '/api/auth/callback';
      return redirectWithCookies(url, supaResponse);
    }
    url.pathname = user ? '/pt' : '/pt/login';
    return redirectWithCookies(url, supaResponse);
  }

  const pathWithoutLocale = pathname.replace(/^\/(pt|en|es)(?=\/|$)/, '') || '/';
  const isPublic = PUBLIC_ROUTES.some((p) => pathWithoutLocale.startsWith(p));

  // Não autenticado tentando acessar área privada
  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('next', pathname);
    return redirectWithCookies(url, supaResponse);
  }

  // Autenticado caindo em /login (mas /verify é acessível sempre)
  if (isPublic && user && pathWithoutLocale.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.searchParams.delete('next');
    return redirectWithCookies(url, supaResponse);
  }

  // Propaga locale para o next-intl (lido por requestLocale em getRequestConfig)
  supaResponse.headers.set('x-next-intl-locale', locale);
  return supaResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.svg|logo\\.svg|.*\\..*).*)'],
};
