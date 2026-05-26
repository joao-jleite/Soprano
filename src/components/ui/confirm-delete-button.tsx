'use client';

import * as React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
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
  title,
  description,
  triggerLabel,
  variant = 'ghost',
  size = 'sm',
  iconOnly = false,
}: Props) {
  const t = useTranslations('confirmDelete');
  const tc = useTranslations('common');

  const resolvedTitle = title ?? t('title');
  const resolvedDescription = description ?? t('description');
  const resolvedTriggerLabel = triggerLabel ?? t('triggerLabel');

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handle() {
    setLoading(true);
    try {
      await onConfirm();
      toast.success(t('success'));
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Trash2 className="h-4 w-4" />
          {!iconOnly && resolvedTriggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            {tc('cancel')}
          </Button>
          <Button variant="destructive" onClick={handle} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {tc('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
