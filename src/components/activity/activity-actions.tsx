'use client';

import { useRouter } from '@/i18n/navigation';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { softDelete } from '@/app/actions/soft-delete';

export function ActivityDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteButton
      onConfirm={async () => {
        await softDelete({ table: 'activities', id });
        router.push('/atividades');
      }}
      title="Excluir atividade?"
      description="A atividade será movida para a lixeira. Admins podem restaurar depois."
      variant="outline"
      size="sm"
    />
  );
}
