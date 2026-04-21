'use client';

import * as React from 'react';
import { ArchiveRestore, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { restoreDeleted, hardDelete } from '@/app/actions/soft-delete';

type Table = 'activities' | 'locations' | 'activity_types';

export function RestoreRow({ table, id }: { table: Table; id: string }) {
  const t = useTranslations('trash');
  const router = useRouter();
  const [restoring, setRestoring] = React.useState(false);

  async function onRestore() {
    setRestoring(true);
    try {
      await restoreDeleted({ table, id });
      toast.success(t('restored'));
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? t('restoreError'));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button size="sm" variant="outline" onClick={onRestore} disabled={restoring}>
        {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
        {t('restore')}
      </Button>
      <ConfirmDeleteButton
        onConfirm={async () => {
          await hardDelete({ table, id });
          router.refresh();
        }}
        title={t('hardDeleteTitle')}
        description={t('hardDeleteDescription')}
        triggerLabel={t('hardDeleteLabel')}
        variant="destructive"
        size="sm"
      />
    </div>
  );
}
