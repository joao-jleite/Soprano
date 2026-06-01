'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { deleteDailyReport } from '@/app/actions/daily-reports';

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canConfirm = confirmation === 'EXCLUIR';

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setConfirmation('');
      setError(null);
    }
  }

  function handleDelete() {
    if (!canConfirm) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteDailyReport(reportId);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/resumo-diario');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir resumo diário?</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. O resumo será removido permanentemente,
            incluindo todas as associações de atividades.
            <br /><br />
            Digite <strong className="text-foreground font-mono">EXCLUIR</strong> para confirmar.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
          placeholder="EXCLUIR"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
        />

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={!canConfirm || isPending}
            onClick={handleDelete}
          >
            {isPending ? 'Excluindo…' : 'Excluir definitivamente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
