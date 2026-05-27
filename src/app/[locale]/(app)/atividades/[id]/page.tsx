import { notFound } from 'next/navigation';
import { Calendar, ClipboardList, MapPin, User, Users } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PhotoGallery } from '@/components/activity/photo-lightbox';
import { Pencil, Copy } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PdfDownloadButton } from '@/components/activity/pdf-download-button';
import { ActivityDeleteButton } from '@/components/activity/activity-actions';
import { CopyVerifyLink } from '@/components/activity/copy-verify-link';
import { formatDate, formatDateTime } from '@/lib/utils';

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
  if (!user) redirect({ href: '/login', locale });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  const { data: activity } = await supabase
    .from('activities')
    .select(`
      *,
      locations(name, kind),
      activity_types(label_pt, label_en, label_es),
      activity_participants(name, role),
      activity_photos(id, storage_path, caption),
      signatures(*)
    `)
    .eq('id', id)
    .single();

  if (!activity) notFound();
  const act = activity as any;

  // Busca supervisor e cliente separadamente para evitar ambiguidade de FK
  const [{ data: supervisorProfile }, { data: clientProfile }] = await Promise.all([
    act.supervisor_id
      ? supabase.from('profiles').select('full_name').eq('id', act.supervisor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    act.client_id
      ? supabase.from('profiles').select('full_name').eq('id', act.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  act.supervisor = supervisorProfile;
  act.client = clientProfile;

  const localeKey = (locale === 'en' ? 'label_en' : locale === 'es' ? 'label_es' : 'label_pt') as any;
  const typeLabel = act.activity_types?.[localeKey];

  const signature = act.signatures?.find((s: any) => !s.rejected) ?? null;

  // Bucket é privado → usar signed URLs (expiram em 1h)
  const photosWithUrls = await Promise.all(
    (act.activity_photos ?? []).map(async (p: any) => {
      const { data } = await supabase.storage
        .from('activity-photos')
        .createSignedUrl(p.storage_path, 3600);
      return { ...p, url: data?.signedUrl ?? '' };
    }),
  );

  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={act.status} label={t(`activities.status.${act.status}`)} />
            <span className="text-data">{typeLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {act.status === 'assinada' && signature?.verification_code && (
              <CopyVerifyLink code={signature.verification_code} />
            )}
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
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{act.description}</h1>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoBlock icon={<MapPin className="h-4 w-4" />} label={t('activities.fields.location')}>
          {act.locations?.name}
        </InfoBlock>
        <InfoBlock icon={<Calendar className="h-4 w-4" />} label={t('activities.fields.startedAt')}>
          {formatDate(act.started_at, locale === 'pt' ? 'pt-BR' : locale)}
        </InfoBlock>
        <InfoBlock icon={<User className="h-4 w-4" />} label={t('activities.fields.supervisor')}>
          {act.supervisor?.full_name ?? '—'}
        </InfoBlock>
        <InfoBlock icon={<User className="h-4 w-4" />} label={t('activities.fields.client')}>
          {act.client?.full_name ?? '—'}
        </InfoBlock>
      </section>

      {act.notes && (
        <Card>
          <CardContent className="p-4 text-sm whitespace-pre-wrap">{act.notes}</CardContent>
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
              {act.activity_participants.map((p: any) => (
                <li key={p.name}>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('activities.fields.photos')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoGallery photos={photosWithUrls as any} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ── Bloco de assinatura (histórico) ou aviso para Resumo Diário ── */}
      {signature && act.status === 'assinada' ? (
        <Card className="surface-elevated border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <CardTitle className="text-base">{t('signature.title')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Documento verificado e autenticado</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SignatureDisplay signature={signature} locale={locale} />
          </CardContent>
        </Card>
      ) : act.status === 'rascunho' && profile?.role !== 'cliente' ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Envio para assinatura via Resumo Diário</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Para enviar para assinatura, adicione esta atividade a um resumo diário na seção{' '}
              <Link href="/resumo-diario" className="text-primary hover:underline">
                Resumo Diário
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoBlock({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <p className="text-[10px] uppercase tracking-wider">{label}</p>
        </div>
        <p className="mt-1.5 text-sm font-medium truncate">{children}</p>
      </CardContent>
    </Card>
  );
}

function SignatureDisplay({ signature, locale }: { signature: any; locale: string }) {
  const loc = locale === 'pt' ? 'pt-BR' : locale;
  return (
    <div className="space-y-4">
      {/* Assinatura SVG */}
      <div className="relative rounded-xl border border-border bg-muted/20 p-4 overflow-hidden">
        <div
          className="w-full max-h-[160px] flex items-center justify-center invert-0 dark:invert opacity-90"
          dangerouslySetInnerHTML={{ __html: signature.svg_data }}
        />
        <div className="absolute bottom-3 left-6 right-6 h-px bg-border/60" />
      </div>

      {/* Meta da assinatura */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Assinado por</p>
          <p className="text-sm font-semibold truncate">{signature.signer_name}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Data</p>
          <p className="text-sm font-medium">{formatDateTime(signature.signed_at, loc)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">Código</p>
          <p className="text-sm font-mono text-primary">{signature.verification_code}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const map: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
    rascunho: 'secondary',
    enviada: 'warning',
    assinada: 'success',
    rejeitada: 'destructive',
  };
  return <Badge variant={map[status] ?? 'secondary'}>{label ?? status}</Badge>;
}
