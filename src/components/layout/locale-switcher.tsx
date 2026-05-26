'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function onChange(next: string) {
    router.replace(pathname, { locale: next as Locale });
  }

  return (
    <Select value={locale} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto gap-2 border-0 bg-transparent hover:bg-secondary/50 pl-2 pr-2.5">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span>{localeFlags[locale]}</span>
            <span className="hidden sm:inline text-xs font-medium uppercase tracking-wider">
              {locale}
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((l) => (
          <SelectItem key={l} value={l}>
            <span className="flex items-center gap-2">
              <span>{localeFlags[l]}</span>
              <span>{localeNames[l]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
