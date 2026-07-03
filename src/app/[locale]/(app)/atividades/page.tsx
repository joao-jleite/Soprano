import { Camera, ChevronRight, Download, Plus, Trash2 } from 'lucide-react';
import type { ActivityStatus } from '@/lib/supabase/database.types';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ActivityFilters } from './filters';
import { ActivityDeleteButton } from '@/components/activity/activity-actions';
import { PendingLink } from './pending-link';

type SearchParams = Promise<{
  location?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}>;

const STATUS_ORDER: string[] = ['rascunho', 'enviada', 'assinada', 'rejeitada'];

// Chips de status — par cor/fundo do design system
const STATUS_CHIP: Record<string, string> = {
  rascunho: 'bg-secondary text-muted-foreground',
  enviada: 'bg-warn-bg text-warn',
  assinada: 'bg-ok-bg text-ok',
  rejeitada: 'bg-bad-bg text-bad',
};

const GRID =
  'grid grid-cols-[92px_1.55fr_1fr_100px_64px_104px_132px_40px] gap-3 min-w-[960px] items-center px-5';

export default async function ActivitiesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const supabase = await createClient();
  const intlLocale = locale === 'pt' ? 'pt-BR' : locale;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const role = (me as any)?.role as 'admin' | 'supervisor' | 'cliente' | undefined;

  // Nota: evitar join profiles!supervisor_id — activities tem dois FKs para profiles
  // (supervisor_id e client_id) e PostgREST pode falhar com ambiguidade silenciosa.
  let q = supabase
    .from('activities')
    .select(
      'id, description, status, started_at, supervisor_id, locations(name, kind), activity_types(label_pt, label_en, label_es), activity_participants(name), activity_photos(count)',
    )
    // Esconde as excluídas (soft-delete) — elas vivem na lixeira, não na lista.
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .limit(100);

  // Query paralela só de status (sem o filtro de status) — alimenta as abas
  let statusQ = supabase
    .from('activities')
    .select('status')
    .is('deleted_at', null)
    .limit(2000);

  // Cliente só vê atividades dele (sem filtrar por status — assinatura é no resumo diário)
  if (role === 'cliente' && user) {
    q = q.eq('client_id', user.id);
    statusQ = statusQ.eq('client_id', user.id);
  }

  if (sp.location) {
    q = q.eq('location_id', sp.location);
    statusQ = statusQ.eq('location_id', sp.location);
  }
  if (sp.type) {
    q = q.eq('activity_type_id', sp.type);
    statusQ = statusQ.eq('activity_type_id', sp.type);
  }
  if (sp.status) q = q.eq('status', sp.status as ActivityStatus);
  if (sp.from) {
    q = q.gte('started_at', sp.from);
    statusQ = statusQ.gte('started_at', sp.from);
  }
  if (sp.to) {
    q = q.lte('started_at', sp.to);
    statusQ = statusQ.lte('started_at', sp.to);
  }
  if (sp.q && sp.q.trim()) {
    const term = sp.q.trim().replace(/[%,]/g, '');
    q = q.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
    statusQ = statusQ.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const [
    { data: activities, error: activitiesError },
    { data: statusRows },
    { data: locations },
    { data: types },
  ] = await Promise.all([
    q,
    statusQ,
    supabase.from('locations').select('id, name, kind').eq('line', 'linha-6').order('sort_order'),
    supabase.from('activity_types').select('id, slug, label_pt, label_en, label_es').order('label_pt'),
  ]);

  if (activitiesError) {
    console.error('[atividades] query error:', JSON.stringify(activitiesError));
  }

  const statusCounts: Record<string, number> = {};
  ((statusRows ?? []) as { status: string }[]).forEach((r) => {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  });
  const totalCount = (statusRows ?? []).length;

  // Href das abas preservando os demais filtros
  function tabHref(status: string | null) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== 'status') p.set(k, v);
    }
    if (status) p.set('status', status);
    const qs = p.toString();
    return `/atividades${qs ? `?${qs}` : ''}`;
  }

  const localeKey = (locale === 'en' ? 'label_en' : locale === 'es' ? 'label_es' : 'label_pt') as
    | 'label_pt'
    | 'label_en'
    | 'label_es';

  const dateFmt = new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeFmt = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground/70">
            {t('nav.operation')}
          </span>
          <h1 className="text-[28px] font-semibold tracking-[-0.015em]">{t('activities.title')}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {role !== 'cliente' && <PendingLink />}
          {role === 'admin' && (
            <Button asChild variant="outline" className="h-10 rounded-[10px] text-[12.5px] font-semibold">
              <Link href="/equipe/lixeira">
                <Trash2 className="h-3.5 w-3.5" />
                Lixeira
              </Link>
            </Button>
          )}
          {role !== 'cliente' && (
            <Button asChild variant="outline" className="h-10 rounded-[10px] text-[12.5px] font-semibold">
              <a href="/api/relatorios/csv">
                <Download className="h-3.5 w-3.5" />
                {t('activities.exportCsv')}
              </a>
            </Button>
          )}
          {role !== 'cliente' && (
            <Button
              asChild
              className="h-10 rounded-[10px] bg-gradient-to-b from-[#1BA2DE] to-[#0E7DB6] px-[18px] text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(16,149,214,0.55)] hover:brightness-110 hover:from-[#1BA2DE] hover:to-[#0E7DB6]"
            >
              <Link href="/atividades/nova">
                <Plus className="h-3.5 w-3.5" />
                {t('activities.newActivity')}
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* Abas de status */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          href={tabHref(null)}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
            !sp.status
              ? 'border-primary/40 bg-brand-bg text-accent'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('activities.all')}
          <span className="font-mono text-[10px] opacity-75">{totalCount}</span>
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
              sp.status === s
                ? 'border-primary/40 bg-brand-bg text-accent'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`activities.status.${s}` as any)}
            <span className="font-mono text-[10px] opacity-75">{statusCounts[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <ActivityFilters locations={locations ?? []} types={types ?? []} localeKey={localeKey} />

      {activitiesError && role !== 'cliente' && (
        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <p className="text-xs font-mono text-destructive">
              DB error: {activitiesError.message} · code: {activitiesError.code}
            </p>
          </CardContent>
        </Card>
      )}

      {(!activities || activities.length === 0) && !activitiesError && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">{t('activities.empty')}</p>
            {role !== 'cliente' && (
              <Button asChild size="sm" variant="outline">
                <Link href="/atividades/nova">{t('activities.emptyCta')}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {(activities ?? []).length > 0 && (
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="overflow-x-auto">
            {/* Cabeçalho da tabela */}
            <div
              className={`${GRID} border-b border-border py-[11px] font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70`}
            >
              <span>{t('activities.table.code')}</span>
              <span>{t('activities.table.activity')}</span>
              <span>{t('activities.table.location')}</span>
              <span>{t('activities.table.team')}</span>
              <span>{t('activities.table.photos')}</span>
              <span>{t('activities.table.start')}</span>
              <span>{t('activities.table.status')}</span>
              <span />
            </div>

            {(activities ?? []).map((a: any) => {
              const started = new Date(a.started_at);
              const team: string[] = ((a.activity_participants ?? []) as { name: string }[]).map(
                (p) =>
                  p.name
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase(),
              );
              const photoCount = a.activity_photos?.[0]?.count ?? 0;
              const canDelete =
                role === 'admin' || (role === 'supervisor' && a.supervisor_id === user?.id);
              return (
                <div
                  key={a.id}
                  className={`${GRID} group relative border-b border-border py-[13px] transition-colors last:border-0 hover:bg-secondary`}
                >
                  {/* Link cobre a linha inteira; ações ficam acima dele */}
                  <Link
                    href={`/atividades/${a.id}`}
                    className="absolute inset-0 z-0"
                    aria-label={a.description}
                  />
                  <span className="pointer-events-none relative font-mono text-[11px] font-semibold text-accent">
                    ATV-{String(a.id).replace(/-/g, '').slice(0, 4).toUpperCase()}
                  </span>
                  <span className="pointer-events-none relative flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium">{a.description}</span>
                    <span className="truncate text-[11px] text-muted-foreground/70">
                      {a.activity_types?.[localeKey]}
                    </span>
                  </span>
                  <span className="pointer-events-none relative flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[12.5px] font-medium">{a.locations?.name}</span>
                    <span className="truncate text-[10.5px] uppercase text-muted-foreground/70">
                      {a.locations?.kind}
                    </span>
                  </span>
                  <span className="pointer-events-none relative flex pl-[7px]">
                    {team.slice(0, 3).map((ini, i) => (
                      <span
                        key={i}
                        className="-ml-[7px] inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-card bg-brand-bg text-[9px] font-semibold text-accent"
                      >
                        {ini}
                      </span>
                    ))}
                    {team.length > 3 && (
                      <span className="-ml-[7px] inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-card bg-secondary text-[9px] font-semibold text-muted-foreground">
                        +{team.length - 3}
                      </span>
                    )}
                  </span>
                  <span className="pointer-events-none relative inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                    <Camera className="h-[13px] w-[13px]" />
                    {photoCount}
                  </span>
                  <span className="pointer-events-none relative flex flex-col gap-px">
                    <span className="font-mono text-[11px]">{dateFmt.format(started)}</span>
                    <span className="font-mono text-[9.5px] text-muted-foreground/70">
                      {timeFmt.format(started)}
                    </span>
                  </span>
                  <span className="pointer-events-none relative">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10.5px] font-semibold ${STATUS_CHIP[a.status] ?? 'bg-secondary text-muted-foreground'}`}
                    >
                      <span className="h-[5px] w-[5px] rounded-full bg-current" />
                      {t(`activities.status.${a.status}` as any)}
                    </span>
                  </span>
                  <span className="relative z-10 flex items-center justify-end gap-1">
                    {canDelete ? (
                      <ActivityDeleteButton id={a.id} />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between px-5 py-[13px]">
            <span className="font-mono text-[10.5px] text-muted-foreground/70">
              {t('activities.showing', {
                shown: activities?.length ?? 0,
                total: sp.status ? (statusCounts[sp.status] ?? 0) : totalCount,
              })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
