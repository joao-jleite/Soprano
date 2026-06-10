import { setRequestLocale, getTranslations } from 'next-intl/server';
import { FileText, Download, Activity as ActivityIcon, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonthlyPicker } from './monthly-picker';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tr = await getTranslations('reports');
  const supabase = await createClient();

  // Guard: apenas admin e supervisor acessam relatórios
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const role = (me as any)?.role;
  if (!user || !['admin', 'supervisor'].includes(role)) {
    redirect({ href: '/', locale });
  }

  const sinceISO = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const sinceDate = sinceISO.slice(0, 10);

  const [{ data: byStatus }, { data: byLocation }, { data: monthly }, { data: signedReports }] =
    await Promise.all([
      supabase.from('activities').select('status').is('deleted_at', null).gte('started_at', sinceISO),
      supabase
        .from('activities')
        .select('locations(name)')
        .is('deleted_at', null)
        .gte('started_at', sinceISO)
        .limit(1000),
      supabase
        .from('activities')
        .select('started_at')
        .is('deleted_at', null)
        .gte('started_at', new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString())
        .limit(2000),
      // Resumos assinados nos últimos 90 dias (substitui query de signatures em activities)
      (supabase as any)
        .from('daily_reports')
        .select('signed_at, sent_at')
        .eq('status', 'assinado')
        .gte('report_date', sinceDate)
        .not('signed_at', 'is', null)
        .limit(500),
    ]);

  const statusCounts = countBy((byStatus ?? []) as any[], (r) => r.status);
  const locationCounts = countBy((byLocation ?? []) as any[], (r) => r.locations?.name ?? '—');
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const monthlyCounts = countBy((monthly ?? []) as any[], (r) =>
    (r.started_at as string).slice(0, 7),
  );
  const monthlySorted = Object.entries(monthlyCounts).sort(([a], [b]) => a.localeCompare(b));
  const monthlyMax = Math.max(1, ...monthlySorted.map(([, v]) => v));

  // avg time-to-sign em horas — calculado via daily_reports (signed_at - sent_at)
  let avgHours = 0;
  let ttsCount = 0;
  for (const row of (signedReports ?? []) as any[]) {
    if (!row.signed_at || !row.sent_at) continue;
    const delta = new Date(row.signed_at).getTime() - new Date(row.sent_at).getTime();
    if (delta > 0) {
      avgHours += delta / 3_600_000;
      ttsCount++;
    }
  }
  const avg = ttsCount ? (avgHours / ttsCount).toFixed(1) : '—';
  const signedCount90 = (signedReports ?? []).length;

  const total = (byStatus ?? []).length;

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{tr('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tr('subtitle')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat
          icon={<ActivityIcon className="h-4 w-4" />}
          label={tr('total90')}
          value={total}
        />
        <Stat
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          label={tr('signed')}
          value={signedCount90}
          accent
        />
        <Stat
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          label={tr('pending')}
          value={statusCounts['enviada'] ?? 0}
        />
        <Stat
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          label={tr('rejected')}
          value={statusCounts['rejeitada'] ?? 0}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr('monthlyChart')}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr('noData')}</p>
            ) : (
              <div className="flex items-end gap-1.5 h-36">
                {monthlySorted.map(([month, count]) => {
                  const h = Math.max(6, (count / monthlyMax) * 100);
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[9px] font-mono tabular-nums text-muted-foreground">
                        {count}
                      </div>
                      <div
                        className="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors"
                        style={{ height: `${h}%` }}
                        title={`${month}: ${count}`}
                      />
                      <div className="text-[9px] font-mono text-muted-foreground">
                        {month.slice(5)}/{month.slice(2, 4)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tr('topLocations')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topLocations.length === 0 && (
              <p className="text-sm text-muted-foreground">{tr('noData')}</p>
            )}
            {topLocations.map(([name, count]) => {
              const max = topLocations[0][1];
              const pct = (count / max) * 100;
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate">{name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="surface-elevated">
          <CardHeader>
            <CardTitle className="text-base">{tr('avgTimeToSign')}</CardTitle>
            <CardDescription>{tr('avgTimeToSignHelp')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold font-mono tabular-nums">
              {avg}
              <span className="text-lg text-muted-foreground ml-1">h</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tr('avgTimeToSignBase', { count: ttsCount })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {tr('exports')}
            </CardTitle>
            <CardDescription>{tr('exportsHelp')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/relatorios/csv?days=90" download>
                <Download className="h-4 w-4" /> {tr('csvDays', { days: 90 })}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/api/relatorios/csv?days=365" download>
                <Download className="h-4 w-4" /> {tr('csv12m')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {tr('monthlyReport')}
            </CardTitle>
            <CardDescription>{tr('monthlyReportHelp')}</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyPicker />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of arr) {
    const k = key(x);
    if (!k) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'surface-elevated border-primary/30' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className="mt-3 text-3xl font-semibold font-mono tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
