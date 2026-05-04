'use client';

import * as React from 'react';
import SignaturePadLib from 'react-signature-canvas';
import { Eraser, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  onConfirm: (svg: string) => void | Promise<void>;
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
      {/* Área de assinatura */}
      <div className="relative rounded-xl border-2 border-dashed border-border bg-card overflow-hidden transition-colors focus-within:border-primary/50">
        {/* Watermark hint */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/20 font-medium">
            Assine aqui
          </p>
        </div>

        <SignaturePadLib
          ref={padRef}
          canvasProps={{
            className: 'w-full touch-none',
            style: { height: 200 },
          }}
          backgroundColor="transparent"
          penColor="currentColor"
          onEnd={() => setEmpty(false)}
        />

        {/* Linha de base */}
        <div className="absolute bottom-10 left-8 right-8 h-px bg-border pointer-events-none" />

        {/* Label "x" no início da linha de base */}
        <span className="absolute bottom-[30px] left-8 text-xs text-muted-foreground/40 pointer-events-none select-none leading-none">
          ×
        </span>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={empty || submitting || disabled}
          className="text-muted-foreground"
        >
          <Eraser className="h-3.5 w-3.5" />
          {t('clear')}
        </Button>

        <Button
          type="button"
          size="default"
          onClick={confirm}
          disabled={empty || submitting || disabled}
          className="px-8"
        >
          <Check className="h-4 w-4" />
          {submitting ? 'Assinando...' : t('confirm')}
        </Button>
      </div>
    </div>
  );
}

function dataUrlToSvg(dataUrl: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><image href="${dataUrl}" width="${width}" height="${height}"/></svg>`;
}
