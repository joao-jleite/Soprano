/// <reference lib="webworker" />
//
// Service worker do Soprano (gerado pelo Serwist a partir deste arquivo).
// Este arquivo é EXCLUÍDO do typecheck principal (ver tsconfig.json) porque
// usa a lib "webworker", que conflita com a lib "dom" do resto do app.
// O @serwist/next o compila separadamente para public/sw.js.
//
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { NetworkFirst, NetworkOnly, Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injetado pelo Serwist em tempo de build com os assets a pré-cachear.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Cache do "app shell" — páginas de navegação. Nome próprio para podermos
// aquecê-lo no install e a estratégia NetworkFirst lê dele quando offline.
const SHELL_CACHE = 'soprano-app-shell';

// Rotas aquecidas assim que o SW instala. Sem isto, abrir "Nova atividade"
// pela PRIMEIRA vez já em campo (sem rede) caía no erro do navegador, pois
// nada havia sido cacheado ainda. Em PT — o time de obra usa só português.
const WARM_ROUTES = ['/pt', '/pt/atividades', '/pt/atividades/nova'];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Ativa a nova versão imediatamente, sem esperar abas antigas fecharem.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // PDFs (atividade e resumo diário) são documentos dinâmicos gerados pelo
    // servidor (Puppeteer) e podem demorar MAIS que o timeout do cache de APIs.
    // Sem esta regra, o NetworkFirst de `/api/*` do defaultCache (ou o de
    // navegação abaixo) servia um PDF ANTIGO do cache quando a geração passava
    // do timeout — fazia o layout novo aparecer só em ALGUMAS atividades.
    // NetworkOnly = sempre gera fresco, nunca lê de cache. Precisa vir PRIMEIRO.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && /^\/api\/.+\/pdf$/.test(url.pathname),
      handler: new NetworkOnly(),
    },
    // Navegações de documento: tenta a rede (3s) e cai no cache aquecido quando
    // offline ou lento. Tem precedência sobre o defaultCache para navegações.
    // `ignoreSearch` faz `/atividades/nova?pending=<id>` cair no shell cacheado
    // de `/atividades/nova` (os dados do item vêm do IndexedDB no cliente).
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new NetworkFirst({
        cacheName: SHELL_CACHE,
        networkTimeoutSeconds: 3,
        matchOptions: { ignoreSearch: true },
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        // Última linha de defesa: navegação não-cacheada e sem rede → página
        // offline amigável em vez do erro cru do navegador.
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

// Aquece o cache do app shell no install (best-effort — falha de rede não
// impede a instalação do SW).
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        WARM_ROUTES.map(async (route) => {
          try {
            const res = await fetch(route, { credentials: 'same-origin' });
            if (res.ok) await cache.put(route, res.clone());
          } catch {
            /* aquecer é best-effort */
          }
        }),
      );
    })(),
  );
});

serwist.addEventListeners();
