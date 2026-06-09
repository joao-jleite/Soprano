import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { MonthlyReportPdf, type MonthlyActivity } from '@/lib/pdf/monthly-report-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// react-pdf pode renderizar centenas/milhares de atividades — evita 504 no default de 10s
export const maxDuration = 60;

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
    .maybeSingle();
  const role = profile?.role;
  if (role !== 'admin' && role !== 'supervisor') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Período: 1º dia do mês até 1º dia do mês seguinte, em horário de São Paulo.
  // SP é UTC-3 fixo (Brasil aboliu o horário de verão em 2019), então 00:00 BRT
  // = 03:00 UTC. Sem este ajuste, atividades do fim do mês (ex: 30/06 23h BRT)
  // cairiam no mês seguinte.
  const start = new Date(Date.UTC(year, month - 1, 1, 3, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 3, 0, 0));

  const { data, error } = await supabase
    .from('activities')
    .select(
      `
      id, description, started_at, status,
      locations(name),
      activity_types(label_pt),
      supervisor:profiles!activities_supervisor_id_fkey(full_name),
      client:profiles!activities_client_id_fkey(full_name)
      `,
    )
    .is('deleted_at', null)
    .gte('started_at', start.toISOString())
    .lt('started_at', end.toISOString())
    .order('started_at', { ascending: true })
    .limit(2000);

  if (error) return new NextResponse(`Erro: ${error.message}`, { status: 500 });

  // Assinatura vem do resumo diário (a tabela `signatures` de atividade é legada).
  const activityIds = (data ?? []).map((a: any) => a.id);
  const signedAtMap: Record<string, string | null> = {};
  if (activityIds.length > 0) {
    const { data: draData } = await supabase
      .from('daily_report_activities')
      .select(`activity_id, daily_reports(status, signed_at)`)
      .in('activity_id', activityIds);
    for (const dra of (draData ?? []) as any[]) {
      const report = dra.daily_reports;
      if (report?.status === 'assinado') {
        signedAtMap[dra.activity_id] = report.signed_at ?? null;
      }
    }
  }

  const activities: MonthlyActivity[] = (data ?? []).map((a: any) => ({
    id: a.id,
    description: a.description,
    started_at: a.started_at,
    status: a.status,
    location_name: a.locations?.name,
    type_label: a.activity_types?.label_pt,
    supervisor_name: a.supervisor?.full_name,
    client_name: a.client?.full_name,
    signed_at: signedAtMap[a.id] ?? null,
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
