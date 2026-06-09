/// <reference lib="webworker" />
//
// Service worker do Soprano (gerado pelo Serwist a partir deste arquivo).
// Este arquivo é EXCLUÍDO do typecheck principal (ver tsconfig.json) porque
// usa a lib "webworker", que conflita com a lib "dom" do resto do app.
// O @serwist/next o compila separadamente para public/sw.js.
//
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injetado pelo Serwist em tempo de build com os assets a pré-cachear.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Ativa a nova versão imediatamente, sem esperar abas antigas fecharem.
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
