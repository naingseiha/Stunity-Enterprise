'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  getSuperAdminSchoolDetail,
  updateSuperAdminSchool,
  deleteSuperAdminSchool,
  SuperAdminSchoolDetail,
  UpdateSchoolData,
} from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  School,
  ChevronRight,
  Home,
  Users,
  GraduationCap,
  User,
  BookOpen,
  Calendar,
  Mail,
  Phone,
  Globe,
  MapPin,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';

const TIER_OPTIONS = [
  { value: 'FREE_TRIAL_1M', label: '1 Month Trial' },
  { value: 'FREE_TRIAL_3M', label: '3 Month Trial' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

const TIER_LABELS: Record<string, string> = Object.fromEntries(TIER_OPTIONS.map((t) => [t.value, t.label]));

export default function SuperAdminSchoolDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const id = params?.id as string;
  const [school, setSchool] = useState<SuperAdminSchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
  });
  const [subscriptionForm, setSubscriptionForm] = useState({
    subscriptionTier: '',
    subscriptionEnd: '',
  });

  const loadSchool = () => {
    getSuperAdminSchoolDetail(id)
      .then((res) => {
        setSchool(res.data);
        setEditForm({
          name: res.data.name,
          email: res.data.email,
          phone: res.data.phone || '',
          address: res.data.address || '',
          website: res.data.website || '',
        });
        setSubscriptionForm({
          subscriptionTier: res.data.subscriptionTier || 'FREE_TRIAL_1M',
          subscriptionEnd: res.data.subscriptionEnd
            ? new Date(res.data.subscriptionEnd).toISOString().slice(0, 10)
            : '',
        });
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) loadSchool();
    else { setError('Invalid school ID'); setLoading(false); }
  }, [id]);

  const handleToggleActive = async () => {
    if (!school) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateSuperAdminSchool(id, { isActive: !school.isActive });
      setSchool(res.data);
      setSuccessMsg(school.isActive ? 'School deactivated' : 'School activated');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateSuperAdminSchool(id, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone || null,
        address: editForm.address || null,
        website: editForm.website || null,
      });
      setSchool(res.data);
      setEditModalOpen(false);
      setSuccessMsg('School updated');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateSuperAdminSchool(id, {
        subscriptionTier: subscriptionForm.subscriptionTier,
        subscriptionEnd: subscriptionForm.subscriptionEnd ? subscriptionForm.subscriptionEnd : null,
      });
      setSchool(res.data);
      setSuccessMsg('Subscription updated');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await deleteSuperAdminSchool(id);
      router.replace(`/${locale}/super-admin/schools`);
    } catch (err: any) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6">
        <p className="font-medium text-red-800">{error || 'School not found'}</p>
        <Link href={`/${locale}/super-admin/schools`} className="mt-4 inline-flex items-center gap-2 text-stunity-primary-600 hover:underline">
          ← Back to Schools
        </Link>
      </div>
    );
  }

  const tierLabel = TIER_LABELS[school.subscriptionTier || ''] || school.subscriptionTier || '–';
  const counts = school._count || {};

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 transition-colors flex items-center gap-1">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/${locale}/super-admin/schools`} className="hover:text-stunity-primary-600 transition-colors">Schools</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{school.name}</span>
        </nav>
      </AnimatedContent>

      {/* Success / Error toasts */}
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 text-sm font-medium">
          {successMsg}
        </div>
      )}
      {saveError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm font-medium">
          {saveError}
        </div>
      )}

      {/* Header with actions */}
      <AnimatedContent animation="slide-up" delay={50}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-gradient-to-br from-stunity-primary-500 to-amber-500 rounded-xl shadow-lg">
                <School className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      school.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {school.isActive ? (
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Inactive</span>
                    )}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-stunity-primary-100 text-stunity-primary-700">
                    {tierLabel}
                  </span>
                </div>
                <p className="text-gray-500 mt-1">/{school.slug}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleToggleActive}
                disabled={saving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  school.isActive
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                } disabled:opacity-50`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : school.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                {school.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => setEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <Link
                href={`/${locale}/super-admin/schools`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
              >
                ← Back to list
              </Link>
            </div>
          </div>
        </div>
      </AnimatedContent>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { label: 'Users', value: counts.users ?? 0, icon: Users, iconClass: 'bg-blue-100 text-blue-600' },
          { label: 'Students', value: counts.students ?? 0, icon: GraduationCap, iconClass: 'bg-emerald-100 text-emerald-600' },
          { label: 'Teachers', value: counts.teachers ?? 0, icon: User, iconClass: 'bg-violet-100 text-violet-600' },
          { label: 'Classes', value: counts.classes ?? 0, icon: BookOpen, iconClass: 'bg-amber-100 text-amber-600' },
          { label: 'Academic Years', value: counts.academicYears ?? 0, icon: Calendar, iconClass: 'bg-cyan-100 text-cyan-600' },
        ].map((stat, i) => (
          <AnimatedContent key={stat.label} animation="slide-up" delay={100 + i * 50}>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.iconClass}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          </AnimatedContent>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <AnimatedContent animation="slide-up" delay={300}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Contact Information</h2>
              <button
                onClick={() => setEditModalOpen(true)}
                className="text-sm text-stunity-primary-600 hover:text-stunity-primary-700 font-medium flex items-center gap-1"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            </div>
            <div className="p-6 space-y-4">
              {school.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <a href={`mailto:${school.email}`} className="text-gray-900 hover:text-stunity-primary-600">{school.email}</a>
                  </div>
                </div>
              )}
              {school.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-gray-900">{school.phone}</p>
                  </div>
                </div>
              )}
              {school.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Website</p>
                    <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-stunity-primary-600 hover:underline">{school.website}</a>
                  </div>
                </div>
              )}
              {school.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="text-gray-900">{school.address}</p>
                  </div>
                </div>
              )}
              {!school.email && !school.phone && !school.website && !school.address && (
                <p className="text-sm text-gray-500">No contact info</p>
              )}
            </div>
          </div>
        </AnimatedContent>

        {/* Subscription - editable */}
        <AnimatedContent animation="slide-up" delay={350}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Subscription</h2>
            </div>
            <form onSubmit={handleSaveSubscription} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <select
                  value={subscriptionForm.subscriptionTier}
                  onChange={(e) => setSubscriptionForm((f) => ({ ...f, subscriptionTier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500"
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subscription end date</label>
                <input
                  type="date"
                  value={subscriptionForm.subscriptionEnd}
                  onChange={(e) => setSubscriptionForm((f) => ({ ...f, subscriptionEnd: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500"
                />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-500">Setup</span>
                <span className={`font-medium ${school.setupCompleted ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {school.setupCompleted ? 'Completed' : 'Pending'}
                </span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 px-4 bg-stunity-primary-600 text-white font-medium rounded-lg hover:bg-stunity-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save subscription
              </button>
            </form>
          </div>
        </AnimatedContent>
      </div>

      {/* Academic Years */}
      {school.academicYears && school.academicYears.length > 0 && (
        <AnimatedContent animation="slide-up" delay={400}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Recent Academic Years</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {school.academicYears.map((year) => (
                <div key={year.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{year.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(year.startDate).toLocaleDateString()} – {new Date(year.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {year.isCurrent && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-stunity-primary-100 text-stunity-primary-700">Current</span>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{year.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedContent>
      )}

      {/* Danger zone */}
      <AnimatedContent animation="slide-up" delay={450}>
        <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Danger Zone
            </h2>
            <p className="text-sm text-red-600 mt-1">Permanently delete this school and all associated data. This cannot be undone.</p>
          </div>
          <div className="p-6">
            <button
              onClick={() => setDeleteModalOpen(true)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete school
            </button>
          </div>
        </div>
      </AnimatedContent>

      {/* Edit modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && setEditModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit school</h3>
              <button onClick={() => !saving && setEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={editForm.website}
                  onChange={(e) => setEditForm((f) => ({ ...f, website: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={saving}
                  className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 px-4 bg-stunity-primary-600 text-white font-medium rounded-lg hover:bg-stunity-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && setDeleteModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900">Delete school?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              This will permanently delete <strong>{school.name}</strong> and all associated data (users, classes, students, teachers, etc.). This cannot be undone.
            </p>
            {saveError && <p className="text-red-600 text-sm mb-4">{saveError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={saving}
                className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
