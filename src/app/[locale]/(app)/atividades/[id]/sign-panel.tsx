'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { SignatureTyped } from '@/components/signature/signature-typed';
import { signActivity, rejectActivity } from '@/app/actions/signatures';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, ShieldX, PenLine, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  activityId: string;
  /** Nome do cliente que assina (para exibir na interface) */
  signerName?: string;
};

export function SignActivityPanel({ activityId, signerName }: Props) {
  const t = useTranslations('signature');
  const router = useRouter();
  const [mode, setMode] = React.useState<'sign' | 'reject'>('sign');
  const [reason, setReason] = React.useState('');
  const [signing, setSigning] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);

  async function onConfirm(svg: string) {
    setSigning(true);
    try {
      await signActivity({ activityId, svgData: svg });
      toast.success('Atividade assinada com sucesso ✓');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao assinar');
    } finally {
      setSigning(false);
    }
  }

  async function onReject() {
    if (!reason.trim()) return;
    setRejecting(true);
    try {
      await rejectActivity({ activityId, reason, svgData: '<svg/>' });
      toast.success('Atividade recusada');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao recusar');
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Instrução principal */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">{t('subtitle')}</p>
          {signerName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Assinante: <span className="font-medium text-foreground">{signerName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Toggle assinar / recusar */}
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
          onClick={() => setMode('reject')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all',
            mode === 'reject'
              ? 'bg-background shadow-sm text-destructive border border-border'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <ShieldX className="h-3.5 w-3.5" />
          Recusar
        </button>
      </div>

      {mode === 'sign' ? (
        <SignatureTyped
          signerName={signerName}
          onConfirm={onConfirm}
          disabled={signing}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Ao recusar, o supervisor será notificado e a atividade voltará para revisão.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('rejectReason')}</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da recusa..."
              rows={4}
              className="resize-none"
            />
          </div>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={!reason.trim() || rejecting}
            className="w-full sm:w-auto"
          >
            <ShieldX className="h-4 w-4" />
            {rejecting ? 'Recusando...' : t('reject')}
          </Button>
        </div>
      )}
    </div>
  );
}
