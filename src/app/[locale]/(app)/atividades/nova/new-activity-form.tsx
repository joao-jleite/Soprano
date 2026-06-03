'use client';

import * as React from 'react';
import { Loader2, Save, Send } from 'lucide-react';
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
import { ParticipantsEditor, type Participant } from '@/components/activity/participants-editor';
import { PhotoUpload, type UploadedPhoto } from '@/components/activity/photo-upload';
import { createActivity, createActivityType, createLocation, updateActivity } from '@/app/actions/activities';

export type InitialActivity = {
  id: string;
  locationId: string;
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

export function NewActivityForm({ locations, types, clients, recentActivities = [], locale, initial, mode = 'create' }: Props) {
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

  const [locationId, setLocationId] = React.useState<string | null>(initial?.locationId ?? null);
  const [typeId, setTypeId] = React.useState<string | null>(initial?.activityTypeId ?? null);
  const [clientId, setClientId] = React.useState<string | null>(initial?.clientId ?? null);
  const [description, setDescription] = React.useState(initial?.description ?? '');
  const [notes, setNotes] = React.useState(initial?.notes ?? '');
  const [evolucao, setEvolucao] = React.useState(initial?.evolucao ?? '');
  const [pendencias, setPendencias] = React.useState(initial?.pendencias ?? '');
  const [continuationOf, setContinuationOf] = React.useState<string | null>(initial?.continuationOf ?? null);
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

  const [savingAs, setSavingAs] = React.useState<'draft' | 'submit' | null>(null);

  async function handleCreateLocation(name: string): Promise<Option> {
    try {
      const created = await createLocation(name, 'outro');
      const opt: Option = { value: created.id, label: created.name, sublabel: tLoc('kinds.outro') };
      setLocationOptions((prev) => [...prev, opt]);
      toast.success(t('toasts.locationCreated', { name: created.name }));
      return opt;
    } catch (e: any) {
      toast.error(e?.message ?? t('errors.createLocation'));
      throw e;
    }
  }

  async function handleCreateType(name: string): Promise<Option> {
    try {
      const created = await createActivityType({ labelPt: name });
      const opt: Option = { value: created.id, label: created.label_pt };
      setTypeOptions((prev) => [...prev, opt]);
      toast.success(t('toasts.typeCreated', { name: created.label_pt }));
      return opt;
    } catch (e: any) {
      toast.error(e?.message ?? t('errors.createType'));
      throw e;
    }
  }

  async function submit(submitForSignature: boolean) {
    if (!locationId || !typeId || !description.trim()) return;
    setSavingAs(submitForSignature ? 'submit' : 'draft');
    try {
      const payload = {
        locationId,
        activityTypeId: typeId,
        clientId: clientId,
        description,
        notes: notes || undefined,
        evolucao: evolucao || undefined,
        pendencias: pendencias || undefined,
        continuationOf: continuationOf || undefined,
        startedAt: new Date(startedAt + 'T12:00:00').toISOString(),
        endedAt: endedAt ? new Date(endedAt + 'T12:00:00').toISOString() : null,
        participants,
        photos: photos.map((p) => ({ storagePath: p.storagePath })),
        submit: submitForSignature,
      };
      const id =
        mode === 'edit' && initial
          ? await updateActivity({ ...payload, id: initial.id })
          : await createActivity(payload);
      toast.success(submitForSignature ? t('toasts.submittedForSignature') : t('toasts.draftSaved'));
      router.push(`/atividades/${id}`);
    } catch (e: any) {
      toast.error(e?.message ?? t('errors.saveActivity'));
    } finally {
      setSavingAs(null);
    }
  }

  const canSave = locationId && typeId && description.trim().length >= 3;

  return (
    <div className="space-y-6">
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

            <Field label={t('fields.type')}>
              <ExpandableSelect
                options={typeOptions}
                value={typeId}
                onChange={setTypeId}
                onCreate={handleCreateType}
                placeholder={t('placeholders.selectType')}
              />
            </Field>
          </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('fields.participants')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantsEditor value={participants} onChange={setParticipants} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('fields.photos')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload value={photos} onChange={setPhotos} draftId={draftIdRef.current} />
        </CardContent>
      </Card>

      {/* Continuação de atividade anterior */}
      {mode === 'create' && recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Continuação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta atividade é continuação de outra? Selecione a parte anterior para encadear.
            </p>
            <Select value={continuationOf ?? '__none__'} onValueChange={(v) => setContinuationOf(v === '__none__' ? null : v)}>
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
                    {new Date(a.started_at).toLocaleDateString('pt-BR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

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

      <div className="flex flex-wrap gap-3 justify-end sticky bottom-4 z-10">
        <Button
          type="button"
          variant="secondary"
          onClick={() => submit(false)}
          disabled={!canSave || savingAs !== null}
        >
          {savingAs === 'draft' ? <Loader2 className="animate-spin" /> : <Save />}
          {t('actions.save')}
        </Button>
        <Button
          type="button"
          onClick={() => submit(true)}
          disabled={!canSave || !clientId || savingAs !== null}
          title={!clientId ? t('placeholders.assignClientLater') : undefined}
        >
          {savingAs === 'submit' ? <Loader2 className="animate-spin" /> : <Send />}
          {t('actions.submit')}
        </Button>
        {canSave && !clientId && (
          <p className="w-full text-right text-xs text-muted-foreground -mt-1">
            ↑ {t('fields.clientForSigning')} obrigatório para enviar
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
