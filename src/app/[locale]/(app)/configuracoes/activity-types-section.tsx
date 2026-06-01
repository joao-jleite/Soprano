'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteActivityType } from '@/app/actions/activities';

type ActivityType = {
  id: string;
  slug: string;
  label_pt: string;
  label_en: string;
  label_es: string;
};

export function ActivityTypesSection({ types }: { types: ActivityType[] }) {
  const [list, setList] = useState(types);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDelete(id: string, label: string) {
    if (!confirm(`Excluir o tipo "${label}"?\n\nAtividades existentes não serão afetadas, mas o tipo não estará mais disponível para novas atividades.`)) return;
    setPending(id);
    startTransition(async () => {
      const result = await deleteActivityType(id);
      if (result?.error) {
        setErrors(e => ({ ...e, [id]: result.error! }));
      } else {
        setList(l => l.filter(t => t.id !== id));
        setErrors(e => { const n = { ...e }; delete n[id]; return n; });
      }
      setPending(null);
    });
  }

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">Nenhum tipo de atividade cadastrado.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {list.map(t => (
        <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{t.label_pt}</span>
            <Badge variant="outline" className="text-[10px] font-mono">{t.slug}</Badge>
            {errors[t.id] && (
              <span className="text-xs text-destructive">{errors[t.id]}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={pending === t.id}
            onClick={() => handleDelete(t.id, t.label_pt)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
