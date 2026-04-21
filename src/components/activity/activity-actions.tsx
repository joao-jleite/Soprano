'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { softDelete } from '@/app/actions/soft-delete';

export function ActivityDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const t = useTranslations('activities');

  return (
    <ConfirmDeleteButton
      onConfirm={async () => {
        await softDelete({ table: 'activities', id });
        router.push('/atividades');
      }}
      title={t('actions.delete')}
      description={t('draftNotice')}
      variant="outline"
      size="sm"
    />
  );
}
