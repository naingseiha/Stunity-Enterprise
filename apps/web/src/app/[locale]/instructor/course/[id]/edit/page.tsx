'use client';

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

type SupportedLocaleKey = 'en' | 'km';
type LocalizedTextMap = Partial<Record<SupportedLocaleKey, string>>;

type CourseFormState = {
  title: string;
  description: string;
  titleTranslations: LocalizedTextMap;
  descriptionTranslations: LocalizedTextMap;
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

const getTrimmedText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const normalizeTranslationMap = (translations?: unknown): LocalizedTextMap | undefined => {
  if (!translations || typeof translations !== 'object') return undefined;

  const map = translations as Record<string, unknown>;
  const normalized: LocalizedTextMap = {};

  if (typeof map.en === 'string' && map.en.trim()) normalized.en = map.en.trim();
  if (typeof map.km === 'string' && map.km.trim()) normalized.km = map.km.trim();

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const resolveLocalizedField = (
  baseValue: unknown,
  translations?: LocalizedTextMap | null
): { value: string; translations?: LocalizedTextMap } => {
  const base = getTrimmedText(baseValue);
  const normalizedTranslations = normalizeTranslationMap(translations);
  const fallback = base || normalizedTranslations?.en || normalizedTranslations?.km || '';

  if (!normalizedTranslations) return { value: fallback };
  return { value: fallback, translations: normalizedTranslations };
};

const EMPTY_FORM: CourseFormState = {
  title: '',
  description: '',
  titleTranslations: {},
  descriptionTranslations: {},
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
  category: form.category,
  level: form.level,
  thumbnail: form.thumbnail,
  tags: form.tags.map((tag) => tag.trim()).filter(Boolean),
  price: Number(form.price),
  isFree: Boolean(form.isFree),
});

export default function EditCourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
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
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState('');
  const [hasLoadedForm, setHasLoadedForm] = useState(false);
  const currentSnapshot = useMemo(() => serializeFormState(form), [form]);

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
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Course Details</span>
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
            Preview
          </Link>
          <Link
            href={`/${locale}/instructor/course/${courseId}/curriculum`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-semibold transition-all"
          >
            <BookOpen className="w-4 h-4" />
            Curriculum
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
          <section className="bg-slate-900/45 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Core Details</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Course title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
                placeholder="Describe what students will learn"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Category</label>
                <select
                  value={form.category}
                  onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Level</label>
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
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Thumbnail URL</label>
              <input
                type="url"
                value={form.thumbnail}
                onChange={(event) => setForm((previous) => ({ ...previous, thumbnail: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Price (USD)</label>
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
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Access</label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFree}
                    onChange={(event) => setForm((previous) => ({ ...previous, isFree: event.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm font-semibold">Free course</span>
                </label>
              </div>
            </div>
          </section>

          <section className="bg-slate-900/45 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Localization</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">English Title</label>
                <input
                  type="text"
                  value={form.titleTranslations.en || ''}
                  onChange={(event) => updateTranslationField('titleTranslations', 'en', event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-sky-700/60 bg-sky-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Khmer Title</label>
                <input
                  type="text"
                  value={form.titleTranslations.km || ''}
                  onChange={(event) => updateTranslationField('titleTranslations', 'km', event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-700/60 bg-emerald-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">English Description</label>
                <textarea
                  value={form.descriptionTranslations.en || ''}
                  onChange={(event) => updateTranslationField('descriptionTranslations', 'en', event.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-sky-700/60 bg-sky-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Khmer Description</label>
                <textarea
                  value={form.descriptionTranslations.km || ''}
                  onChange={(event) => updateTranslationField('descriptionTranslations', 'km', event.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-700/60 bg-emerald-900/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-slate-900/45 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/15 text-amber-200 text-xs font-semibold"
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
                <p className="text-xs text-slate-400">No tags yet</p>
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
                placeholder="Add tag"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
              <button
                onClick={addTag}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-400 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
