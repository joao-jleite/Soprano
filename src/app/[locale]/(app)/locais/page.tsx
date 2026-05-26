import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocationRowActions } from './row-actions';

export const dynamic = 'force-dynamic';

export default async function LocaisPage({
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
  const isAdmin = (me as any)?.role === 'admin';

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, kind, sort_order')
    .is('deleted_at', null)
    .order('sort_order');

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{t('locations.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('locations.description')}</p>
      </header>

      <ul className="space-y-2">
        {(locations ?? []).map((l) => (
          <li key={l.id}>
            <Card>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5">
                    #{String(l.sort_order).padStart(3, '0')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline">{t(`locations.kinds.${l.kind}`)}</Badge>
                  {isAdmin && <LocationRowActions id={l.id} name={l.name} />}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
