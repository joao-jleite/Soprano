import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = (locales.includes(requested as Locale) ? requested : 'pt') as Locale;

  try {
    return {
      locale,
      messages: (await import(`@/messages/${locale}.json`)).default,
    };
  } catch {
    notFound();
  }
});
