import { ArrowUpRight, Activity, CheckCircle2, Users, PenLine, FileSignature, ClipboardCheck } from 'lucide-react';
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

  const name = profile?.full_name?.split(' ')[0] ?? '';
  const localeStr = locale === 'pt' ? 'pt-BR' : locale;

  // ── Painel dedicado para o CLIENTE (quem assina) ───────────────────────────
  if (role === 'cliente' && user) {
    return (
      <ClientDashboard
        supabase={supabase}
        userId={user.id}
        name={name}
        localeStr={localeStr}
        today={t('dashboard.today')}
      />
    );
  }

  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const applyScope = (qb: any) =>
    role === 'cliente' && user ? qb.eq('client_id', user.id) : qb;

  const [{ count: monthCount }, { count: signedCount }, { data: pending }, { data: recent }] =
    await Promise.all([
      applyScope(
        supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .gte('started_at', monthStart),
      ),
      applyScope(
        supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'assinada')
          .gte('started_at', monthStart),
      ),
      applyScope(
        supabase
          .from('activities')
          .select('id, description, started_at, locations(name), activity_types(label_pt)')
          .eq('status', 'enviada')
          .order('submitted_at', { ascending: false })
          .limit(5),
      ),
      applyScope(
        supabase
          .from('activities')
          .select('id, description, status, started_at, locations(name), activity_types(label_pt)')
          .order('updated_at', { ascending: false })
          .limit(5),
      ),
    ]);

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
            {(pending ?? []).map((a: any) => (
              <Link
                key={a.id}
                href={`/atividades/${a.id}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.locations?.name} · {a.activity_types?.label_pt}
                  </p>
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
                <StatusBadge status={a.status} />
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
    assinada: 'success',
    rejeitada: 'destructive',
  };
  return (
    <Badge variant={variantMap[status] ?? 'secondary'} className="shrink-0">
      {status}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel do CLIENTE — foco total em assinatura. Sem métricas operacionais,
// sem CTAs de criação. O que importa: "o que preciso assinar agora".
// ─────────────────────────────────────────────────────────────────────────────
async function ClientDashboard({
  supabase,
  userId,
  name,
  localeStr,
  today,
}: {
  supabase: any;
  userId: string;
  name: string;
  localeStr: string;
  today: string;
}) {
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const [
    { data: pendingReports },
    { data: pendingActivities },
    { count: signedReportsMonth },
    { count: signedActivitiesMonth },
    { data: recentSigned },
  ] = await Promise.all([
    // Resumos diários aguardando minha assinatura
    supabase
      .from('daily_reports')
      .select('id, report_date, sent_at')
      .eq('client_id', userId)
      .eq('status', 'aguardando_assinatura')
      .is('deleted_at', null)
      .order('report_date', { ascending: true }),
    // Atividades enviadas diretamente para mim
    supabase
      .from('activities')
      .select('id, description, started_at, locations(name), activity_types(label_pt)')
      .eq('client_id', userId)
      .eq('status', 'enviada')
      .order('submitted_at', { ascending: true })
      .limit(10),
    // Resumos assinados no mês
    supabase
      .from('daily_reports')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', userId)
      .eq('status', 'assinado')
      .gte('signed_at', monthStart),
    // Atividades assinadas no mês
    supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', userId)
      .eq('status', 'assinada')
      .gte('started_at', monthStart),
    // Histórico recente de resumos assinados
    supabase
      .from('daily_reports')
      .select('id, report_date, signed_at')
      .eq('client_id', userId)
      .eq('status', 'assinado')
      .is('deleted_at', null)
      .order('signed_at', { ascending: false })
      .limit(5),
  ]);

  const reports = (pendingReports ?? []) as any[];
  const activities = (pendingActivities ?? []) as any[];
  const totalPending = reports.length + activities.length;
  const signedMonth = (signedReportsMonth ?? 0) + (signedActivitiesMonth ?? 0);
  const recent = (recentSigned ?? []) as any[];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-data">
          {today} · {formatDateTime(new Date(), localeStr)}
        </p>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
          Olá, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {totalPending > 0
            ? `Você tem ${totalPending} ${totalPending === 1 ? 'documento aguardando' : 'documentos aguardando'} sua assinatura.`
            : 'Tudo em dia — nenhum documento aguardando sua assinatura.'}
        </p>
      </header>

      {/* Destaque: aguardando minha assinatura */}
      <Card
        className={
          totalPending > 0
            ? 'surface-elevated border-primary/40'
            : 'border-emerald-500/30'
        }
      >
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full ' +
                (totalPending > 0
                  ? 'bg-primary/15 text-primary'
                  : 'bg-emerald-500/15 text-emerald-500')
              }
            >
              {totalPending > 0 ? (
                <PenLine className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Aguardando sua assinatura
              </p>
              <p className="mt-1 text-3xl font-semibold font-mono tabular-nums">
                {totalPending}
              </p>
            </div>
          </div>
          {reports.length > 0 && (
            <Button asChild>
              <Link href={`/resumo-diario/${reports[0].id}`}>
                <FileSignature className="h-4 w-4" />
                Assinar agora
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stat secundário: assinados no mês */}
      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Assinados no mês"
          value={signedMonth}
          icon={<ClipboardCheck className="h-4 w-4" />}
          accent
        />
        <StatCard
          label="Pendentes no total"
          value={totalPending}
          icon={<PenLine className="h-4 w-4" />}
        />
      </section>

      {/* Lista de pendências — a área de ação principal */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-elevated">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Aguardando assinatura</CardTitle>
            <Badge variant={totalPending > 0 ? 'warning' : 'secondary'}>
              {totalPending}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {totalPending === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Nenhum documento pendente. Você está em dia.
              </p>
            )}

            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/resumo-diario/${r.id}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    Resumo diário · {formatDate(r.report_date + 'T12:00:00', localeStr)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Aguardando assinatura
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            ))}

            {activities.map((a) => (
              <Link
                key={a.id}
                href={`/atividades/${a.id}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.locations?.name} · {a.activity_types?.label_pt}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Histórico de assinados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinados recentemente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Seu histórico de assinaturas aparecerá aqui.
              </p>
            )}
            {recent.map((r) => (
              <Link
                key={r.id}
                href={`/resumo-diario/${r.id}`}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:text-primary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    Resumo diário · {formatDate(r.report_date + 'T12:00:00', localeStr)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.signed_at
                      ? `Assinado em ${formatDate(r.signed_at, localeStr)}`
                      : 'Assinado'}
                  </p>
                </div>
                <Badge variant="success" className="shrink-0">
                  Assinado
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
