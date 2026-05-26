import { NextResponse } from 'next/server';

// Rota de desenvolvimento removida por segurança.
// Para acessar contas em emergência, use o dashboard do Supabase:
// https://supabase.com/dashboard → Authentication → Users
export async function GET() {
  return new NextResponse('Not Found', { status: 404 });
}
