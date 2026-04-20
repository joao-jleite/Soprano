'use client';

import { Check, Link2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function CopyVerifyLink({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    const url = `${window.location.origin}/pt/verify/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link de verificação copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      {copied ? 'Copiado' : 'Link verificação'}
    </Button>
  );
}
