import { ArrowLeft, Clock, Coins, MapPin, Calendar, User, CheckCircle2 } from 'lucide-react';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  SendClaimButton,
  AcknowledgeClaimButton,
  RespondClaimForm,
  DeleteClaimButton,
} from './claim-actions';

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

export default async function ReclamoDetailPage({
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
  const { data: me } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null };
  const role = me?.role as 'admin' | 'supervisor' | 'cliente' | undefined;

  const { data: claim } = await supabase
    .from('claims')
    .select(
      'id, ref_code, claim_type, title, description, event_date, time_impact_days, cost_impact_amount, location_id, author_id, client_id, status, notified_at, acknowledged_at, response_at, response_outcome, response_note, created_at, locations(name)',
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!claim) notFound();

  const [{ data: timeline }, { data: people }] = await Promise.all([
    supabase
      .from('claim_timeline')
      .select('id, event, actor_name, created_at')
      .eq('claim_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [claim.author_id, claim.client_id].filter(Boolean) as string[]),
  ]);

  const nameOf = (pid: string | null) =>
    pid ? people?.find((p) => p.id === pid)?.full_name ?? null : null;

  const loc = locale === 'pt' ? 'pt-BR' : locale;
  const isAuthor = role === 'admin' || (role === 'supervisor' && claim.author_id === user?.id);
  const isClient = role === 'cliente' && claim.client_id === user?.id;

  const canSend = isAuthor && claim.status === 'rascunho';
  const canDelete = isAuthor;
  const canAck = isClient && claim.status === 'enviado';
  const canRespond = isClient && ['recebido', 'em_analise'].includes(claim.status);

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
      </div>

      {/* Cabeçalho */}
      <header className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={claim.status} label={t(`claims.status.${claim.status}`)} />
          {claim.ref_code && (
            <span className="text-sm font-mono text-primary">{claim.ref_code}</span>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{claim.title}</h1>
        <p className="text-sm text-muted-foreground">{t(`claims.types.${claim.claim_type}`)}</p>
      </header>

      {/* Corpo */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              {t('claims.descriptionField')}
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{claim.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <Meta icon={<Calendar className="h-3.5 w-3.5" />} label={t('claims.eventDate')}>
              {formatDate(claim.event_date, loc)}
            </Meta>
            {claim.locations?.name && (
              <Meta icon={<MapPin className="h-3.5 w-3.5" />} label={t('claims.location')}>
                {claim.locations.name}
              </Meta>
            )}
            <Meta icon={<User className="h-3.5 w-3.5" />} label={t('claims.author')}>
              {nameOf(claim.author_id) ?? '—'}
            </Meta>
            <Meta icon={<User className="h-3.5 w-3.5" />} label={t('claims.client')}>
              {nameOf(claim.client_id) ?? '—'}
            </Meta>
          </div>

          {/* Impacto pleiteado */}
          {(claim.time_impact_days != null || claim.cost_impact_amount != null) && (
            <div className="pt-2 border-t border-border/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                {t('claims.impactTitle')}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {claim.time_impact_days != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {claim.time_impact_days} {t('claims.days')}
                  </span>
                )}
                {claim.cost_impact_amount != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    {formatBRL(claim.cost_impact_amount, locale)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Estado de envio / acuse */}
          <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground space-y-1">
            <p>
              {claim.notified_at
                ? `${t('claims.sentAt')} ${formatDateTime(claim.notified_at, loc)}`
                : t('claims.notNotified')}
            </p>
            {claim.acknowledged_at && (
              <p className="text-foreground inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {t('claims.acknowledgedAt')} {formatDateTime(claim.acknowledged_at, loc)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resposta da Acciona */}
      {claim.response_at && claim.response_outcome && (
        <Card className="border-primary/30">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t('claims.outcomeTitle')}
              </p>
              <StatusBadge
                status={claim.response_outcome === 'aceito' ? 'respondido' : claim.response_outcome === 'rejeitado' ? 'rejeitada' : 'recebido'}
                label={t(`claims.outcomes.${claim.response_outcome}`)}
              />
            </div>
            {claim.response_note && (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{claim.response_note}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('claims.respondedAt')} {formatDateTime(claim.response_at, loc)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      {(canSend || canAck || canRespond || canDelete) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {canAck && <AcknowledgeClaimButton claimId={claim.id} />}
            {canRespond && <RespondClaimForm claimId={claim.id} />}
            <div className="flex flex-wrap items-center gap-2">
              {canSend && <SendClaimButton claimId={claim.id} disabled={!claim.client_id} />}
              {canSend && !claim.client_id && (
                <span className="text-xs text-destructive">{t('claims.validation.client')}</span>
              )}
              {canDelete && <DeleteClaimButton claimId={claim.id} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico / timeline */}
      {timeline && timeline.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">
              {t('claims.timeline')}
            </p>
            <ol className="space-y-3">
              {timeline.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm">{t(`claims.events.${ev.event}`)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(ev.created_at, loc)}
                      {ev.actor_name ? ` · ${ev.actor_name}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
