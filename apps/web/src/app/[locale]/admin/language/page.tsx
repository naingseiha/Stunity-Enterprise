'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  ChevronRight,
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
  { value: 'all' as const, label: 'All', icon: Layers, activeClass: 'bg-white text-gray-900 shadow-sm' },
  { value: 'web' as const, label: 'Web', icon: Layout, activeClass: 'bg-white text-blue-600 shadow-sm' },
  { value: 'mobile' as const, label: 'Mobile', icon: Smartphone, activeClass: 'bg-white text-indigo-600 shadow-sm' },
  { value: 'global' as const, label: 'Global', icon: Globe, activeClass: 'bg-white text-amber-600 shadow-sm' },
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

export default function LanguageManagementPage() {
  const router = useRouter();
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
      setStatus({ type: 'error', message: 'Failed to connect to translation service' });
    } finally {
      setLoading(false);
      if (refresh) setIsRefreshing(false);
    }
  }, []);

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
      userData?.user?.role === 'SUPER_ADMIN' ||
      userData?.user?.role === 'ADMIN'
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
      setStatus({ type: 'success', message: `Saved "${update.key}"` });
      setTimeout(() => setStatus(null), 2500);
    } catch (error) {
      console.error('Failed to save translation:', error);
      setStatus({ type: 'error', message: 'Failed to save translation' });
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
      setStatus({ type: 'success', message: `Saved ${pendingUpdates.length} translation updates` });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save all translations:', error);
      setStatus({ type: 'error', message: 'Failed to save all changes' });
    } finally {
      setSavingAll(false);
    }
  };

  const syncFromJson = async () => {
    setLoading(true);
    setStatus({ type: 'success', message: 'Syncing defaults from local files...' });
    try {
      const result = await translationApi.sync();
      setStatus({
        type: 'success',
        message: `Successfully synced ${result.count} translations from local files`
      });
      await loadData();
    } catch (error) {
      console.error('Sync error:', error);
      setStatus({ type: 'error', message: 'Failed to sync local translations to database' });
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

      <div className="lg:ml-64 min-h-screen bg-[#f8fafc]">
        <main className="p-6 lg:p-8 max-w-[1700px] mx-auto">

          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-6 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span>Dashboard</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>Admin</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-gray-900">Language Management</span>
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="h-6 w-6 text-blue-600" />
                  Translation Management Console
                </h1>
                <p className="text-gray-500 mt-1">
                  Manage OTA translations by app target, locale, namespace, and screen/page groups
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {status && (
                  <div className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
                    status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {status.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {status.message}
                  </div>
                )}
                <button
                  onClick={() => loadData(true)}
                  disabled={isRefreshing || loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={syncFromJson}
                  disabled={loading || savingAll}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-60"
                >
                  <FileCode className="h-4 w-4" />
                  Sync Defaults
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={pendingUpdates.length === 0 || savingAll || loading}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingAll
                    ? 'Saving...'
                    : pendingUpdates.length > 0
                      ? `Save ${pendingUpdates.length} Changes`
                      : 'Save Changes'}
                </button>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={30}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Keys</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{translations.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filtered Keys</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{filteredTranslations.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Screen/Page Groups</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{groupedTranslations.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unsaved Changes</p>
                <p className={`text-2xl font-semibold mt-1 ${pendingUpdates.length > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                  {pendingUpdates.length}
                </p>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={60}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Filter className="h-4 w-4 text-gray-500" />
                Filter translations
              </div>

              <div className="flex flex-wrap items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                {APP_FILTERS.map((item) => {
                  const Icon = item.icon;
                  const isActive = appFilter === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setAppFilter(item.value)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                        isActive ? item.activeClass : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 inline mr-1.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-4">
                <div className="relative xl:col-span-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search keys or values..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Locale</label>
                  <select
                    value={localeFilter}
                    onChange={(e) => setLocaleFilter(e.target.value as LocaleFilter)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All locales</option>
                    <option value="en">English (en)</option>
                    <option value="km">Khmer (km)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Namespace</label>
                  <select
                    value={namespaceFilter}
                    onChange={(e) => setNamespaceFilter(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All namespaces</option>
                    {namespaceOptions.map((namespace) => (
                      <option key={namespace} value={namespace}>{namespace}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Screen/Page</label>
                  <select
                    value={screenFilter}
                    onChange={(e) => setScreenFilter(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All screens/pages</option>
                    {screenOptions.map((screen) => (
                      <option key={screen} value={screen}>{screen}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{filteredTranslations.length}</span> translation keys
                  across <span className="font-semibold text-gray-700">{groupedTranslations.length}</span> screen/page groups.
                </p>
                <button
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={90}>
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-20 text-center text-gray-500">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 opacity-30" />
                Loading translation dictionary...
              </div>
            ) : groupedTranslations.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-6 py-20 text-center text-gray-500">
                No translations match the current filters.
              </div>
            ) : (
              <div className="space-y-4">
                {groupedTranslations.map((group) => (
                  <div key={group.screen} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">{group.screen}</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Namespace: <span className="font-medium text-gray-700">{group.namespace}</span>
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {group.items.length} keys
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[980px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Key / Path</th>
                            <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Locale</th>
                            <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Target</th>
                            <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Value</th>
                            <th className="px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.items.map((translation) => {
                            const currentValue = editedValues[translation.id] ?? translation.value;
                            const isDirty = pendingUpdateById.has(translation.id);
                            const localeBadge = LOCALE_BADGE_STYLES[translation.locale] || 'bg-gray-100 text-gray-700';
                            const appBadge = APP_BADGE_STYLES[translation.app] || 'bg-gray-100 text-gray-700';

                            return (
                              <tr
                                key={translation.id}
                                className={`transition-colors ${isDirty ? 'bg-blue-50/40' : 'hover:bg-gray-50/50'}`}
                              >
                                <td className="px-5 py-3.5 align-top">
                                  <code className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded break-all">
                                    {translation.key}
                                  </code>
                                </td>
                                <td className="px-5 py-3.5 align-top">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${localeBadge}`}>
                                    {translation.locale}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 align-top">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${appBadge}`}>
                                    {translation.app}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => handleValueChange(translation.id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && void handleSave(translation)}
                                    className={`w-full bg-transparent border border-transparent focus:border-blue-400 focus:bg-white outline-none px-2 py-1.5 text-sm rounded transition-all ${
                                      isDirty ? 'text-blue-700 font-medium' : 'text-gray-700'
                                    }`}
                                  />
                                </td>
                                <td className="px-5 py-3.5 text-right align-top">
                                  {isDirty ? (
                                    <button
                                      onClick={() => void handleSave(translation)}
                                      disabled={saving === translation.id || savingAll}
                                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
                                    >
                                      {saving === translation.id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Save className="h-3 w-3" />
                                      )}
                                      Save
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnimatedContent>
        </main>
      </div>
    </>
  );
}
