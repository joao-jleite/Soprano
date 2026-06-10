'use client';

import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import {
  CloudUpload,
  Loader2,
  AlertTriangle,
  Clock,
  RotateCw,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { listUnsynced, removeActivity } from '@/lib/offline/queue';
import { retryItem, syncPending } from '@/lib/offline/sync';
import { useOnline } from '@/lib/offline/use-online';
import { formatDate } from '@/lib/utils';
import type { PendingActivity } from '@/lib/offline/db';

export function PendingList({ locale }: { locale: string }) {
  const online = useOnline();
  const router = useRouter();
  const items = useLiveQuery(() => listUnsynced(), [], undefined);
  const loc = locale === 'pt' ? 'pt-BR' : locale;

  const loading = items === undefined;
  const hasItems = !!items && items.length > 0;
  const anySyncing = !!items?.some((i) => i.status === 'syncing');

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!hasItems) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-sm font-medium">Tudo sincronizado</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Não há atividades aguardando envio. As que você criar sem internet aparecem aqui
            até subirem para o servidor.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items!.length} {items!.length === 1 ? 'atividade aguardando' : 'atividades aguardando'} envio
        </p>
        <Button
          size="sm"
          onClick={() => void syncPending()}
          disabled={!online || anySyncing}
        >
          {anySyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          {online ? 'Enviar todas agora' : 'Sem conexão'}
        </Button>
      </div>

      <ul className="space-y-3">
        {items!.map((item) => (
          <PendingCard
            key={item.localId}
            item={item}
            loc={loc}
            online={online}
            onChanged={() => router.refresh()}
          />
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: PendingActivity['status'] }) {
  if (status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        <Loader2 className="h-3 w-3 animate-spin" /> Enviando
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
        <AlertTriangle className="h-3 w-3" /> Falhou
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600">
      <Clock className="h-3 w-3" /> Na fila
    </span>
  );
}

function PendingCard({
  item,
  loc,
  online,
  onChanged,
}: {
  item: PendingActivity;
  loc: string;
  online: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const typeLabels = item.typeLabels?.join(', ');

  async function onRetry() {
    setBusy(true);
    await retryItem(item.localId);
    setBusy(false);
    onChanged();
  }

  return (
    <li>
      <Card>
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm font-medium">{item.description}</p>
            <StatusPill status={item.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.locationLabel && <span>{item.locationLabel}</span>}
            {typeLabels && <span>· {typeLabels}</span>}
            <span>· {formatDate(item.startedAt, loc)}</span>
            {!!item.photoCount && (
              <span className="inline-flex items-center gap-1">
                · <ImageIcon className="h-3 w-3" /> {item.photoCount}
              </span>
            )}
          </div>

          {item.status === 'error' && item.error && (
            <p className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-[11px] leading-snug text-destructive">
              {item.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={busy || !online || item.status === 'syncing'}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
              Reenviar
            </Button>
            <ConfirmDeleteButton
              onConfirm={async () => {
                await removeActivity(item.localId);
                onChanged();
              }}
              title="Descartar atividade"
              description="Esta atividade ainda não subiu para o servidor. Ao descartar, ela é apagada do aparelho e não poderá ser recuperada."
              triggerLabel="Descartar"
              size="sm"
              variant="ghost"
            />
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
