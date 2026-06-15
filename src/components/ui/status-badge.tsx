import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  rascunho: 'secondary',
  enviada: 'warning',
  rejeitada: 'destructive',
  // Reclamos (claims)
  enviado: 'default',
  recebido: 'warning',
  em_analise: 'warning',
  respondido: 'success',
  encerrado: 'secondary',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{label ?? status}</Badge>;
}
