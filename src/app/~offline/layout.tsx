import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '../globals.css';

// Layout raiz próprio: a página /~offline vive fora do segmento [locale],
// então precisa do seu <html>/<body>. É estática para ser pré-cacheada pelo
// service worker e servir como fallback de navegação sem rede.
export const metadata: Metadata = {
  title: 'Sem conexão · Soprano',
};

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
