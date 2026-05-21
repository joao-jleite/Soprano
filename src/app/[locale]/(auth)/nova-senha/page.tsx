import { setRequestLocale } from 'next-intl/server';
import { KeyRound } from 'lucide-react';
import { NovaSenhaForm } from './form';
import { SopranoMark } from '@/components/brand/logo';

export const dynamic = 'force-dynamic';

export default async function NovaSenhaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Ícone */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <KeyRound className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Defina sua senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha uma senha segura para acessar o Soprano.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6">
        <NovaSenhaForm locale={locale} />
      </div>

      {/* Rodapé */}
      <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40">
        Soprano · Zitrón Brasil · Linha 6
      </p>
    </div>
  );
}
