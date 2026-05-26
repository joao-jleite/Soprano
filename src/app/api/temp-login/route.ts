import { createServiceClient } from '@/lib/supabase/service';
import { NextResponse, type NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Rota temporária para apresentação — REMOVER após 2026-05-21
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const email = (searchParams.get('email') ?? 'joaovitor.leite@zitron.com').toLowerCase();

  try {
    const admin = createServiceClient();
    if (!admin) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurado' }, { status: 500 });
    }

    // Busca todos os usuários e filtra por email
    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listErr) {
      return NextResponse.json({ error: `listUsers: ${listErr.message}` }, { status: 500 });
    }

    const user = listData.users.find((u) => u.email?.toLowerCase() === email);
    if (!user) {
      return NextResponse.json({ error: `Usuário não encontrado: ${email}` }, { status: 404 });
    }

    // Define senha temporária conhecida via admin API (sem enviar email)
    const tempPassword = 'Soprano2026!';
    const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
      password: tempPassword,
    });
    if (updateErr) {
      return NextResponse.json({ error: `updateUser: ${updateErr.message}` }, { status: 500 });
    }

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <title>Login Temporário — Soprano</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;background:#0c1018;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#1a2035;border:1px solid #2d3a55;border-radius:12px;padding:32px;max-width:380px;width:calc(100% - 32px);text-align:center}
    h2{font-size:20px;margin-bottom:8px}
    p{color:#94a3b8;font-size:14px;margin-bottom:24px}
    .field{background:#0c1018;border:1px solid #2d3a55;border-radius:8px;padding:12px 16px;margin-bottom:12px;text-align:left}
    .label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
    .value{font-size:15px;font-weight:600;margin-top:4px;font-family:monospace;word-break:break-all}
    a{display:block;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;padding:14px;font-weight:600;margin-top:16px}
    a:hover{background:#2563eb}
  </style>
</head>
<body>
  <div class="card">
    <h2>Credenciais Temporárias</h2>
    <p>Senha redefinida sem email. Use para logar agora.</p>
    <div class="field">
      <div class="label">Email</div>
      <div class="value">${email}</div>
    </div>
    <div class="field">
      <div class="label">Senha temporária</div>
      <div class="value">${tempPassword}</div>
    </div>
    <a href="${origin}/pt/login">Ir para o Login →</a>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
