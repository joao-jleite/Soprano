import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'destructive' | 'secondary'> = {
  rascunho: 'secondary',
  enviada: 'warning',
  rejeitada: 'destructive',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{label ?? status}</Badge>;
}
