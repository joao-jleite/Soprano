import { setRequestLocale } from 'next-intl/server';
import { Mail } from 'lucide-react';
import { EsqueciSenhaForm } from './form';

export default async function EsqueciSenhaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Informe o email cadastrado e enviaremos um link para redefinir sua senha.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6">
        <EsqueciSenhaForm locale={locale} />
      </div>

      <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40">
        Soprano · Zitrón Brasil · Linha 6
      </p>
    </div>
  );
}
