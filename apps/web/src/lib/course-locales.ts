export type CourseLocale = string;

export type CourseLanguageOption = {
  key: CourseLocale;
  label: string;
  help?: string;
};

const COURSE_LOCALE_ALIASES: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  km: 'km',
  kh: 'km',
  'km-kh': 'km',
  'kh-kh': 'km',
};

const COURSE_LOCALE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

const FALLBACK_LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  km: 'Khmer',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
};

export const COMMON_COURSE_LANGUAGE_OPTIONS: CourseLanguageOption[] = [
  { key: 'en', label: 'English', help: 'Default for international learners' },
  { key: 'km', label: 'Khmer', help: 'Localized for Cambodian learners' },
  { key: 'es', label: 'Spanish', help: 'Useful for LATAM and global Spanish learners' },
  { key: 'fr', label: 'French', help: 'Useful for Francophone regions' },
  { key: 'de', label: 'German', help: 'Common for DACH learners' },
  { key: 'pt-br', label: 'Portuguese (Brazil)', help: 'Strong fit for Brazilian learners' },
  { key: 'zh', label: 'Chinese', help: 'Supports broad Chinese-language reach' },
  { key: 'ja', label: 'Japanese', help: 'Strong for Japan-focused cohorts' },
  { key: 'ko', label: 'Korean', help: 'Strong for Korea-focused cohorts' },
  { key: 'th', label: 'Thai', help: 'Helpful for Thailand-based programs' },
  { key: 'vi', label: 'Vietnamese', help: 'Helpful for Vietnam-based programs' },
  { key: 'ar', label: 'Arabic', help: 'Useful for MENA learners' },
];

export const normalizeCourseLocale = (value: unknown, fallback = 'en') => {
  const normalized = String(value || '').trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return fallback;
  return COURSE_LOCALE_ALIASES[normalized] || normalized;
};

export const isValidCourseLocale = (value: unknown) => {
  const normalized = normalizeCourseLocale(value, '');
  return Boolean(normalized) && COURSE_LOCALE_PATTERN.test(normalized);
};

export const normalizeCourseLocaleList = (values: unknown, sourceLocale = 'en') => {
  const normalizedSource = normalizeCourseLocale(sourceLocale);
  const list = Array.isArray(values)
    ? values
    : typeof values === 'string'
      ? values.split(',')
      : [];

  const normalized = Array.from(new Set(
    list
      .map((value) => normalizeCourseLocale(value))
      .filter((locale) => isValidCourseLocale(locale))
  ));

  if (!normalized.includes(normalizedSource)) {
    normalized.unshift(normalizedSource);
  }

  return normalized.length > 0 ? normalized : [normalizedSource];
};

export const getCourseLanguageLabel = (locale: string, displayLocale = 'en') => {
  const normalized = normalizeCourseLocale(locale);
  const optionLabel = COMMON_COURSE_LANGUAGE_OPTIONS.find((option) => option.key === normalized)?.label;
  if (optionLabel) return optionLabel;

  const baseLanguage = normalized.split('-')[0];
  const fallback = FALLBACK_LANGUAGE_LABELS[normalized] || FALLBACK_LANGUAGE_LABELS[baseLanguage];
  if (fallback) {
    return normalized === baseLanguage ? fallback : `${fallback} (${normalized.toUpperCase()})`;
  }

  try {
    const displayName = new Intl.DisplayNames([displayLocale], { type: 'language' }).of(baseLanguage);
    if (displayName) {
      return normalized === baseLanguage ? displayName : `${displayName} (${normalized.toUpperCase()})`;
    }
  } catch {
    // Ignore Intl.DisplayNames availability issues and fall back to locale code.
  }

  return normalized.toUpperCase();
};
