import { setRequestLocale, getTranslations } from 'next-intl/server';
import { FileText, Download, Activity as ActivityIcon, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();

  const sinceISO = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  const [{ data: byStatus }, { data: byLocation }, { data: monthly }, { data: timeToSign }] =
    await Promise.all([
      supabase.from('activities').select('status').gte('started_at', sinceISO),
      supabase
        .from('activities')
        .select('locations(name)')
        .gte('started_at', sinceISO)
        .limit(1000),
      supabase
        .from('activities')
        .select('started_at')
        .gte('started_at', new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString())
        .limit(2000),
      supabase
        .from('activities')
        .select('submitted_at, signatures(signed_at)')
        .eq('status', 'assinada')
        .not('submitted_at', 'is', null)
        .gte('started_at', sinceISO)
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

  // avg time-to-sign in hours
  let avgHours = 0;
  let ttsCount = 0;
  for (const row of (timeToSign ?? []) as any[]) {
    const sig = row.signatures?.[0];
    if (!sig?.signed_at || !row.submitted_at) continue;
    const delta = new Date(sig.signed_at).getTime() - new Date(row.submitted_at).getTime();
    if (delta > 0) {
      avgHours += delta / 3_600_000;
      ttsCount++;
    }
  }
  const avg = ttsCount ? (avgHours / ttsCount).toFixed(1) : '—';

  const total = (byStatus ?? []).length;

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t('nav.reports')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicadores dos últimos 90 dias · dados em tempo real
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat
          icon={<ActivityIcon className="h-4 w-4" />}
          label="Total (90d)"
          value={total}
        />
        <Stat
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          label="Assinadas"
          value={statusCounts['assinada'] ?? 0}
          accent
        />
        <Stat
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          label="Pendentes"
          value={statusCounts['enviada'] ?? 0}
        />
        <Stat
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          label="Rejeitadas"
          value={statusCounts['rejeitada'] ?? 0}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividades por mês (12m)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
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
            <CardTitle className="text-base">Top locais (90d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topLocations.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
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
            <CardTitle className="text-base">Tempo médio até assinatura</CardTitle>
            <CardDescription>Do envio para assinatura até a confirmação do cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold font-mono tabular-nums">
              {avg}
              <span className="text-lg text-muted-foreground ml-1">h</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado em {ttsCount} atividade(s) assinada(s).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Exportações
            </CardTitle>
            <CardDescription>Baixe a planilha completa das atividades do período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/relatorios/csv?days=90" download>
                <Download className="h-4 w-4" /> CSV (90 dias)
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/api/relatorios/csv?days=365" download>
                <Download className="h-4 w-4" /> CSV (12 meses)
              </a>
            </Button>
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
