import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

// Rota temporária — deletar após uso
const EMAILS = [
  'andressa.oliveira@zitron.com',
  'carloseduardo_ceds@yahoo.com.br',
  'edipebr@hotmail.com',
  'jctrevizan@hotmail.com',
  'joao.jleite3@gmail.com',
  'joao.liro155@gmail.com',
  'joaovitor.leite@zitron.com',
  'leo.ramos.real2769@gmail.com',
  'pablitofernanditos@gmail.com',
  'pedro.deoliveira@zitron.com',
  'renne.oliveira@zitron.com',
  'sergiocaetano2104@gmail.com',
];

export async function POST(request: Request) {
  const { secret, password } = await request.json();

  // Proteção simples contra chamada acidental
  if (secret !== process.env.RESET_SECRET || !secret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Senha inválida' }, { status: 400 });
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: 'Service key não configurada' }, { status: 500 });

  const results: { email: string; ok: boolean; error?: string }[] = [];

  // Busca todos os usuários de uma vez
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  for (const email of EMAILS) {
    const user = users.find((u) => u.email === email);
    if (!user) {
      results.push({ email, ok: false, error: 'Não encontrado no Auth' });
      continue;
    }
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    results.push({ email, ok: !error, error: error?.message });
  }

  return NextResponse.json({ results });
}
