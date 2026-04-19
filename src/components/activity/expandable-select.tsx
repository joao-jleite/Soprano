'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type Option = {
  value: string;
  label: string;
  sublabel?: string;
};

type Props = {
  options: Option[];
  value: string | null;
  onChange: (value: string) => void;
  /** Chamado quando o usuário quer adicionar uma nova opção. Retorna o novo id. */
  onCreate?: (name: string) => Promise<Option>;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Select expansível: lista opções, permite busca e um botão "+ Adicionar novo"
 * que abre um campo inline pra cadastrar direto, sem sair da tela.
 *
 * Padrão de UX que o João pediu: supervisor cadastra uma vez, nas próximas só seleciona.
 */
export function ExpandableSelect({
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  emptyText,
  className,
  disabled,
}: Props) {
  const t = useTranslations('expandableSelect');
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [newValue, setNewValue] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const selected = options.find((o) => o.value === value);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  async function handleCreate() {
    const name = newValue.trim();
    if (!name || !onCreate) return;
    setSubmitting(true);
    try {
      const created = await onCreate(name);
      onChange(created.value);
      setNewValue('');
      setCreating(false);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-input/40 px-3 py-2 text-sm',
            'hover:border-primary/40 transition-colors',
            'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40',
            'disabled:cursor-not-allowed disabled:opacity-40',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder ?? '—'}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-60 shrink-0 ml-2" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[18rem] rounded-md border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && !creating && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                {emptyText ?? t('search')}
              </li>
            )}
            {filtered.map((o) => {
              const active = o.value === value;
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-left',
                      'hover:bg-secondary/60 transition-colors',
                      active && 'text-primary',
                    )}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="flex flex-col leading-tight">
                      <span>{o.label}</span>
                      {o.sublabel && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {o.sublabel}
                        </span>
                      )}
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>

          {onCreate && (
            <div className="border-t border-border p-2 bg-card/50">
              {!creating ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setCreating(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t('addNewTitle')}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={t('addNewPlaceholder')}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreate();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreate}
                      disabled={!newValue.trim() || submitting}
                      className="flex-1"
                    >
                      {t('addNewConfirm')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCreating(false);
                        setNewValue('');
                      }}
                    >
                      {t('addNewCancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
