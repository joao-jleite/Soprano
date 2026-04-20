import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Calendar, MapPin, User, Users } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SignActivityPanel } from './sign-panel';
import { PdfDownloadButton } from '@/components/activity/pdf-download-button';
import { ActivityDeleteButton } from '@/components/activity/activity-actions';
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
  if (!user) notFound();

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
      supervisor:profiles!activities_supervisor_id_fkey(full_name),
      client:profiles!activities_client_id_fkey(full_name),
      activity_participants(name, role),
      activity_photos(id, storage_path, caption),
      signatures(*)
    `)
    .eq('id', id)
    .single();

  if (!activity) notFound();
  const act = activity as any;

  const localeKey = (locale === 'en' ? 'label_en' : locale === 'es' ? 'label_es' : 'label_pt') as any;
  const typeLabel = act.activity_types?.[localeKey];

  const signature = act.signatures?.[0];
  const canSign =
    profile?.role === 'cliente' &&
    act.client_id === user.id &&
    act.status === 'enviada' &&
    !signature;

  const photosWithUrls = await Promise.all(
    (act.activity_photos ?? []).map(async (p: any) => {
      const { data } = supabase.storage.from('activity-photos').getPublicUrl(p.storage_path);
      return { ...p, url: data.publicUrl };
    }),
  );

  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={act.status} />
            <span className="text-data">{typeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <PdfDownloadButton activityId={act.id} />
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
        <InfoBlock icon={<User className="h-4 w-4" />} label="Supervisor">
          {act.supervisor?.full_name ?? '—'}
        </InfoBlock>
        <InfoBlock icon={<User className="h-4 w-4" />} label="Cliente">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photosWithUrls.map((p: any) => (
                <div key={p.id} className="relative aspect-square rounded-md overflow-hidden border border-border">
                  <Image src={p.url} alt={p.caption ?? ''} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
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
                ? 'Esta atividade ainda é um rascunho. Envie para assinatura quando estiver pronta.'
                : 'Aguardando ação do cliente designado.'}
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
    rascunho: 'secondary',
    enviada: 'warning',
    assinada: 'success',
    rejeitada: 'destructive',
  };
  return <Badge variant={map[status] ?? 'secondary'}>{status}</Badge>;
}
