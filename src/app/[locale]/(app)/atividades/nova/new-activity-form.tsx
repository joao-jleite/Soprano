'use client';

import * as React from 'react';
import { Loader2, Save, Send } from 'lucide-react';
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
import { createActivity, createActivityType, createLocation } from '@/app/actions/activities';

type Props = {
  locations: { id: string; name: string; kind: string }[];
  types: { id: string; slug: string; label_pt: string; label_en: string; label_es: string }[];
  clients: { id: string; full_name: string }[];
  locale: string;
};

const LOCATION_KINDS = [
  { value: 'estacao', label: 'Estação' },
  { value: 'vse', label: 'VSE — Poço de ventilação' },
  { value: 'se', label: 'SE — Saída de emergência' },
  { value: 'escadaria', label: 'Escadaria' },
  { value: 'patio', label: 'Pátio' },
  { value: 'outro', label: 'Outro' },
];

export function NewActivityForm({ locations, types, clients, locale }: Props) {
  const t = useTranslations();
  const router = useRouter();

  const draftIdRef = React.useRef(crypto.randomUUID());

  const [locationOptions, setLocationOptions] = React.useState<Option[]>(
    locations.map((l) => ({
      value: l.id,
      label: l.name,
      sublabel: LOCATION_KINDS.find((k) => k.value === l.kind)?.label,
    })),
  );
  const [typeOptions, setTypeOptions] = React.useState<Option[]>(
    types.map((tp) => ({
      value: tp.id,
      label:
        locale === 'en' ? tp.label_en : locale === 'es' ? tp.label_es : tp.label_pt,
    })),
  );

  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [typeId, setTypeId] = React.useState<string | null>(null);
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [startedAt, setStartedAt] = React.useState(() =>
    new Date().toISOString().slice(0, 16),
  );
  const [endedAt, setEndedAt] = React.useState('');
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>([]);

  const [savingAs, setSavingAs] = React.useState<'draft' | 'submit' | null>(null);

  async function handleCreateLocation(name: string): Promise<Option> {
    const created = await createLocation(name, 'outro');
    const opt: Option = { value: created.id, label: created.name, sublabel: 'Outro' };
    setLocationOptions((prev) => [...prev, opt]);
    return opt;
  }

  async function handleCreateType(name: string): Promise<Option> {
    const created = await createActivityType({ labelPt: name });
    const opt: Option = { value: created.id, label: created.label_pt };
    setTypeOptions((prev) => [...prev, opt]);
    return opt;
  }

  async function submit(submitForSignature: boolean) {
    if (!locationId || !typeId || !description.trim()) return;
    setSavingAs(submitForSignature ? 'submit' : 'draft');
    try {
      const id = await createActivity({
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
      });
      router.push(`/atividades/${id}`);
    } finally {
      setSavingAs(null);
    }
  }

  const canSave = locationId && typeId && description.trim().length >= 3;

  return (
    <div className="space-y-6">
      <Card className="surface-elevated">
        <CardHeader>
          <CardTitle className="text-base">Onde e o quê</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('activities.fields.location')}>
              <ExpandableSelect
                options={locationOptions}
                value={locationId}
                onChange={setLocationId}
                onCreate={handleCreateLocation}
                placeholder={t('activities.placeholders.selectLocation')}
              />
            </Field>

            <Field label={t('activities.fields.type')}>
              <ExpandableSelect
                options={typeOptions}
                value={typeId}
                onChange={setTypeId}
                onCreate={handleCreateType}
                placeholder={t('activities.placeholders.selectType')}
              />
            </Field>
          </div>

          <Field label={t('activities.fields.description')}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('activities.placeholders.description')}
              rows={3}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quando</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t('activities.fields.startedAt')}>
            <Input
              type="datetime-local"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </Field>
          <Field label={t('activities.fields.endedAt')}>
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
          <CardTitle className="text-base">{t('activities.fields.participants')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantsEditor value={participants} onChange={setParticipants} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('activities.fields.photos')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoUpload value={photos} onChange={setPhotos} draftId={draftIdRef.current} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cliente e observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Cliente (quem vai assinar)">
            <Select value={clientId ?? ''} onValueChange={(v) => setClientId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional — atribuir depois" />
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
          <Field label={t('activities.fields.notes')}>
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
          {t('activities.actions.save')}
        </Button>
        <Button
          type="button"
          onClick={() => submit(true)}
          disabled={!canSave || !clientId || savingAs !== null}
        >
          {savingAs === 'submit' ? <Loader2 className="animate-spin" /> : <Send />}
          {t('activities.actions.submit')}
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
