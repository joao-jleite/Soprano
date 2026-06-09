import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { locales, type Locale } from '@/i18n/config';
import { Providers } from '@/components/providers';
import '../globals.css';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  return {
    title: {
      default: t('name'),
      template: `%s · ${t('name')}`,
    },
    description: t('description'),
    applicationName: t('name'),
    manifest: '/manifest.webmanifest',
    icons: {
      icon: '/favicon.svg',
      apple: '/icons/icon.svg',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: t('name'),
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#050710',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
