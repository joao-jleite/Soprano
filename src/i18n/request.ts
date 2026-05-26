import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './config';

// Imports estáticos por locale — garante bundling correto no Vercel/webpack.
// Template literals dinâmicos (import(`@/messages/${locale}.json`)) podem
// falhar em prod se o build não incluir os chunks no bundle da função.
const messageLoaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  pt: () => import('@/messages/pt.json'),
  en: () => import('@/messages/en.json'),
  es: () => import('@/messages/es.json'),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (locales.includes(requested as Locale) ? requested : 'pt') as Locale;

  const messages = await messageLoaders[locale]()
    .then((m) => m.default)
    .catch(() => messageLoaders['pt']().then((m) => m.default));

  return { locale, messages };
});
