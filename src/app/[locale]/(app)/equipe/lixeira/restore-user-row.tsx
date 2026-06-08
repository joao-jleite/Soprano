'use client';

import * as React from 'react';
import { ArchiveRestore, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { restoreUser, hardDeleteUser } from '@/app/actions/team';

export function RestoreUserRow({ id }: { id: string }) {
  const router = useRouter();
  const [restoring, setRestoring] = React.useState(false);

  async function onRestore() {
    setRestoring(true);
    const result = await restoreUser(id);
    setRestoring(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Usuário reativado');
    router.refresh();
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" variant="outline" onClick={onRestore} disabled={restoring}>
        {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
        Reativar
      </Button>
      <ConfirmDeleteButton
        onConfirm={async () => {
          const result = await hardDeleteUser(id);
          if (result.error) throw new Error(result.error);
          router.refresh();
        }}
        title="Excluir permanentemente"
        description="Remove o usuário do sistema e do Auth. Essa ação é irreversível."
        triggerLabel="Excluir"
        variant="destructive"
        size="sm"
      />
    </div>
  );
}
