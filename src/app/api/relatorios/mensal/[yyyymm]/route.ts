import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { MonthlyReportPdf, type MonthlyActivity } from '@/lib/pdf/monthly-report-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONTH_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ yyyymm: string }> },
) {
  const { yyyymm } = await params;
  const m = yyyymm.match(/^(\d{4})(\d{2})$/);
  if (!m) return new NextResponse('Formato inválido. Use YYYYMM (ex: 202604)', { status: 400 });

  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  if (month < 1 || month > 12) return new NextResponse('Mês inválido', { status: 400 });

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

  // Período: primeiro dia do mês até primeiro dia do mês seguinte
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const { data, error } = await supabase
    .from('activities')
    .select(
      `
      id, description, started_at, status,
      locations(name),
      activity_types(label_pt),
      supervisor:profiles!activities_supervisor_id_fkey(full_name),
      client:profiles!activities_client_id_fkey(full_name),
      signatures(signed_at)
      `,
    )
    .is('deleted_at', null)
    .gte('started_at', start.toISOString())
    .lt('started_at', end.toISOString())
    .order('started_at', { ascending: true })
    .limit(2000);

  if (error) return new NextResponse(`Erro: ${error.message}`, { status: 500 });

  const activities: MonthlyActivity[] = (data ?? []).map((a: any) => ({
    id: a.id,
    description: a.description,
    started_at: a.started_at,
    status: a.status,
    location_name: a.locations?.name,
    type_label: a.activity_types?.label_pt,
    supervisor_name: a.supervisor?.full_name,
    client_name: a.client?.full_name,
    signed_at: a.signatures?.[0]?.signed_at ?? null,
  }));

  const periodLabel = `${MONTH_PT[month - 1]} de ${year}`;

  const doc = MonthlyReportPdf({
    period: { year, month },
    activities,
    generatedAt: new Date().toISOString(),
    periodLabel,
  });

  const stream = await renderToStream(doc as any);

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="soprano-mensal-${yyyymm}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
