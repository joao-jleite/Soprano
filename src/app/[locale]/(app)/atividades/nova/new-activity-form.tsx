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
import {
  createActivity,
  createActivityType,
  createLocation,
  updateActivity,
} from '@/app/actions/activities';
import { formatDate } from '@/lib/utils';

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
};

export function NewActivityForm({
  locations,
  types,
  clients,
  recentActivities = [],
  locale,
  initial,
  mode = 'create',
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
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>(
    (initial?.photos ?? []).map((p) => ({ storagePath: p.storagePath, url: p.url ?? '' })),
  );

  const [saving, setSaving] = React.useState(false);

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

  async function handleSave() {
    if (!locationId || typeIds.length === 0 || !description.trim()) return;
    setSaving(true);

    try {
      const base = {
        locationId,
        clientId,
        description,
        notes: notes || undefined,
        evolucao: evolucao || undefined,
        pendencias: pendencias || undefined,
        continuationOf: continuationOf || undefined,
        startedAt: new Date(startedAt + 'T12:00:00').toISOString(),
        endedAt: endedAt ? new Date(endedAt + 'T12:00:00').toISOString() : null,
        participants,
        photos: photos.map((p) => ({ storagePath: p.storagePath })),
      };

      if (mode === 'edit' && initial) {
        // Edição — tipo único
        const result = await updateActivity({
          ...base,
          id: initial.id,
          activityTypeId: typeIds[0],
        });
        if (result.error) { toast.error(result.error); return; }
        toast.success(t('toasts.draftSaved'));
        router.push(`/atividades/${result.id!}`);
      } else {
        // Criação — múltiplos tipos
        const result = await createActivity({ ...base, activityTypeIds: typeIds });
        if (result.error) { toast.error(result.error); return; }

        const ids = result.ids!;
        if (ids.length === 1) {
          toast.success(t('toasts.draftSaved'));
          router.push(`/atividades/${ids[0]}`);
        } else {
          toast.success(
            `${ids.length} atividades criadas como rascunho.`,
          );
          router.push('/atividades');
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? t('errors.saveActivity'));
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!(locationId && typeIds.length > 0 && description.trim().length >= 3);

  // ── Render ───────────────────────────────────────────────────────────────

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
          <PhotoUpload value={photos} onChange={setPhotos} draftId={draftIdRef.current} />
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
          {mode === 'create' && typeIds.length > 1
            ? `Salvar ${typeIds.length} atividades`
            : t('actions.save')}
        </Button>
        <p className="w-full text-right text-xs text-muted-foreground -mt-1">
          Para enviar para assinatura, adicione ao Resumo Diário após salvar.
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
