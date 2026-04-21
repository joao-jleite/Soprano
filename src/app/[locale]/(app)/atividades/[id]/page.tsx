import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Calendar, MapPin, User, Users } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SignActivityPanel } from './sign-panel';
import { PhotoGallery } from '@/components/activity/photo-lightbox';
import { Pencil, Copy } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PdfDownloadButton } from '@/components/activity/pdf-download-button';
import { ActivityDeleteButton } from '@/components/activity/activity-actions';
import { CopyVerifyLink } from '@/components/activity/copy-verify-link';
import { formatDateTime } from '@/lib/utils';

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

  const signature = act.signatures?.[0];
  const canSign =
    profile?.role === 'cliente' &&
    act.client_id === user.id &&
    act.status === 'enviada' &&
    !signature;

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
            {(profile?.role === 'admin' ||
              (profile?.role === 'supervisor' && act.supervisor_id === user.id && act.status === 'rascunho')) && (
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
          {formatDateTime(act.started_at, locale === 'pt' ? 'pt-BR' : locale)}
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

      <Card className={signature ? 'surface-elevated border-primary/30' : ''}>
        <CardHeader>
          <CardTitle className="text-base">{t('signature.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {signature ? (
            <SignatureDisplay signature={signature} locale={locale} />
          ) : canSign ? (
            <SignActivityPanel activityId={act.id} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {act.status === 'rascunho'
                ? t('activities.draftNotice')
                : t('activities.waitingClient')}
            </p>
          )}
        </CardContent>
      </Card>
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
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-card p-4">
        <div
          className="w-full max-h-[160px] flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: signature.svg_data }}
        />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{signature.signer_name}</strong>
        </span>
        <span>{formatDateTime(signature.signed_at, locale === 'pt' ? 'pt-BR' : locale)}</span>
        <span className="font-mono">Cód. {signature.verification_code}</span>
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
