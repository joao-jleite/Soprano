import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Puppeteer + Chromium fora do bundle webpack
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // ──────────────────────────────────────────────────────────────
  // Security Headers — aplicados em todas as rotas
  // ──────────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Impede MIME-sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Bloqueia carregamento em iframes de terceiros (clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Ativa filtro XSS em browsers legados
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Controla informação do referrer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desativa features de hardware desnecessárias
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // HSTS — força HTTPS por 2 anos (ativar só depois de confirmar HTTPS funcional)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Content-Security-Policy básica
          // next-intl e Supabase injetam inline scripts → precisamos de 'unsafe-inline'
          // nas diretivas de script. Isso pode ser endurecido com nonces no futuro.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
              "media-src 'self'",
              "object-src 'none'",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // Adicional: rotas de API com restrição extra
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
