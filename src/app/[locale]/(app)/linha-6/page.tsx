import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Building2, Wind, Siren, Stars } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { Linha6Scheme } from '@/components/map/linha-6-scheme';

export const dynamic = 'force-dynamic';

const KIND_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  estacao: { label: 'Estação', icon: Building2, tone: 'text-primary' },
  vse: { label: 'VSE', icon: Wind, tone: 'text-accent' },
  se: { label: 'SE', icon: Siren, tone: 'text-warn' },
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
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: locations, error: locError }, { data: recentActs }] = await Promise.all([
    supabase
      .from('locations')
      .select('id, name, kind, sort_order')
      .eq('line', 'linha-6')
      .order('sort_order', { ascending: true }),
    supabase
      .from('activities')
      .select('location_id')
      .is('deleted_at', null)
      .gte('started_at', ninetyDaysAgo)
      .limit(2000),
  ]);

  const grouped = (locations ?? []).reduce<Record<string, typeof locations>>((acc, l) => {
    const k = l.kind as string;
    (acc[k] ||= [] as any).push(l);
    return acc;
  }, {});

  // Ranking de locais por atividade nos últimos 90 dias
  const countByLocation: Record<string, number> = {};
  ((recentActs ?? []) as { location_id: string | null }[]).forEach((a) => {
    if (a.location_id) countByLocation[a.location_id] = (countByLocation[a.location_id] ?? 0) + 1;
  });
  const nameById = Object.fromEntries((locations ?? []).map((l) => [l.id, l.name]));
  const topLocations = Object.entries(countByLocation)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCount = topLocations[0]?.[1] ?? 1;

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-muted-foreground/70">
            {t('title').toUpperCase()} · LINHA UNI / ACCIONA
          </span>
          <h1 className="text-[28px] font-semibold tracking-[-0.015em]">Linha 6 — Laranja</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            [grouped.estacao?.length ?? 0, t('stationsLabel')],
            [grouped.vse?.length ?? 0, 'VSEs'],
            [grouped.se?.length ?? 0, 'SEs'],
          ].map(([n, label]) => (
            <span
              key={String(label)}
              className="rounded-[7px] border border-border bg-card px-2.5 py-1.5 font-mono text-[10.5px] uppercase text-muted-foreground"
            >
              {n} {label}
            </span>
          ))}
          {(grouped.patio?.length ?? 0) > 0 && (
            <span className="rounded-[7px] border border-border bg-card px-2.5 py-1.5 font-mono text-[10.5px] uppercase text-muted-foreground">
              Pátio
            </span>
          )}
        </div>
      </header>

      {locError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs font-mono text-destructive">
          Erro ao carregar locais: {locError.message} · code: {locError.code}
        </div>
      )}

      <Linha6Scheme
        stops={(locations ?? []) as any}
        locale={locale}
        legend={{
          station: t('legendStation'),
          vse: t('legendVse'),
          se: t('legendSe'),
          note: t('schemeNote'),
        }}
      />

      {topLocations.length > 0 && (
        <div className="overflow-hidden rounded-[14px] border border-border bg-card">
          <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
            <span className="text-sm font-semibold">{t('mostActive')}</span>
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground/70">
              {t('last90')}
            </span>
          </div>
          <div className="flex flex-col gap-3 px-5 pb-[18px] pt-3.5">
            {topLocations.map(([id, n]) => (
              <Link key={id} href={`/atividades?location=${id}`} className="group flex items-center gap-3.5">
                <span className="w-[190px] flex-none truncate text-[12.5px] font-medium group-hover:text-accent">
                  {nameById[id] ?? '—'}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full rounded-full bg-gradient-to-r from-[#1095D6] to-[#35B6F5]"
                    style={{ width: `${Math.max(6, Math.round((n / maxCount) * 100))}%` }}
                  />
                </span>
                <span className="w-[30px] text-right font-mono text-[11px] text-muted-foreground">
                  {n}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([kind, items]) => {
        const meta = KIND_META[kind] ?? KIND_META.outro;
        const Icon = meta.icon;
        return (
          <section key={kind} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${meta.tone}`} />
              <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                  <Card className="rounded-xl transition-all group-hover:border-primary/40">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
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
