export type LocalizedTextMap = Record<string, string>;

const LOCALE_ALIASES: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  km: 'km',
  kh: 'km',
  'km-kh': 'km',
  'kh-kh': 'km',
};

const normalizeLocaleKey = (value: string) => {
  const normalized = value.trim().toLowerCase().replace('_', '-');
  return LOCALE_ALIASES[normalized] || normalized;
};

export const getRequestedLocale = (input: unknown) => {
  if (typeof input !== 'string' || !input.trim()) return 'en';
  return normalizeLocaleKey(input);
};

export const parseLocalizedTextMap = (input: unknown): LocalizedTextMap | undefined => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;

  const entries = Object.entries(input as Record<string, unknown>)
    .map(([locale, value]) => [normalizeLocaleKey(locale), typeof value === 'string' ? value.trim() : ''] as const)
    .filter(([, value]) => value.length > 0);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
};

export const buildLocalizedTextInput = (
  baseValue: unknown,
  translationsInput: unknown,
  legacyTranslations: Record<string, unknown> = {}
) => {
  const translations = {
    ...(parseLocalizedTextMap(translationsInput) || {}),
    ...(parseLocalizedTextMap(legacyTranslations) || {}),
  };

  const normalizedBase = typeof baseValue === 'string' ? baseValue.trim() : '';
  const fallbackValue =
    normalizedBase
    || translations.en
    || translations.km
    || Object.values(translations)[0]
    || '';

  if (fallbackValue && !translations.en) {
    translations.en = fallbackValue;
  }

  return {
    value: fallbackValue,
    translations: Object.keys(translations).length > 0 ? translations : undefined,
  };
};

export const resolveLocalizedText = (
  baseValue: unknown,
  translationsInput: unknown,
  localeInput: unknown
) => {
  const locale = getRequestedLocale(localeInput);
  const translations = parseLocalizedTextMap(translationsInput);
  const normalizedBase = typeof baseValue === 'string' ? baseValue : '';

  if (!translations) return normalizedBase;

  return (
    translations[locale]
    || (locale.includes('-') ? translations[locale.split('-')[0]] : undefined)
    || translations.en
    || translations.km
    || normalizedBase
    || Object.values(translations)[0]
    || ''
  );
};
