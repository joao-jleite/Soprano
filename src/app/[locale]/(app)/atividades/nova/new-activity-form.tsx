'use client';

import * as React from 'react';
import { Loader2, Save } from 'lucide-react';

// Duração padrão (dias) por label_pt do tipo de atividade.
// Chave em MAIÚSCULAS para comparação case-insensitive.
const DURACAO_PADRAO: Record<string, number> = {
  'GRELHA DE ENTRADA DE AR PRESSURIZAÇÃO': 1,
  'REGISTRO CORTAFOGO + SOBREPRESSÃO': 2,
  'ATENUADOR ANTES DO VENTILADOR DUTO 1': 2,
  'ATENUADOR ANTES DO VENTILADOR DUTO 2': 2,
  'ATENUADOR APÓS DO VENTILADOR DUTO 1': 3,
  'ATENUADOR APÓS DO VENTILADOR DUTO 2': 3,
  'ATENUADOR ANTES DO VENTILADOR EXAUSTÃO D3': 2,
  'ATENUADOR ANTES DO VENTILADOR EXAUSTÃO D4': 2,
  'ATENUADOR ANTES DO VENTILADOR INSUFLAÇÃO D1': 2,
  'ATENUADOR ANTES DO VENTILADOR INSUFLAÇÃO D2': 2,
  'ATENUADOR APOS DO VENTILADOR EXAUSTÃO D3': 3,
  'ATENUADOR APOS DO VENTILADOR EXAUSTÃO D4': 3,
  'ATENUADOR APOS DO VENTILADOR INSUFLAÇÃO D1': 3,
  'ATENUADOR APOS DO VENTILADOR INSUFLAÇÃO D2': 3,
  'ATENUADOR ANTES DO VENTILADOR EXAUSTÃO': 5,
  'ATENUADOR ANTES DO VENTILADOR INSUFLAÇÃO': 5,
  'ATENUADOR APÓS DO VENTILADOR INSUFLAÇÃO': 6,
  'ATENUADOR APÓS DO VENTILADOR EXAUSTÃO': 6,
  'ATENUADOR ANTES DO VENTILADOR': 11,
  'ATENUADOR APÓS DO VENTILADOR': 11,
  'GRELHAS PRESSURIZAÇÃO NA CAIXA DA ESCADA': 6,
  'GRELHAS EMBAIXO PLATAFORMA 1': 7,
  'GRELHAS EMBAIXO PLATAFORMA 2': 7,
  'DUTOS PRESSURIZAÇÃO + VENTILADORES CENTRÍFUGOS + DAMPERS DE RETORNO': 4,
  'ELECTROCALHAS + PAINEIS + C. FORÇA + C. SENSOR. CORTA FOGO. + ELETRODUTOS': 8,
  'ELECTROCALHAS + PAINEIS + C. FORÇA + C. CONTROLE + C. S. TEMP + ELETRODUTOS + S. TEMP': 10,
  'VENTILADORES AXIAIS + CALDELERIA DUTO 1': 7,
  'VENTILADORES AXIAIS + CALDELERIA DUTO 2': 7,
  'VENTILADORES AXIAIS + CALDELERIA EXAUSTÃO D3': 4,
  'VENTILADORES AXIAIS + CALDELERIA EXAUSTÃO D4': 4,
  'VENTILADORES AXIAIS + CALDELERIA INSUFLAÇÃO D1': 4,
  'VENTILADORES AXIAIS + CALDELERIA INSUFLAÇÃO D2': 4,
  'VENTILADORES AXIAIS + CALDELERIA EXAUSTÃO': 14,
  'VENTILADORES AXIAIS + CALDELERIA INSUFLAÇÃO': 14,
  'VENTILADORES AXIAIS + CALDELERIA': 14,
  'DUTOS VIA 1': 14,
  'DUTOS VIA 2': 14,
};

/** Retorna YYYY-MM-DD somando `days` dias a uma data ISO string. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ExpandableSelect, type Option } from '@/components/activity/expandable-select';
import { ParticipantsEditor, type Participant } from '@/components/activity/participants-editor';
import { PhotoUpload, type UploadedPhoto } from '@/components/activity/photo-upload';
import { createActivity, createActivityType, createLocation, updateActivity } from '@/app/actions/activities';

export type InitialActivity = {
  id: string;
  locationId: string;
  activityTypeId: string;
  description: string;
  notes: string | null;
  startedAt: string;
  endedAt: string | null;
  participants: { name: string; role: string | null }[];
  photos: { storagePath: string; url?: string }[];
};

type Props = {
  locations: { id: string; name: string; kind: string }[];
  types: { id: string; slug: string; label_pt: string; label_en: string; label_es: string }[];
  locale: string;
  initial?: InitialActivity;
  mode?: 'create' | 'edit';
};

export function NewActivityForm({ locations, types, locale, initial, mode = 'create' }: Props) {
  const t = useTranslations('activities');
  const tLoc = useTranslations('locations');
  const router = useRouter();

  const draftIdRef = React.useRef(initial?.id ?? crypto.randomUUID());

  // Controle de duração automática
  // - durationManual: true quando o usuário editou o campo manualmente após a seleção de tipo
  // - isInitialMount: evita que o efeito de typeId sobrescreva valores em modo edição
  const durationManualRef = React.useRef(false);
  const isInitialMount = React.useRef(true);

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
  const [description, setDescription] = React.useState(initial?.description ?? '');
  const [notes, setNotes] = React.useState(initial?.notes ?? '');
  const [startedAt, setStartedAt] = React.useState(() =>
    initial?.startedAt
      ? new Date(initial.startedAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );
  const [endedAt, setEndedAt] = React.useState(
    initial?.endedAt ? new Date(initial.endedAt).toISOString().slice(0, 10) : '',
  );
  const [duration, setDuration] = React.useState('');

  const [participants, setParticipants] = React.useState<Participant[]>(
    (initial?.participants ?? []) as any,
  );
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>(
    (initial?.photos ?? []).map((p) => ({ storagePath: p.storagePath, url: p.url ?? '' })),
  );

  const [saving, setSaving] = React.useState(false);

  // Ao mudar o tipo: preenche duração padrão (se mapeado) e recalcula término
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!typeId) return;

    const typeObj = types.find((tp) => tp.id === typeId);
    const labelKey = typeObj?.label_pt?.toUpperCase().trim() ?? '';
    const defaultDuration = DURACAO_PADRAO[labelKey];

    if (defaultDuration !== undefined) {
      // Tipo mapeado → sempre aplica o valor padrão e reseta o flag manual
      durationManualRef.current = false;
      setDuration(String(defaultDuration));
      if (startedAt) {
        setEndedAt(addDays(startedAt, defaultDuration));
      }
    } else if (!durationManualRef.current) {
      // Tipo sem mapeamento E usuário não editou manualmente → limpa o campo
      setDuration('');
    }
    // Se durationManualRef.current === true, mantém o valor que o usuário digitou
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

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

  async function handleSave() {
    if (!locationId || !typeId || !description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        locationId,
        activityTypeId: typeId,
        clientId: null,
        description,
        notes: notes || undefined,
        startedAt: new Date(startedAt + 'T12:00:00').toISOString(),
        endedAt: endedAt ? new Date(endedAt + 'T12:00:00').toISOString() : null,
        participants,
        photos: photos.map((p) => ({ storagePath: p.storagePath })),
        submit: false,
      };
      const id =
        mode === 'edit' && initial
          ? await updateActivity({ ...payload, id: initial.id })
          : await createActivity(payload);
      toast.success(t('toasts.draftSaved'));
      router.push(`/atividades/${id}`);
    } catch (e: any) {
      toast.error(e?.message ?? t('errors.saveActivity'));
    } finally {
      setSaving(false);
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
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label={t('fields.startedAt')}>
            <Input
              type="date"
              value={startedAt}
              onChange={(e) => {
                const val = e.target.value;
                setStartedAt(val);
                // Recalcula término se duração estiver preenchida
                const days = parseInt(duration, 10);
                if (val && !isNaN(days) && days > 0) {
                  setEndedAt(addDays(val, days));
                }
              }}
            />
          </Field>
          <Field label="Duração prevista (dias)">
            <Input
              type="number"
              min="1"
              value={duration}
              placeholder="—"
              onChange={(e) => {
                durationManualRef.current = true;
                setDuration(e.target.value);
                const days = parseInt(e.target.value, 10);
                if (startedAt && !isNaN(days) && days > 0) {
                  setEndedAt(addDays(startedAt, days));
                }
              }}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('fields.notes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('placeholders.description')}
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 justify-end sticky bottom-4 z-10">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          {t('actions.save')}
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
