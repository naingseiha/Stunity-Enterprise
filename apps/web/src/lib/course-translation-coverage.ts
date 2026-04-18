export type SupportedLocaleKey = 'en' | 'km';
export type LocalizedTextMap = Partial<Record<SupportedLocaleKey, string>>;

export type TranslationCoverageField = {
  baseValue?: unknown;
  translations?: LocalizedTextMap | null;
  required?: boolean;
};

const getTrimmedText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const hasAnyLocalizedValue = (
  baseValue?: unknown,
  translations?: LocalizedTextMap | null
) => {
  const base = getTrimmedText(baseValue);
  if (base) return true;

  if (!translations) return false;
  return Object.values(translations).some((value) => getTrimmedText(value).length > 0);
};

export const isLocaleCovered = (
  field: TranslationCoverageField,
  locale: SupportedLocaleKey,
  sourceLocale: SupportedLocaleKey
) => {
  if (field.required === false && !hasAnyLocalizedValue(field.baseValue, field.translations)) {
    return true;
  }

  if (locale === sourceLocale) {
    return hasAnyLocalizedValue(field.baseValue, field.translations);
  }

  return getTrimmedText(field.translations?.[locale]).length > 0;
};

export const summarizeLocaleCoverage = (
  fields: TranslationCoverageField[],
  locale: SupportedLocaleKey,
  sourceLocale: SupportedLocaleKey
) => {
  const relevantFields = fields.filter((field) => field.required !== false || hasAnyLocalizedValue(field.baseValue, field.translations));
  const total = relevantFields.length;
  const completed = relevantFields.filter((field) => isLocaleCovered(field, locale, sourceLocale)).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 100;

  return {
    completed,
    total,
    percent,
    isComplete: completed >= total,
  };
};

export const getCoverageTone = (percent: number) => {
  if (percent >= 100) {
    return {
      badge: 'border-emerald-300 bg-emerald-50 text-emerald-700',
      text: 'text-emerald-600',
    };
  }

  if (percent >= 60) {
    return {
      badge: 'border-amber-300 bg-amber-50 text-amber-700',
      text: 'text-amber-600',
    };
  }

  return {
    badge: 'border-rose-300 bg-rose-50 text-rose-700',
    text: 'text-rose-600',
  };
};
