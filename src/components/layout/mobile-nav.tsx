'use client';

import { Activity, Building2, ClipboardList, Home, MoreHorizontal, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/supabase/database.types';

type NavItem = { href: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; roles: Role[] };

const ITEMS: NavItem[] = [
  { href: '/',              labelKey: 'nav.dashboard',   icon: Home,          roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/linha-6',       labelKey: 'nav.linha6',      icon: Building2,     roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/atividades',    labelKey: 'nav.activities',  icon: Activity,      roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/resumo-diario', labelKey: 'nav.dailyReport', icon: ClipboardList, roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/relatorios',    labelKey: 'nav.reports',     icon: FileText,      roles: ['cliente'] },        // cliente: relatórios no lugar de "mais"
  { href: '/configuracoes', labelKey: 'nav.settings',    icon: MoreHorizontal,roles: ['admin', 'supervisor'] }, // admin/sup: atalho para config
];

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const t = useTranslations();

  // Pega os 5 itens relevantes para o role — cliente vê relatórios, outros veem configurações
  const items = ITEMS.filter((i) => i.roles.includes(role)).slice(0, 5);

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <ul className="grid grid-cols-5">
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
