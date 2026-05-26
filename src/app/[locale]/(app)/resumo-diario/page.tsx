import { Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default async function DailyReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const role = (me as any)?.role as 'admin' | 'supervisor' | 'cliente' | undefined;

  const { data: reports } = await (supabase as any)
    .from('daily_reports')
    .select('id, report_date, status, notes, cancellation_reason, sent_at, signed_at')
    .is('deleted_at', null)
    .order('report_date', { ascending: false })
    .limit(60);

  // Busca nomes de estações e clientes separado para evitar ambiguidade de FK
  const stationIds = [...new Set((reports ?? []).map((r: any) => r.station_id).filter(Boolean))];
  const clientIds  = [...new Set((reports ?? []).map((r: any) => r.client_id).filter(Boolean))];

  const stationMap: Record<string, string> = {};
  const clientMap:  Record<string, string> = {};

  const { data: rawReports } = await (supabase as any)
    .from('daily_reports')
    .select('id, report_date, status, notes, cancellation_reason, sent_at, signed_at, station_id, client_id')
    .is('deleted_at', null)
    .order('report_date', { ascending: false })
    .limit(60);

  const allStationIds = [...new Set((rawReports ?? []).map((r: any) => r.station_id).filter(Boolean))];
  const allClientIds  = [...new Set((rawReports ?? []).map((r: any) => r.client_id).filter(Boolean))];

  if (allStationIds.length) {
    const { data: stations } = await supabase
      .from('locations')
      .select('id, name')
      .in('id', allStationIds);
    (stations ?? []).forEach((s: any) => { stationMap[s.id] = s.name; });
  }

  if (allClientIds.length) {
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allClientIds);
    (clients ?? []).forEach((c: any) => { clientMap[c.id] = c.full_name; });
  }

  const localeStr = locale === 'pt' ? 'pt-BR' : locale;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('dailyReport.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rawReports?.length ?? 0} resumos
          </p>
        </div>
        {role !== 'cliente' && (
          <Button asChild>
            <Link href="/resumo-diario/novo">
              <Plus />
              {t('dailyReport.new')}
            </Link>
          </Button>
        )}
      </header>

      {(!rawReports || rawReports.length === 0) && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">{t('dailyReport.empty')}</p>
            {role !== 'cliente' && (
              <Button asChild size="sm" variant="outline">
                <Link href="/resumo-diario/novo">{t('dailyReport.emptyCta')}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {(rawReports ?? []).map((r: any) => (
          <li key={r.id}>
            <Card className="transition-all hover:border-primary/40">
              <CardContent className="p-4">
                <Link href={`/resumo-diario/${r.id}`} className="block">
                  <div className="flex items-center gap-2 mb-1">
                    <ReportStatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(r.report_date + 'T12:00:00', localeStr)}
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {stationMap[r.station_id] ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {clientMap[r.client_id] ? `Cliente: ${clientMap[r.client_id]}` : 'Sem cliente definido'}
                    {r.status === 'cancelado' && r.cancellation_reason && (
                      <span className="text-destructive/80">
                        {' · '}Cancelado: {r.cancellation_reason}
                      </span>
                    )}
                  </p>
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const map: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
    rascunho:              'secondary',
    aguardando_assinatura: 'warning',
    assinado:              'success',
    cancelado:             'destructive',
  };
  const labels: Record<string, string> = {
    rascunho:              'Rascunho',
    aguardando_assinatura: 'Aguardando assinatura',
    assinado:              'Assinado',
    cancelado:             'Cancelado',
  };
  return <Badge variant={map[status] ?? 'secondary'}>{labels[status] ?? status}</Badge>;
}
