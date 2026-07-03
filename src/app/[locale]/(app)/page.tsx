import { Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';

// Força renderização dinâmica — evita que Vercel faça cache estático de uma
// versão "com erro" (ex: 404 de deploy antigo) no CDN
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cor do ponto de status nas atividades recentes (tokens do design system)
const STATUS_DOT: Record<string, string> = {
  assinada: 'bg-ok',
  enviada: 'bg-warn',
  rejeitada: 'bg-bad',
  rascunho: 'bg-zitron-steel',
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();
  const intlLocale = locale === 'pt' ? 'pt-BR' : locale;

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

  const signedReportsQuery = applyScope(
    (supabase as any)
      .from('daily_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assinado')
      .gte('report_date', monthStartDate)
      .is('deleted_at', null),
  );

  const pendingCountQuery = applyScope(
    (supabase as any)
      .from('daily_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aguardando_assinatura')
      .is('deleted_at', null),
  );

  const [
    { count: monthCount },
    { count: signedCount },
    { count: pendingTotal },
    { data: pending },
    { data: recent },
    { data: monthLocations },
  ] = await Promise.all([
    applyScope(
      supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .gte('started_at', monthStart),
    ),
    signedReportsQuery,
    pendingCountQuery,
    applyScope(
      (supabase as any)
        .from('daily_reports')
        .select('id, report_date, notes')
        .eq('status', 'aguardando_assinatura')
        .is('deleted_at', null)
        .order('report_date', { ascending: false })
        .limit(5),
    ),
    applyScope(
      supabase
        .from('activities')
        .select('id, description, status, started_at, locations(name), activity_types(label_pt)')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(6),
    ),
    applyScope(
      supabase
        .from('activities')
        .select('location_id')
        .is('deleted_at', null)
        .gte('started_at', monthStart)
        .limit(1000),
    ),
  ]);

  const name = profile?.full_name?.split(' ')[0] ?? '';
  const activeFronts = new Set(
    ((monthLocations ?? []) as { location_id: string | null }[])
      .map((r) => r.location_id)
      .filter(Boolean),
  ).size;

  const todayLine = new Intl.DateTimeFormat(intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();

  const monthChip = new Intl.DateTimeFormat(intlLocale, { month: 'short', year: 'numeric' })
    .format(new Date())
    .toUpperCase();

  const kpis = [
    {
      label: t('dashboard.activitiesThisMonth'),
      value: monthCount ?? 0,
      num: 'text-foreground',
      chip: monthChip,
      chipClass: 'bg-brand-bg text-accent',
    },
    {
      label: t('dashboard.signedThisMonth'),
      value: signedCount ?? 0,
      num: 'text-ok',
      chip: t('dashboard.thisMonth').toUpperCase(),
      chipClass: 'bg-ok-bg text-ok',
    },
    {
      label: t('dashboard.pendingSignatures'),
      value: pendingTotal ?? 0,
      num: (pendingTotal ?? 0) > 0 ? 'text-warn' : 'text-foreground',
      chip: t('nav.awaitingSignature').toUpperCase(),
      chipClass: 'bg-warn-bg text-warn',
    },
    {
      label: t('dashboard.activeFronts'),
      value: activeFronts,
      num: 'text-accent',
      chip: 'LINHA 6',
      chipClass: 'bg-brand-bg text-accent',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10.5px] tracking-[0.24em] text-muted-foreground/70">
            {todayLine} · LINHA 6 — LARANJA
          </span>
          <h1 className="text-[28px] font-semibold tracking-[-0.015em]">
            {t('dashboard.welcome', { name })}
          </h1>
          <span className="text-[13.5px] text-muted-foreground">
            {t('dashboard.subtitle', { pending: pendingTotal ?? 0 })}
          </span>
        </div>
        {role !== 'cliente' && (
          <Button
            asChild
            className="h-[42px] rounded-[11px] bg-gradient-to-b from-[#1BA2DE] to-[#0E7DB6] px-5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(16,149,214,0.55)] hover:brightness-110 hover:from-[#1BA2DE] hover:to-[#0E7DB6]"
          >
            <Link href="/atividades/nova">
              <Plus className="h-[15px] w-[15px]" />
              {t('activities.newActivity')}
            </Link>
          </Button>
        )}
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-[18px] pb-4"
          >
            <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground/70">
              {k.label}
            </span>
            <span className={`font-mono text-[31px] font-semibold leading-none tracking-[-0.02em] ${k.num}`}>
              {k.value}
            </span>
            <span
              className={`inline-flex self-start rounded-md px-2 py-[3px] text-[10.5px] font-semibold ${k.chipClass}`}
            >
              {k.chip}
            </span>
          </div>
        ))}
      </section>

      {/* Pendências + Recentes */}
      <section className="grid gap-3.5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-sm font-semibold">{t('dashboard.pendingSignatures')}</span>
            <span className="rounded-full bg-warn-bg px-2.5 py-[3px] font-mono text-[10.5px] font-semibold text-warn">
              {pendingTotal ?? 0}
            </span>
          </div>
          {(pending ?? []).length === 0 && (
            <p className="px-5 py-4 text-sm text-muted-foreground">{t('dashboard.noPending')}</p>
          )}
          {(pending ?? []).map((r: any) => {
            const d = new Date(r.report_date + 'T12:00:00');
            const day = d.getDate();
            const mon = new Intl.DateTimeFormat(intlLocale, { month: 'short' })
              .format(d)
              .replace('.', '')
              .toUpperCase();
            const ageDays = Math.max(
              0,
              Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)),
            );
            return (
              <div
                key={r.id}
                className="flex items-center gap-4 border-b border-border px-5 py-3.5 transition-colors hover:bg-secondary"
              >
                <div className="w-[46px] flex-none rounded-[9px] border border-border bg-popover py-1.5 text-center">
                  <div className="text-base font-semibold leading-none">{day}</div>
                  <div className="mt-[3px] font-mono text-[8.5px] tracking-[0.14em] text-muted-foreground/70">
                    {mon}
                  </div>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[13.5px] font-semibold">
                    {formatDate(r.report_date + 'T12:00:00', intlLocale)}
                  </span>
                  {r.notes && (
                    <span className="truncate text-xs text-muted-foreground">{r.notes}</span>
                  )}
                </div>
                <span
                  className={`font-mono text-[10px] font-semibold ${ageDays > 2 ? 'text-warn' : 'text-muted-foreground/70'}`}
                >
                  {ageDays}d
                </span>
                <Button asChild variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                  <Link href={`/resumo-diario/${r.id}`}>{t('dashboard.open')}</Link>
                </Button>
              </div>
            );
          })}
          <Link
            href="/resumo-diario"
            className="block px-5 py-3 text-[12.5px] font-semibold text-accent transition-colors hover:bg-secondary"
          >
            {t('dashboard.viewAllReports')}
          </Link>
        </div>

        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-sm font-semibold">{t('dashboard.recentActivities')}</span>
            <Link href="/atividades" className="text-xs font-semibold text-accent">
              {t('dashboard.viewAllActivities')}
            </Link>
          </div>
          {(recent ?? []).length === 0 && (
            <div className="flex flex-col items-start gap-3 px-5 py-4">
              <p className="text-sm text-muted-foreground">{t('activities.empty')}</p>
              {role !== 'cliente' && (
                <Button asChild size="sm">
                  <Link href="/atividades/nova">{t('activities.emptyCta')}</Link>
                </Button>
              )}
            </div>
          )}
          {(recent ?? []).map((a: any) => (
            <Link
              key={a.id}
              href={`/atividades/${a.id}`}
              className="flex items-center gap-3 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-secondary"
            >
              <span
                className={`h-[7px] w-[7px] flex-none rounded-full ${STATUS_DOT[a.status] ?? 'bg-zitron-steel'}`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium">{a.description}</span>
                <span className="truncate font-mono text-[10px] tracking-[0.08em] text-muted-foreground/70">
                  {[a.locations?.name, formatDate(a.started_at, intlLocale)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              {a.status !== 'rascunho' && <StatusBadge status={a.status} />}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
