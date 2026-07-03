import { getTranslations } from 'next-intl/server';
import { SopranoRotorDrift } from '@/components/brand/logo';

/*
 * Painel de marca do login — lado esquerdo full-bleed (design system Zitrón).
 * Sempre escuro, independente do tema: grid técnico, rotor em giro lento,
 * wordmark espaçado e assinatura Zitrón no rodapé.
 */
export async function BrandPanel() {
  const t = await getTranslations('auth');
  return (
    <div className="relative hidden overflow-hidden bg-[#04070C] lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(28,42,59,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(28,42,59,.18) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(640px 460px at 42% 46%, rgba(16,120,180,.17), transparent 70%)',
        }}
        aria-hidden
      />

      <span className="relative font-mono text-[10px] tracking-[0.26em] text-[#4E6E8C]">
        LINHA 6 — LARANJA · SÃO PAULO
      </span>

      <div className="relative flex flex-col gap-7">
        <SopranoRotorDrift className="h-[92px] w-[92px] overflow-visible" />
        <div className="flex flex-col gap-3.5">
          <span className="text-[34px] font-semibold leading-none tracking-[0.3em] text-[#EDF4FB]">
            SOPRANO
          </span>
          <span className="max-w-[42ch] text-[14.5px] leading-[1.65] text-[#8FA2B8]">
            {t('brandDescription')}
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[9.5px] tracking-[0.22em] text-[#4E6E8C] uppercase">
            {t('aSolutionBy')}
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/zitron.png" alt="Zitrón" className="block h-4 w-auto opacity-95" />
        </div>
        <span className="font-mono text-[9.5px] tracking-[0.18em] text-[#3D4F63]">
          EST. 1963 · GIJÓN — SÃO PAULO
        </span>
      </div>
    </div>
  );
}
