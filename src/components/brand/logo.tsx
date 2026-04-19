import { cn } from '@/lib/utils';

/**
 * Soprano logo — stylized "S" com curva de airflow.
 * Monocromático, respeita currentColor. Escala limpa em qualquer tamanho.
 */
export function SopranoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="soprano-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--zitron-blue-bright))" />
          <stop offset="100%" stopColor="hsl(var(--zitron-blue))" />
        </linearGradient>
      </defs>
      {/* contorno quadrado sutil */}
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9" stroke="currentColor" strokeOpacity="0.15" />
      {/* S estilizado — fluxo de ar */}
      <path
        d="M27.5 12.5c-1.6-2.2-4.6-3.5-7.5-3.5-4.4 0-8 3-8 6.5 0 3.6 3 5.5 7 6.5 4 1 7 2.9 7 6.5 0 3.5-3.6 6.5-8 6.5-2.9 0-5.9-1.3-7.5-3.5"
        stroke="url(#soprano-grad)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* partícula/pontos de ar */}
      <circle cx="12.5" cy="32.5" r="1.25" fill="hsl(var(--zitron-blue-bright))" />
      <circle cx="27.5" cy="7.5" r="1.25" fill="hsl(var(--zitron-blue-bright))" />
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
