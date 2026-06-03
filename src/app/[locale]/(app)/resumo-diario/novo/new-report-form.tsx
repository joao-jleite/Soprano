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
  clients: { id: string; full_name: string }[];
};

export function NewDailyReportForm({ clients }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const [clientId, setClientId] = React.useState('__none__');
  const [date,     setDate]     = React.useState(today);
  const [notes,    setNotes]    = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) { toast.error('Informe a data'); return; }

    setLoading(true);
    const result = await createDailyReport({
      reportDate: date,
      clientId: (clientId && clientId !== '__none__') ? clientId : null,
      notes: notes || undefined,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Resumo criado');
    router.push(`/resumo-diario/${result.id!}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Data */}
      <div className="space-y-1.5">
        <Label htmlFor="date">Data do resumo</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Cliente */}
      <div className="space-y-1.5">
        <Label>Cliente (quem vai assinar)</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar cliente..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem cliente — atribuir depois</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Observações gerais <span className="text-muted-foreground">(opcional)</span>
        </Label>
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
