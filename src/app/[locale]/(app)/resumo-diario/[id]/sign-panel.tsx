'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { SignatureTyped } from '@/components/signature/signature-typed';
import { cancelDailyReport } from '@/app/actions/daily-reports';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, ShieldX, PenLine, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  reportId: string;
  signerName?: string;
};

export function SignDailyReportPanel({ reportId, signerName }: Props) {
  const router = useRouter();
  const [mode, setMode]         = React.useState<'sign' | 'cancel'>('sign');
  const [reason, setReason]     = React.useState('');
  const [signing, setSigning]   = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  async function onSign(svg: string) {
    setSigning(true);
    try {
      const res = await fetch(`/api/resumo-diario/${reportId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svgData: svg }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error ?? `Erro ${res.status}`);
        return;
      }
      toast.success('Resumo assinado com sucesso ✓');
      router.push('/resumo-diario');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao assinar');
    } finally {
      setSigning(false);
    }
  }

  async function onCancel() {
    if (!reason.trim()) return;
    setCancelling(true);
    try {
      const result = await cancelDailyReport({ reportId, reason });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Cancelamento registrado — supervisor será notificado');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Instrução */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Confirme as atividades acima e assine o resumo do dia</p>
          {signerName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Assinante: <span className="font-medium text-foreground">{signerName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Toggle assinar / cancelar */}
      <div className="flex gap-2 rounded-lg border border-border p-1 bg-muted/30 w-fit">
        <button
          type="button"
          onClick={() => setMode('sign')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
            mode === 'sign'
              ? 'bg-background shadow-sm text-primary border border-border'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <PenLine className="h-3.5 w-3.5" />
          Assinar
        </button>
        <button
          type="button"
          onClick={() => setMode('cancel')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
            mode === 'cancel'
              ? 'bg-background shadow-sm text-destructive border border-border'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <ShieldX className="h-3.5 w-3.5" />
          Cancelar assinatura
        </button>
      </div>

      {mode === 'sign' ? (
        <SignatureTyped
          signerName={signerName}
          onConfirm={onSign}
          disabled={signing}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Ao cancelar, o supervisor será notificado e o resumo voltará para revisão.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo do cancelamento</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              rows={4}
              className="resize-none"
            />
          </div>
          <Button
            variant="destructive"
            onClick={onCancel}
            disabled={!reason.trim() || cancelling}
            className="w-full sm:w-auto"
          >
            <ShieldX className="h-4 w-4" />
            {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </div>
      )}
    </div>
  );
}
