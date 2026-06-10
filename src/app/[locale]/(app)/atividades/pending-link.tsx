'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { CloudUpload } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { countUnsynced } from '@/lib/offline/queue';

/**
 * Atalho para a tela "Aguardando envio" no cabeçalho de Atividades.
 * Só aparece quando há itens na fila offline (contagem reativa do IndexedDB).
 */
export function PendingLink() {
  const count = useLiveQuery(() => countUnsynced(), [], 0);
  if (!count) return null;

  return (
    <Button asChild variant="outline">
      <Link href="/atividades/pendentes">
        <CloudUpload className="h-4 w-4" />
        Pendentes ({count})
      </Link>
    </Button>
  );
}
