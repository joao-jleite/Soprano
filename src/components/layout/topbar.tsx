'use client';

import * as React from 'react';
import { Bell, LogOut, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import { ChangePasswordDialog } from './change-password-dialog';
import { createClient } from '@/lib/supabase/client';
import { initials } from '@/lib/utils';

type Props = {
  fullName: string;
  role: 'admin' | 'supervisor' | 'cliente';
  pendingCount?: number;
};

export function Topbar({ fullName, role, pendingCount = 0 }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const searchRef = React.useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K foca a busca global
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = e.currentTarget.value.trim();
      router.push(q ? `/atividades?q=${encodeURIComponent(q)}` : '/atividades');
    }
  }

  async function handleLogout() {
    // Redirect sempre acontece, mesmo com sessão já expirada (signOut lança).
    try {
      await supabase.auth.signOut();
    } catch {
      /* sessão já ausente no client */
    }
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      /* offline — cookies do client já foram limpos */
    }
    window.location.assign(`/${locale}/login`);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
        <div className="hidden h-[38px] max-w-[420px] flex-1 items-center gap-2.5 rounded-[10px] border border-border bg-input px-3 text-muted-foreground md:flex">
          <Search className="h-[15px] w-[15px] flex-none" />
          <input
            ref={searchRef}
            placeholder={t('nav.search')}
            onKeyDown={onSearchKeyDown}
            className="h-full flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9.5px]">
            ⌘K
          </span>
        </div>

        <div className="flex-1" />

        <LocaleSwitcher />

        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t('nav.awaitingSignature')}
        >
          <Link href="/atividades?status=enviada">
            <Bell />
            {pendingCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full border-2 border-background bg-warn" />
            )}
          </Link>
        </Button>

        <ThemeToggle />
        <ChangePasswordDialog />

        <span
          className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-[#1BA2DE] to-[#0A6CA6] text-xs font-semibold text-white"
          title={`${fullName} · ${t(`roles.${role}`)}`}
        >
          {initials(fullName)}
        </span>

        {/* Logout no topo só no mobile — no desktop ele vive no card da sidebar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label={t('nav.logout')}
          className="lg:hidden"
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
