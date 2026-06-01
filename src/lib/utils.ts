import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale: string = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale: string = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Retorna tempo relativo em português (ex: "3 dias atrás", "agora mesmo").
 * Adequado para renderização client-side.
 */
export function timeAgo(date: string | Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60)                  return 'agora mesmo';
  if (diff < 3600)                { const m = Math.floor(diff / 60);       return `${m} min atrás`; }
  if (diff < 86_400)              { const h = Math.floor(diff / 3600);     return `${h}h atrás`; }
  if (diff < 7 * 86_400)         { const d = Math.floor(diff / 86_400);   return `${d} dia${d > 1 ? 's' : ''} atrás`; }
  if (diff < 30 * 86_400)        { const w = Math.floor(diff / 604_800);  return `${w} semana${w > 1 ? 's' : ''} atrás`; }
  if (diff < 365 * 86_400)       { const mo = Math.floor(diff / 2_592_000); return `${mo} ${mo > 1 ? 'meses' : 'mês'} atrás`; }
  const y = Math.floor(diff / 31_536_000); return `${y} ano${y > 1 ? 's' : ''} atrás`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
