'use client';

import { Check, Link2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function CopyVerifyLink({ code }: { code: string }) {
  const t = useTranslations('activities');
  const locale = useLocale();
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    const url = `${window.location.origin}/${locale}/verify/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('copiedLink'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('copiedLinkError'));
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
      {copied ? t('copied') : t('copyVerifyLink')}
    </Button>
  );
}
