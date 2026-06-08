'use client';

import { LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import { ChangePasswordDialog } from './change-password-dialog';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';

type Props = {
  fullName: string;
  role: 'admin' | 'supervisor' | 'cliente';
};

export function Topbar({ fullName, role }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    // Hard redirect para garantir que o cookie de sessão expirado seja
    // reconhecido pelo middleware no próximo request.
    window.location.assign(`/${locale}/login`);
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-data">Linha 6 · Laranja</span>
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LocaleSwitcher />
          <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold border border-primary/25">
              {initials(fullName)}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium">{fullName}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t(`roles.${role}`)}
              </span>
            </div>
          </div>
          <ChangePasswordDialog />
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label={t('nav.logout')}>
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}
