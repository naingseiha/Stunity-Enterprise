import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'km'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request
  let locale = await requestLocale;
  
  // Validate locale or use default
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en'; // Default locale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
