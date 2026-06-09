'use client';

import * as React from 'react';

/**
 * Status de conectividade do navegador.
 *
 * Usa `navigator.onLine` + eventos online/offline. Não garante que a internet
 * esteja realmente acessível (só que há uma rede), mas é suficiente para
 * decidir entre o caminho online e o enfileiramento offline — o sync sempre
 * confirma de fato ao tentar a requisição.
 */
export function useOnline(): boolean {
  const [online, setOnline] = React.useState(true);

  React.useEffect(() => {
    // Inicializa após montar (no SSR navigator não existe).
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
