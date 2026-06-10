'use client';

import * as React from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExpandableSelect, type Option } from '@/components/activity/expandable-select';
import { MultiExpandableSelect } from '@/components/activity/multi-expandable-select';
import { ParticipantsEditor, type Participant } from '@/components/activity/participants-editor';
import { PhotoUpload, type UploadedPhoto } from '@/components/activity/photo-upload';
import { PhotoCapture, type CapturedPhoto } from '@/components/activity/photo-capture';
import {
  createActivity,
  createActivityType,
  createLocation,
  updateActivity,
} from '@/app/actions/activities';
import { formatDate } from '@/lib/utils';
import { useOnline } from '@/lib/offline/use-online';
import { uploadPhotoBlob } from '@/lib/offline/photo-storage';
import {
  enqueueActivity,
  updateQueuedActivity,
  getActivity,
  getPhotos,
  type NewActivityInput,
  type NewPhotoInput,
} from '@/lib/offline/queue';
import { syncPending } from '@/lib/offline/sync';

export type InitialActivity = {
  id: string;
  locationId: string;
  /** Usado apenas no modo edit. No modo create, typeIds pode ter múltiplos valores. */
  activityTypeId: string;
  clientId: string | null;
  description: string;
  notes: string | null;
  evolucao: string | null;
  pendencias: string | null;
  continuationOf: string | null;
  startedAt: string;
  endedAt: string | null;
  participants: { name: string; role: string | null }[];
  photos: { storagePath: string; url?: string }[];
};

type RecentActivity = {
  id: string;
  description: string;
  started_at: string;
  locations?: { name: string } | null;
};

type Props = {
  locations: { id: string; name: string; kind: string }[];
  types: { id: string; slug: string; label_pt: string; label_en: string; label_es: string }[];
  clients: { id: string; full_name: string }[];
  recentActivities?: RecentActivity[];
  locale: string;
  initial?: InitialActivity;
  mode?: 'create' | 'edit';
  /** Quando definido, edita um item da fila offline (tela "Aguardando envio"). */
  pendingLocalId?: string;
};

export function NewActivityForm({
  locations,
  types,
  clients,
  recentActivities = [],
  locale,
  initial,
  mode = 'create',
  pendingLocalId,
}: Props) {
  const t = useTranslations('activities');
  const tLoc = useTranslations('locations');
  const router = useRouter();

  const draftIdRef = React.useRef(initial?.id ?? crypto.randomUUID());

  const [locationOptions, setLocationOptions] = React.useState<Option[]>(
    locations.map((l) => ({
      value: l.id,
      label: l.name,
      sublabel: tLoc(`kindsLong.${l.kind}` as any),
    })),
  );
  const [typeOptions, setTypeOptions] = React.useState<Option[]>(
    types.map((tp) => ({
      value: tp.id,
      label:
        locale === 'en' ? tp.label_en : locale === 'es' ? tp.label_es : tp.label_pt,
    })),
  );

  const [locationId, setLocationId] = React.useState<string | null>(
    initial?.locationId ?? null,
  );

  /**
   * Em modo create: array de tipos (multi-select).
   * Em modo edit: array com exatamente 1 elemento (single-select representado como array).
   */
  const [typeIds, setTypeIds] = React.useState<string[]>(
    initial?.activityTypeId ? [initial.activityTypeId] : [],
  );

  const [clientId, setClientId] = React.useState<string | null>(initial?.clientId ?? null);
  const [description, setDescription] = React.useState(initial?.description ?? '');
  const [notes, setNotes] = React.useState(initial?.notes ?? '');
  const [evolucao, setEvolucao] = React.useState(initial?.evolucao ?? '');
  const [pendencias, setPendencias] = React.useState(initial?.pendencias ?? '');
  const [continuationOf, setContinuationOf] = React.useState<string | null>(
    initial?.continuationOf ?? null,
  );
  const [startedAt, setStartedAt] = React.useState(() =>
    initial?.startedAt
      ? new Date(initial.startedAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [endedAt, setEndedAt] = React.useState(
    initial?.endedAt ? new Date(initial.endedAt).toISOString().slice(0, 10) : '',
  );
  const [participants, setParticipants] = React.useState<Participant[]>(
    (initial?.participants ?? []) as any,
  );
  // Modo edit: fotos já no Storage (PhotoUpload). Modo create: blobs locais (PhotoCapture).
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>(
    (initial?.photos ?? []).map((p) => ({ storagePath: p.storagePath, url: p.url ?? '' })),
  );
  const [captured, setCaptured] = React.useState<CapturedPhoto[]>([]);

  const online = useOnline();
  const [saving, setSaving] = React.useState(false);
  const [loadingPending, setLoadingPending] = React.useState(!!pendingLocalId);

  // ── Edição de item da fila offline: carrega do IndexedDB e prefilla ────────
  React.useEffect(() => {
    if (!pendingLocalId) return;
    let cancelled = false;
    (async () => {
      const act = await getActivity(pendingLocalId);
      if (cancelled) return;
      if (!act) {
        setLoadingPending(false);
        return;
      }
      draftIdRef.current = act.clientKey || draftIdRef.current;
      setLocationId(act.locationId);
      setTypeIds(act.activityTypeIds);
      setClientId(act.clientId ?? null);
      setDescription(act.description);
      setNotes(act.notes ?? '');
      setEvolucao(act.evolucao ?? '');
      setPendencias(act.pendencias ?? '');
      setContinuationOf(act.continuationOf ?? null);
      setStartedAt(new Date(act.startedAt).toISOString().slice(0, 10));
      setEndedAt(act.endedAt ? new Date(act.endedAt).toISOString().slice(0, 10) : '');
      setParticipants((act.participants ?? []) as Participant[]);

      const phs = await getPhotos(pendingLocalId);
      if (cancelled) return;
      setCaptured(
        phs.map((p) => ({
          id: crypto.randomUUID(),
          blob: p.blob,
          fileType: p.fileType,
          previewUrl: URL.createObjectURL(p.blob),
          caption: p.caption ?? '',
          lat: p.lat,
          lng: p.lng,
        })),
      );
      setLoadingPending(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLocalId]);

  // ── Handlers de criação inline ───────────────────────────────────────────

  async function handleCreateLocation(name: string): Promise<Option> {
    const result = await createLocation(name, 'outro');
    if ('error' in result) {
      toast.error(result.error ?? t('errors.createLocation'));
      throw new Error(result.error);
    }
    const opt: Option = { value: result.id, label: result.name, sublabel: tLoc('kinds.outro') };
    setLocationOptions((prev) => [...prev, opt]);
    toast.success(t('toasts.locationCreated', { name: result.name }));
    return opt;
  }

  async function handleCreateType(name: string): Promise<Option> {
    const result = await createActivityType({ labelPt: name });
    if ('error' in result) {
      toast.error(result.error ?? t('errors.createType'));
      throw new Error(result.error);
    }
    const opt: Option = { value: result.id, label: result.label_pt };
    setTypeOptions((prev) => [...prev, opt]);
    toast.success(t('toasts.typeCreated', { name: result.label_pt }));
    return opt;
  }

  // ── Salvar ───────────────────────────────────────────────────────────────

  /** Campos comuns (sem fotos), compartilhados por edit/create/offline. */
  function buildBase() {
    return {
      locationId: locationId!,
      clientId,
      description,
      notes: notes || undefined,
      evolucao: evolucao || undefined,
      pendencias: pendencias || undefined,
      continuationOf: continuationOf || undefined,
      startedAt: new Date(startedAt + 'T12:00:00').toISOString(),
      endedAt: endedAt ? new Date(endedAt + 'T12:00:00').toISOString() : null,
      participants,
    };
  }

  /** Monta o payload offline (campos + rótulos de exibição), reusado por criar/editar. */
  function buildOfflinePayload(): NewActivityInput {
    return {
      ...buildBase(),
      activityTypeIds: typeIds,
      // Mesma chave do caminho online (draftId): se o envio começou online e
      // caiu aqui, o servidor dedupe pelo clientKey e não cria atividade dobrada.
      clientKey: draftIdRef.current,
      // Rótulos só para a tela "Pendentes" ficar legível offline (não vão ao servidor).
      locationLabel: locationOptions.find((o) => o.value === locationId)?.label,
      typeLabels: typeIds
        .map((id) => typeOptions.find((o) => o.value === id)?.label)
        .filter((l): l is string => !!l),
    };
  }

  /** Fotos capturadas no formato da fila offline. */
  function capturedToPhotos(): NewPhotoInput[] {
    return captured.map((p) => ({
      blob: p.blob,
      fileType: p.fileType,
      caption: p.caption || undefined,
      lat: p.lat,
      lng: p.lng,
    }));
  }

  /** Enfileira a atividade + fotos no banco local para sync posterior. */
  async function saveOffline() {
    await enqueueActivity(buildOfflinePayload(), capturedToPhotos());
    toast.success(t('toasts.savedOffline'));
    router.push('/atividades');
  }

  /** Salva as alterações de um item já na fila (tela "Aguardando envio"). */
  async function saveEditedPending() {
    await updateQueuedActivity(pendingLocalId!, buildOfflinePayload(), capturedToPhotos());
    toast.success('Atividade atualizada — sobe quando houver conexão.');
    void syncPending();
    router.push('/atividades/pendentes');
  }

  async function handleSave() {
    if (!locationId || typeIds.length === 0 || !description.trim()) return;
    // Valida a ordem das datas no cliente. Sem isto, no offline a atividade era
    // enfileirada e só falhava no sync (a regra só existia no servidor) — virava
    // um item travado que nunca subia.
    if (datesInvalid) {
      toast.error('A data de término não pode ser anterior ao início.');
      return;
    }
    setSaving(true);

    try {
      // ── Edição de item da fila offline ──
      if (pendingLocalId) {
        await saveEditedPending();
        return;
      }

      // ── Modo edição (online apenas) ──
      if (mode === 'edit' && initial) {
        const result = await updateActivity({
          ...buildBase(),
          photos: photos.map((p) => ({ storagePath: p.storagePath })),
          id: initial.id,
          activityTypeId: typeIds[0],
        });
        if (result.error) { toast.error(result.error); return; }
        toast.success(t('toasts.draftSaved'));
        router.push(`/atividades/${result.id!}`);
        return;
      }

      // ── Modo criação ──
      // Sem rede: grava local e sincroniza depois.
      if (!online) {
        await saveOffline();
        return;
      }

      // Com rede: sobe as fotos e cria via Server Action. Se a rede cair no
      // meio (upload/action lançam), cai no enfileiramento offline.
      try {
        const folder = `draft/${draftIdRef.current}`;
        const uploadedPhotos = await Promise.all(
          captured.map(async (p) => ({
            storagePath: await uploadPhotoBlob(p.blob, p.fileType, folder),
            caption: p.caption || undefined,
            lat: p.lat,
            lng: p.lng,
          })),
        );

        const result = await createActivity({
          ...buildBase(),
          photos: uploadedPhotos,
          activityTypeIds: typeIds,
          clientKey: draftIdRef.current,
        });
        if (result.error) { toast.error(result.error); return; }

        const ids = result.ids!;
        if (ids.length === 1) {
          toast.success(t('toasts.draftSaved'));
          router.push(`/atividades/${ids[0]}`);
        } else {
          toast.success(`${ids.length} atividades criadas como rascunho.`);
          router.push('/atividades');
        }
      } catch {
        // Falha de rede no meio do envio online → guarda offline.
        await saveOffline();
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('errors.saveActivity'));
    } finally {
      setSaving(false);
    }
  }

  const datesInvalid = !!(endedAt && new Date(endedAt) < new Date(startedAt));
  const canSave =
    !!(locationId && typeIds.length > 0 && description.trim().length >= 3) && !datesInvalid;

  // ── Render ───────────────────────────────────────────────────────────────

  if (loadingPending) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onde e o quê */}
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="text-base">{t('sections.whereWhat')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('fields.location')}>
              <ExpandableSelect
                options={locationOptions}
                value={locationId}
                onChange={setLocationId}
                onCreate={handleCreateLocation}
                placeholder={t('placeholders.selectLocation')}
              />
            </Field>

            <Field
              label={t('fields.type')}
              hint={
                mode === 'create'
                  ? 'Selecione um ou mais tipos para criar atividades em lote'
                  : undefined
              }
            >
              {mode === 'create' ? (
                <MultiExpandableSelect
                  options={typeOptions}
                  value={typeIds}
                  onChange={setTypeIds}
                  onCreate={handleCreateType}
                  placeholder={t('placeholders.selectType')}
                />
              ) : (
                <ExpandableSelect
                  options={typeOptions}
                  value={typeIds[0] ?? null}
                  onChange={(v) => setTypeIds([v])}
                  onCreate={handleCreateType}
                  placeholder={t('placeholders.selectType')}
                />
              )}
            </Field>
          </div>

          {/* Aviso de lote */}
          {mode === 'create' && typeIds.length > 1 && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              Serão criadas <strong>{typeIds.length} atividades</strong> independentes com os
              mesmos dados (local, datas, participantes, fotos e observações).
            </p>
          )}

          <Field label={t('fields.description')}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('placeholders.description')}
              rows={3}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Quando */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sections.when')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t('fields.startedAt')}>
            <Input
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </Field>
          <Field label={t('fields.endedAt')}>
            <Input
              type="date"
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
            />
            {datesInvalid && (
              <p className="text-[11px] text-destructive">
                A data de término não pode ser anterior ao início.
              </p>
            )}
          </Field>
        </CardContent>
      </Card>

      {/* Participantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('fields.participants')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantsEditor value={participants} onChange={setParticipants} />
        </CardContent>
      </Card>

      {/* Fotos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('fields.photos')}</CardTitle>
        </CardHeader>
        <CardContent>
          {mode === 'edit' ? (
            <PhotoUpload value={photos} onChange={setPhotos} draftId={draftIdRef.current} />
          ) : (
            <PhotoCapture value={captured} onChange={setCaptured} />
          )}
        </CardContent>
      </Card>

      {/* Continuação — apenas no modo create */}
      {mode === 'create' && recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Continuação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta atividade é continuação de outra? Selecione a parte anterior para encadear.
            </p>
            <Select
              value={continuationOf ?? '__none__'}
              onValueChange={(v) => setContinuationOf(v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Não é continuação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Não é continuação</SelectItem>
                {recentActivities.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.description}
                    {a.locations?.name ? ` · ${a.locations.name}` : ''}
                    {' · '}
                    {formatDate(a.started_at, locale === 'pt' ? 'pt-BR' : locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Cliente e observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('sections.clientAndNotes')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label={t('fields.clientForSigning')}>
            <Select value={clientId ?? ''} onValueChange={(v) => setClientId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder={t('placeholders.assignClientLater')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Evolução">
            <Textarea
              value={evolucao}
              onChange={(e) => setEvolucao(e.target.value)}
              placeholder="O que avançou / foi executado nesta atividade..."
              rows={3}
            />
          </Field>
          <Field label={t('fields.notes')}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações gerais, condições, intercorrências..."
              rows={3}
            />
          </Field>
          <Field label="Pendências">
            <Textarea
              value={pendencias}
              onChange={(e) => setPendencias(e.target.value)}
              placeholder="O que ficou pendente para os próximos dias..."
              rows={3}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 justify-end sticky bottom-4 z-10">
        <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {pendingLocalId
            ? 'Salvar alterações'
            : mode === 'create' && typeIds.length > 1
            ? `Salvar ${typeIds.length} atividades`
            : t('actions.save')}
        </Button>
        <p className="w-full text-right text-xs text-muted-foreground -mt-1">
          {pendingLocalId
            ? 'As alterações ficam salvas no aparelho e sobem quando houver conexão.'
            : 'Para enviar para assinatura, adicione ao Resumo Diário após salvar.'}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}
