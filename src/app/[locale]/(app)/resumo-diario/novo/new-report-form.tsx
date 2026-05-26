'use client';

import * as React from 'react';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { createDailyReport } from '@/app/actions/daily-reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  stations: { id: string; name: string }[];
  clients:  { id: string; full_name: string }[];
};

export function NewDailyReportForm({ stations, clients }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  // Default: hoje no formato YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  const [stationId, setStationId] = React.useState('');
  const [clientId,  setClientId]  = React.useState('');
  const [date,      setDate]      = React.useState(today);
  const [notes,     setNotes]     = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stationId) { toast.error('Selecione uma estação'); return; }
    if (!date)      { toast.error('Informe a data');        return; }

    setLoading(true);
    try {
      const id = await createDailyReport({
        reportDate: date,
        stationId,
        clientId: clientId || null,
        notes: notes || undefined,
      });
      toast.success('Resumo criado');
      router.push(`/resumo-diario/${id}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar resumo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Data */}
      <div className="space-y-1.5">
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Estação */}
      <div className="space-y-1.5">
        <Label>Estação</Label>
        <Select value={stationId} onValueChange={setStationId} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a estação..." />
          </SelectTrigger>
          <SelectContent>
            {stations.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cliente */}
      <div className="space-y-1.5">
        <Label>Cliente (quem vai assinar)</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Opcional — atribuir depois" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sem cliente definido</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações gerais <span className="text-muted-foreground">(opcional)</span></Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Condições do dia, intercorrências gerais..."
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar resumo'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
