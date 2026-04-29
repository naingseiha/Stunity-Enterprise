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
} from 'lucide-react';
import { translationApi, type Translation } from '@/lib/api/translations';
import { TokenManager } from '@/lib/api/auth';
import { useParams, useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';

import { useTranslations } from 'next-intl';
type AppFilter = 'all' | 'web' | 'mobile' | 'global';
type LocaleFilter = 'all' | 'en' | 'km';

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
  web: 'bg-blue-50 text-blue-700',
  mobile: 'bg-indigo-50 text-indigo-700',
  global: 'bg-amber-50 text-amber-700',
};

const LOCALE_BADGE_STYLES: Record<string, string> = {
  en: 'bg-blue-50 text-blue-700',
  km: 'bg-red-50 text-red-700',
};

const getNamespace = (key: string): string => key.split('.')[0] || 'misc';

const getScreen = (key: string): string => {
  const parts = key.split('.');
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : parts[0] || 'misc';
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
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/30',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/30',
    violet:
      'border-violet-100/80 bg-gradient-to-br from-white via-violet-50/80 to-indigo-50/70 shadow-violet-100/30',
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/30',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.26)] ring-1 ring-white/75 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

export default function LanguageManagementPage() {
  const router = useRouter();
  const t = useTranslations('languageAdmin');
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'en';

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

    void loadData();
  }, [loadData, locale, router]);

  const translationsWithMeta = useMemo<TranslationWithMeta[]>(
    () => translations.map((t) => ({ ...t, namespace: getNamespace(t.key), screen: getScreen(t.key) })),
    [translations]
  );

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
        const matchesSearch = query.length === 0
          || t.key.toLowerCase().includes(query)
          || t.value.toLowerCase().includes(query);
        const matchesApp = appFilter === 'all' || t.app === appFilter;
        const matchesLocale = localeFilter === 'all' || t.locale === localeFilter;
        const matchesNamespace = namespaceFilter === 'all' || t.namespace === namespaceFilter;
        const matchesScreen = screenFilter === 'all' || t.screen === screenFilter;
        return matchesSearch && matchesApp && matchesLocale && matchesNamespace && matchesScreen;
      })
      .sort((a, b) => {
        const byScreen = a.screen.localeCompare(b.screen);
        if (byScreen !== 0) return byScreen;
        return a.key.localeCompare(b.key);
      }),
    [appFilter, localeFilter, namespaceFilter, screenFilter, searchQuery, translationsWithMeta]
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

  const clearFilters = () => {
    setSearchQuery('');
    setAppFilter('all');
    setLocaleFilter('all');
    setNamespaceFilter('all');
    setScreenFilter('all');
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    appFilter !== 'all' ||
    localeFilter !== 'all' ||
    namespaceFilter !== 'all' ||
    screenFilter !== 'all'
  );

  const populatedTranslations = translations.reduce((count, item) => (
    item.value.trim().length > 0 ? count + 1 : count
  ), 0);
  const readinessScore = translations.length > 0
    ? Math.round((populatedTranslations / translations.length) * 100)
    : 0;

  if (!isMounted) {
    return null;
  }

  const userData = TokenManager.getUserData();
  const user = userData.user;
  const school = userData.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(6,182,212,0.1),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <div className="overflow-hidden rounded-[1.95rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(238,242,255,0.97)_54%,rgba(224,242,254,0.88))] p-6 shadow-[0_38px_110px_-48px_rgba(30,64,175,0.28)] ring-1 ring-blue-100/70 sm:p-7">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600">{t('eyebrow')}</p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-[2.55rem]">
                    {t('title')}
                  </h1>
                  <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
                    {t('description')}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={syncFromJson}
                      disabled={loading || savingAll}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-none dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950 disabled:opacity-60"
                    >
                      <FileCode className="h-4 w-4 text-blue-500" />
                      {t('syncDefaults')}
                    </button>
                    <button
                      onClick={handleSaveAll}
                      disabled={pendingUpdates.length === 0 || savingAll || loading}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
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
                      <span className="text-5xl font-black tracking-tight">{readinessScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-blue-100/75">{t('ready')}</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <Globe className="h-7 w-7 text-blue-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-sky-200 to-indigo-200"
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: t('groups'), value: groupedTranslations.length },
                    { label: t('locales'), value: localeFilter === 'all' ? 2 : 1 },
                    { label: t('pending'), value: pendingUpdates.length },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-blue-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold text-blue-50/90">
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
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                <div className={`rounded-xl p-2 ${status.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
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
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{t('controls')}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{t('workspace')}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {t('workspaceDescription')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => loadData(true)}
                    disabled={isRefreshing || loading}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:opacity-60"
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
                              ? 'bg-white dark:bg-gray-900 text-slate-950 shadow-sm ring-1 ring-slate-200/70'
                              : 'text-slate-500 hover:text-slate-700 dark:text-gray-200'
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
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400" />
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
                    <option value="en">{t('english')}</option>
                    <option value="km">{t('khmer')}</option>
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

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    {t.rich('showingKeys', {
                      keys: filteredTranslations.length,
                      groups: groupedTranslations.length,
                      strong: (chunks) => <span className="font-semibold text-slate-950">{chunks}</span>
                    })}
                  </p>
                  <button
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="inline-flex items-center justify-center rounded-[0.85rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:opacity-50"
                  >
                    {t('clearFilters')}
                  </button>
                </div>

                {loading ? (
                  <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-6 py-20 text-center">
                    <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                    <p className="mt-4 text-sm font-medium text-slate-500">{t('loadingDictionary')}</p>
                  </div>
                ) : groupedTranslations.length === 0 ? (
                  <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-6 py-20 text-center">
                    <p className="text-lg font-black tracking-tight text-slate-950">{t('noMatches')}</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">{t('noMatchesDescription')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedTranslations.map((group) => (
                      <section
                        key={group.screen}
                        className="overflow-hidden rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 shadow-[0_20px_45px_-38px_rgba(15,23,42,0.3)]"
                      >
                        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-base font-black tracking-tight text-slate-950">{group.screen}</h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {t('namespaceLabel', { namespace: group.namespace })}
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                            {t('keyCount', { count: group.items.length })}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-[980px] w-full text-left">
                            <thead className="bg-white dark:bg-gray-900/70">
                              <tr>
                                {[
                                  { key: 'key', label: t('key') },
                                  { key: 'locale', label: t('locale') },
                                  { key: 'target', label: t('target') },
                                  { key: 'value', label: t('value') },
                                  { key: 'action', label: t('action') },
                                ].map(({ key, label }) => (
                                  <th
                                    key={key}
                                    className={`px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 ${
                                      key === 'action' ? 'text-right' : ''
                                    }`}
                                  >
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                              {group.items.map((translation) => {
                                const currentValue = editedValues[translation.id] ?? translation.value;
                                const isDirty = pendingUpdateById.has(translation.id);
                                const localeBadge = LOCALE_BADGE_STYLES[translation.locale] || 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200';
                                const appBadge = APP_BADGE_STYLES[translation.app] || 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200';

                                return (
                                  <tr
                                    key={translation.id}
                                    className={`transition ${isDirty ? 'bg-blue-50/40' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50'}`}
                                  >
                                    <td className="px-5 py-4 align-top">
                                      <code className="inline-flex rounded-[0.7rem] bg-slate-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                        {translation.key}
                                      </code>
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
                                    <td className="px-5 py-4">
                                      <input
                                        type="text"
                                        value={currentValue}
                                        onChange={(e) => handleValueChange(translation.id, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && void handleSave(translation)}
                                        className={`w-full rounded-[0.85rem] border px-3 py-2 text-sm outline-none transition ${
                                          isDirty
                                            ? 'border-blue-200 bg-blue-50/60 font-medium text-blue-700 focus:border-blue-300 focus:ring-2 focus:ring-blue-100'
                                            : 'border-transparent bg-transparent text-slate-700 dark:text-gray-200 focus:border-slate-200 dark:border-gray-800 focus:bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-100'
                                        }`}
                                      />
                                    </td>
                                    <td className="px-5 py-4 text-right align-top">
                                      {isDirty ? (
                                        <button
                                          onClick={() => void handleSave(translation)}
                                          disabled={saving === translation.id || savingAll}
                                          className="inline-flex items-center gap-1.5 rounded-[0.85rem] bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-60"
                                        >
                                          {saving === translation.id ? (
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <Save className="h-3.5 w-3.5" />
                                          )}
                                          {t('save')}
                                        </button>
                                      ) : (
                                        <span className="text-xs font-medium text-slate-300">{t('upToDate')}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ))}
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
