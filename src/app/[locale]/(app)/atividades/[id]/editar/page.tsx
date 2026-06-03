import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { NewActivityForm, type InitialActivity } from '../../nova/new-activity-form';

export const dynamic = 'force-dynamic';

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: '/login', locale });

  const [{ data: activity }, { data: locations }, { data: types }, { data: clients }] = await Promise.all([
    supabase
      .from('activities')
      .select(`
        id, location_id, activity_type_id, client_id, description, notes,
        evolucao, pendencias, continuation_of,
        started_at, ended_at, status, supervisor_id,
        activity_participants(name, role),
        activity_photos(storage_path)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    supabase.from('locations').select('id, name, kind').eq('line', 'linha-6').is('deleted_at', null).order('sort_order'),
    supabase.from('activity_types').select('id, slug, label_pt, label_en, label_es').is('deleted_at', null).order('label_pt'),
    supabase.from('profiles').select('id, full_name').eq('role', 'cliente').is('deleted_at', null).order('full_name'),
  ]);

  if (!activity) notFound();
  const act = activity as any;

  // Apenas rascunhos editáveis — redireciona para detalhe se já foi enviada/assinada
  if (act.status !== 'rascunho') redirect({ href: `/atividades/${id}`, locale });

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  // Sem permissão → detalhe da atividade (não 404)
  if ((me as any)?.role !== 'admin' && act.supervisor_id !== user.id) redirect({ href: `/atividades/${id}`, locale });

  const initial: InitialActivity = {
    id: act.id,
    locationId: act.location_id,
    activityTypeId: act.activity_type_id,
    clientId: act.client_id,
    description: act.description,
    notes: act.notes,
    evolucao: act.evolucao ?? null,
    pendencias: act.pendencias ?? null,
    continuationOf: act.continuation_of ?? null,
    startedAt: act.started_at,
    endedAt: act.ended_at,
    participants: (act.activity_participants ?? []).map((p: any) => ({
      name: p.name,
      role: p.role,
    })),
    photos: await Promise.all(
      (act.activity_photos ?? []).map(async (p: any) => {
        const { data } = await supabase.storage
          .from('activity-photos')
          .createSignedUrl(p.storage_path, 3600);
        return { storagePath: p.storage_path, url: data?.signedUrl ?? '' };
      }),
    ),
  };

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <p className="text-data">Editar rascunho</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Editar atividade</h1>
      </header>

      <NewActivityForm
        locations={locations ?? []}
        types={types ?? []}
        clients={clients ?? []}
        locale={locale}
        initial={initial}
        mode="edit"
      />
    </div>
  );
}
