'use client';

import { useRouter, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { softDelete } from '@/app/actions/soft-delete';

export function ActivityDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('activities');

  return (
    <ConfirmDeleteButton
      onConfirm={async () => {
        await softDelete({ table: 'activities', id });
        if (pathname === '/atividades') {
          // Já estamos na lista — força rebusca ignorando o router cache
          router.refresh();
        } else {
          // Vindo do detalhe — navega de volta pra lista
          router.push('/atividades');
        }
      }}
      title={t('actions.delete')}
      description={t('draftNotice')}
      variant="outline"
      size="sm"
    />
  );
}
