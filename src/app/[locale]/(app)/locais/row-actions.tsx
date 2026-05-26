'use client';

import { useTranslations } from 'next-intl';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { softDelete } from '@/app/actions/soft-delete';

export function LocationRowActions({ id, name }: { id: string; name: string }) {
  const t = useTranslations('locations');

  return (
    <ConfirmDeleteButton
      onConfirm={() => softDelete({ table: 'locations', id })}
      title={t('delete.title', { name })}
      description={t('delete.description')}
      variant="ghost"
      size="icon"
      iconOnly
    />
  );
}
