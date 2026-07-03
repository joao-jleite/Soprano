import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { NewActivityForm, type InitialActivity } from './new-activity-form';

export const dynamic = 'force-dynamic';

export default async function NewActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; pending?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('activities');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: locations }, { data: types }, { data: clients }, { data: recentActivities }] = await Promise.all([
    supabase.from('locations').select('id, name, kind').eq('line', 'linha-6').is('deleted_at', null).order('sort_order'),
    supabase.from('activity_types').select('id, slug, label_pt, label_en, label_es').is('deleted_at', null).order('label_pt'),
    supabase.from('profiles').select('id, full_name').eq('role', 'cliente').is('deleted_at', null).order('full_name'),
    // Atividades recentes para o picker de continuação (últimos 60 dias, do próprio supervisor)
    user
      ? supabase
          .from('activities')
          .select('id, description, started_at, locations(name)')
          .eq('supervisor_id', user.id)
          .is('deleted_at', null)
          .gte('started_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
          .order('started_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  // Duplicar a partir de outra atividade
  let initial: InitialActivity | undefined;
  let duplicating = false;
  if (sp.from) {
    const { data: src } = await supabase
      .from('activities')
      .select(`
        location_id, activity_type_id, client_id, description, notes, evolucao, pendencias,
        activity_participants(name, role)
      `)
      .eq('id', sp.from)
      .is('deleted_at', null)
      .single();
    if (src) {
      duplicating = true;
      const s = src as any;
      initial = {
        id: '', // ignorado no modo create
        locationId: s.location_id,
        activityTypeId: s.activity_type_id,
        clientId: s.client_id,
        description: s.description,
        notes: s.notes ?? null,
        evolucao: s.evolucao ?? null,
        pendencias: s.pendencias ?? null,
        continuationOf: null,
        startedAt: new Date().toISOString(),
        endedAt: null,
        participants: (s.activity_participants ?? []).map((p: any) => ({ name: p.name, role: p.role })),
        photos: [],
      };
    }
  }

  const editingPending = !!sp.pending;

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground/70">
          {editingPending ? 'Editar pendente' : duplicating ? t('duplicating') : t('newActivity')}
        </p>
        <h1 className="text-[28px] font-semibold tracking-[-0.015em]">
          {editingPending ? 'Editar atividade pendente' : t('register')}
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          {editingPending
            ? 'Corrija o que for preciso e salve — a atividade volta para a fila e sobe quando houver conexão.'
            : duplicating
            ? t('duplicateHelp')
            : t('newHelp')}
        </p>
      </header>

      <NewActivityForm
        locations={locations ?? []}
        types={types ?? []}
        clients={clients ?? []}
        recentActivities={(recentActivities ?? []) as any[]}
        locale={locale}
        initial={initial}
        mode="create"
        pendingLocalId={sp.pending}
      />
    </div>
  );
}
