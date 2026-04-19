'use client';

import * as React from 'react';
import SignaturePadLib from 'react-signature-canvas';
import { Eraser, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  onConfirm: (svg: string) => void | Promise<void>;
  onReject?: (reason: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function SignatureCanvas({ onConfirm, disabled, className }: Props) {
  const t = useTranslations('signature');
  const padRef = React.useRef<SignaturePadLib | null>(null);
  const [empty, setEmpty] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  function clear() {
    padRef.current?.clear();
    setEmpty(true);
  }

  async function confirm() {
    if (!padRef.current || padRef.current.isEmpty()) return;
    setSubmitting(true);
    try {
      const canvas = padRef.current.getTrimmedCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const svg = dataUrlToSvg(dataUrl, canvas.width, canvas.height);
      await onConfirm(svg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative rounded-md border border-border bg-card overflow-hidden">
        <div className="absolute top-3 left-3 text-data pointer-events-none">
          {t('draw')}
        </div>
        <SignaturePadLib
          ref={padRef}
          canvasProps={{
            className: 'w-full h-[240px] touch-none',
          }}
          backgroundColor="transparent"
          penColor="#f5f5f7"
          onEnd={() => setEmpty(false)}
        />
        <div className="absolute bottom-0 left-4 right-4 h-px bg-border pointer-events-none" />
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={clear} disabled={empty || submitting}>
          <Eraser />
          {t('clear')}
        </Button>
        <Button type="button" onClick={confirm} disabled={empty || submitting || disabled}>
          <Check />
          {t('confirm')}
        </Button>
      </div>
    </div>
  );
}

function dataUrlToSvg(dataUrl: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><image href="${dataUrl}" width="${width}" height="${height}"/></svg>`;
}
