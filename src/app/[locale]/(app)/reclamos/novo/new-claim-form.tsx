'use client';

import * as React from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClaim } from '@/app/actions/claims';
import type { ClaimType } from '@/lib/supabase/database.types';

const CLAIM_TYPES: ClaimType[] = [
  'suspensao_conveniencia',
  'suspensao_falta_pagamento',
  'falta_acesso_area',
  'interferencia_terceiros',
  'alteracao_escopo',
  'risco_geotecnico_ambiental',
  'forca_maior',
  'suspensao_poder_concedente',
];

type Client = { id: string; full_name: string; company: string | null };
type Loc = { id: string; name: string };

export function NewClaimForm({ clients, locations }: { clients: Client[]; locations: Loc[] }) {
  const t = useTranslations('claims');
  const router = useRouter();

  const [claimType, setClaimType] = React.useState<ClaimType | ''>('');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [eventDate, setEventDate] = React.useState('');
  const [timeImpact, setTimeImpact] = React.useState('');
  const [costImpact, setCostImpact] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [locationId, setLocationId] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const titleInvalid = title.trim().length > 0 && title.trim().length < 3;

  async function handleSave() {
    if (!claimType) return toast.error(t('validation.type'));
    if (title.trim().length < 3) return toast.error(t('validation.title'));
    if (description.trim().length < 10) return toast.error(t('validation.description'));
    if (!eventDate) return toast.error(t('validation.eventDate'));

    setSaving(true);
    try {
      const result = await createClaim({
        claimType,
        title: title.trim(),
        description: description.trim(),
        eventDate,
        timeImpactDays: timeImpact.trim() ? Number(timeImpact) : null,
        costImpactAmount: costImpact.trim() ? Number(costImpact) : null,
        clientId: clientId || null,
        locationId: locationId || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t('createdSuccess'));
      router.push(`/reclamos/${result.id!}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro inesperado');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        {/* Fundamento */}
        <div className="space-y-1.5">
          <Label>{t('typeLabel')}</Label>
          <Select value={claimType} onValueChange={(v) => setClaimType(v as ClaimType)}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectType')} />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_TYPES.map((ct) => (
                <SelectItem key={ct} value={ct}>
                  {t(`types.${ct}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Título */}
        <div className="space-y-1.5">
          <Label htmlFor="title">{t('titleField')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            aria-invalid={titleInvalid}
          />
        </div>

        {/* Descrição */}
        <div className="space-y-1.5">
          <Label htmlFor="description">{t('descriptionField')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={6}
          />
        </div>

        {/* Data do evento */}
        <div className="space-y-1.5">
          <Label htmlFor="eventDate">{t('eventDate')}</Label>
          <Input
            id="eventDate"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full sm:w-56"
          />
        </div>

        {/* Impacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="timeImpact">
              {t('timeImpact')} <span className="text-muted-foreground">({t('optional')})</span>
            </Label>
            <Input
              id="timeImpact"
              type="number"
              min={0}
              value={timeImpact}
              onChange={(e) => setTimeImpact(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="costImpact">
              {t('costImpact')} <span className="text-muted-foreground">({t('optional')})</span>
            </Label>
            <Input
              id="costImpact"
              type="number"
              min={0}
              step="0.01"
              value={costImpact}
              onChange={(e) => setCostImpact(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Destinatário (Acciona) */}
        <div className="space-y-1.5">
          <Label>
            {t('client')} <span className="text-muted-foreground">({t('optional')})</span>
          </Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger>
              <SelectValue placeholder={t('selectClient')} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name}
                  {c.company ? ` · ${c.company}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Local */}
        {locations.length > 0 && (
          <div className="space-y-1.5">
            <Label>
              {t('location')} <span className="text-muted-foreground">({t('optional')})</span>
            </Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectLocation')} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t('saving') : t('save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
