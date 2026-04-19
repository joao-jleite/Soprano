'use client';

import { usePathname } from 'next/navigation';
import {
  Activity,
  Building2,
  FileText,
  Home,
  MapPin,
  MessageSquareWarning,
  Settings,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { SopranoWordmark, ZitronBadge } from '@/components/brand/logo';
import type { Role } from '@/lib/supabase/database.types';

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: Home, roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/linha-6', labelKey: 'nav.linha6', icon: Building2, roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/atividades', labelKey: 'nav.activities', icon: Activity, roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/locais', labelKey: 'nav.locations', icon: MapPin, roles: ['admin', 'supervisor'] },
  { href: '/equipe', labelKey: 'nav.team', icon: Users, roles: ['admin'] },
  { href: '/relatorios', labelKey: 'nav.reports', icon: FileText, roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/reclamos', labelKey: 'nav.complaints', icon: MessageSquareWarning, roles: ['admin', 'supervisor', 'cliente'] },
  { href: '/configuracoes', labelKey: 'nav.settings', icon: Settings, roles: ['admin', 'supervisor', 'cliente'] },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const t = useTranslations();

  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-border lg:bg-card/30 lg:backdrop-blur-xl">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <SopranoWordmark />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all',
                    active
                      ? 'bg-primary/10 text-primary border-l-2 border-primary -ml-[2px] pl-[calc(0.75rem-2px)]'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 py-4 border-t border-border space-y-2">
        <ZitronBadge />
        <p className="text-[10px] text-muted-foreground/60 font-mono">
          Linha 6 · SP
        </p>
      </div>
    </aside>
  );
}
