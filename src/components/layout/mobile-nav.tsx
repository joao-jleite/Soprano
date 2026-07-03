'use client';

import {
  Activity,
  ClipboardList,
  Home,
  MessageSquareWarning,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { SopranoGlyph } from '@/components/brand/logo';
import type { Role } from '@/lib/supabase/database.types';

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
};

const ALL_ITEMS: NavItem[] = [
  { href: '/',              labelKey: 'nav.dashboard',   icon: Home,          roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/atividades',    labelKey: 'nav.activities',  icon: Activity,      roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/resumo-diario', labelKey: 'nav.dailyReport', icon: ClipboardList, roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/reclamos',      labelKey: 'nav.complaints',  icon: MessageSquareWarning, roles: ['admin', 'supervisor', 'cliente'] },
];

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const t = useTranslations();

  const items = ALL_ITEMS.filter((i) => i.roles.includes(role));
  // FAB central de nova atividade — só para quem registra obra
  const withFab = role === 'admin' || role === 'supervisor';
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  function renderItem(item: NavItem) {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <li key={item.href} className="flex-1">
        <Link
          href={item.href}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors',
            active ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Icon className="h-5 w-5" />
          {t(item.labelKey)}
        </Link>
      </li>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <ul className="flex items-stretch">
        {left.map(renderItem)}
        {withFab && (
          <li className="relative w-16 shrink-0">
            <Link
              href="/atividades/nova"
              aria-label={t('activities.newActivity')}
              className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-full border border-primary/40 bg-gradient-to-b from-[#1CA6E4] to-[#085A8E] shadow-[0_8px_24px_-6px_rgba(16,149,214,0.6)] transition-transform active:scale-95"
            >
              <SopranoGlyph className="h-8 w-8" />
            </Link>
          </li>
        )}
        {right.map(renderItem)}
      </ul>
    </nav>
  );
}
