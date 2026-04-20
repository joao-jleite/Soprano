'use client';

import * as React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Props = {
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  triggerLabel?: string;
  variant?: 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'default' | 'icon';
  iconOnly?: boolean;
};

export function ConfirmDeleteButton({
  onConfirm,
  title = 'Confirmar exclusão',
  description = 'Essa ação pode ser desfeita pela lixeira (admin).',
  triggerLabel = 'Excluir',
  variant = 'ghost',
  size = 'sm',
  iconOnly = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handle() {
    setLoading(true);
    try {
      await onConfirm();
      toast.success('Excluído');
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao excluir');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Trash2 className="h-4 w-4" />
          {!iconOnly && triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handle} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
