import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { NewDailyReportForm } from './new-report-form';

export default async function NovoDailyReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const [{ data: stations }, { data: clients }] = await Promise.all([
    supabase
      .from('locations')
      .select('id, name')
      .eq('kind', 'estacao')
      .is('deleted_at', null)
      .order('sort_order'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'cliente')
      .is('deleted_at', null)
      .order('full_name'),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Novo resumo diário</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Agrupe as atividades do dia por estação e envie para assinatura do cliente.
        </p>
      </div>
      <NewDailyReportForm
        stations={stations ?? []}
        clients={clients ?? []}
      />
    </div>
  );
}
