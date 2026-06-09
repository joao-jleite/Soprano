'use client';

import * as React from 'react';
import { syncPending } from '@/lib/offline/sync';

/**
 * Dispara o sync da fila offline automaticamente:
 *  - ao montar (app aberto já online com pendências antigas);
 *  - quando a conexão volta (evento `online`) — o "sobe tudo estilo WhatsApp";
 *  - ao reexibir a aba (pega reconexões que o evento `online` não emitiu).
 *
 * Não renderiza nada. Os indicadores visuais vivem em <OfflineIndicator/>.
 */
export function SyncEngine() {
  React.useEffect(() => {
    void syncPending();

    const trigger = () => void syncPending();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncPending();
    };

    window.addEventListener('online', trigger);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', trigger);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
