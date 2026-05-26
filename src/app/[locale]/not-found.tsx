'use client';

import { usePathname } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { SopranoMark } from '@/components/brand/logo';

export default function NotFound() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-6 max-w-md">
        <SopranoMark className="h-14 w-14 mx-auto opacity-60" />
        <div className="space-y-2">
          <p className="text-data">404</p>
          <h1 className="text-3xl font-semibold tracking-tight">Página não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            O endereço que você tentou acessar não existe ou você não tem permissão para vê-lo.
          </p>
          {pathname && (
            <p className="text-xs font-mono bg-muted rounded px-2 py-1 text-muted-foreground break-all">
              {pathname}
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/">Voltar ao painel</Link>
        </Button>
      </div>
    </div>
  );
}
