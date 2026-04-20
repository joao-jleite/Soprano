'use client';

import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { softDelete } from '@/app/actions/soft-delete';

export function LocationRowActions({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDeleteButton
      onConfirm={() => softDelete({ table: 'locations', id })}
      title={`Excluir "${name}"?`}
      description="O local será movido para a lixeira. Atividades existentes continuam intactas, mas o local não aparece mais na criação de novas."
      variant="ghost"
      size="icon"
      iconOnly
    />
  );
}
