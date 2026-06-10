'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CloudOff, Loader2, RefreshCw, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { listUnsynced } from '@/lib/offline/queue';
import { retryAllNow } from '@/lib/offline/sync';
import { useOnline } from '@/lib/offline/use-online';
import { cn } from '@/lib/utils';

/**
 * Indicadores de estado offline/sync (estilo WhatsApp):
 *  - banner fixo no topo quando sem conexão;
 *  - pílula no rodapé com a fila: 🕓 pendentes, spinner sincronizando ou
 *    ⚠️ erro (toque para reenviar). Some quando online e sem pendências.
 */
export function OfflineIndicator() {
  const t = useTranslations('offline');
  const online = useOnline();

  // Reativo: atualiza sozinho a cada mudança no IndexedDB (enqueue/sync/remove).
  const items = useLiveQuery(() => listUnsynced(), [], undefined);
  const count = items?.length ?? 0;
  const syncing = !!items?.some((i) => i.status === 'syncing');
  const errorItem = items?.find((i) => i.status === 'error');
  const hasError = !!errorItem;

  return (
    <>
      {!online && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-1.5 text-center text-xs font-medium text-amber-950 backdrop-blur">
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
          <span>{t('banner')}</span>
        </div>
      )}

      {count > 0 && (
        <div className="fixed bottom-24 right-4 z-50 flex max-w-[80vw] flex-col items-end gap-1.5 lg:bottom-6">
          {/* Mostra o motivo real da falha para diagnóstico em campo. */}
          {hasError && errorItem?.error && (
            <p className="max-w-xs rounded-md bg-destructive/10 px-2.5 py-1.5 text-right text-[11px] leading-snug text-destructive shadow-sm">
              {errorItem.error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void retryAllNow()}
            disabled={syncing || !online}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg',
              'transition-colors disabled:cursor-default',
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
          </button>
        </div>
      )}
    </>
  );
}
