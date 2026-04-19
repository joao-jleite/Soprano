import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/login'];

export async function middleware(request: NextRequest) {
  const { response: supaResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Root → locale default (com ou sem auth)
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/pt' : '/pt/login';
    return NextResponse.redirect(url);
  }

  const pathWithoutLocale = pathname.replace(/^\/(pt|en|es)(?=\/|$)/, '') || '/';
  const isPublic = PUBLIC_ROUTES.some((p) => pathWithoutLocale.startsWith(p));

  // Não autenticado tentando acessar área privada
  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/pt/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Autenticado caindo em /login
  if (isPublic && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/pt';
    url.searchParams.delete('next');
    return NextResponse.redirect(url);
  }

  return supaResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.svg|logo\\.svg|.*\\..*).*)'],
};
