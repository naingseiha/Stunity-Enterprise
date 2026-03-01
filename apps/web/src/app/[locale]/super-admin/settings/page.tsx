'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getSuperAdminFeatureFlags,
  createSuperAdminFeatureFlag,
  updateSuperAdminFeatureFlag,
  deleteSuperAdminFeatureFlag,
  getSuperAdminAnnouncements,
  createSuperAdminAnnouncement,
  updateSuperAdminAnnouncement,
  deleteSuperAdminAnnouncement,
  FeatureFlag,
  PlatformAnnouncement,
} from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  Settings,
  Home,
  ChevronRight,
  Shield,
  Bell,
  CreditCard,
  Globe,
  Database,
  Plus,
  Loader2,
  X,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit2,
} from 'lucide-react';

type Tab = 'feature-flags' | 'announcements' | 'subscription-tiers' | 'coming-soon';

export default function SuperAdminSettingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [tab, setTab] = useState<Tab>('feature-flags');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flagModal, setFlagModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [flagForm, setFlagForm] = useState({ key: '', description: '', enabled: false });
  const [savingFlag, setSavingFlag] = useState(false);
  const [annModal, setAnnModal] = useState(false);
  const [annForm, setAnnForm] = useState<{ title: string; content: string; priority: 'INFO' | 'WARNING' | 'URGENT'; isActive: boolean }>({ title: '', content: '', priority: 'INFO', isActive: true });
  const [editingAnn, setEditingAnn] = useState<PlatformAnnouncement | null>(null);
  const [savingAnn, setSavingAnn] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    try {
      const res = await getSuperAdminFeatureFlags('platform');
      setFlags(res.data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await getSuperAdminAnnouncements();
      setAnnouncements(res.data);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([loadFlags(), loadAnnouncements()]).finally(() => setLoading(false));
  }, [loadFlags, loadAnnouncements]);

  const handleSaveFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagForm.key.trim() && !editingFlag) return;
    setSavingFlag(true);
    try {
      if (editingFlag) {
        await updateSuperAdminFeatureFlag(editingFlag.id, {
          description: flagForm.description.trim() || undefined,
          enabled: flagForm.enabled,
        });
      } else {
        await createSuperAdminFeatureFlag({
          key: flagForm.key.trim().toUpperCase().replace(/\s+/g, '_'),
          description: flagForm.description.trim() || undefined,
          enabled: flagForm.enabled,
        });
      }
      setFlagModal(false);
      setEditingFlag(null);
      setFlagForm({ key: '', description: '', enabled: false });
      await loadFlags();
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingFlag(false);
    }
  };

  const openEditFlag = (f: FeatureFlag) => {
    setEditingFlag(f);
    setFlagForm({ key: f.key, description: f.description || '', enabled: f.enabled });
    setFlagModal(true);
  };

  const handleDeleteFlag = async (f: FeatureFlag) => {
    if (!confirm(`Delete feature flag "${f.key}"? This cannot be undone.`)) return;
    try {
      await deleteSuperAdminFeatureFlag(f.id);
      setFlags((prev) => prev.filter((x) => x.id !== f.id));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleFlag = async (f: FeatureFlag) => {
    setTogglingId(f.id);
    try {
      await updateSuperAdminFeatureFlag(f.id, { enabled: !f.enabled });
      setFlags((prev) => prev.map((x) => (x.id === f.id ? { ...x, enabled: !x.enabled } : x)));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title.trim() || !annForm.content.trim()) return;
    setSavingAnn(true);
    try {
      if (editingAnn) {
        await updateSuperAdminAnnouncement(editingAnn.id, annForm);
      } else {
        await createSuperAdminAnnouncement(annForm);
      }
      setAnnModal(false);
      setEditingAnn(null);
      setAnnForm({ title: '', content: '', priority: 'INFO', isActive: true });
      await loadAnnouncements();
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await deleteSuperAdminAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openEditAnn = (a: PlatformAnnouncement) => {
    setEditingAnn(a);
    setAnnForm({
      title: a.title,
      content: a.content,
      priority: a.priority,
      isActive: a.isActive,
    });
    setAnnModal(true);
  };

  const tabs = [
    { id: 'feature-flags' as Tab, label: 'Feature Flags', icon: Shield },
    { id: 'announcements' as Tab, label: 'Announcements', icon: Bell },
    { id: 'subscription-tiers' as Tab, label: 'Subscription Tiers', icon: CreditCard },
    { id: 'coming-soon' as Tab, label: 'Coming Soon', icon: Database },
  ];

  const subscriptionTiers = [
    { tier: 'FREE_TRIAL_1M', label: '1 Month Trial', maxStudents: 100, maxTeachers: 10, maxStorage: '1 GB' },
    { tier: 'FREE_TRIAL_3M', label: '3 Month Trial', maxStudents: 300, maxTeachers: 20, maxStorage: '5 GB' },
    { tier: 'BASIC', label: 'Basic', maxStudents: 500, maxTeachers: 30, maxStorage: '10 GB' },
    { tier: 'STANDARD', label: 'Standard', maxStudents: 1000, maxTeachers: 50, maxStorage: '25 GB' },
    { tier: 'PREMIUM', label: 'Premium', maxStudents: 2500, maxTeachers: 100, maxStorage: '50 GB' },
    { tier: 'ENTERPRISE', label: 'Enterprise', maxStudents: -1, maxTeachers: -1, maxStorage: 'Unlimited' },
  ];

  const comingSoonSections = [
    { title: 'Billing Integration', description: 'Stripe integration for plans, invoices, upgrades', icon: CreditCard },
    { title: 'Notifications', description: 'Configure system notifications and alerts', icon: Bell },
    { title: 'Localization', description: 'Manage languages and regional settings', icon: Globe },
    { title: 'Maintenance Mode', description: 'Put the platform into maintenance mode', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Platform Settings</span>
        </nav>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-stunity-primary-100 rounded-xl">
            <Settings className="h-8 w-8 text-stunity-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-gray-600 mt-1">Configure platform-wide settings and preferences</p>
          </div>
        </div>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={100}>
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  tab === t.id
                    ? 'border-stunity-primary-500 text-stunity-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </AnimatedContent>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>
      )}

      {tab === 'feature-flags' && (
        <AnimatedContent animation="slide-up" delay={150}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Platform Feature Flags</h3>
              <button
                onClick={() => { setEditingFlag(null); setFlagForm({ key: '', description: '', enabled: false }); setFlagModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stunity-primary-600 text-white hover:bg-stunity-primary-700 text-sm font-medium"
              >
                <Plus className="h-4 w-4" /> Add Flag
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-stunity-primary-500 animate-spin" />
              </div>
            ) : flags.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No feature flags yet</p>
                <p className="text-sm mt-1">Add a flag to enable or disable platform features</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {flags.map((f) => (
                  <div key={f.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50">
                    <div>
                      <p className="font-medium text-gray-900">{f.key}</p>
                      {f.description && <p className="text-sm text-gray-500 mt-0.5">{f.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditFlag(f)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFlag(f)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleFlag(f)}
                        disabled={togglingId === f.id}
                        className="flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                      >
                        {togglingId === f.id ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : f.enabled ? (
                          <ToggleRight className="h-8 w-8 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-8 w-8 text-gray-300" />
                        )}
                        <span className={f.enabled ? 'text-emerald-600' : 'text-gray-500'}>{f.enabled ? 'On' : 'Off'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedContent>
      )}

      {tab === 'announcements' && (
        <AnimatedContent animation="slide-up" delay={150}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Platform Announcements</h3>
              <button
                onClick={() => { setAnnModal(true); setEditingAnn(null); setAnnForm({ title: '', content: '', priority: 'INFO', isActive: true }); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stunity-primary-600 text-white hover:bg-stunity-primary-700 text-sm font-medium"
              >
                <Plus className="h-4 w-4" /> Add Announcement
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 text-stunity-primary-500 animate-spin" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No announcements yet</p>
                <p className="text-sm mt-1">Add an announcement to show a banner to all users</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {announcements.map((a) => (
                  <div key={a.id} className="px-6 py-4 flex items-start justify-between hover:bg-gray-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{a.title}</p>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          a.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                          a.priority === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {a.priority}
                        </span>
                        {!a.isActive && <span className="px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-600">Inactive</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.content}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openEditAnn(a)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteAnnouncement(a.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AnimatedContent>
      )}

      {tab === 'subscription-tiers' && (
        <AnimatedContent animation="slide-up" delay={150}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Subscription Tiers (Read-Only)</h3>
              <p className="text-sm text-gray-500 mt-1">Tiers and limits are configured per school in school detail. Billing integration coming soon.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Label</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Max Students</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Max Teachers</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Storage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptionTiers.map((t) => (
                    <tr key={t.tier} className="hover:bg-gray-50/80">
                      <td className="px-6 py-4 font-medium text-gray-900">{t.tier}</td>
                      <td className="px-6 py-4 text-gray-700">{t.label}</td>
                      <td className="px-6 py-4 text-gray-600">{t.maxStudents === -1 ? 'Unlimited' : t.maxStudents}</td>
                      <td className="px-6 py-4 text-gray-600">{t.maxTeachers === -1 ? 'Unlimited' : t.maxTeachers}</td>
                      <td className="px-6 py-4 text-gray-600">{t.maxStorage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedContent>
      )}

      {tab === 'coming-soon' && (
        <AnimatedContent animation="slide-up" delay={150}>
          <div className="grid gap-4">
            {comingSoonSections.map((s) => (
              <div key={s.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-start gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                  <s.icon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{s.description}</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Coming soon</span>
              </div>
            ))}
          </div>
        </AnimatedContent>
      )}

      {/* Feature Flag Modal */}
      {flagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!savingFlag) { setFlagModal(false); setEditingFlag(null); } }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingFlag ? 'Edit Feature Flag' : 'Add Feature Flag'}</h3>
            <form onSubmit={handleSaveFlag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                <input
                  type="text"
                  value={flagForm.key}
                  onChange={(e) => setFlagForm((p) => ({ ...p, key: e.target.value }))}
                  placeholder="FEATURE_NAME"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 disabled:bg-gray-100 disabled:text-gray-600"
                  required
                  disabled={!!editingFlag}
                />
                {editingFlag && <p className="text-xs text-gray-500 mt-1">Key cannot be changed after creation</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={flagForm.description}
                  onChange={(e) => setFlagForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={flagForm.enabled}
                  onChange={(e) => setFlagForm((p) => ({ ...p, enabled: e.target.checked }))}
                />
                <label htmlFor="enabled" className="text-sm text-gray-700">{editingFlag ? 'Enabled' : 'Enabled by default'}</label>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => { setFlagModal(false); setEditingFlag(null); }} disabled={savingFlag} className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={savingFlag} className="px-4 py-2 rounded-lg bg-stunity-primary-600 text-white hover:bg-stunity-primary-700 disabled:opacity-50 flex items-center gap-2">
                  {savingFlag && <Loader2 className="h-4 w-4 animate-spin" />} {editingFlag ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Modal */}
      {annModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setAnnModal(false); setEditingAnn(null); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingAnn ? 'Edit Announcement' : 'Add Announcement'}</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={annForm.title}
                  onChange={(e) => setAnnForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Announcement title"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={annForm.content}
                  onChange={(e) => setAnnForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Announcement content"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={annForm.priority}
                  onChange={(e) => setAnnForm((p) => ({ ...p, priority: e.target.value as 'INFO' | 'WARNING' | 'URGENT' }))}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
                >
                  <option value="INFO">Info</option>
                  <option value="WARNING">Warning</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="annActive"
                  checked={annForm.isActive}
                  onChange={(e) => setAnnForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                <label htmlFor="annActive" className="text-sm text-gray-700">Active (visible to users)</label>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => { setAnnModal(false); setEditingAnn(null); }} className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={savingAnn} className="px-4 py-2 rounded-lg bg-stunity-primary-600 text-white hover:bg-stunity-primary-700 disabled:opacity-50 flex items-center gap-2">
                  {savingAnn && <Loader2 className="h-4 w-4 animate-spin" />} {editingAnn ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
