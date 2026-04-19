import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { NewActivityForm } from './new-activity-form';

export default async function NewActivityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const [{ data: locations }, { data: types }, { data: clients }] = await Promise.all([
    supabase.from('locations').select('id, name, kind').eq('line', 'linha-6').order('sort_order'),
    supabase.from('activity_types').select('id, slug, label_pt, label_en, label_es').order('label_pt'),
    supabase.from('profiles').select('id, full_name').eq('role', 'cliente').order('full_name'),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <p className="text-data">Nova atividade</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">Registrar atividade</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha os dados da obra executada. Você pode salvar como rascunho e enviar para assinatura depois.
        </p>
      </header>

      <NewActivityForm
        locations={locations ?? []}
        types={types ?? []}
        clients={clients ?? []}
        locale={locale}
      />
    </div>
  );
}
