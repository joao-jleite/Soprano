'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ACTIONS = ['insert', 'update', 'delete', 'soft_delete', 'restore'];

export function AuditFilters({ tables }: { tables: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [actor, setActor] = React.useState(sp.get('actor') ?? '');

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (!value || value === 'all') params.delete(key);
    else params.set(key, value);
    params.delete('page');
    router.push(`?${params.toString()}`);
  }

  React.useEffect(() => {
    const current = sp.get('actor') ?? '';
    if (actor === current) return;
    const t = setTimeout(() => update('actor', actor || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  const hasFilters = Array.from(sp.keys()).length > 0;

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border bg-card/40">
      <div className="flex flex-col gap-1 min-w-[180px]">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tabela</span>
        <Select value={sp.get('table') ?? 'all'} onValueChange={(v) => update('table', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {tables.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 min-w-[150px]">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ação</span>
        <Select value={sp.get('action') ?? 'all'} onValueChange={(v) => update('action', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ator (email)</span>
        <Input
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="buscar por email..."
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push('?')}>
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
