import { setRequestLocale } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PendingList } from './pending-list';

export const dynamic = 'force-dynamic';

export default async function PendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="max-w-3xl space-y-6">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/atividades">
            <ChevronLeft className="h-4 w-4" />
            Atividades
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Aguardando envio</h1>
        <p className="text-sm text-muted-foreground">
          Atividades criadas sem internet ficam aqui até subirem para o servidor. Sobem
          sozinhas quando a conexão volta — ou toque em &ldquo;Reenviar&rdquo;.
        </p>
      </header>

      <PendingList locale={locale} />
    </div>
  );
}
