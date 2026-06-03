export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ShieldCheck, AlertTriangle, Clock, CalendarDays, User } from 'lucide-react';
import { FileDown } from 'lucide-react';
import { ActivityPicker } from './activity-picker';
import { SendReportButton } from './send-button';
import { SignDailyReportPanel } from './sign-panel';
import { DeleteReportButton } from './delete-button';

export default async function DailyReportPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
    : { data: null };
  const role = (me as any)?.role as 'admin' | 'supervisor' | 'cliente' | undefined;

  // Busca o resumo
  const { data: report } = await (supabase as any)
    .from('daily_reports')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (!report) notFound();

  // Dados relacionados em paralelo
  const [
    { data: client },
    { data: supervisor },
    { data: reportActivities },
    { data: signature },
  ] = await Promise.all([
    report.client_id
      ? supabase.from('profiles').select('full_name').eq('id', report.client_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('profiles').select('full_name').eq('id', report.supervisor_id).single(),
    (supabase as any)
      .from('daily_report_activities')
      .select('activity_id')
      .eq('daily_report_id', id),
    (supabase as any)
      .from('daily_report_signatures')
      .select('*')
      .eq('daily_report_id', id)
      .maybeSingle(),
  ]);

  const includedIds: string[] = (reportActivities ?? []).map((r: any) => r.activity_id);

  // Atividades incluídas (com detalhes) + fotos
  const [{ data: includedActivities }, { data: allPhotos }] = await Promise.all([
    includedIds.length
      ? supabase
          .from('activities')
          .select('id, description, status, started_at, locations(name, sort_order), activity_types(label_pt)')
          .in('id', includedIds)
          .order('started_at')
      : Promise.resolve({ data: [] }),
    includedIds.length
      ? (supabase as any)
          .from('activity_photos')
          .select('id, activity_id, storage_path, caption')
          .in('activity_id', includedIds)
          .order('uploaded_at')
      : Promise.resolve({ data: [] }),
  ]);

  // Signed URLs para fotos (expiram em 1h)
  const photosWithUrls = await Promise.all(
    (allPhotos ?? []).map(async (ph: any) => {
      const { data } = await supabase.storage
        .from('activity-photos')
        .createSignedUrl(ph.storage_path, 3600);
      return { ...ph, url: data?.signedUrl ?? null };
    })
  );
  const photosByActivity: Record<string, typeof photosWithUrls> = {};
  photosWithUrls.forEach(ph => {
    if (ph.url) (photosByActivity[ph.activity_id] ||= []).push(ph);
  });

  // Ordena por local (sort_order) → started_at
  const sortedActivities = [...(includedActivities ?? [])].sort((a: any, b: any) => {
    const sa = a.locations?.sort_order ?? 9999;
    const sb = b.locations?.sort_order ?? 9999;
    if (sa !== sb) return sa - sb;
    return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
  });

  // Atividades disponíveis para adicionar (mesmo dia, não incluídas, não assinadas)
  const dateStart = report.report_date + 'T00:00:00';
  const dateEnd   = report.report_date + 'T23:59:59';

  let availableActivities: any[] = [];
  const canEdit = ['rascunho', 'cancelado'].includes(report.status);

  if (canEdit && role !== 'cliente') {
    const { data: allDay } = await supabase
      .from('activities')
      .select('id, description, status, started_at, locations(name), activity_types(label_pt)')
      .gte('started_at', dateStart)
      .lte('started_at', dateEnd)
      .not('status', 'in', '("assinada")')
      .is('deleted_at', null)
      .order('started_at');

    // Filtra as que não estão neste resumo
    const includedSet = new Set(includedIds);

    // Filtra as que estão em outro resumo ativo
    const candidateIds = (allDay ?? [])
      .filter((a: any) => !includedSet.has(a.id))
      .map((a: any) => a.id);

    if (candidateIds.length) {
      const { data: alreadyInOtherReport } = await (supabase as any)
        .from('daily_report_activities')
        .select('activity_id, daily_reports(status)')
        .in('activity_id', candidateIds);

      const blockedIds = new Set(
        ((alreadyInOtherReport ?? []) as any[])
          .filter((r: any) => r.daily_reports?.status !== 'cancelado')
          .map((r: any) => r.activity_id)
      );

      availableActivities = (allDay ?? []).filter(
        (a: any) => !includedSet.has(a.id) && !blockedIds.has(a.id)
      );
    } else {
      availableActivities = [];
    }
  }

  const localeStr = locale === 'pt' ? 'pt-BR' : locale;
  const isClient  = role === 'cliente';
  const canSign   = report.status === 'aguardando_assinatura' && isClient;
  const isSigned  = report.status === 'assinado';
  const isCancelled = report.status === 'cancelado';

  const statusConfig: Record<string, { label: string; variant: any }> = {
    rascunho:              { label: 'Rascunho',              variant: 'secondary'    },
    aguardando_assinatura: { label: 'Aguardando assinatura', variant: 'warning'      },
    assinado:              { label: 'Assinado',              variant: 'success'      },
    cancelado:             { label: 'Cancelado',             variant: 'destructive'  },
  };
  const sc = statusConfig[report.status] ?? { label: report.status, variant: 'secondary' };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Cabeçalho */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant={sc.variant}>{sc.label}</Badge>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/resumo-diario/${id}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileDown className="h-4 w-4" />
                PDF
              </a>
            </Button>
            {!isClient && (
              <DeleteReportButton reportId={id} />
            )}
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Resumo diário — {formatDate(report.report_date + 'T12:00:00', localeStr)}
        </h1>
      </header>

      {/* Metadados */}
      <Card>
        <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-2.5 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-medium">{formatDate(report.report_date + 'T12:00:00', localeStr)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Supervisor</p>
              <p className="font-medium">{(supervisor as any)?.full_name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{(client as any)?.full_name ?? 'Não definido'}</p>
            </div>
          </div>
          {report.sent_at && (
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Enviado em</p>
                <p className="font-medium">{formatDateTime(report.sent_at, localeStr)}</p>
              </div>
            </div>
          )}
          {report.signed_at && (
            <div className="flex items-center gap-2.5 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Assinado em</p>
                <p className="font-medium">{formatDateTime(report.signed_at, localeStr)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      {report.notes && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Observações</p>
            <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Aviso de cancelamento */}
      {isCancelled && report.cancellation_reason && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Assinatura cancelada pelo cliente</p>
            <p className="text-sm text-muted-foreground mt-0.5">{report.cancellation_reason}</p>
          </div>
        </div>
      )}

      {/* Atividades */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Atividades incluídas
            {includedIds.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({includedIds.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {canEdit && role !== 'cliente' ? (
            <ActivityPicker
              reportId={id}
              reportDate={report.report_date}
              includedActivities={(includedActivities ?? []) as any[]}
              availableActivities={availableActivities}
            />
          ) : (
            <>
              {sortedActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma atividade incluída.</p>
              ) : (
                <div className="space-y-5">
                  {(() => {
                    // Agrupa por local para exibição
                    const groups: { locName: string; items: any[] }[] = [];
                    let lastLoc = '';
                    for (const a of sortedActivities) {
                      const loc = (a as any).locations?.name ?? 'Sem local';
                      if (loc !== lastLoc) { groups.push({ locName: loc, items: [] }); lastLoc = loc; }
                      groups[groups.length - 1].items.push(a);
                    }
                    return groups.map(group => (
                      <div key={group.locName}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            📍 {group.locName}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <ul className="space-y-2">
                          {group.items.map((a: any) => {
                            const photos = photosByActivity[a.id] ?? [];
                            return (
                              <li key={a.id} className="rounded-lg border border-border bg-card/50 px-3 py-2.5 space-y-2">
                                <div>
                                  <p className="text-sm font-medium">{a.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {a.activity_types?.label_pt} · {formatDate(a.started_at, localeStr)}
                                  </p>
                                </div>
                                {photos.length > 0 && (
                                  <div className="flex gap-1.5 flex-wrap">
                                    {photos.slice(0, 6).map((ph: any) => (
                                      <a
                                        key={ph.id}
                                        href={ph.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={ph.url}
                                          alt={ph.caption ?? 'Foto da atividade'}
                                          className="h-16 w-24 object-cover rounded-md border border-border hover:opacity-80 transition-opacity"
                                        />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Assinatura existente */}
      {isSigned && signature && !signature.cancelled && signature.svg_data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Assinatura
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="rounded-lg border border-border bg-background p-3 flex justify-center">
              <div
                className="max-w-xs"
                dangerouslySetInnerHTML={{ __html: signature.svg_data }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {signature.signer_name} · {formatDateTime(signature.signed_at, localeStr)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ação: enviar para assinatura (supervisor/admin) */}
      {canEdit && !isClient && (
        <>
          <Separator />
          <div className="flex items-center gap-4 flex-wrap">
            <SendReportButton
              reportId={id}
              isCancelled={isCancelled}
              hasClient={!!report.client_id}
            />
            {!report.client_id && (
              <p className="text-sm text-muted-foreground">
                Defina um cliente para poder enviar.
              </p>
            )}
          </div>
        </>
      )}

      {/* Ação: assinar (cliente) */}
      {canSign && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assinatura do cliente</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <SignDailyReportPanel
                reportId={id}
                signerName={(me as any)?.full_name}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
