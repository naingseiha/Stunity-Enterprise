import { getRequestConfig } from 'next-intl/server';

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

  // Try to load remote overrides (OTA)
  let remoteMessages = {};
  try {
    const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/translations/web/${locale}`, {
      next: { revalidate: 60 } // Revalidate frequently so admin OTA edits appear quickly
    });
    if (response.ok) {
      const { data } = await response.json();
      remoteMessages = data || {};
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch OTA translations:', error);
  }

  // Merge: Remote (DB) values override local defaults
  // Note: remoteMessages is expected to be a flat key-value object (e.g. "common.login": "...")
  // We need to unflatten it or just trust that next-intl handles flat keys if appropriately formatted.
  // Actually, next-intl expects a nested object, so we'll unflatten.
  
  const merged = { ...localMessages };
  Object.entries(remoteMessages).forEach(([key, value]) => {
    const parts = key.split('.');
    let current: any = merged;
    for (let i = 0; i < parts.length - 1; i++) {
       if (!current[parts[i]]) current[parts[i]] = {};
       current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  });

  return {
    locale,
    messages: merged,
  };
});
