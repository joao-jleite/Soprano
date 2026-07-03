'use client';

import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  locations: { id: string; name: string; kind: string }[];
  types: { id: string; slug: string; label_pt: string; label_en: string; label_es: string }[];
  localeKey: 'label_pt' | 'label_en' | 'label_es';
};

export function ActivityFilters({ locations, types, localeKey }: Props) {
  const t = useTranslations('activities');
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (!value || value === 'all') params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  function clear() {
    router.push('?');
  }

  const hasFilters = Array.from(sp.keys()).length > 0;

  const [searchValue, setSearchValue] = React.useState(sp.get('q') ?? '');
  React.useEffect(() => {
    const current = sp.get('q') ?? '';
    if (searchValue === current) return;
    const t = setTimeout(() => update('q', searchValue || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border bg-card/40">
      <Filter label="Buscar" className="min-w-[220px] flex-1">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Descrição, observações..."
            className="pl-8"
          />
        </div>
      </Filter>

      <Filter label={t('filterByLocation')} className="min-w-[180px]">
        <Select value={sp.get('location') ?? 'all'} onValueChange={(v) => update('location', v)}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">—</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Filter>

      <Filter label={t('filterByType')} className="min-w-[160px]">
        <Select value={sp.get('type') ?? 'all'} onValueChange={(v) => update('type', v)}>
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">—</SelectItem>
            {types.map((tp) => (
              <SelectItem key={tp.id} value={tp.id}>
                {tp[localeKey]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Filter>

      <Filter label={`${t('filterByDate')} (from)`}>
        <Input
          type="date"
          value={sp.get('from') ?? ''}
          onChange={(e) => update('from', e.target.value || null)}
        />
      </Filter>

      <Filter label={`${t('filterByDate')} (to)`}>
        <Input
          type="date"
          value={sp.get('to') ?? ''}
          onChange={(e) => update('to', e.target.value || null)}
        />
      </Filter>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X />
          {t('filterClear')}
        </Button>
      )}
    </div>
  );
}

function Filter({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
