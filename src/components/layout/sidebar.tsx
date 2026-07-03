'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MessageSquareWarning,
  Settings,
  Users,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn, initials } from '@/lib/utils';
import { SopranoMark } from '@/components/brand/logo';
import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/lib/supabase/database.types';

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  withBadge?: boolean;
};

const OPS_ITEMS: NavItem[] = [
  { href: '/',              labelKey: 'nav.dashboard',   icon: Home,                 roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/atividades',    labelKey: 'nav.activities',  icon: Activity,             roles: ['admin', 'supervisor', 'cliente'], withBadge: true },
  { href: '/resumo-diario', labelKey: 'nav.dailyReport', icon: ClipboardList,        roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/reclamos',      labelKey: 'nav.complaints',  icon: MessageSquareWarning, roles: ['admin', 'supervisor', 'cliente'] },
];

const MGMT_ITEMS: NavItem[] = [
  { href: '/relatorios',    labelKey: 'nav.reports',  icon: FileText, roles: ['admin', 'supervisor'] },
  { href: '/equipe',        labelKey: 'nav.team',     icon: Users,    roles: ['admin'] },
  { href: '/configuracoes', labelKey: 'nav.settings', icon: Settings, roles: ['admin', 'supervisor'] },
];

export function Sidebar({
  role,
  fullName,
  pendingCount = 0,
}: {
  role: Role;
  fullName: string;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    // Hard redirect para o middleware reconhecer o cookie expirado.
    window.location.assign(`/${locale}/login`);
  }

  function renderItems(items: NavItem[]) {
    return items
      .filter((i) => i.roles.includes(role))
      .map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
        return (
          <li key={item.href} className="relative">
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-[9px] bg-brand-bg"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                aria-hidden
              />
            )}
            <Link
              href={item.href}
              className={cn(
                'relative flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] transition-colors',
                active
                  ? 'font-semibold text-accent'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-[17px] w-[17px] flex-none" />
              <span className="flex-1">{t(item.labelKey)}</span>
              {item.withBadge && pendingCount > 0 && (
                <span
                  className="rounded-full bg-warn-bg px-2 py-0.5 font-mono text-[10px] font-semibold text-warn"
                  title={t('nav.awaitingSignature')}
                >
                  {pendingCount}
                </span>
              )}
            </Link>
          </li>
        );
      });
  }

  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[236px] lg:flex-none lg:flex-col lg:border-r lg:border-border lg:bg-popover lg:px-3.5 lg:pb-4 lg:pt-5">
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-4">
        <SopranoMark className="h-[30px] w-[30px]" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold tracking-[0.2em]">SOPRANO</span>
          <span className="font-mono text-[8.5px] tracking-[0.22em] text-muted-foreground/70">
            LINHA 6 · SP
          </span>
        </span>
      </Link>

      <div className="px-2.5 pb-2 pt-2.5 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">
        {t('nav.operation')}
      </div>
      <nav>
        <ul className="space-y-0.5">{renderItems(OPS_ITEMS)}</ul>
      </nav>

      {MGMT_ITEMS.some((i) => i.roles.includes(role)) && (
        <>
          <div className="px-2.5 pb-2 pt-4 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">
            {t('nav.management')}
          </div>
          <nav>
            <ul className="space-y-0.5">{renderItems(MGMT_ITEMS)}</ul>
          </nav>
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3">
        <span className="inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-brand-bg text-xs font-semibold text-accent">
          {initials(fullName)}
        </span>
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[12.5px] font-semibold">{fullName}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
            {t(`roles.${role}`)}
          </span>
        </span>
        <button
          onClick={handleLogout}
          aria-label={t('nav.logout')}
          className="ml-auto inline-flex text-muted-foreground transition-colors hover:text-bad"
        >
          <LogOut className="h-[15px] w-[15px]" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 pb-0.5 pt-3.5">
        <span className="font-mono text-[8.5px] tracking-[0.2em] text-muted-foreground/60">POR</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zitron.png" alt="Zitrón" className="block h-[13px] w-auto opacity-85" />
      </div>
    </aside>
  );
}
