'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Option } from './expandable-select';

type Props = {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Cadastra nova opção inline — retorna o objeto criado */
  onCreate?: (name: string) => Promise<Option>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Versão multi-seleção do ExpandableSelect.
 * Exibe checkboxes na lista e chips removíveis abaixo do trigger.
 */
export function MultiExpandableSelect({
  options,
  value,
  onChange,
  onCreate,
  placeholder,
  className,
  disabled,
}: Props) {
  const t = useTranslations('expandableSelect');
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [newValue, setNewValue] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const selectedOptions = options.filter((o) => value.includes(o.value));

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ?? '').toLowerCase().includes(q),
    );
  }, [options, query]);

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((id) => id !== v) : [...value, v]);
  }

  function remove(v: string) {
    onChange(value.filter((id) => id !== v));
  }

  async function handleCreate() {
    const name = newValue.trim();
    if (!name || !onCreate) return;
    setSubmitting(true);
    try {
      const created = await onCreate(name);
      onChange([...value, created.value]);
      setNewValue('');
      setCreating(false);
    } finally {
      setSubmitting(false);
    }
  }

  const triggerLabel =
    value.length === 0
      ? null
      : value.length === 1
        ? selectedOptions[0]?.label ?? '1 selecionado'
        : `${value.length} tipos selecionados`;

  return (
    <div className={cn('space-y-2', className)}>
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
            )}
          >
            <span className={cn('truncate', !triggerLabel && 'text-muted-foreground')}>
              {triggerLabel ?? placeholder ?? 'Selecione...'}
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
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search')}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
            </div>

            {/* Options list */}
            <ul className="max-h-64 overflow-y-auto py-1" role="listbox">
              {filtered.length === 0 && !creating && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum tipo encontrado
                </li>
              )}
              {filtered.map((o) => {
                const active = value.includes(o.value);
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => toggle(o.value)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-sm text-left',
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
                      {/* Checkbox visual */}
                      <span
                        className={cn(
                          'h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                          active
                            ? 'bg-primary border-primary'
                            : 'border-input bg-background',
                        )}
                      >
                        {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Criar novo */}
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

      {/* Chips dos selecionados */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <Badge key={o.value} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
              {o.label}
              <button
                type="button"
                aria-label={`Remover ${o.label}`}
                onClick={() => remove(o.value)}
                className="rounded-sm p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
