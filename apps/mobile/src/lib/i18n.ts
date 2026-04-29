import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { Config } from '@/config';

import en from '../assets/locales/en.json';
import km from '../assets/locales/km.json';

const LANGUAGE_KEY = 'user-language';

const resources = {
  en: { translation: en },
  km: { translation: km },
};

const BUILT_IN_LOCALES = ['en', 'km'] as const;
type BuiltInLocale = (typeof BUILT_IN_LOCALES)[number];
type RuntimeLocale = string;

const DYNAMIC_TRANSLATIONS_KEY = 'dynamic-translations';
const DYNAMIC_TRANSLATIONS_ETAG_KEY = 'dynamic-translations-etag';
const DYNAMIC_TRANSLATION_LOCALES_KEY = 'dynamic-translation-locales';
const FOREGROUND_TRANSLATION_SYNC_INTERVAL_MS = 60 * 1000;
let lastForegroundTranslationSyncAt = 0;
const getAuthServiceUrl = () => Config.authUrl.replace(/\/$/, '');

const normalizeLocale = (locale: string | null | undefined): RuntimeLocale => {
  const raw = (locale || '').trim();
  if (!raw) return 'en';

  const normalized = raw.replace('_', '-');
  const [language, region] = normalized.split('-');
  const languageCode = language.toLowerCase();

  if (languageCode === 'kh' || normalized.toLowerCase() === 'km-kh') return 'km';
  if (!/^[a-z]{2,3}$/.test(languageCode)) return 'en';

  return region && /^[a-z]{2}$/i.test(region)
    ? `${languageCode}-${region.toUpperCase()}`
    : languageCode;
};

const getLocaleSyncOrder = (preferredLocale?: string): RuntimeLocale[] => {
  const primary = normalizeLocale(preferredLocale);
  return Array.from(new Set([primary, ...BUILT_IN_LOCALES]));
};

export interface AvailableTranslationLocale {
  locale: string;
  label: string;
  nativeLabel: string;
  count: number;
}

const getLocalePayloadKey = (locale: RuntimeLocale) => `${DYNAMIC_TRANSLATIONS_KEY}-${locale}`;
const getLocaleEtagKey = (locale: RuntimeLocale) => `${DYNAMIC_TRANSLATIONS_ETAG_KEY}-${locale}`;

const getBaseLocale = (locale: RuntimeLocale): BuiltInLocale => (
  normalizeLocale(locale).startsWith('km') ? 'km' : 'en'
);

const getStoredDynamicLocales = async (): Promise<RuntimeLocale[]> => {
  const saved = await AsyncStorage.getItem(DYNAMIC_TRANSLATION_LOCALES_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((locale) => normalizeLocale(String(locale))).filter(Boolean);
  } catch {
    return [];
  }
};

const rememberDynamicLocale = async (locale: RuntimeLocale) => {
  const normalized = normalizeLocale(locale);
  const locales = Array.from(new Set([...(await getStoredDynamicLocales()), normalized]));
  await AsyncStorage.setItem(DYNAMIC_TRANSLATION_LOCALES_KEY, JSON.stringify(locales));
};

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
  locale: RuntimeLocale,
  data: Record<string, unknown>,
  options: { refreshActiveLanguage?: boolean } = {}
) => {
  const normalizedLocale = normalizeLocale(locale);
  const baseLocale = getBaseLocale(normalizedLocale);
  const base = resources[baseLocale].translation as Record<string, unknown>;
  const normalized = buildNestedTranslations(data);

  // Rebuild locale namespace to prevent stale overrides for removed keys.
  i18n.removeResourceBundle(normalizedLocale, 'translation');
  i18n.addResourceBundle(normalizedLocale, 'translation', base, true, true);
  if (Object.keys(normalized).length > 0) {
    i18n.addResourceBundle(normalizedLocale, 'translation', normalized, true, true);
  }

  if (options.refreshActiveLanguage && normalizeLocale(i18n.resolvedLanguage || i18n.language) === normalizedLocale) {
    await i18n.changeLanguage(normalizedLocale);
  }
};

const syncLocaleTranslations = async (locale: RuntimeLocale) => {
  const normalizedLocale = normalizeLocale(locale);
  const etagKey = getLocaleEtagKey(normalizedLocale);
  const savedEtag = await AsyncStorage.getItem(etagKey);
  const headers: Record<string, string> = {};
  if (savedEtag) {
    headers['If-None-Match'] = savedEtag;
  }

  const response = await fetch(`${getAuthServiceUrl()}/auth/translations/mobile/${normalizedLocale}`, { headers });
  if (response.status === 304) {
    const saved = await AsyncStorage.getItem(getLocalePayloadKey(normalizedLocale));
    if (saved) {
      const data = JSON.parse(saved);
      if (data && typeof data === 'object') {
        await applyLocaleTranslations(normalizedLocale, data as Record<string, unknown>, { refreshActiveLanguage: true });
      }
    }
    await rememberDynamicLocale(normalizedLocale);
    return;
  }
  if (!response.ok) return;

  const payload = await response.json();
  const data = payload?.data && typeof payload.data === 'object'
    ? (payload.data as Record<string, unknown>)
    : {};

  await applyLocaleTranslations(normalizedLocale, data, { refreshActiveLanguage: true });
  await AsyncStorage.setItem(getLocalePayloadKey(normalizedLocale), JSON.stringify(data));
  await rememberDynamicLocale(normalizedLocale);

  const responseEtag = response.headers.get('etag');
  if (responseEtag) {
    await AsyncStorage.setItem(getLocaleEtagKey(normalizedLocale), responseEtag);
  } else {
    await AsyncStorage.removeItem(getLocaleEtagKey(normalizedLocale));
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

export const getAvailableTranslationLocales = async (): Promise<AvailableTranslationLocale[]> => {
  try {
    const response = await fetch(`${getAuthServiceUrl()}/auth/translations/locales/mobile`);
    if (!response.ok) throw new Error('Failed to fetch available locales');
    const payload = await response.json();
    const remoteLocales = Array.isArray(payload?.data) ? payload.data : [];
    const normalized = remoteLocales
      .map((item: any) => ({
        locale: normalizeLocale(item.locale),
        label: String(item.label || item.locale || ''),
        nativeLabel: String(item.nativeLabel || item.label || item.locale || ''),
        count: Number(item.count || 0),
      }))
      .filter((item: AvailableTranslationLocale) => item.locale);

    const byLocale = new Map<string, AvailableTranslationLocale>();
    [
      { locale: 'en', label: 'English', nativeLabel: 'English', count: 0 },
      { locale: 'km', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ', count: 0 },
      ...normalized,
    ].forEach((item) => byLocale.set(item.locale, item));

    return Array.from(byLocale.values());
  } catch (error) {
    console.log('Failed to load available translation locales', error);
    return [
      { locale: 'en', label: 'English', nativeLabel: 'English', count: 0 },
      { locale: 'km', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ', count: 0 },
    ];
  }
};

/**
 * Load persisted dynamic translations on startup
 */
const loadPersistedTranslations = async () => {
  try {
    const locales = Array.from(new Set([...BUILT_IN_LOCALES, ...(await getStoredDynamicLocales())]));
    for (const locale of locales) {
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

AppState.addEventListener('change', (nextState) => {
  if (nextState !== 'active') return;

  const now = Date.now();
  if (now - lastForegroundTranslationSyncAt < FOREGROUND_TRANSLATION_SYNC_INTERVAL_MS) return;

  lastForegroundTranslationSyncAt = now;
  void syncTranslations(i18n.resolvedLanguage || i18n.language || 'en');
});

export default i18n;
