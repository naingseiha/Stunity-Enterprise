'use client';

import { useState, useEffect, useMemo } from 'react';
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
  FileCode
} from 'lucide-react';
import { translationApi, type Translation } from '@/lib/api/translations';
import { TokenManager } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';

export default function LanguageManagementPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appFilter, setAppFilter] = useState<'all' | 'web' | 'mobile' | 'global'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Editing state
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    setLoading(true);
    try {
      const response = await translationApi.getAll();
      console.log('API Response:', response);
      const data = response.data || [];
      setTranslations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load translations:', error);
      setStatus({ type: 'error', message: 'Failed to connect to translation service' });
    } finally {
      setLoading(false);
      if (refresh) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const token = TokenManager.getAccessToken();
    if (!token) {
      console.warn('No access token found, redirecting to login');
      router.push('/en/login');
      return;
    }
    loadData();
  }, []);

  const filteredTranslations = useMemo(() => {
    if (!Array.isArray(translations)) {
      console.warn('translations is not an array:', translations);
      return [];
    }
    return translations.filter(t => {
      const matchesSearch = 
        t.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.value.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesApp = appFilter === 'all' || t.app === appFilter;
      return matchesSearch && matchesApp;
    });
  }, [translations, searchQuery, appFilter]);

  if (!isMounted) {
    return null; 
  }

  const userData = TokenManager.getUserData();
  const user = userData.user;
  const school = userData.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push('/en/login');
  };

  const handleValueChange = (id: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (t: Translation) => {
    const newValue = editedValues[t.id];
    if (newValue === undefined || newValue === t.value) return;

    setSaving(t.id);
    try {
      await translationApi.update({
        app: t.app,
        locale: t.locale,
        key: t.key,
        value: newValue
      });
      
      // Update local state
      setTranslations(prev => prev.map(item => 
        item.id === t.id ? { ...item, value: newValue } : item
      ));
      
      // Clear from edited values
      const newEdited = { ...editedValues };
      delete newEdited[t.id];
      setEditedValues(newEdited);

      setStatus({ type: 'success', message: `Saved "${t.key}"` });
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save translation' });
    } finally {
      setSaving(null);
    }
  };

  const syncFromJson = async () => {
    setLoading(true);
    setStatus({ type: 'success', message: 'Syncing defaults from local files...' });
    try {
      const result = await translationApi.sync();
      setStatus({ 
        type: 'success', 
        message: `Successfully synced ${result.count} translations from local files!` 
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

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen bg-[#f8fafc]">
        <main className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                  Dynamic Translations
                </h1>
                <p className="text-gray-500 mt-1">
                  Manage Over-the-Air (OTA) translation updates for Web and Mobile
                </p>
              </div>

              <div className="flex items-center gap-3">
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
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={syncFromJson}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  <FileCode className="h-4 w-4" />
                  Sync Defaults
                </button>
              </div>
            </div>
          </AnimatedContent>

          {/* Filters */}
          <AnimatedContent animation="slide-up" delay={50}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search keys or values..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-200">
                <button
                  onClick={() => setAppFilter('all')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    appFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5 inline mr-1.5" />
                  All
                </button>
                <button
                  onClick={() => setAppFilter('web')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    appFilter === 'web' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Layout className="h-3.5 w-3.5 inline mr-1.5" />
                  Web
                </button>
                <button
                  onClick={() => setAppFilter('mobile')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    appFilter === 'mobile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5 inline mr-1.5" />
                  Mobile
                </button>
                <button
                  onClick={() => setAppFilter('global')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    appFilter === 'global' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 inline mr-1.5" />
                  Global
                </button>
              </div>
            </div>
          </AnimatedContent>

          {/* Translation List */}
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Key / Path</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Locale</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">App</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 opacity-20" />
                        Loading translation dictionary...
                      </td>
                    </tr>
                  ) : filteredTranslations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-gray-500 text-sm">
                        No translations matches your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTranslations.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {t.key}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.locale === 'km' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {t.locale}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500 capitalize">{t.app}</span>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editedValues[t.id] !== undefined ? editedValues[t.id] : t.value}
                            onChange={(e) => handleValueChange(t.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSave(t)}
                            className={`w-full bg-transparent border-b border-transparent focus:border-blue-400 focus:bg-white outline-none px-2 py-1 text-sm transition-all ${
                              editedValues[t.id] !== undefined ? 'text-blue-600 font-medium' : 'text-gray-700'
                            }`}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editedValues[t.id] !== undefined && (
                            <button
                              onClick={() => handleSave(t)}
                              disabled={saving === t.id}
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                              {saving === t.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              Save
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </AnimatedContent>
        </main>
      </div>
    </>
  );
}
