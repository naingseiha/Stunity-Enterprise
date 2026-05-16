import type { AbstractIntlMessages } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { applyFlatTranslationOverrides, getTranslationCacheTag } from './translation-merge';

const DEFAULT_LOCALE = 'en';
const DEFAULT_CONFIGURABLE_LOCALES = [
  'en',
  'km',
  'fr',
  'es',
  'zh',
  'th',
  'vi',
  'lo',
  'my',
  'id',
  'ms',
  'ja',
  'ko',
] as const;

const normalizeLocaleList = (value: string | undefined) => {
  const configured = value
    ?.split(',')
    .map((locale) => locale.trim())
    .filter(Boolean);

  const source = configured && configured.length > 0 ? configured : [...DEFAULT_CONFIGURABLE_LOCALES];
  return Array.from(new Set([DEFAULT_LOCALE, ...source]));
};

export const locales = normalizeLocaleList(process.env.NEXT_PUBLIC_SUPPORTED_LOCALES);
export type Locale = string;

async function loadLocalMessages(locale: string) {
  try {
    return (await import(`../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../messages/${DEFAULT_LOCALE}.json`)).default;
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request
  let locale = await requestLocale;
  
  // Validate locale or use default
  if (!locale || !locales.includes(locale)) {
    locale = DEFAULT_LOCALE;
  }

  // Load local messages
  const localMessages = await loadLocalMessages(locale);

  // Load remote overrides from Supabase (via auth service)
  let remoteMessages: Record<string, string> = {};
  try {
    const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/translations/web/${locale}`, {
      next: {
        revalidate: 60,
        tags: [getTranslationCacheTag('web', locale)],
      },
    });
    if (response.ok) {
      const { data } = await response.json();
      if (data && typeof data === 'object') {
        remoteMessages = data as Record<string, string>;
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch OTA translations:', error);
  }

  const messages = applyFlatTranslationOverrides(
    localMessages as Record<string, unknown>,
    remoteMessages
  ) as AbstractIntlMessages;

  return {
    locale,
    messages,
  };
});
