'use client';

import * as React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SopranoMark } from '@/components/brand/logo';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[soprano]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <SopranoMark className="h-12 w-12 mx-auto opacity-70" />
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-data">Erro</p>
          <h1 className="text-2xl font-semibold tracking-tight">Algo deu errado</h1>
          <p className="text-sm text-muted-foreground">
            Uma falha inesperada ocorreu ao carregar esta página. Já registramos o problema.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
              Ref: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset}>
            <RotateCw />
            Tentar novamente
          </Button>
        </div>
      </div>
    </div>
  );
}
