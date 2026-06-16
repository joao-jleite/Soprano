'use client';

import * as React from 'react';
import { X, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Participant = { name: string; role?: string };

type Props = {
  value: Participant[];
  onChange: (next: Participant[]) => void;
};

/**
 * Editor de participantes sem campo de função.
 * Aceita múltiplos nomes de uma vez — separados por vírgula, ponto-e-vírgula ou Enter.
 * Ex: "Rafael, Ildeu, Mario Sérgio, Renato" → 4 chips adicionados de uma vez.
 */
export function ParticipantsEditor({ value, onChange }: Props) {
  const [input, setInput] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  function commit(raw: string) {
    const names = raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    // Nomes repetidos são permitidos de propósito (ex.: dois "José" na equipe).
    const toAdd = names.map((name) => ({ name }));
    onChange([...value, ...toAdd]);
    setInput('');
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(input);
    }
    // Vírgula ou ponto-e-vírgula: confirma o que foi digitado até agora
    if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      commit(input);
    }
    // Backspace no campo vazio remove o último participante
    if (e.key === 'Backspace' && input === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 rounded-md border border-input bg-transparent px-3 py-2 min-h-[44px]',
        'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
        'cursor-text transition-colors',
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Chips dos participantes já adicionados */}
      {value.map((p, i) => (
        <Badge
          key={`${p.name}-${i}`}
          variant="secondary"
          className="pl-2.5 pr-1 py-0.5 gap-1.5 text-sm font-normal shrink-0"
        >
          {p.name}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(i); }}
            className="rounded-full hover:bg-destructive/20 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Remover ${p.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Input inline */}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) commit(input); }}
        placeholder={
          value.length === 0
            ? 'Rafael, Ildeu, Mario Sérgio… (vírgula para separar)'
            : 'Adicionar mais…'
        }
        className={cn(
          'flex-1 min-w-[180px] bg-transparent text-sm outline-none placeholder:text-muted-foreground',
          'py-0.5',
        )}
        autoCapitalize="words"
        autoComplete="off"
      />

      {/* Contador quando há participantes */}
      {value.length > 0 && (
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/60 shrink-0 self-center">
          <Users className="h-3 w-3" />
          {value.length}
        </span>
      )}
    </div>
  );
}
