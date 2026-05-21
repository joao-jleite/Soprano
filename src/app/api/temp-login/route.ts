import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse, type NextRequest } from 'next/server';

// Rota temporária para apresentação — REMOVER após 2026-05-21
// Gera magic link via service role sem enviar email (bypass rate limit)
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const email = searchParams.get('email') ?? 'joaovitor.leite@zitron.com';

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: 'Service role não configurado' }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${origin}/pt` },
  });

  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao gerar link' }, { status: 500 });
  }

  return NextResponse.redirect(data.properties.action_link);
}
