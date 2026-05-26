import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = (profile as any)?.role;
  if (role !== 'admin' && role !== 'supervisor') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? 90)));
  const sinceISO = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('activities')
    .select(
      `
      id, status, description, started_at, ended_at, submitted_at,
      locations(name),
      activity_types(label_pt),
      supervisor:profiles!activities_supervisor_id_fkey(full_name),
      client:profiles!activities_client_id_fkey(full_name),
      signatures(signed_at, verification_code, signer_name)
      `,
    )
    .is('deleted_at', null)
    .gte('started_at', sinceISO)
    .order('started_at', { ascending: false })
    .limit(5000);

  if (error) return new NextResponse(`Erro: ${error.message}`, { status: 500 });

  const header = [
    'id',
    'status',
    'descricao',
    'local',
    'tipo',
    'supervisor',
    'cliente',
    'iniciada_em',
    'encerrada_em',
    'enviada_em',
    'assinada_em',
    'assinante',
    'codigo_verificacao',
  ];
  const lines: string[] = [header.join(',')];

  for (const row of (data ?? []) as any[]) {
    const sig = row.signatures?.[0];
    lines.push(
      [
        row.id,
        row.status,
        row.description,
        row.locations?.name,
        row.activity_types?.label_pt,
        row.supervisor?.full_name,
        row.client?.full_name,
        row.started_at,
        row.ended_at,
        row.submitted_at,
        sig?.signed_at,
        sig?.signer_name,
        sig?.verification_code,
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  // BOM for Excel UTF-8 compatibility
  const body = '\uFEFF' + lines.join('\n');
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="soprano-atividades-${days}d-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
