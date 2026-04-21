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
  startedAt: string;
  endedAt: string | null;
  participants: { name: string; role: string | null }[];
  photos: { storagePath: string }[];
};

type Props = {
  locations: { id: string; name: string; kind: string }[];
  types: { id: string; slug: string; label_pt: string; label_en: string; label_es: string }[];
  clients: { id: string; full_name: string }[];
  locale: string;
  initial?: InitialActivity;
  mode?: 'create' | 'edit';
};

export function NewActivityForm({ locations, types, clients, locale, initial, mode = 'create' }: Props) {
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
  const [startedAt, setStartedAt] = React.useState(() =>
    initial?.startedAt
      ? new Date(initial.startedAt).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  );
  const [endedAt, setEndedAt] = React.useState(
    initial?.endedAt ? new Date(initial.endedAt).toISOString().slice(0, 16) : '',
  );
  const [participants, setParticipants] = React.useState<Participant[]>(
    (initial?.participants ?? []) as any,
  );
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>(
    (initial?.photos ?? []).map((p) => ({ storagePath: p.storagePath, url: '' })) as any,
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
        startedAt: new Date(startedAt).toISOString(),
        endedAt: endedAt ? new Date(endedAt).toISOString() : null,
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
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </Field>
          <Field label={t('fields.endedAt')}>
            <Input
              type="datetime-local"
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
          <Field label={t('fields.notes')}>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
        >
          {savingAs === 'submit' ? <Loader2 className="animate-spin" /> : <Send />}
          {t('actions.submit')}
        </Button>
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
