import { ArrowLeft } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { NewClaimForm } from './new-claim-form';

export const dynamic = 'force-dynamic';

export default async function NovoReclamoPage({
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
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const role = me?.role;

  // Só admin/supervisor criam reclamos.
  if (role !== 'admin' && role !== 'supervisor') {
    redirect(`/${locale}/reclamos`);
  }

  const [{ data: clients }, { data: locations }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, company')
      .eq('role', 'cliente')
      .is('deleted_at', null)
      .order('full_name'),
    supabase
      .from('locations')
      .select('id, name')
      .eq('line', 'linha-6')
      .is('deleted_at', null)
      .order('sort_order'),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/reclamos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('claims.backToList')}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-3">{t('claims.newTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('claims.subtitle')}</p>
      </div>

      <NewClaimForm clients={clients ?? []} locations={locations ?? []} />
    </div>
  );
}
