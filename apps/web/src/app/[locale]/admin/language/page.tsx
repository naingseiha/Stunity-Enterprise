'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Globe,
  Save,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Layout,
  Layers,
  FileCode,
  Filter,
  PlusCircle,
} from 'lucide-react';
import { translationApi, type Translation } from '@/lib/api/translations';
import { TokenManager } from '@/lib/api/auth';
import { useParams, usePathname, useRouter } from 'next/navigation';
import AnimatedContent from '@/components/AnimatedContent';

import { useTranslations } from 'next-intl';
type AppFilter = 'all' | 'web' | 'mobile' | 'global';
type LocaleFilter = string;
type ValueStatusFilter = 'all' | 'empty' | 'filled' | 'edited';
type KeyKindFilter = 'all' | 'manual' | 'generated';

interface TranslationWithMeta extends Translation {
  namespace: string;
  screen: string;
}

interface PendingUpdate {
  id: string;
  app: string;
  locale: string;
  key: string;
  value: string;
}

const APP_FILTERS = [
  { value: 'all' as const, labelKey: 'allApps', icon: Layers },
  { value: 'web' as const, labelKey: 'web', icon: Layout },
  { value: 'mobile' as const, labelKey: 'mobile', icon: Smartphone },
  { value: 'global' as const, labelKey: 'global', icon: Globe },
];

const APP_BADGE_STYLES: Record<string, string> = {
  web: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200',
  mobile: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200',
  global: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
};

const LOCALE_BADGE_STYLES: Record<string, string> = {
  en: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200',
  km: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200',
};

const LOCALE_CODE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const GROUP_PAGE_SIZE = 12;

const getNamespace = (key: string): string => key.split('.')[0] || 'misc';

const getScreen = (key: string): string => {
  const parts = key.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0] || 'misc';
};

const getLocaleLabel = (locale: string) => {
  try {
    const [language] = locale.split('-');
    const displayName = new Intl.DisplayNames(['en'], { type: 'language' }).of(language);
    return displayName ? `${displayName} (${locale})` : locale;
  } catch {
    return locale;
  }
};

const normalizeLocaleInput = (value: string) => {
  const [language, region] = value.trim().replace('_', '-').split('-');
  if (!language) return '';
  return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase();
};

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'sky' | 'emerald' | 'violet' | 'amber';
}) {
  const tones = {
    sky: 'border-sky-200 bg-white shadow-sky-100/40 dark:border-sky-500/20 dark:bg-gray-900 dark:shadow-black/20',
    emerald:
      'border-emerald-200 bg-white shadow-emerald-100/40 dark:border-emerald-500/20 dark:bg-gray-900 dark:shadow-black/20',
    violet:
      'border-violet-200 bg-white shadow-violet-100/40 dark:border-violet-500/20 dark:bg-gray-900 dark:shadow-black/20',
    amber:
      'border-amber-200 bg-white shadow-amber-100/40 dark:border-amber-500/20 dark:bg-gray-900 dark:shadow-black/20',
  };

  return (
    <div
      className={`rounded-[1rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.26)] ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-600 dark:text-gray-400">{helper}</p>
    </div>
  );
}

export default function LanguageManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('languageAdmin');
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'en';
  const isSuperAdminRoute = pathname.includes('/super-admin/language');
  const isKhmerLocale = locale.toLowerCase().startsWith('km');
  const heroTitleClassName = isKhmerLocale
    ? 'mt-3 max-w-3xl text-[1.85rem] font-black leading-[1.35] tracking-normal text-slate-950 dark:text-white sm:text-[2.1rem] lg:text-[2.3rem]'
    : 'mt-3 max-w-3xl text-3xl font-black leading-tight tracking-normal text-slate-950 dark:text-white sm:text-[2.35rem]';

  const [isMounted, setIsMounted] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('all');
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [screenFilter, setScreenFilter] = useState('all');
  const [valueStatusFilter, setValueStatusFilter] = useState<ValueStatusFilter>('all');
  const [keyKindFilter, setKeyKindFilter] = useState<KeyKindFilter>('all');
  const [visibleGroupLimit, setVisibleGroupLimit] = useState(GROUP_PAGE_SIZE);
  const [newLocale, setNewLocale] = useState('');
  const [newLocaleApp, setNewLocaleApp] = useState<'web' | 'mobile' | 'global'>('web');
  const [newLocaleSource, setNewLocaleSource] = useState('en');

  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    setLoading(true);
    try {
      const response = await translationApi.getAll();
      const data = response.data || [];
      setTranslations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load translations:', error);
      setStatus({ type: 'error', message: t('failedConnect') });
    } finally {
      setLoading(false);
      if (refresh) setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    setIsMounted(true);

    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    const hasLanguageAccess = Boolean(
      userData?.user?.isSuperAdmin ||
      userData?.user?.role === 'SUPER_ADMIN'
    );

    if (!hasLanguageAccess) {
      router.push(`/${locale}/feed`);
      return;
    }

    if (!isSuperAdminRoute) {
      router.replace(`/${locale}/super-admin/language`);
      return;
    }

    void loadData();
  }, [isSuperAdminRoute, loadData, locale, router]);

  const translationsWithMeta = useMemo<TranslationWithMeta[]>(
    () => translations.map((t) => ({ ...t, namespace: getNamespace(t.key), screen: getScreen(t.key) })),
    [translations]
  );

  const localeOptions = useMemo(
    () => Array.from(new Set(translations.map((t) => t.locale))).sort((a, b) => a.localeCompare(b)),
    [translations]
  );

  const visibleLocaleCount = useMemo(() => {
    if (localeFilter !== 'all') return 1;
    return new Set(
      translations
        .filter((item) => appFilter === 'all' || item.app === appFilter)
        .map((t) => t.locale)
    ).size;
  }, [appFilter, localeFilter, translations]);

  const sourceLocaleOptions = useMemo(() => {
    const locales = translations
      .filter((item) => item.app === newLocaleApp)
      .map((item) => item.locale);
    return Array.from(new Set(locales)).sort((a, b) => a.localeCompare(b));
  }, [newLocaleApp, translations]);

  useEffect(() => {
    if (sourceLocaleOptions.length > 0 && !sourceLocaleOptions.includes(newLocaleSource)) {
      setNewLocaleSource(sourceLocaleOptions[0]);
    }
  }, [newLocaleSource, sourceLocaleOptions]);

  const scopedTranslations = useMemo(
    () => translationsWithMeta.filter((t) => {
      const matchesApp = appFilter === 'all' || t.app === appFilter;
      const matchesLocale = localeFilter === 'all' || t.locale === localeFilter;
      return matchesApp && matchesLocale;
    }),
    [appFilter, localeFilter, translationsWithMeta]
  );

  const namespaceOptions = useMemo(
    () => Array.from(new Set(scopedTranslations.map((t) => t.namespace))).sort((a, b) => a.localeCompare(b)),
    [scopedTranslations]
  );

  const namespaceScopedTranslations = useMemo(
    () => scopedTranslations.filter((t) => namespaceFilter === 'all' || t.namespace === namespaceFilter),
    [namespaceFilter, scopedTranslations]
  );

  const screenOptions = useMemo(
    () => Array.from(new Set(namespaceScopedTranslations.map((t) => t.screen))).sort((a, b) => a.localeCompare(b)),
    [namespaceScopedTranslations]
  );

  useEffect(() => {
    if (namespaceFilter !== 'all' && !namespaceOptions.includes(namespaceFilter)) {
      setNamespaceFilter('all');
    }
  }, [namespaceFilter, namespaceOptions]);

  useEffect(() => {
    if (screenFilter !== 'all' && !screenOptions.includes(screenFilter)) {
      setScreenFilter('all');
    }
  }, [screenFilter, screenOptions]);

  const filteredTranslations = useMemo(
    () => translationsWithMeta
      .filter((t) => {
        const query = searchQuery.trim().toLowerCase();
        const currentValue = editedValues[t.id] ?? t.value;
        const isEdited = editedValues[t.id] !== undefined && editedValues[t.id] !== t.value;
        const isGeneratedKey = t.key.startsWith('auto.');
        const matchesSearch = query.length === 0
          || t.key.toLowerCase().includes(query)
          || currentValue.toLowerCase().includes(query)
          || t.screen.toLowerCase().includes(query)
          || t.namespace.toLowerCase().includes(query)
          || t.app.toLowerCase().includes(query)
          || t.locale.toLowerCase().includes(query);
        const matchesApp = appFilter === 'all' || t.app === appFilter;
        const matchesLocale = localeFilter === 'all' || t.locale === localeFilter;
        const matchesNamespace = namespaceFilter === 'all' || t.namespace === namespaceFilter;
        const matchesScreen = screenFilter === 'all' || t.screen === screenFilter;
        const matchesValueStatus = valueStatusFilter === 'all'
          || (valueStatusFilter === 'empty' && currentValue.trim().length === 0)
          || (valueStatusFilter === 'filled' && currentValue.trim().length > 0)
          || (valueStatusFilter === 'edited' && isEdited);
        const matchesKeyKind = keyKindFilter === 'all'
          || (keyKindFilter === 'generated' && isGeneratedKey)
          || (keyKindFilter === 'manual' && !isGeneratedKey);

        return matchesSearch
          && matchesApp
          && matchesLocale
          && matchesNamespace
          && matchesScreen
          && matchesValueStatus
          && matchesKeyKind;
      })
      .sort((a, b) => {
        const byScreen = a.screen.localeCompare(b.screen);
        if (byScreen !== 0) return byScreen;
        return a.key.localeCompare(b.key);
      }),
    [appFilter, editedValues, keyKindFilter, localeFilter, namespaceFilter, screenFilter, searchQuery, translationsWithMeta, valueStatusFilter]
  );

  const translationById = useMemo(
    () => new Map(translations.map((t) => [t.id, t])),
    [translations]
  );

  const pendingUpdates = useMemo<PendingUpdate[]>(() => Object.entries(editedValues).flatMap(([id, value]) => {
    const original = translationById.get(id);
    if (!original || value === original.value) return [];
    return [{
      id,
      app: original.app,
      locale: original.locale,
      key: original.key,
      value
    }];
  }), [editedValues, translationById]);

  const pendingUpdateById = useMemo(
    () => new Map(pendingUpdates.map((u) => [u.id, u])),
    [pendingUpdates]
  );

  const groupedTranslations = useMemo(() => {
    const groups = new Map<string, TranslationWithMeta[]>();
    filteredTranslations.forEach((translation) => {
      const bucket = groups.get(translation.screen) || [];
      bucket.push(translation);
      groups.set(translation.screen, bucket);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([screen, items]) => ({
        screen,
        namespace: items[0]?.namespace || 'misc',
        items: items.sort((a, b) => a.key.localeCompare(b.key))
      }));
  }, [filteredTranslations]);

  const visibleGroups = useMemo(
    () => groupedTranslations.slice(0, visibleGroupLimit),
    [groupedTranslations, visibleGroupLimit]
  );

  const hiddenGroupCount = Math.max(0, groupedTranslations.length - visibleGroups.length);

  useEffect(() => {
    setVisibleGroupLimit(GROUP_PAGE_SIZE);
  }, [appFilter, keyKindFilter, localeFilter, namespaceFilter, screenFilter, searchQuery, valueStatusFilter]);

  const applyUpdatesLocally = useCallback((updates: PendingUpdate[]) => {
    if (updates.length === 0) return;

    const updateMap = new Map(updates.map((u) => [u.id, u.value]));
    setTranslations((prev) => prev.map((item) => {
      const nextValue = updateMap.get(item.id);
      if (nextValue === undefined) return item;
      return { ...item, value: nextValue };
    }));

    setEditedValues((prev) => {
      const next = { ...prev };
      updates.forEach((u) => {
        delete next[u.id];
      });
      return next;
    });
  }, []);

  const handleValueChange = useCallback((id: string, value: string) => {
    setEditedValues((prev) => {
      const original = translationById.get(id)?.value;
      if (original !== undefined && value === original) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: value };
    });
  }, [translationById]);

  const handleSave = async (translation: Translation) => {
    const update = pendingUpdateById.get(translation.id);
    if (!update) return;

    setSaving(translation.id);
    try {
      await translationApi.update({
        app: update.app,
        locale: update.locale,
        key: update.key,
        value: update.value
      });
      applyUpdatesLocally([update]);
      setStatus({ type: 'success', message: t('savedKey', { key: update.key }) });
      setTimeout(() => setStatus(null), 2500);
    } catch (error) {
      console.error('Failed to save translation:', error);
      setStatus({ type: 'error', message: t('failedSave') });
    } finally {
      setSaving(null);
    }
  };

  const handleResetToDefault = async (translation: Translation) => {
    if (translation.defaultValue == null || translation.defaultValue === translation.value) return;

    const update: PendingUpdate = {
      id: translation.id,
      app: translation.app,
      locale: translation.locale,
      key: translation.key,
      value: translation.defaultValue,
    };

    setSaving(translation.id);
    try {
      await translationApi.update({
        app: update.app,
        locale: update.locale,
        key: update.key,
        value: update.value,
      });
      applyUpdatesLocally([update]);
      setStatus({ type: 'success', message: t('resetKey', { key: update.key }) });
      setTimeout(() => setStatus(null), 2500);
    } catch (error) {
      console.error('Failed to reset translation:', error);
      setStatus({ type: 'error', message: t('failedReset') });
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    if (pendingUpdates.length === 0) return;
    setSavingAll(true);
    try {
      await translationApi.bulkUpdate(
        pendingUpdates.map((u) => ({
          app: u.app,
          locale: u.locale,
          key: u.key,
          value: u.value
        }))
      );
      applyUpdatesLocally(pendingUpdates);
      setStatus({ type: 'success', message: t('savedUpdates', { count: pendingUpdates.length }) });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save all translations:', error);
      setStatus({ type: 'error', message: t('failedSaveAll') });
    } finally {
      setSavingAll(false);
    }
  };

  const syncFromJson = async () => {
    setLoading(true);
    setStatus({ type: 'success', message: t('syncingDefaults') });
    try {
      const result = await translationApi.sync();
      setStatus({
        type: 'success',
        message: t('syncedDefaults', {
          count: result.created ?? result.count,
          preserved: result.preserved ?? 0
        })
      });
      await loadData();
    } catch (error) {
      console.error('Sync error:', error);
      setStatus({ type: 'error', message: t('failedSync') });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const createLocaleFromSource = async () => {
    const targetLocale = normalizeLocaleInput(newLocale);
    if (!LOCALE_CODE_PATTERN.test(targetLocale)) {
      setStatus({ type: 'error', message: t('invalidLocaleCode') });
      return;
    }

    if (targetLocale === newLocaleSource) {
      setStatus({ type: 'error', message: t('targetMatchesSource') });
      return;
    }

    const sourceEntries = translations.filter(
      (item) => item.app === newLocaleApp && item.locale === newLocaleSource
    );

    if (sourceEntries.length === 0) {
      setStatus({ type: 'error', message: t('noSourceLocale') });
      return;
    }

    const existingTargetKeys = new Set(
      translations
        .filter((item) => item.app === newLocaleApp && item.locale === targetLocale)
        .map((item) => item.key)
    );

    const entriesToCreate = sourceEntries
      .filter((item) => !existingTargetKeys.has(item.key))
      .map((item) => ({
        app: newLocaleApp,
        locale: targetLocale,
        key: item.key,
        value: item.value,
      }));

    if (entriesToCreate.length === 0) {
      setStatus({ type: 'success', message: t('localeAlreadyReady', { locale: targetLocale }) });
      setLocaleFilter(targetLocale);
      return;
    }

    setSavingAll(true);
    try {
      await translationApi.bulkUpdate(entriesToCreate);
      setStatus({
        type: 'success',
        message: t('createdLocale', { locale: targetLocale, count: entriesToCreate.length }),
      });
      setNewLocale('');
      setLocaleFilter(targetLocale);
      setAppFilter(newLocaleApp);
      await loadData();
    } catch (error) {
      console.error('Failed to create locale:', error);
      setStatus({ type: 'error', message: t('failedCreateLocale') });
    } finally {
      setSavingAll(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setAppFilter('all');
    setLocaleFilter('all');
    setNamespaceFilter('all');
    setScreenFilter('all');
    setValueStatusFilter('all');
    setKeyKindFilter('all');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    appFilter !== 'all' ||
    localeFilter !== 'all' ||
    namespaceFilter !== 'all' ||
    screenFilter !== 'all' ||
    valueStatusFilter !== 'all' ||
    keyKindFilter !== 'all'
  );

  const populatedTranslations = translations.reduce((count, item) => (
    item.value.trim().length > 0 ? count + 1 : count
  ), 0);
  const readinessScore = translations.length > 0
    ? Math.round((populatedTranslations / translations.length) * 100)
    : 0;

  if (!isMounted || !isSuperAdminRoute) {
    return null;
  }

  return (
    <>
      <div className="-mx-4 -my-8 min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_46%,#f8fafc_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_52%,#020617_100%)] dark:text-gray-100 sm:-mx-6 lg:-mx-8">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_-52px_rgba(30,64,175,0.32)] dark:border-gray-800 dark:bg-gray-900 sm:p-7">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600">{t('eyebrow')}</p>
                  <h1 className={heroTitleClassName}>
                    {t('title')}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-600 dark:text-gray-300 sm:text-base">
                    {t('description')}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={syncFromJson}
                      disabled={loading || savingAll}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:text-white"
                    >
                      <FileCode className="h-4 w-4 text-blue-500" />
                      {t('syncDefaults')}
                    </button>
                    <button
                      onClick={handleSaveAll}
                      disabled={pendingUpdates.length === 0 || savingAll || loading}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <Save className="h-4 w-4" />
                      {savingAll
                        ? t('saving')
                        : pendingUpdates.length > 0
                          ? t('saveChangesCount', { count: pendingUpdates.length })
                          : t('saveChanges')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.9rem] border border-blue-200/70 bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,64,175,0.94)_52%,rgba(8,145,178,0.9))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(15,23,42,0.54)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-100/80">{t('localePulse')}</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-normal">{readinessScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-blue-100/75">{t('ready')}</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <Globe className="h-7 w-7 text-blue-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-sky-200 to-indigo-200"
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: t('groups'), value: groupedTranslations.length },
                    { label: t('locales'), value: visibleLocaleCount },
                    { label: t('pending'), value: pendingUpdates.length },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-normal text-white">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-blue-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50/90">
                  {pendingUpdates.length > 0 ? t('editsWaiting', { count: pendingUpdates.length }) : t('dictionaryInSync')}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={30}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={t('totalKeys')} value={translations.length} helper={t('totalKeysHelper')} tone="sky" />
              <MetricCard label={t('filtered')} value={filteredTranslations.length} helper={t('filteredHelper')} tone="emerald" />
              <MetricCard label={t('groups')} value={groupedTranslations.length} helper={t('groupsHelper')} tone="violet" />
              <MetricCard label={t('unsaved')} value={pendingUpdates.length} helper={t('unsavedHelper')} tone="amber" />
            </div>
          </AnimatedContent>

          {status ? (
            <AnimatedContent animation="slide-up" delay={40}>
              <div
                className={`mt-5 flex items-start gap-4 rounded-[1.35rem] px-5 py-4 shadow-sm ${
                  status.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100'
                    : 'border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-100'
                }`}
              >
                <div className={`rounded-xl p-2 ${status.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-rose-100 dark:bg-rose-900/60'}`}>
                  {status.type === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                  )}
                </div>
                <div className="flex-1 pt-0.5 text-sm font-medium">{status.message}</div>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent animation="slide-up" delay={60}>
            <section className="mt-5 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">{t('controls')}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-normal text-slate-950 dark:text-white">{t('workspace')}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-gray-400">
                    {t('workspaceDescription')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => loadData(true)}
                    disabled={isRefreshing || loading}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {t('refresh')}
                  </button>
                  <button
                    onClick={handleSaveAll}
                    disabled={pendingUpdates.length === 0 || savingAll || loading}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {savingAll ? t('saving') : t('saveAll')}
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-gray-100">
                    <Filter className="h-4 w-4 text-slate-500" />
                    {t('focusDictionary')}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-1.5">
                    {APP_FILTERS.map((item) => {
                      const Icon = item.icon;
                      const isActive = appFilter === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => setAppFilter(item.value)}
                          className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2 text-sm font-semibold transition ${
                            isActive
                              ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/70 dark:bg-gray-950 dark:text-white dark:ring-gray-700'
                              : 'text-slate-600 hover:text-slate-800 dark:text-gray-300 dark:hover:text-white'
                          }`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                          {t(item.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_160px_190px_220px]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t('searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-11 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>

                  <select
                    value={localeFilter}
                    onChange={(e) => setLocaleFilter(e.target.value as LocaleFilter)}
                    className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('allLocales')}</option>
                    {localeOptions.map((localeOption) => (
                      <option key={localeOption} value={localeOption}>
                        {getLocaleLabel(localeOption)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={namespaceFilter}
                    onChange={(e) => setNamespaceFilter(e.target.value)}
                    className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('allNamespaces')}</option>
                    {namespaceOptions.map((namespace) => (
                      <option key={namespace} value={namespace}>{namespace}</option>
                    ))}
                  </select>

                  <select
                    value={screenFilter}
                    onChange={(e) => setScreenFilter(e.target.value)}
                    className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('allScreens')}</option>
                    {screenOptions.map((screen) => (
                      <option key={screen} value={screen}>{screen}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_180px_minmax(0,1fr)]">
                  <select
                    value={valueStatusFilter}
                    onChange={(e) => setValueStatusFilter(e.target.value as ValueStatusFilter)}
                    className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('allStatuses')}</option>
                    <option value="empty">{t('emptyOnly')}</option>
                    <option value="filled">{t('filledOnly')}</option>
                    <option value="edited">{t('editedOnly')}</option>
                  </select>

                  <select
                    value={keyKindFilter}
                    onChange={(e) => setKeyKindFilter(e.target.value as KeyKindFilter)}
                    className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">{t('allKeyTypes')}</option>
                    <option value="manual">{t('manualKeys')}</option>
                    <option value="generated">{t('generatedKeys')}</option>
                  </select>

                  <div className="flex flex-wrap items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-2">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-gray-400">{t('quickFilters')}</span>
                    <button
                      type="button"
                      onClick={() => setValueStatusFilter('edited')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        valueStatusFilter === 'edited'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800'
                      }`}
                    >
                      {t('unsavedQuick', { count: pendingUpdates.length })}
                    </button>
                    <button
                      type="button"
                      onClick={() => setValueStatusFilter('empty')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        valueStatusFilter === 'empty'
                          ? 'bg-amber-500 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800'
                      }`}
                    >
                      {t('emptyQuick')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyKindFilter('generated')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        keyKindFilter === 'generated'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-800'
                      }`}
                    >
                      {t('generatedQuick')}
                    </button>
                  </div>
                </div>

                <div className="rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-gray-100">
                        <PlusCircle className="h-4 w-4 text-blue-500" />
                        {t('createLocale')}
                      </div>
                      <p className="mt-1 text-xs font-medium text-slate-600 dark:text-gray-400">{t('createLocaleDescription')}</p>
                    </div>

                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-gray-400">
                      {t('target')}
                      <select
                        value={newLocaleApp}
                        onChange={(e) => setNewLocaleApp(e.target.value as 'web' | 'mobile' | 'global')}
                        className="min-w-[130px] rounded-[0.85rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="web">{t('web')}</option>
                        <option value="mobile">{t('mobile')}</option>
                        <option value="global">{t('global')}</option>
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-gray-400">
                      {t('sourceLocale')}
                      <select
                        value={newLocaleSource}
                        onChange={(e) => setNewLocaleSource(e.target.value)}
                        className="min-w-[150px] rounded-[0.85rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      >
                        {sourceLocaleOptions.map((localeOption) => (
                          <option key={localeOption} value={localeOption}>
                            {getLocaleLabel(localeOption)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-gray-400">
                      {t('newLocale')}
                      <input
                        type="text"
                        value={newLocale}
                        onChange={(e) => setNewLocale(e.target.value.trim())}
                        placeholder={t('newLocalePlaceholder')}
                        className="min-w-[180px] rounded-[0.85rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-700 dark:text-gray-200 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>

                    <button
                      onClick={createLocaleFromSource}
                      disabled={savingAll || loading || sourceLocaleOptions.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-[0.85rem] bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <PlusCircle className="h-4 w-4" />
                      {t('create')}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-600 dark:text-gray-400">
                    {t.rich('showingKeys', {
                      keys: filteredTranslations.length,
                      groups: groupedTranslations.length,
                      strong: (chunks) => <span className="font-semibold text-slate-950 dark:text-white">{chunks}</span>
                    })}
                  </p>
                  <button
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="inline-flex items-center justify-center rounded-[0.85rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {t('clearFilters')}
                  </button>
                </div>

                {loading ? (
                  <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-6 py-20 text-center">
                    <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                    <p className="mt-4 text-sm font-medium text-slate-600 dark:text-gray-400">{t('loadingDictionary')}</p>
                  </div>
                ) : groupedTranslations.length === 0 ? (
                  <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-6 py-20 text-center">
                    <p className="text-lg font-black tracking-normal text-slate-950 dark:text-white">{t('noMatches')}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600 dark:text-gray-400">{t('noMatchesDescription')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleGroups.map((group) => (
                      <section
                        key={group.screen}
                        className="overflow-hidden rounded-[1.1rem] border border-slate-200 bg-slate-50 shadow-[0_20px_45px_-38px_rgba(15,23,42,0.3)] dark:border-gray-800 dark:bg-gray-950/40"
                      >
                        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-base font-black tracking-normal text-slate-950 dark:text-white">{group.screen}</h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-gray-400">
                              {t('namespaceLabel', { namespace: group.namespace })}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {t('keyCount', { count: group.items.length })}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-[1180px] w-full text-left">
                            <thead className="bg-white dark:bg-gray-900">
                              <tr>
                                {[
                                  { key: 'key', label: t('key') },
                                  { key: 'locale', label: t('locale') },
                                  { key: 'target', label: t('target') },
                                  { key: 'default', label: t('defaultValue') },
                                  { key: 'value', label: t('value') },
                                  { key: 'action', label: t('action') },
                                ].map(({ key, label }) => (
                                  <th
                                    key={key}
                                    className={`px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-gray-400 ${
                                      key === 'action' ? 'text-right' : ''
                                    }`}
                                  >
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white dark:divide-gray-800 dark:bg-gray-900">
                              {group.items.map((translation) => {
                                const currentValue = editedValues[translation.id] ?? translation.value;
                                const isDirty = pendingUpdateById.has(translation.id);
                                const localeBadge = LOCALE_BADGE_STYLES[translation.locale] || 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200';
                                const appBadge = APP_BADGE_STYLES[translation.app] || 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200';

                                return (
                                  <tr
                                    key={translation.id}
                                    className={`transition ${isDirty ? 'bg-blue-50/70 dark:bg-blue-950/30' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50'}`}
                                  >
                                    <td className="px-5 py-4 align-top">
                                      <div className="space-y-2">
                                        <code className="inline-flex rounded-[0.7rem] bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                                          {translation.key}
                                        </code>
                                        <div className="flex flex-wrap gap-1.5">
                                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
                                            translation.key.startsWith('auto.')
                                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-200'
                                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200'
                                          }`}>
                                            {translation.key.startsWith('auto.') ? t('generated') : t('manual')}
                                          </span>
                                          {translation.value.trim().length === 0 ? (
                                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
                                              {t('empty')}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${localeBadge}`}>
                                        {translation.locale}
                                      </span>
                                    </td>
                                    <td className="px-5 py-4 align-top">
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${appBadge}`}>
                                        {translation.app}
                                      </span>
                                    </td>
                                    <td className="max-w-[260px] px-5 py-4 align-top">
                                      {translation.defaultValue == null ? (
                                        <span className="text-xs font-medium text-slate-400 dark:text-gray-500">{t('noDefault')}</span>
                                      ) : (
                                        <div className="line-clamp-3 rounded-[0.85rem] bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-500 ring-1 ring-slate-200 dark:bg-gray-800/60 dark:text-gray-300 dark:ring-gray-800">
                                          {translation.defaultValue}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-5 py-4">
                                      <input
                                        type="text"
                                        value={currentValue}
                                        onChange={(e) => handleValueChange(translation.id, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && void handleSave(translation)}
                                        className={`w-full rounded-[0.85rem] border px-3 py-2 text-sm outline-none transition ${
                                          isDirty
                                            ? 'border-blue-200 bg-blue-50/70 font-medium text-blue-700 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-100 dark:focus:ring-blue-900/50'
                                            : 'border-transparent bg-transparent text-slate-700 focus:border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:text-gray-200 dark:focus:bg-gray-950 dark:focus:ring-blue-900/50'
                                        }`}
                                      />
                                    </td>
                                    <td className="px-5 py-4 text-right align-top">
                                      <div className="flex flex-col items-end gap-2">
                                      {isDirty ? (
                                        <button
                                          onClick={() => void handleSave(translation)}
                                          disabled={saving === translation.id || savingAll}
                                          className="inline-flex items-center gap-1.5 rounded-[0.85rem] bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-60 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/60"
                                        >
                                          {saving === translation.id ? (
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Save className="h-3.5 w-3.5" />
                                          )}
                                          {t('save')}
                                        </button>
                                      ) : (
                                        <span className="text-xs font-medium text-slate-400 dark:text-gray-500">{t('upToDate')}</span>
                                      )}
                                      {translation.defaultValue != null && currentValue !== translation.defaultValue ? (
                                        <button
                                          type="button"
                                          onClick={() => void handleResetToDefault(translation)}
                                          disabled={saving === translation.id || savingAll}
                                          className="inline-flex items-center rounded-[0.85rem] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                          {t('resetDefault')}
                                        </button>
                                      ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
                    {hiddenGroupCount > 0 ? (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setVisibleGroupLimit((current) => current + GROUP_PAGE_SIZE)}
                          className="inline-flex items-center justify-center rounded-[0.95rem] border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          {t('showMoreGroups', { count: hiddenGroupCount })}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>
    </>
  );
}
