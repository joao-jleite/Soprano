import { Plus, Clock, Coins } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function formatBRL(amount: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale === 'pt' ? 'pt-BR' : locale, {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

export default async function ReclamosPage({
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
  const role = me?.role as 'admin' | 'supervisor' | 'cliente' | undefined;
  const isClient = role === 'cliente';

  let q = supabase
    .from('claims')
    .select(
      'id, ref_code, claim_type, title, status, event_date, time_impact_days, cost_impact_amount, created_at, locations(name)',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (isClient && user) {
    q = q.eq('client_id', user.id).neq('status', 'rascunho');
  }

  const { data: claims, error } = await q;
  const loc = locale === 'pt' ? 'pt-BR' : locale;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t('nav.complaints')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('claims.subtitle')}</p>
        </div>
        {!isClient && (
          <Button asChild>
            <Link href="/reclamos/novo">
              <Plus />
              {t('claims.new')}
            </Link>
          </Button>
        )}
      </header>

      {error && !isClient && (
        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <p className="text-xs font-mono text-destructive">
              DB error: {error.message} · code: {error.code}
            </p>
          </CardContent>
        </Card>
      )}

      {(!claims || claims.length === 0) && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              {isClient ? t('claims.emptyClient') : t('claims.empty')}
            </p>
            {!isClient && (
              <Button asChild size="sm" variant="outline">
                <Link href="/reclamos/novo">{t('claims.new')}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {(claims ?? []).map((c) => (
          <li key={c.id}>
            <Card className="transition-all hover:border-primary/40">
              <CardContent className="p-4">
                <Link href={`/reclamos/${c.id}`} className="block">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={c.status} label={t(`claims.status.${c.status}`)} />
                    {c.ref_code && (
                      <span className="text-xs font-mono text-primary">{c.ref_code}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {t(`claims.types.${c.claim_type}`)}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span>{formatDate(c.event_date, loc)}</span>
                    {c.locations?.name && <span>· {c.locations.name}</span>}
                    {c.time_impact_days != null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {c.time_impact_days} {t('claims.days')}
                      </span>
                    )}
                    {c.cost_impact_amount != null && (
                      <span className="inline-flex items-center gap-1">
                        <Coins className="h-3 w-3" /> {formatBRL(c.cost_impact_amount, locale)}
                      </span>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
