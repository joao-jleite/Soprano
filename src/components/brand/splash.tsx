'use client';

import { SopranoRotorSettle } from '@/components/brand/logo';

/*
 * Splash de marca — overlay full-screen exibido entre o login e o dashboard.
 * Sempre escuro (momento de marca, independe do tema): rotor gira 1080° e
 * assenta no S enquanto a barra de progresso corre.
 */
export function SopranoSplash({ subtitle }: { subtitle?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#04070C]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(560px 380px at 50% 42%, rgba(16,120,180,.15), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-7">
        <SopranoRotorSettle className="h-28 w-28" />
        <div className="flex flex-col items-center gap-2.5">
          <span className="pl-[0.4em] text-[19px] font-semibold tracking-[0.4em] text-[#EDF4FB]">
            SOPRANO
          </span>
          {subtitle && (
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#4E6E8C]">
              {subtitle}
            </span>
          )}
        </div>
        <div className="h-0.5 w-[170px] overflow-hidden rounded-full bg-[#101A26]">
          <div className="soprano-splash-progress h-full w-full bg-gradient-to-r from-[#1095D6] to-[#45D6FF]" />
        </div>
      </div>
      <style>{`
        .soprano-splash-progress {
          transform-origin: left;
          animation: soprano-splash-progress 2.4s cubic-bezier(0.3, 0.2, 0.2, 1) both;
        }
        @keyframes soprano-splash-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
