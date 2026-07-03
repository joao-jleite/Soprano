import * as React from 'react';
import { cn } from '@/lib/utils';

/*
 * Soprano brand — "rotor" S (design system Zitrón, redesign 2026).
 * Disco azul com S vazado (máscara SVG → o S é transparente de verdade,
 * funciona sobre qualquer superfície) + arcos de rastro do fluxo de ar.
 * Cores literais da marca — não mudam com o tema.
 */

const ROTOR_S = 'M 55.42 30.08 A 10.5 10.5 0 1 0 48 48 A 10.5 10.5 0 1 1 40.58 65.92';

function RotorDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#27B1EC" />
        <stop offset="1" stopColor="#0A6CA6" />
      </linearGradient>
      <mask id={`${id}-m`}>
        <circle cx="48" cy="48" r="34" fill="white" />
        <path d={ROTOR_S} stroke="black" strokeWidth="8.5" fill="none" strokeLinecap="round" />
      </mask>
    </defs>
  );
}

function RotorDisc({ id }: { id: string }) {
  return <circle cx="48" cy="48" r="34" fill={`url(#${id}-g)`} mask={`url(#${id}-m)`} />;
}

function RotorTrail() {
  return (
    <g fill="none" stroke="#35B6F5" strokeLinecap="round" strokeWidth="2.6">
      <path d="M10.38 30.46 A41.5 41.5 0 0 1 44.38 6.66" opacity="0.55" />
      <path d="M85.62 65.54 A41.5 41.5 0 0 1 51.62 89.34" opacity="0.55" />
      <path d="M51.62 6.66 A41.5 41.5 0 0 1 68.75 12.06" opacity="0.2" />
      <path d="M44.38 89.34 A41.5 41.5 0 0 1 27.25 83.94" opacity="0.2" />
    </g>
  );
}

export function SopranoMark({
  className,
  trail = false,
}: {
  className?: string;
  trail?: boolean;
}) {
  const id = React.useId().replace(/[:]/g, '');
  return (
    <svg
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
    >
      <RotorDefs id={id} />
      {trail && <RotorTrail />}
      <RotorDisc id={id} />
    </svg>
  );
}

/** Rotor girando — spinner de marca (assinatura, geração de PDF, loading). */
export function SopranoSpinner({ className }: { className?: string }) {
  const id = React.useId().replace(/[:]/g, '');
  return (
    <svg
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      <RotorDefs id={id} />
      <RotorTrail />
      <g
        className="animate-rotor-spin"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <RotorDisc id={id} />
      </g>
    </svg>
  );
}

/** Rotor do splash — gira 3 voltas e assenta no S (animação única). */
export function SopranoRotorSettle({ className }: { className?: string }) {
  const id = React.useId().replace(/[:]/g, '');
  return (
    <svg
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-24 w-24', className)}
      aria-hidden="true"
    >
      <RotorDefs id={id} />
      <RotorTrail />
      <g
        className="animate-rotor-settle"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <RotorDisc id={id} />
      </g>
    </svg>
  );
}

/** Rotor em giro lento contínuo — painel de marca do login. */
export function SopranoRotorDrift({ className }: { className?: string }) {
  const id = React.useId().replace(/[:]/g, '');
  return (
    <svg
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-24 w-24', className)}
      aria-hidden="true"
    >
      <RotorDefs id={id} />
      <RotorTrail />
      <g
        className="animate-rotor-drift"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      >
        <RotorDisc id={id} />
      </g>
    </svg>
  );
}

/** S da marca em traço branco — para superfícies já azuis (FAB, ícone do app). */
export function SopranoGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <path
        d="M 57.62 24.72 A 13.65 13.65 0 1 0 48 48 A 13.65 13.65 0 1 1 38.38 71.28"
        stroke="white"
        strokeWidth="11"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SopranoWordmark({
  className,
  showMark = true,
}: {
  className?: string;
  showMark?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {showMark && <SopranoMark className="h-7 w-7" />}
      <span className="font-sans text-lg font-semibold tracking-tight">
        Soprano
      </span>
    </div>
  );
}

export function ZitronBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      Zitrón Brasil
    </div>
  );
}
