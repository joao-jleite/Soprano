import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function LocaisPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, kind, sort_order')
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
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mt-0.5">
                    #{String(l.sort_order).padStart(3, '0')}
                  </p>
                </div>
                <Badge variant="outline">{t(`locations.kinds.${l.kind}`)}</Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
