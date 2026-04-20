import { Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ActivityFilters } from './filters';
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

  let q = supabase
    .from('activities')
    .select('id, description, status, started_at, reject_reason, locations(name, kind), activity_types(label_pt, label_en, label_es), profiles!activities_supervisor_id_fkey(full_name)')
    .is('deleted_at', null)
    .order('started_at', { ascending: false })
    .limit(100);

  // Cliente só vê atividades dele
  if (role === 'cliente' && user) {
    q = q.eq('client_id', user.id).neq('status', 'rascunho');
  }

  if (sp.location) q = q.eq('location_id', sp.location);
  if (sp.type) q = q.eq('activity_type_id', sp.type);
  if (sp.status) q = q.eq('status', sp.status);
  if (sp.from) q = q.gte('started_at', sp.from);
  if (sp.to) q = q.lte('started_at', sp.to);
  if (sp.q && sp.q.trim()) {
    const term = sp.q.trim().replace(/[%,]/g, '');
    q = q.or(`description.ilike.%${term}%,notes.ilike.%${term}%`);
  }

  const [{ data: activities }, { data: locations }, { data: types }] = await Promise.all([
    q,
    supabase.from('locations').select('id, name, kind').eq('line', 'linha-6').is('deleted_at', null).order('sort_order'),
    supabase.from('activity_types').select('id, slug, label_pt, label_en, label_es').is('deleted_at', null).order('label_pt'),
  ]);

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
        <Button asChild>
          <Link href="/atividades/nova">
            <Plus />
            {t('activities.newActivity')}
          </Link>
        </Button>
      </header>

      <ActivityFilters locations={locations ?? []} types={types ?? []} localeKey={localeKey} />

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
            <Link
              href={`/atividades/${a.id}`}
              className="block group"
            >
              <Card className="transition-all group-hover:border-primary/40">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={a.status} label={t(`activities.status.${a.status}`)} />
                      <span className="text-xs text-muted-foreground">
                        {a.activity_types?.[localeKey]}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.locations?.name} · {a.profiles?.full_name} · {formatDate(a.started_at, locale === 'pt' ? 'pt-BR' : locale)}
                    </p>
                    {a.status === 'rejeitada' && a.reject_reason && (
                      <p className="text-xs text-destructive mt-1 line-clamp-2">
                        <span className="font-medium">{t('activities.rejectReason')}:</span>{' '}
                        {a.reject_reason}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
    rascunho: 'secondary',
    enviada: 'warning',
    assinada: 'success',
    rejeitada: 'destructive',
  };
  return <Badge variant={map[status] ?? 'secondary'}>{label ?? status}</Badge>;
}
