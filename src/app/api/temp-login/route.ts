import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse, type NextRequest } from 'next/server';

// Rota temporária para apresentação — REMOVER após 2026-05-21
// Define senha via admin API sem enviar email (bypass rate limit)
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const email = searchParams.get('email') ?? 'joaovitor.leite@zitron.com';

  const admin = createServiceClient();
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurado no Vercel' }, { status: 500 });
  }

  // Busca o usuário pelo email
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    return NextResponse.json({ error: `Usuário não encontrado: ${email}` }, { status: 404 });
  }

  // Define senha temporária conhecida (sem enviar email)
  const tempPassword = 'Soprano2026!';
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    password: tempPassword,
  });

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Retorna página HTML simples com as credenciais e botão de login
  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>Login Temporário — Soprano</title>
  <style>
    body { font-family: sans-serif; background: #0c1018; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1a2035; border: 1px solid #2d3a55; border-radius: 12px; padding: 32px; max-width: 360px; width: 100%; text-align: center; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    p { color: #94a3b8; font-size: 14px; margin: 0 0 24px; }
    .field { background: #0c1018; border: 1px solid #2d3a55; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; text-align: left; }
    .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
    .value { font-size: 15px; font-weight: 600; margin-top: 4px; font-family: monospace; }
    a { display: block; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; padding: 14px; font-weight: 600; margin-top: 8px; }
    a:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Credenciais Temporárias</h2>
    <p>Senha redefinida. Use para logar agora.</p>
    <div class="field">
      <div class="label">Email</div>
      <div class="value">${email}</div>
    </div>
    <div class="field">
      <div class="label">Senha</div>
      <div class="value">${tempPassword}</div>
    </div>
    <a href="${origin}/pt/login">Ir para o Login →</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
