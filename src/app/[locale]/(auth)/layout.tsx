import { SopranoWordmark, ZitronBadge } from '@/components/brand/logo';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="absolute inset-0 grid-lines opacity-[0.15] pointer-events-none" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-5">
        <SopranoWordmark />
        <LocaleSwitcher />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-8">
        {children}
      </main>

      <footer className="relative z-10 flex items-center justify-between px-6 lg:px-10 py-5 text-xs text-muted-foreground">
        <ZitronBadge />
        <span className="font-mono uppercase tracking-wider">Linha 6 · Laranja · SP</span>
      </footer>
    </div>
  );
}
