'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { Send, RefreshCw } from 'lucide-react';
import { sendReportForSignature, resendReport } from '@/app/actions/daily-reports';
import { Button } from '@/components/ui/button';

type Props = {
  reportId: string;
  isCancelled?: boolean;
  hasClient: boolean;
};

export function SendReportButton({ reportId, isCancelled, hasClient }: Props) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleSend() {
    if (!hasClient) {
      toast.error('Defina um cliente antes de enviar para assinatura');
      return;
    }
    setLoading(true);
    try {
      const result = isCancelled
        ? await resendReport(reportId)
        : await sendReportForSignature(reportId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Resumo enviado para assinatura');
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleSend} disabled={loading} className="gap-2">
      {isCancelled
        ? <RefreshCw className="h-4 w-4" />
        : <Send className="h-4 w-4" />
      }
      {loading
        ? 'Enviando...'
        : isCancelled
          ? 'Reenviar para assinatura'
          : 'Enviar para assinatura'
      }
    </Button>
  );
}
