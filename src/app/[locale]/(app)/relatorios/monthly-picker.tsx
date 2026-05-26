'use client';

import * as React from 'react';
import { Download } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function MonthlyPicker() {
  const tr = useTranslations('reports');
  const locale = useLocale();
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);

  // últimos 24 meses disponíveis, nomes traduzidos via Intl
  const options = React.useMemo(() => {
    const fmt = new Intl.DateTimeFormat(
      locale === 'pt' ? 'pt-BR' : locale,
      { month: 'long', year: 'numeric' },
    );
    const out: { year: number; month: number; label: string }[] = [];
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 24; i++) {
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      out.push({ year: y, month: mo, label: fmt.format(d) });
      d.setMonth(d.getMonth() - 1);
    }
    return out;
  }, [locale]);

  const yyyymm = `${year}${String(month).padStart(2, '0')}`;
  const href = `/api/relatorios/mensal/${yyyymm}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={yyyymm}
        onValueChange={(v) => {
          setYear(Number(v.slice(0, 4)));
          setMonth(Number(v.slice(4, 6)));
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => {
            const val = `${o.year}${String(o.month).padStart(2, '0')}`;
            return (
              <SelectItem key={val} value={val}>
                {o.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Button asChild size="sm">
        <a href={href} target="_blank" rel="noopener noreferrer">
          <Download className="h-4 w-4" />
          {tr('downloadPdf')}
        </a>
      </Button>
    </div>
  );
}
