import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Building2, Wind, Siren, Stars } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { MapToggle } from './map-toggle';

export const dynamic = 'force-dynamic';

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  estacao: { label: 'Estação', icon: Building2, tone: 'text-primary' },
  vse: { label: 'VSE', icon: Wind, tone: 'text-accent' },
  se: { label: 'SE', icon: Siren, tone: 'text-amber-400' },
  escadaria: { label: 'Escadaria', icon: Stars, tone: 'text-muted-foreground' },
  patio: { label: 'Pátio', icon: Building2, tone: 'text-muted-foreground' },
  outro: { label: 'Outro', icon: Building2, tone: 'text-muted-foreground' },
};

export default async function Linha6Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('linha6');
  const supabase = await createClient();

  // Mapa mostra TODA infraestrutura da linha — sem filtro deleted_at
  // (estações são infraestrutura permanente, não conteúdo criado pelo usuário)
  const { data: locations, error: locError } = await supabase
    .from('locations')
    .select('id, name, kind, sort_order')
    .eq('line', 'linha-6')
    .order('sort_order', { ascending: true });

  const grouped = (locations ?? []).reduce<Record<string, typeof locations>>((acc, l) => {
    const k = l.kind as string;
    (acc[k] ||= [] as any).push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-data">Linha 6 · Laranja · Brasilândia ↔ São Joaquim</p>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground max-w-3xl">{t('subtitle')}</p>
      </header>

      {locError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs font-mono text-destructive">
          Erro ao carregar locais: {locError.message} · code: {locError.code}
        </div>
      )}

      <MapToggle stops={(locations ?? []) as any} locale={locale} />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatBlock label={t('stationsLabel')} value={grouped.estacao?.length ?? 0} icon={<Building2 className="h-4 w-4" />} />
        <StatBlock label={t('shaftsLabel')} value={grouped.vse?.length ?? 0} icon={<Wind className="h-4 w-4" />} accent />
        <StatBlock label={t('emergencyLabel')} value={grouped.se?.length ?? 0} icon={<Siren className="h-4 w-4" />} />
      </section>

      {Object.entries(grouped).map(([kind, items]) => {
        const meta = KIND_META[kind] ?? KIND_META.outro;
        const Icon = meta.icon;
        return (
          <section key={kind} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${meta.tone}`} />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {meta.label}
              </h2>
              <Badge variant="outline" className="ml-auto">
                {items?.length ?? 0}
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(items ?? []).map((loc: any) => (
                <Link
                  key={loc.id}
                  href={`/atividades?location=${loc.id}`}
                  className="group"
                >
                  <Card className="transition-all group-hover:border-primary/40 group-hover:surface-elevated">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                          #{String(loc.sort_order).padStart(3, '0')}
                        </p>
                      </div>
                      <Icon className={`h-4 w-4 ${meta.tone} opacity-60 group-hover:opacity-100`} />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StatBlock({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? 'surface-elevated border-primary/30' : ''}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <span className={accent ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
        </div>
        <p className="mt-3 text-3xl font-semibold font-mono tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
