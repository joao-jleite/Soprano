'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { addActivityToReport, removeActivityFromReport } from '@/app/actions/daily-reports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

type Activity = {
  id: string;
  description: string;
  status: string;
  started_at: string;
  locations?: { name: string } | null;
  activity_types?: { label_pt: string } | null;
};

type Props = {
  reportId: string;
  reportDate: string;
  includedActivities: Activity[];
  availableActivities: Activity[];
};

export function ActivityPicker({
  reportId,
  reportDate,
  includedActivities,
  availableActivities,
}: Props) {
  const router = useRouter();
  const [open, setOpen]       = React.useState(false);
  const [loading, setLoading] = React.useState<string | null>(null);

  async function handleAdd(activityId: string) {
    setLoading(activityId);
    try {
      await addActivityToReport(reportId, activityId);
      toast.success('Atividade adicionada');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao adicionar');
    } finally {
      setLoading(null);
    }
  }

  async function handleRemove(activityId: string) {
    setLoading(activityId);
    try {
      await removeActivityFromReport(reportId, activityId);
      toast.success('Atividade removida');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao remover');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Atividades já incluídas */}
      {includedActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhuma atividade adicionada. Clique abaixo para selecionar.
        </p>
      ) : (
        <ul className="space-y-2">
          {includedActivities.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.description}</p>
                <p className="text-xs text-muted-foreground">
                  {a.locations?.name} · {a.activity_types?.label_pt} · {formatDate(a.started_at, 'pt-BR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                disabled={loading === a.id}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                title="Remover"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Seletor de atividades disponíveis */}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar atividades
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>

        {open && (
          <div className="mt-3 rounded-lg border border-border divide-y divide-border overflow-hidden">
            {availableActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">
                Sem atividades disponíveis para {formatDate(reportDate + 'T12:00:00', 'pt-BR')}.
                Crie atividades primeiro na seção de Atividades.
              </p>
            ) : (
              availableActivities.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-secondary/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.locations?.name} · {a.activity_types?.label_pt}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {a.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAdd(a.id)}
                    disabled={loading === a.id}
                    className="shrink-0"
                  >
                    {loading === a.id ? '...' : 'Adicionar'}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
