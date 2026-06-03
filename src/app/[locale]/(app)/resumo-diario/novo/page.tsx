export const dynamic = 'force-dynamic';

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { NewDailyReportForm } from './new-report-form';

export default async function NovoDailyReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('dailyReport');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  if (me?.role === 'cliente') redirect({ href: '/resumo-diario', locale });

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'cliente')
    .is('deleted_at', null)
    .order('full_name');

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t('new')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('title')}
        </p>
      </div>
      <NewDailyReportForm clients={clients ?? []} />
    </div>
  );
}
