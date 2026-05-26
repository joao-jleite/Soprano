'use client';

import { Activity, Building2, ClipboardList, Home, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', labelKey: 'nav.dashboard', icon: Home },
  { href: '/linha-6', labelKey: 'nav.linha6', icon: Building2 },
  { href: '/atividades', labelKey: 'nav.activities', icon: Activity },
  { href: '/resumo-diario', labelKey: 'nav.dailyReport', icon: ClipboardList },
  { href: '/configuracoes', labelKey: 'nav.settings', icon: MoreHorizontal },
];

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
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
