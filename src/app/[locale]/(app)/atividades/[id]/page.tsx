import { notFound } from 'next/navigation';
import { Users, Pencil, Copy } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PhotoGallery } from '@/components/activity/photo-lightbox';
import { PdfDownloadButton } from '@/components/activity/pdf-download-button';
import { ActivityDeleteButton } from '@/components/activity/activity-actions';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect({ href: '/login', locale });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const { data: activity } = await supabase
    .from('activities')
    .select(`
      id, description, status, notes, evolucao, pendencias,
      started_at, ended_at, submitted_at,
      supervisor_id, client_id, continuation_of,
      locations(name, kind),
      activity_types(label_pt, label_en, label_es),
      activity_participants(name, role),
      activity_photos(id, storage_path, caption)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!activity) notFound();
  const act = activity as any;

  // Busca supervisor, cliente, atividade pai e continuações em paralelo
  const [
    { data: supervisorProfile },
    { data: clientProfile },
    { data: parentActivity },
    { data: continuations },
  ] = await Promise.all([
    act.supervisor_id
      ? supabase.from('profiles').select('full_name').eq('id', act.supervisor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    act.client_id
      ? supabase.from('profiles').select('full_name').eq('id', act.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    act.continuation_of
      ? supabase.from('activities').select('id, description, started_at').eq('id', act.continuation_of).is('deleted_at', null).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('activities')
      .select('id, description, started_at')
      .eq('continuation_of', id)
      .is('deleted_at', null)
      .order('started_at'),
  ]);
  act.supervisor = supervisorProfile;
  act.client = clientProfile;

  const localeKey = (locale === 'en' ? 'label_en' : locale === 'es' ? 'label_es' : 'label_pt') as 'label_pt' | 'label_en' | 'label_es';
  const typeLabel = act.activity_types?.[localeKey];

  // Bucket é privado → usar signed URLs (expiram em 1h)
  const photosWithUrls = await Promise.all(
    (act.activity_photos ?? []).map(async (p: any) => {
      const { data } = await supabase.storage
        .from('activity-photos')
        .createSignedUrl(p.storage_path, 3600);
      return { ...p, url: data?.signedUrl ?? '' };
    }),
  );

  const code = `ATV-${String(act.id).replace(/-/g, '').slice(0, 4).toUpperCase()}`;
  const metaChips = [
    [act.locations?.name, act.locations?.kind].filter(Boolean).join(' · '),
    typeLabel,
    formatDate(act.started_at, locale === 'pt' ? 'pt-BR' : locale),
    act.supervisor?.full_name && `${t('activities.fields.supervisor')} · ${act.supervisor.full_name}`,
    act.client?.full_name && `${t('activities.fields.client')} · ${act.client.full_name}`,
  ].filter(Boolean) as string[];

  return (
    <div className="max-w-4xl space-y-5">
      <header className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground/70">
          <Link href="/atividades" className="text-muted-foreground transition-colors hover:text-accent">
            {t('activities.title')}
          </Link>
          <span>/</span>
          <span className="text-accent">{code}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="max-w-[30ch] text-2xl font-semibold leading-[1.3] tracking-[-0.015em]">
            {act.description}
          </h1>
          <StatusBadge status={act.status} label={t(`activities.status.${act.status}`)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {metaChips.map((chip) => (
            <span
              key={chip}
              className="rounded-[7px] border border-border bg-card px-2.5 py-[5px] font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <PdfDownloadButton activityId={act.id} />
          {act.status === 'rascunho' &&
            (profile?.role === 'admin' || act.supervisor_id === user.id) && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/atividades/${act.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  {t('activities.actions.edit')}
                </Link>
              </Button>
            )}
          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/atividades/nova?from=${act.id}`}
              >
                <Copy className="h-4 w-4" />
                {t('activities.duplicate')}
              </Link>
            </Button>
          )}
          {/* Admin deleta qualquer atividade. Supervisor deleta as suas (qualquer status). */}
          {(profile?.role === 'admin' ||
            (profile?.role === 'supervisor' && act.supervisor_id === user.id)) && (
            <ActivityDeleteButton id={act.id} />
          )}
        </div>
      </header>

      {/* Cadeia de continuações */}
      {(parentActivity || (continuations && continuations.length > 0)) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {parentActivity && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="shrink-0">← Continua:</span>
                <Link href={`/atividades/${(parentActivity as any).id}`} className="text-primary hover:underline truncate">
                  {(parentActivity as any).description}
                  {' · '}
                  {formatDate((parentActivity as any).started_at, locale === 'pt' ? 'pt-BR' : locale)}
                </Link>
              </div>
            )}
            {continuations && continuations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="shrink-0">→ Continua em:</span>
                {continuations.map((c: any, i: number) => (
                  <Link key={c.id} href={`/atividades/${c.id}`} className="text-primary hover:underline">
                    Parte {i + 2} · {formatDate(c.started_at, locale === 'pt' ? 'pt-BR' : locale)}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evolução, Observações, Pendências — bullets coloridos do design system */}
      {(act.evolucao || act.notes || act.pendencias) && (
        <Card className="rounded-[14px]">
          <CardContent className="flex flex-col gap-4 p-5">
            {act.evolucao && (
              <div className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-ok" />
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">Evolução</p>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-muted-foreground">{act.evolucao}</p>
                </div>
              </div>
            )}
            {act.notes && (
              <div className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-zitron-steel" />
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">Observações</p>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-muted-foreground">{act.notes}</p>
                </div>
              </div>
            )}
            {act.pendencias && (
              <div className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-warn" />
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">Pendências</p>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-[1.6] text-muted-foreground">{act.pendencias}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {act.activity_participants?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('activities.fields.participants')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {act.activity_participants.map((p: any, i: number) => (
                <li key={`${p.name}-${i}`}>
                  <Badge variant="secondary" className="px-3 py-1">
                    <span className="flex flex-col leading-tight">
                      <span className="font-medium">{p.name}</span>
                      {p.role && (
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          {p.role}
                        </span>
                      )}
                    </span>
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {photosWithUrls.length > 0 && (
        <Card className="rounded-[14px]">
          <CardHeader className="flex-row items-baseline justify-between space-y-0">
            <CardTitle className="text-[13.5px]">{t('activities.fields.photos')}</CardTitle>
            <span className="font-mono text-[10px] tracking-[0.1em] text-muted-foreground/70">
              {photosWithUrls.length} {locale === 'en' ? 'RECORDS' : 'REGISTROS'}
            </span>
          </CardHeader>
          <CardContent>
            <PhotoGallery photos={photosWithUrls as any} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}

