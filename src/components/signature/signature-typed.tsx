'use client';

import * as React from 'react';
import { Check, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type Props = {
  /** Nome pré-preenchido vindo do perfil do cliente */
  signerName?: string;
  onConfirm: (svg: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

/**
 * Gera um SVG de assinatura estilizada a partir do nome digitado.
 * Usa Georgia italic — disponível em todos os sistemas e no Chromium headless.
 */
function buildSignatureSvg(name: string): string {
  const escaped = name
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 90" width="480" height="90">`,
    `  <text`,
    `    x="24" y="62"`,
    `    font-family="Georgia, 'Times New Roman', serif"`,
    `    font-style="italic"`,
    `    font-size="44"`,
    `    fill="#0f172a"`,
    `    letter-spacing="-1"`,
    `  >${escaped}</text>`,
    `  <line x1="16" y1="76" x2="464" y2="76" stroke="#94a3b8" stroke-width="0.75"/>`,
    `</svg>`,
  ].join('\n');
}

export function SignatureTyped({ signerName = '', onConfirm, disabled, className }: Props) {
  const [name, setName]         = React.useState(signerName);
  const [agreed, setAgreed]     = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const canSign = name.trim().length >= 3 && agreed && !disabled && !submitting;

  async function handleConfirm() {
    if (!canSign) return;
    setSubmitting(true);
    try {
      await onConfirm(buildSignatureSvg(name.trim()));
    } catch (e: any) {
      // Propaga o erro para o caller (sign-panel) que exibe o toast
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn('space-y-4', className)}>

      {/* Preview ao vivo */}
      <div className="relative rounded-xl border-2 border-dashed border-border bg-card overflow-hidden min-h-[112px] flex items-center justify-center px-6 py-4 transition-colors focus-within:border-primary/40">
        {name.trim().length >= 2 ? (
          <div
            className="w-full max-w-[480px]"
            dangerouslySetInnerHTML={{ __html: buildSignatureSvg(name.trim()) }}
          />
        ) : (
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground/25 font-medium select-none">
            Pré-visualização da assinatura
          </p>
        )}

        {/* Indicador de estilo */}
        <span className="absolute top-2 right-3 text-[10px] uppercase tracking-widest text-muted-foreground/30 font-medium select-none">
          Assinatura eletrônica
        </span>
      </div>

      {/* Campo nome */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Nome completo do signatário
        </label>
        <div className="relative">
          <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome completo"
            className="pl-9 font-serif italic text-base tracking-wide"
            autoComplete="name"
            autoCapitalize="words"
          />
        </div>
        {name.trim().length > 0 && name.trim().length < 3 && (
          <p className="text-[11px] text-muted-foreground/60">Mínimo 3 caracteres</p>
        )}
      </div>

      {/* Checkbox legal */}
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors cursor-pointer',
          agreed
            ? 'border-primary/30 bg-primary/5'
            : 'border-border bg-muted/20 hover:border-border/80',
        )}
        onClick={() => setAgreed((v) => !v)}
      >
        <Checkbox
          id="sig-agree"
          checked={agreed}
          onCheckedChange={(v) => setAgreed(!!v)}
          className="mt-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        />
        <label
          htmlFor="sig-agree"
          className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          Declaro que li e confirmo todas as atividades descritas neste documento.
          Esta assinatura eletrônica tem validade jurídica nos termos da{' '}
          <strong className="text-foreground font-medium">Lei 14.063/2020</strong>.
        </label>
      </div>

      {/* Botão */}
      <Button
        type="button"
        size="lg"
        onClick={handleConfirm}
        disabled={!canSign}
        className="w-full"
      >
        <Check className="h-4 w-4" />
        {submitting ? 'Assinando…' : 'Confirmar assinatura'}
      </Button>
    </div>
  );
}
