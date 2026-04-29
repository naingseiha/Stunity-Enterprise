'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Languages,
  Plus,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';
import { getCoverageTone, summarizeLocaleCoverage } from '@/lib/course-translation-coverage';
import {
  COMMON_COURSE_LANGUAGE_OPTIONS,
  getCourseLanguageLabel,
  isValidCourseLocale,
  normalizeCourseLocale,
  normalizeCourseLocaleList,
} from '@/lib/course-locales';

type SupportedLocaleKey = string;
type LocalizedTextMap = Partial<Record<string, string>>;

type CourseFormState = {
  title: string;
  description: string;
  titleTranslations: LocalizedTextMap;
  descriptionTranslations: LocalizedTextMap;
  sourceLocale: SupportedLocaleKey;
  supportedLocales: SupportedLocaleKey[];
  category: string;
  level: string;
  thumbnail: string;
  tags: string[];
  price: number;
  isFree: boolean;
};

const CATEGORIES = [
  'Programming',
  'Data Science',
  'Machine Learning',
  'Mobile Development',
  'Web Development',
  'Mathematics',
  'Science',
  'Design',
  'Business',
  'Marketing',
  'Languages',
  'Personal Development',
  'Health & Fitness',
  'Technology',
  'Other',
];

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
  { value: 'ALL_LEVELS', label: 'All Levels' },
];
const LANGUAGE_OPTIONS: Array<{ key: SupportedLocaleKey; label: string }> = COMMON_COURSE_LANGUAGE_OPTIONS;

const getTrimmedText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeTranslationMap = (translations?: unknown): LocalizedTextMap | undefined => {
  if (!translations || typeof translations !== 'object') return undefined;

  const map = translations as Record<string, unknown>;
  const normalized: LocalizedTextMap = {};

  for (const [localeKey, rawValue] of Object.entries(map)) {
    const normalizedLocaleKey = normalizeCourseLocale(localeKey);
    if (!isValidCourseLocale(normalizedLocaleKey)) continue;
    if (typeof rawValue === 'string' && rawValue.trim()) {
      normalized[normalizedLocaleKey] = rawValue.trim();
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const resolveLocalizedField = (
  baseValue: unknown,
  translations?: LocalizedTextMap | null
): { value: string; translations?: LocalizedTextMap } => {
  const base = getTrimmedText(baseValue);
  const normalizedTranslations = normalizeTranslationMap(translations);
  const fallback = base || normalizedTranslations?.en || normalizedTranslations?.km || Object.values(normalizedTranslations || {})[0] || '';

  if (!normalizedTranslations) return { value: fallback };
  return { value: fallback, translations: normalizedTranslations };
};

const EMPTY_FORM: CourseFormState = {
  title: '',
  description: '',
  titleTranslations: {},
  descriptionTranslations: {},
  sourceLocale: 'en',
  supportedLocales: ['en'],
  category: '',
  level: 'BEGINNER',
  thumbnail: '',
  tags: [],
  price: 0,
  isFree: true,
};

const serializeFormState = (form: CourseFormState) => JSON.stringify({
  title: form.title,
  description: form.description,
  titleTranslations: normalizeTranslationMap(form.titleTranslations) || {},
  descriptionTranslations: normalizeTranslationMap(form.descriptionTranslations) || {},
  sourceLocale: form.sourceLocale,
  supportedLocales: form.supportedLocales,
  category: form.category,
  level: form.level,
  thumbnail: form.thumbnail,
  tags: form.tags.map((tag) => tag.trim()).filter(Boolean),
  price: Number(form.price),
  isFree: Boolean(form.isFree),
});

export default function EditCourseDetailsPage() {
    const autoT = useTranslations();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const locale = (params?.locale as string) || 'en';
  const courseId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [courseTitlePreview, setCourseTitlePreview] = useState('');
  const [form, setForm] = useState<CourseFormState>(EMPTY_FORM);
  const [customCourseLocale, setCustomCourseLocale] = useState('');
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [hasLoadedForm, setHasLoadedForm] = useState(false);
  const currentSnapshot = useMemo(() => serializeFormState(form), [form]);
  const courseTranslationCoverage = useMemo(() => (
    form.supportedLocales.map((localeKey) => ({
      locale: localeKey,
      label: getCourseLanguageLabel(localeKey),
      ...summarizeLocaleCoverage([
        { baseValue: form.title, translations: form.titleTranslations },
        { baseValue: form.description, translations: form.descriptionTranslations },
      ], localeKey, form.sourceLocale),
    }))
  ), [form.description, form.descriptionTranslations, form.sourceLocale, form.supportedLocales, form.title, form.titleTranslations]);
  const availableCourseLanguageOptions = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...LANGUAGE_OPTIONS,
      ...form.supportedLocales.map((localeKey) => ({ key: localeKey, label: getCourseLanguageLabel(localeKey) })),
    ].filter((option) => {
      const normalizedLocale = normalizeCourseLocale(option.key);
      if (seen.has(normalizedLocale)) return false;
      seen.add(normalizedLocale);
      return true;
    });
  }, [form.supportedLocales]);
  const additionalSupportedLocales = useMemo(
    () => form.supportedLocales.filter((localeKey) => localeKey !== 'en' && localeKey !== 'km'),
    [form.supportedLocales]
  );

  const buildPayload = useCallback((source: 'manual' | 'auto') => {
    const localizedTitle = resolveLocalizedField(form.title, form.titleTranslations);
    const localizedDescription = resolveLocalizedField(form.description, form.descriptionTranslations);
    const normalizedCategory = form.category.trim();
    const normalizedPrice = Number(form.price);

    if (!localizedTitle.value || localizedTitle.value.length < 5) {
      if (source === 'manual') throw new Error('Title must be at least 5 characters');
      return null;
    }
    if (!localizedDescription.value || localizedDescription.value.length < 20) {
      if (source === 'manual') throw new Error('Description must be at least 20 characters');
      return null;
    }
    if (!normalizedCategory) {
      if (source === 'manual') throw new Error('Category is required');
      return null;
    }
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
      if (source === 'manual') throw new Error('Price must be a valid non-negative number');
      return null;
    }

    return {
      title: localizedTitle.value,
      description: localizedDescription.value,
      titleTranslations: localizedTitle.translations,
      descriptionTranslations: localizedDescription.translations,
      sourceLocale: form.sourceLocale,
      supportedLocales: normalizeCourseLocaleList(form.supportedLocales, form.sourceLocale),
      category: normalizedCategory,
      level: form.level,
      thumbnail: form.thumbnail.trim(),
      tags: form.tags.map((tag) => tag.trim()).filter(Boolean),
      price: normalizedPrice,
      isFree: form.isFree,
    };
  }, [form]);

  const persistCourse = useCallback(async (source: 'manual' | 'auto') => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return false;
    }

    const payload = buildPayload(source);
    if (!payload) {
      if (source === 'auto') {
        setAutoSaveState('dirty');
      }
      return false;
    }

    if (source === 'manual') {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);
    } else {
      setAutoSaving(true);
      setAutoSaveState('saving');
    }

    try {
      const response = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let body: any = {};
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = { message: rawText };
        }
      }

      if (!response.ok) {
        throw new Error(body?.message || 'Failed to update course');
      }

      setCourseTitlePreview(payload.title);
      setLastSavedSnapshot(serializeFormState({
        ...form,
        title: payload.title,
        description: payload.description,
        titleTranslations: payload.titleTranslations || {},
        descriptionTranslations: payload.descriptionTranslations || {},
        sourceLocale: payload.sourceLocale,
        supportedLocales: payload.supportedLocales,
        category: payload.category,
        level: payload.level,
        thumbnail: payload.thumbnail,
        tags: payload.tags,
        price: payload.price,
        isFree: payload.isFree,
      }));

      if (source === 'manual') {
        setSuccessMessage('Course details updated successfully');
      } else {
        setAutoSaveState('saved');
      }

      return true;
    } catch (error: any) {
      console.error('Error updating course:', error);
      if (source === 'manual') {
        setErrorMessage(error?.message || 'Failed to update course');
      } else {
        setAutoSaveState('error');
      }
      return false;
    } finally {
      if (source === 'manual') {
        setSaving(false);
      } else {
        setAutoSaving(false);
      }
    }
  }, [buildPayload, courseId, form, locale, router]);

  const fetchCourse = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      const response = await fetch(`${LEARN_SERVICE_URL}/courses/${courseId}?locale=${locale}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Unable to load course (${response.status})`);
      }

      const data = await response.json();
      const course = data?.course;
      if (!course) throw new Error('Course data not found');

      const titleTranslations = normalizeTranslationMap(course.titleTranslations) || {};
      const descriptionTranslations = normalizeTranslationMap(course.descriptionTranslations) || {};
      const localizedTitle = resolveLocalizedField(course.title, titleTranslations).value;
      const localizedDescription = resolveLocalizedField(course.description, descriptionTranslations).value;

      setCourseTitlePreview(localizedTitle);
      const nextForm: CourseFormState = {
        title: localizedTitle,
        description: localizedDescription,
        titleTranslations,
        descriptionTranslations,
        sourceLocale: normalizeCourseLocale(course.sourceLocale, 'en'),
        supportedLocales: Array.isArray(course.supportedLocales) && course.supportedLocales.length > 0
          ? normalizeCourseLocaleList(course.supportedLocales, normalizeCourseLocale(course.sourceLocale, 'en'))
          : [normalizeCourseLocale(course.sourceLocale, 'en')],
        category: String(course.category || ''),
        level: String(course.level || 'BEGINNER'),
        thumbnail: String(course.thumbnail || ''),
        tags: Array.isArray(course.tags) ? course.tags.map((tag: unknown) => String(tag)) : [],
        price: Number.isFinite(Number(course.price)) ? Number(course.price) : 0,
        isFree: Boolean(course.isFree),
      };

      setForm(nextForm);
      setLastSavedSnapshot(serializeFormState(nextForm));
      setHasLoadedForm(true);
      setAutoSaveState('idle');
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Error loading course details:', error);
      setErrorMessage(error?.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  }, [courseId, locale, router]);

  useEffect(() => {
    if (!courseId) return;
    fetchCourse();
  }, [courseId, fetchCourse]);

  const updateTranslationField = (
    field: 'titleTranslations' | 'descriptionTranslations',
    translationLocale: SupportedLocaleKey,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: {
        ...(previous[field] || {}),
        [translationLocale]: value,
      },
    }));
  };
  const updateSourceLocale = (nextLocale: SupportedLocaleKey) => {
    setForm((previous) => ({
      ...previous,
      sourceLocale: nextLocale,
      supportedLocales: normalizeCourseLocaleList(
        previous.supportedLocales.includes(nextLocale)
          ? previous.supportedLocales
          : [nextLocale, ...previous.supportedLocales],
        nextLocale
      ),
    }));
  };
  const toggleSupportedLocale = (nextLocale: SupportedLocaleKey) => {
    setForm((previous) => {
      if (nextLocale === previous.sourceLocale) {
        return previous;
      }

      return {
        ...previous,
        supportedLocales: normalizeCourseLocaleList(
          previous.supportedLocales.includes(nextLocale)
            ? previous.supportedLocales.filter((value) => value !== nextLocale)
            : [...previous.supportedLocales, nextLocale],
          previous.sourceLocale
        ),
      };
    });
  };
  const addCustomSupportedLocale = () => {
    const normalizedLocale = normalizeCourseLocale(customCourseLocale);
    if (!isValidCourseLocale(normalizedLocale)) return;

    setForm((previous) => ({
      ...previous,
      supportedLocales: normalizeCourseLocaleList(
        [...previous.supportedLocales, normalizedLocale],
        previous.sourceLocale
      ),
    }));
    setCustomCourseLocale('');
  };

  const addTag = () => {
    const normalizedTag = newTag.trim();
    if (!normalizedTag || form.tags.includes(normalizedTag)) return;

    setForm((previous) => ({
      ...previous,
      tags: [...previous.tags, normalizedTag],
    }));
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setForm((previous) => ({
      ...previous,
      tags: previous.tags.filter((currentTag) => currentTag !== tag),
    }));
  };

  const handleSave = async () => {
    await persistCourse('manual');
  };

  useEffect(() => {
    if (!hasLoadedForm || loading) return;
    if (currentSnapshot === lastSavedSnapshot) return;
    if (saving || autoSaving) return;

    setAutoSaveState('dirty');
    const timer = window.setTimeout(() => {
      void persistCourse('auto');
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [autoSaving, currentSnapshot, hasLoadedForm, lastSavedSnapshot, loading, persistCourse, saving]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (autoSaveState !== 'saved') return;
    const timer = window.setTimeout(() => setAutoSaveState('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [autoSaveState]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <FeedInlineLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-slate-800/20 border border-slate-800 rounded-3xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/instructor/courses`}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_75556f9d" /></span>
            <h1 className="text-xl font-bold text-white truncate max-w-xl">
              {courseTitlePreview || 'Edit Course'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {hasLoadedForm && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              autoSaveState === 'saving'
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                : autoSaveState === 'saved'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : autoSaveState === 'error'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : autoSaveState === 'dirty'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                      : 'border-slate-700 bg-slate-800/70 text-slate-300'
            }`}>
              {autoSaveState === 'saving' && 'Autosaving...'}
              {autoSaveState === 'saved' && 'Autosaved'}
              {autoSaveState === 'error' && 'Autosave failed'}
              {autoSaveState === 'dirty' && 'Unsaved changes'}
              {autoSaveState === 'idle' && 'Up to date'}
            </span>
          )}
          <Link
            href={`/${locale}/learn/course/${courseId}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-semibold transition-all"
          >
            <Eye className="w-4 h-4" />
            <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_a776295a" />
          </Link>
          <Link
            href={`/${locale}/instructor/course/${courseId}/curriculum`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-semibold transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_461e54d0" />
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || autoSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:hover:scale-100"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-200">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_f56727cf" /></h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_796e9806" /></label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={autoT("auto.web.course_id_edit_page.k_0ded4136")}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_45b027ed" /></label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
                placeholder={autoT("auto.web.course_id_edit_page.k_22004d55")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_3f004608" /></label>
                <select
                  value={form.category}
                  onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">{autoT("auto.web.course_id_edit_page.k_14362a29")}</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_d254c784" /></label>
                <select
                  value={form.level}
                  onChange={(event) => setForm((previous) => ({ ...previous, level: event.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_0ba79352" /></label>
              <input
                type="url"
                value={form.thumbnail}
                onChange={(event) => setForm((previous) => ({ ...previous, thumbnail: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder={autoT("auto.web.course_id_edit_page.k_b9e5e619")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_5c79d72f" /></label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(event) => {
                    const nextPrice = Number(event.target.value || 0);
                    setForm((previous) => ({
                      ...previous,
                      price: Number.isFinite(nextPrice) ? nextPrice : 0,
                    }));
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_89041d43" /></label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFree}
                    onChange={(event) => setForm((previous) => ({ ...previous, isFree: event.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-semibold"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_5c76d4e2" /></span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-sky-900/50 bg-sky-950/20 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Languages className="w-4 h-4 text-sky-400 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-white"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_697d64b2" /></h3>
                  <p className="mt-1 text-xs leading-6 text-slate-300">
                    <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_3345fe33" />
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableCourseLanguageOptions.map((languageOption) => (
                  <button
                    key={languageOption.key}
                    type="button"
                    onClick={() => updateSourceLocale(languageOption.key)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      form.sourceLocale === languageOption.key
                        ? 'border-sky-500 bg-slate-900 text-white'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-600'
                    }`}
                  >
                    <p className="text-sm font-semibold">{languageOption.label}</p>
                    <p className="mt-1 text-xs text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_31760052" /></p>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_dd96d7ac" /></label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableCourseLanguageOptions.map((languageOption) => {
                    const isActive = form.supportedLocales.includes(languageOption.key);
                    const isRequired = form.sourceLocale === languageOption.key;
                    return (
                      <button
                        key={languageOption.key}
                        type="button"
                        onClick={() => {
                          if (!isRequired) {
                            toggleSupportedLocale(languageOption.key);
                          }
                        }}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          isActive
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                        } ${isRequired ? 'cursor-default' : ''}`}
                      >
                        {languageOption.label}{isRequired ? ' • source' : ''}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={customCourseLocale}
                    onChange={(event) => setCustomCourseLocale(event.target.value)}
                    placeholder={autoT("auto.web.course_id_edit_page.k_006a6ce4")}
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={addCustomSupportedLocale}
                    className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-400/40 hover:bg-sky-500/20"
                  >
                    <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_5b3dedba" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_e249fc91" /></label>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {courseTranslationCoverage.map((coverage) => {
                    const tone = getCoverageTone(coverage.percent);
                    return (
                      <div key={coverage.locale} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{coverage.label}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {coverage.completed}/{coverage.total} <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_708f3713" />
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone.badge}`}>
                            {coverage.percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_79cf051c" /></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_6132103e" /></label>
                <input
                  type="text"
                  value={form.titleTranslations.en || ''}
                  onChange={(event) => updateTranslationField('titleTranslations', 'en', event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-sky-700/60 bg-sky-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_dc81762d" /></label>
                <input
                  type="text"
                  value={form.titleTranslations.km || ''}
                  onChange={(event) => updateTranslationField('titleTranslations', 'km', event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-700/60 bg-emerald-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            {additionalSupportedLocales.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {additionalSupportedLocales.map((localeKey) => (
                  <div key={`title-${localeKey}`} className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{getCourseLanguageLabel(localeKey)} <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_796e9806" /></label>
                    <input
                      type="text"
                      value={form.titleTranslations[localeKey] || ''}
                      onChange={(event) => updateTranslationField('titleTranslations', localeKey, event.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-violet-700/60 bg-violet-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_73314f78" /></label>
                <textarea
                  value={form.descriptionTranslations.en || ''}
                  onChange={(event) => updateTranslationField('descriptionTranslations', 'en', event.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-sky-700/60 bg-sky-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_a464a975" /></label>
                <textarea
                  value={form.descriptionTranslations.km || ''}
                  onChange={(event) => updateTranslationField('descriptionTranslations', 'km', event.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-700/60 bg-emerald-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>
            </div>
            {additionalSupportedLocales.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {additionalSupportedLocales.map((localeKey) => (
                  <div key={`description-${localeKey}`} className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{getCourseLanguageLabel(localeKey)} <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_45b027ed" /></label>
                    <textarea
                      value={form.descriptionTranslations[localeKey] || ''}
                      onChange={(event) => updateTranslationField('descriptionTranslations', localeKey, event.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-violet-700/60 bg-violet-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-white"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_4c755053" /></h2>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 text-amber-200 text-xs font-semibold"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {form.tags.length === 0 && (
                <p className="text-xs text-slate-400"><AutoI18nText i18nKey="auto.web.course_id_edit_page.k_8642194a" /></p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder={autoT("auto.web.course_id_edit_page.k_2960365b")}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
              <button
                onClick={addTag}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <AutoI18nText i18nKey="auto.web.course_id_edit_page.k_e8f914da" />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
