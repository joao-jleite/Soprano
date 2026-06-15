'use client';

import {
  Activity,
  ClipboardList,
  Home,
  MessageSquareWarning,
  MoreHorizontal,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
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
  { href: '/configuracoes', labelKey: 'nav.settings',    icon: MoreHorizontal,roles: ['admin', 'supervisor'] },
];

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const t = useTranslations();

  const items = ALL_ITEMS.filter((i) => i.roles.includes(role));
  const colsClass = GRID_COLS[items.length] ?? 'grid-cols-4';

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <ul className={`grid ${colsClass}`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <li key={item.href}>
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
        })}
      </ul>
    </nav>
  );
}
