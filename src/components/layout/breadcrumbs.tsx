'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Breadcrumbs() {
  const pathname = usePathname();
  const tn = useTranslations('nav');
  const ta = useTranslations('activities');
  const tt = useTranslations('team');
  const tr = useTranslations('reports');
  const tTrash = useTranslations('trash');
  const tAudit = useTranslations('audit');
  const tc = useTranslations('common');

  function humanize(seg: string) {
    const key = seg.toLowerCase();
    const map: Record<string, string> = {
      atividades: tn('activities'),
      nova: ta('newActivity'),
      editar: ta('editActivity'),
      equipe: tt('title'),
      auditoria: tAudit('title'),
      lixeira: tTrash('title'),
      locais: tn('locations'),
      relatorios: tr('title'),
      configuracoes: tn('settings'),
      reclamos: tn('complaints'),
      'linha-6': tn('linha6'),
      verify: 'Verify',
    };
    if (map[key]) return map[key];
    // UUID-ish → identifier curto
    if (/^[0-9a-f]{8}-/.test(seg)) return seg.slice(0, 8);
    return seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
  }

  if (!pathname) return null;

  // Remove locale prefix (/pt, /en, /es) if presente
  const stripped = pathname.replace(/^\/(pt|en|es)(?=\/|$)/, '');
  const segments = stripped.split('/').filter(Boolean);

  // Não mostra na raiz do app (dashboard)
  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    return { seg, href, label: humanize(seg) };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4"
    >
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">{tc('home')}</span>
      </Link>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={c.href}>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href as any}
                className="hover:text-foreground transition-colors truncate max-w-[140px]"
              >
                {c.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
