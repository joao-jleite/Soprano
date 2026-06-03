'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { Pencil, Check, X } from 'lucide-react';
import { updateReportNotes } from '@/app/actions/daily-reports';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  reportId: string;
  initialNotes: string;
};

export function NotesEditor({ reportId, initialNotes }: Props) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [notes, setNotes]     = React.useState(initialNotes);
  const [saving, setSaving]   = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateReportNotes(reportId, notes);
      if (result?.error) { toast.error(result.error); return; }
      toast.success('Observações salvas');
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setNotes(initialNotes);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="group relative">
        <p className="text-sm whitespace-pre-wrap min-h-[1.5rem]">
          {notes || <span className="text-muted-foreground italic">Sem observações</span>}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
          title="Editar observações"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="resize-none text-sm"
        autoFocus
        placeholder="Condições do dia, intercorrências gerais..."
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          <Check className="h-3.5 w-3.5" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
