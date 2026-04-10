import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/config';

import en from '../assets/locales/en.json';
import km from '../assets/locales/km.json';

const LANGUAGE_KEY = 'user-language';

const resources = {
  en: { translation: en },
  km: { translation: km },
};

const SUPPORTED_LOCALES = ['en', 'km'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DYNAMIC_TRANSLATIONS_KEY = 'dynamic-translations';
const DYNAMIC_TRANSLATIONS_ETAG_KEY = 'dynamic-translations-etag';
const getAuthServiceUrl = () => Config.authUrl.replace(/\/$/, '');

const normalizeLocale = (locale: string | null | undefined): SupportedLocale => {
  const base = (locale || '').toLowerCase().split('-')[0];
  return base === 'km' ? 'km' : 'en';
};

const getLocaleSyncOrder = (preferredLocale?: string): SupportedLocale[] => {
  const primary = normalizeLocale(preferredLocale);
  return [primary, ...SUPPORTED_LOCALES.filter((locale) => locale !== primary)];
};

const getLocalePayloadKey = (locale: SupportedLocale) => `${DYNAMIC_TRANSLATIONS_KEY}-${locale}`;
const getLocaleEtagKey = (locale: SupportedLocale) => `${DYNAMIC_TRANSLATIONS_ETAG_KEY}-${locale}`;

const buildNestedTranslations = (source: Record<string, unknown>): Record<string, unknown> => {
  const nested: Record<string, unknown> = {};

  const assignPath = (path: string, value: unknown) => {
    const parts = path.split('.');
    let current: Record<string, unknown> = nested;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const next = current[key];
      if (typeof next !== 'object' || next === null || Array.isArray(next)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = String(value);
  };

  const walk = (obj: Record<string, unknown>, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, fullKey);
      } else {
        assignPath(fullKey, value);
      }
    });
  };

  walk(source);
  return nested;
};

const applyLocaleTranslations = async (
  locale: SupportedLocale,
  data: Record<string, unknown>,
  options: { refreshActiveLanguage?: boolean } = {}
) => {
  const base = resources[locale].translation as Record<string, unknown>;
  const normalized = buildNestedTranslations(data);

  // Rebuild locale namespace to prevent stale overrides for removed keys.
  i18n.removeResourceBundle(locale, 'translation');
  i18n.addResourceBundle(locale, 'translation', base, true, true);
  if (Object.keys(normalized).length > 0) {
    i18n.addResourceBundle(locale, 'translation', normalized, true, true);
  }

  if (options.refreshActiveLanguage && normalizeLocale(i18n.resolvedLanguage || i18n.language) === locale) {
    await i18n.changeLanguage(locale);
  }
};

const syncLocaleTranslations = async (locale: SupportedLocale) => {
  const etagKey = getLocaleEtagKey(locale);
  const savedEtag = await AsyncStorage.getItem(etagKey);
  const headers: Record<string, string> = {};
  if (savedEtag) {
    headers['If-None-Match'] = savedEtag;
  }

  const response = await fetch(`${getAuthServiceUrl()}/auth/translations/mobile/${locale}`, { headers });
  if (response.status === 304) return;
  if (!response.ok) return;

  const payload = await response.json();
  const data = payload?.data && typeof payload.data === 'object'
    ? (payload.data as Record<string, unknown>)
    : {};

  await applyLocaleTranslations(locale, data, { refreshActiveLanguage: true });
  await AsyncStorage.setItem(getLocalePayloadKey(locale), JSON.stringify(data));

  const responseEtag = response.headers.get('etag');
  if (responseEtag) {
    await AsyncStorage.setItem(etagKey, responseEtag);
  } else {
    await AsyncStorage.removeItem(etagKey);
  }
};

/**
 * Fetch latest translations from API and store them locally
 */
export const syncTranslations = async (preferredLocale?: string) => {
  try {
    const [primaryLocale, ...secondaryLocales] = getLocaleSyncOrder(preferredLocale);
    await syncLocaleTranslations(primaryLocale);
    await Promise.all(secondaryLocales.map((locale) => syncLocaleTranslations(locale)));
  } catch (error) {
    console.log('OTA Sync failed', error);
  }
};

/**
 * Load persisted dynamic translations on startup
 */
const loadPersistedTranslations = async () => {
  try {
    for (const locale of SUPPORTED_LOCALES) {
      const saved = await AsyncStorage.getItem(getLocalePayloadKey(locale));
      if (saved) {
        const data = JSON.parse(saved);
        if (data && typeof data === 'object') {
          await applyLocaleTranslations(locale, data as Record<string, unknown>);
        }
      }
    }
  } catch (e) {
    console.log('Failed to load persisted translations', e);
  }
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      // Load any existing dynamic overrides first
      await loadPersistedTranslations();
      
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      const resolvedLanguage = savedLanguage
        ? normalizeLocale(savedLanguage)
        : normalizeLocale(Localization.getLocales()[0].languageCode);

      callback(resolvedLanguage);

      // Always trigger background sync so admin OTA translation updates can propagate.
      void syncTranslations(resolvedLanguage);
    } catch (error) {
      console.log('Error reading language', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, normalizeLocale(language));
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
