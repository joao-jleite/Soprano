import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/login', '/verify'];

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

  // Root → locale default (com ou sem auth)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/pt' : '/pt/login';
    return redirectWithCookies(url, supaResponse);
  }

  const pathWithoutLocale = pathname.replace(/^\/(pt|en|es)(?=\/|$)/, '') || '/';
  const isPublic = PUBLIC_ROUTES.some((p) => pathWithoutLocale.startsWith(p));

  // Não autenticado tentando acessar área privada
  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/pt/login';
    url.searchParams.set('next', pathname);
    return redirectWithCookies(url, supaResponse);
  }

  // Autenticado caindo em /login (mas /verify é acessível sempre)
  if (isPublic && user && pathWithoutLocale.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/pt';
    url.searchParams.delete('next');
    return redirectWithCookies(url, supaResponse);
  }

  return supaResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.svg|logo\\.svg|.*\\..*).*)'],
};
