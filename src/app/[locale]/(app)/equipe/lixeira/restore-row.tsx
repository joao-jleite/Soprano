'use client';

import * as React from 'react';
import { ArchiveRestore, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { restoreDeleted, hardDelete } from '@/app/actions/soft-delete';

type Table = 'activities' | 'locations' | 'activity_types';

export function RestoreRow({ table, id }: { table: Table; id: string }) {
  const router = useRouter();
  const [restoring, setRestoring] = React.useState(false);

  async function onRestore() {
    setRestoring(true);
    try {
      await restoreDeleted({ table, id });
      toast.success('Restaurado');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" variant="outline" onClick={onRestore} disabled={restoring}>
        {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
        Restaurar
      </Button>
      <ConfirmDeleteButton
        onConfirm={async () => {
          await hardDelete({ table, id });
          router.refresh();
        }}
        title="Excluir em definitivo?"
        description="Esta ação NÃO pode ser desfeita. O registro será removido permanentemente do banco."
        triggerLabel="Destruir"
        variant="destructive"
        size="sm"
      />
    </div>
  );
}
