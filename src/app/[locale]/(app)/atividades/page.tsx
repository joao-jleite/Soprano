import { Plus, Trash2 } from 'lucide-react';
import type { ActivityStatus } from '@/lib/supabase/database.types';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ActivityFilters } from './filters';
import { ActivityDeleteButton } from '@/components/activity/activity-actions';
import { PendingLink } from './pending-link';
import { formatDate } from '@/lib/utils';

type SearchParams = Promise<{
  location?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
}>;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const role = (me as any)?.role as 'admin' | 'supervisor' | 'cliente' | undefined;

  // Nota: evitar join profiles!supervisor_id — activities tem dois FKs para profiles
  // (supervisor_id e client_id) e PostgREST pode falhar com ambiguidade silenciosa.
  // Supervisor name não é crítico na listagem; buscar separado se necessário.
  let q = supabase
    .from('activities')
    .select('id, description, status, started_at, supervisor_id, locations(name, kind), activity_types(label_pt, label_en, label_es)')
    // Esconde as excluídas (soft-delete) — elas vivem na lixeira, não na lista.
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .limit(100);

  // Cliente só vê atividades dele (sem filtrar por status — assinatura é no resumo diário)
  if (role === 'cliente' && user) {
    q = q.eq('client_id', user.id);
  }

  if (sp.location) q = q.eq('location_id', sp.location);
  if (sp.type) q = q.eq('activity_type_id', sp.type);
  if (sp.status) q = q.eq('status', sp.status as ActivityStatus);
  if (sp.from) q = q.gte('started_at', sp.from);
  if (sp.to) q = q.lte('started_at', sp.to);
  if (sp.q && sp.q.trim()) {
    const term = sp.q.trim().replace(/[%,]/g, '');
    q = q.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const [{ data: activities, error: activitiesError }, { data: locations }, { data: types }] = await Promise.all([
    q,
    supabase.from('locations').select('id, name, kind').eq('line', 'linha-6').order('sort_order'),
    supabase.from('activity_types').select('id, slug, label_pt, label_en, label_es').order('label_pt'),
  ]);

  if (activitiesError) {
    console.error('[atividades] query error:', JSON.stringify(activitiesError));
  }

  // Busca nomes dos supervisores separado para evitar ambiguidade de FK
  const supervisorIds = [...new Set((activities ?? []).map((a: any) => a.supervisor_id).filter(Boolean))];
  const supervisorMap: Record<string, string> = {};
  if (supervisorIds.length) {
    const { data: sups } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', supervisorIds);
    (sups ?? []).forEach((s: any) => { supervisorMap[s.id] = s.full_name; });
  }

  const localeKey = (locale === 'en' ? 'label_en' : locale === 'es' ? 'label_es' : 'label_pt') as
    | 'label_pt'
    | 'label_en'
    | 'label_es';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('activities.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activities?.length ?? 0} {t('activities.title').toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {role !== 'cliente' && <PendingLink />}
          {role === 'admin' && (
            <Button asChild variant="outline">
              <Link href="/equipe/lixeira">
                <Trash2 className="h-4 w-4" />
                Lixeira
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/atividades/nova">
              <Plus />
              {t('activities.newActivity')}
            </Link>
          </Button>
        </div>
      </header>

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

      {(!activities || activities.length === 0) && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">{t('activities.empty')}</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/atividades/nova">{t('activities.emptyCta')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {(activities ?? []).map((a: any) => (
          <li key={a.id}>
            <Card className="transition-all hover:border-primary/40">
              <CardContent className="p-4 flex items-center gap-3">
                {/* área clicável principal */}
                <Link href={`/atividades/${a.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={a.status} label={t(`activities.status.${a.status}`)} />
                    <span className="text-xs text-muted-foreground">
                      {a.activity_types?.[localeKey]}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {a.locations?.name} · {supervisorMap[a.supervisor_id] ?? ''} · {formatDate(a.started_at, locale === 'pt' ? 'pt-BR' : locale)}
                  </p>
                  {a.status === 'rejeitada' && (
                    <p className="text-xs text-destructive/70 mt-1">
                      {t('activities.rejectReason')} — {t('activities.seeDetails')}
                    </p>
                  )}
                </Link>

                {/* botão excluir — só para admin ou supervisor dono */}
                {(role === 'admin' || (role === 'supervisor' && a.supervisor_id === user?.id)) && (
                  <ActivityDeleteButton id={a.id} />
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

