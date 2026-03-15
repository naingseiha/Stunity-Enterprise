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

  // Load local messages
  const localMessages = (await import(`../messages/${locale}.json`)).default;

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
