'use client';

import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type Participant = { name: string; role?: string };

type Props = {
  value: Participant[];
  onChange: (next: Participant[]) => void;
};

export function ParticipantsEditor({ value, onChange }: Props) {
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('');

  function add() {
    const n = name.trim();
    if (!n) return;
    if (value.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      setName('');
      return;
    }
    onChange([...value, { name: n, role: role.trim() || undefined }]);
    setName('');
    setRole('');
  }

  function remove(target: Participant) {
    onChange(value.filter((p) => p.name !== target.name));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((p) => (
            <li key={p.name}>
              <Badge variant="secondary" className="pl-2.5 pr-1 py-1">
                <span className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p.role && (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.role}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    className="rounded-full hover:bg-destructive/20 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Função (opcional)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!name.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
