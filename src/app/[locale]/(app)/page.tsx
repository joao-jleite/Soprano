import { ArrowUpRight, Activity, CheckCircle2, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { formatDate, formatDateTime } from '@/lib/utils';

// Força renderização dinâmica — evita que Vercel faça cache estático de uma
// versão "com erro" (ex: 404 de deploy antigo) no CDN
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
    : { data: null };
  const role = (profile as any)?.role as 'admin' | 'supervisor' | 'cliente' | undefined;

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const applyScope = (qb: any) =>
    role === 'cliente' && user ? qb.eq('client_id', user.id) : qb;

  const monthStartDate = monthStart.slice(0, 10); // 'YYYY-MM-DD' para comparar com report_date

  const signedReportsQuery =
    role === 'cliente' && user
      ? (supabase as any)
          .from('daily_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'assinado')
          .eq('client_id', user.id)
          .gte('report_date', monthStartDate)
          .is('deleted_at', null)
      : (supabase as any)
          .from('daily_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'assinado')
          .gte('report_date', monthStartDate)
          .is('deleted_at', null);

  const [{ count: monthCount }, { count: signedCount }, { data: pending }, { data: recent }] =
    await Promise.all([
      applyScope(
        supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .gte('started_at', monthStart),
      ),
      signedReportsQuery,
      // Resumos aguardando assinatura (pendentes)
      role === 'cliente' && user
        ? (supabase as any)
            .from('daily_reports')
            .select('id, report_date, notes')
            .eq('status', 'aguardando_assinatura')
            .eq('client_id', user.id)
            .is('deleted_at', null)
            .order('report_date', { ascending: false })
            .limit(5)
        : (supabase as any)
            .from('daily_reports')
            .select('id, report_date, notes')
            .eq('status', 'aguardando_assinatura')
            .is('deleted_at', null)
            .order('report_date', { ascending: false })
            .limit(5),
      applyScope(
        supabase
          .from('activities')
          .select('id, description, status, started_at, locations(name), activity_types(label_pt)')
          .order('updated_at', { ascending: false })
          .limit(5),
      ),
    ]);

  const name = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-data">{t('dashboard.today')} · {formatDateTime(new Date(), locale === 'pt' ? 'pt-BR' : locale)}</p>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
          {t('dashboard.welcome', { name })}
        </h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('dashboard.activitiesThisMonth')}
          value={monthCount ?? 0}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label={t('dashboard.signedThisMonth')}
          value={signedCount ?? 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent
        />
        <StatCard
          label={t('dashboard.teamOnSite')}
          value="—"
          icon={<Users className="h-4 w-4" />}
          hint="Em breve"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-elevated">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t('dashboard.pendingSignatures')}</CardTitle>
            <Badge variant="warning">{pending?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pending ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sem pendências.</p>
            )}
            {(pending ?? []).map((r: any) => (
              <Link
                key={r.id}
                href={`/resumo-diario/${r.id}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Resumo de {formatDate(r.report_date + 'T12:00:00', locale === 'pt' ? 'pt-BR' : locale)}
                  </p>
                  {r.notes && (
                    <p className="text-xs text-muted-foreground truncate">{r.notes}</p>
                  )}
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.recentActivities')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recent ?? []).length === 0 && (
              <div className="flex flex-col items-start gap-3 py-4">
                <p className="text-sm text-muted-foreground">{t('activities.empty')}</p>
                <Button asChild size="sm">
                  <Link href="/atividades/nova">{t('activities.emptyCta')}</Link>
                </Button>
              </div>
            )}
            {(recent ?? []).map((a: any) => (
              <Link
                key={a.id}
                href={`/atividades/${a.id}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.locations?.name}
                  </p>
                </div>
                {a.status !== 'rascunho' && <StatusBadge status={a.status} />}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <Card className={accent ? 'surface-elevated border-primary/30' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <span className={accent ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
        </div>
        <p className="mt-3 text-3xl font-semibold font-mono tabular-nums">{value}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
    rascunho: 'secondary',
    enviada: 'warning',
    rejeitada: 'destructive',
  };
  return (
    <Badge variant={variantMap[status] ?? 'secondary'} className="shrink-0">
      {status}
    </Badge>
  );
}
