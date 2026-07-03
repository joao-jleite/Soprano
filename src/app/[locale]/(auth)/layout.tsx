import { getTranslations } from 'next-intl/server';
import { SopranoWordmark } from '@/components/brand/logo';
import { BrandPanel } from '@/components/brand/brand-panel';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('auth');
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <div className="flex min-h-screen flex-col">
        {/* Marca compacta — só no mobile, onde o painel esquerdo some */}
        <header className="flex items-center justify-center px-6 pt-10 lg:hidden">
          <SopranoWordmark />
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-10 lg:px-10">
          <div className="w-full max-w-[392px]">{children}</div>
        </main>

        <footer className="flex items-center justify-between px-6 pb-6 lg:px-10">
          <LocaleSwitcher />
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/60">
            {t('restricted')}
          </span>
        </footer>
      </div>
    </div>
  );
}
