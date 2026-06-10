'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CloudOff, Loader2, RefreshCw, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { listUnsynced } from '@/lib/offline/queue';
import { useOnline } from '@/lib/offline/use-online';
import { cn } from '@/lib/utils';

/**
 * Indicadores de estado offline/sync (estilo WhatsApp):
 *  - banner fixo no topo quando sem conexão;
 *  - pílula no rodapé com a fila: 🕓 pendentes, spinner sincronizando ou
 *    ⚠️ erro. Toque abre a tela "Aguardando envio" (ver/reenviar/descartar).
 *  Some quando online e sem pendências.
 */
export function OfflineIndicator() {
  const t = useTranslations('offline');
  const online = useOnline();

  // Reativo: atualiza sozinho a cada mudança no IndexedDB (enqueue/sync/remove).
  const items = useLiveQuery(() => listUnsynced(), [], undefined);
  const count = items?.length ?? 0;
  const syncing = !!items?.some((i) => i.status === 'syncing');
  const hasError = !!items?.some((i) => i.status === 'error');

  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-1.5 text-center text-xs font-medium text-amber-950 backdrop-blur">
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
          <span>{t('banner')}</span>
        </div>
      )}

      {count > 0 && (
        <Link
          href="/atividades/pendentes"
          className={cn(
            'fixed bottom-24 right-4 z-50 lg:bottom-6',
            'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg',
            'transition-colors',
            hasError
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-foreground text-background',
          )}
          aria-live="polite"
        >
          {syncing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('syncing')}
            </>
          ) : hasError ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('error')}
            </>
          ) : online ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              {t('pending', { count })}
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5" />
              {t('pending', { count })}
            </>
          )}
        </Link>
      )}
    </>
  );
}
