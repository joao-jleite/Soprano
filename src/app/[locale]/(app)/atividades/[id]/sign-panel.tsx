'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { SignatureCanvas } from '@/components/signature/signature-canvas';
import { signActivity, rejectActivity } from '@/app/actions/signatures';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function SignActivityPanel({ activityId }: { activityId: string }) {
  const t = useTranslations('signature');
  const router = useRouter();
  const [mode, setMode] = React.useState<'sign' | 'reject'>('sign');
  const [reason, setReason] = React.useState('');

  async function onConfirm(svg: string) {
    try {
      await signActivity({ activityId, svgData: svg });
      toast.success(t('confirm') + ' ✓');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao assinar');
    }
  }

  async function onReject() {
    if (!reason.trim()) return;
    try {
      await rejectActivity({ activityId, reason, svgData: '<svg/>' });
      toast.success(t('reject') + ' ✓');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao rejeitar');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('subtitle')}</p>

      <div className="flex gap-2">
        <Button
          variant={mode === 'sign' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('sign')}
        >
          {t('confirm')}
        </Button>
        <Button
          variant={mode === 'reject' ? 'destructive' : 'ghost'}
          size="sm"
          onClick={() => setMode('reject')}
        >
          {t('reject')}
        </Button>
      </div>

      {mode === 'sign' ? (
        <SignatureCanvas onConfirm={onConfirm} />
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t('rejectReason')}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
          <Button variant="destructive" onClick={onReject} disabled={!reason.trim()}>
            {t('reject')}
          </Button>
        </div>
      )}
    </div>
  );
}
