// Página de fallback offline (estática → pré-cacheada pelo service worker).
// Servida quando uma navegação não está em cache e não há rede. Mantida sem
// dependência de dados ou i18n para nunca falhar offline.
export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-amber-500"
            aria-hidden="true"
          >
            <path d="M2 2 22 22" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
            <path d="M5 13a10 10 0 0 1 5.24-2.76" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Você está sem conexão</h1>
        <p className="text-sm text-muted-foreground">
          Esta tela ainda não tinha sido aberta com internet. As atividades que você
          já salvou estão seguras no aparelho e sobem sozinhas quando a conexão voltar.
        </p>
        <a
          href="/pt/atividades"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar para Atividades
        </a>
      </div>
    </main>
  );
}
