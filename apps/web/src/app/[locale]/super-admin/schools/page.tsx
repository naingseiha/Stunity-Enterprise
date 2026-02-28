'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  getSuperAdminSchools,
  updateSuperAdminSchool,
  createSuperAdminSchool,
  approveSuperAdminSchool,
  rejectSuperAdminSchool,
  SuperAdminSchool,
} from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  School,
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronDown,
  Filter,
  Users,
  GraduationCap,
  Calendar,
  Building2,
  Plus,
  Download,
  X,
  Loader2,
  Power,
  PowerOff,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  FREE_TRIAL_1M: '1M Trial',
  FREE_TRIAL_3M: '3M Trial',
  BASIC: 'Basic',
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  ENTERPRISE: 'Enterprise',
};

const TIER_COLORS: Record<string, string> = {
  FREE_TRIAL_1M: 'bg-amber-100 text-amber-700',
  FREE_TRIAL_3M: 'bg-orange-100 text-orange-700',
  BASIC: 'bg-slate-100 text-slate-700',
  STANDARD: 'bg-blue-100 text-blue-700',
  PREMIUM: 'bg-indigo-100 text-indigo-700',
  ENTERPRISE: 'bg-violet-100 text-violet-700',
};

export default function SuperAdminSchoolsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [schools, setSchools] = useState<SuperAdminSchool[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'pending'>('all');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    trialMonths: 1,
  });

  useEffect(() => {
    if (!filterOpen) return;
    const close = () => setFilterOpen(false);
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
    };
  }, [filterOpen]);

  const fetchSchools = useCallback(async (page: number, searchText: string, status: 'all' | 'active' | 'inactive' | 'pending') => {
    setLoading(true);
    try {
      const res = await getSuperAdminSchools({
        page,
        limit: 20,
        search: searchText || undefined,
        status,
      });
      setSchools(res.data.schools);
      setPagination(res.data.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchSchools(pagination.page, search, statusFilter);
  }, [pagination.page, search, statusFilter, fetchSchools]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('all');
    setPagination((p) => ({ ...p, page: 1 }));
    setFilterOpen(false);
  };

  const handleToggleActive = async (school: SuperAdminSchool) => {
    setTogglingId(school.id);
    try {
      const res = await updateSuperAdminSchool(school.id, { isActive: !school.isActive });
      setSchools((prev) => prev.map((s) => (s.id === school.id ? { ...s, isActive: res.data.isActive } : s)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleApprove = async (school: SuperAdminSchool) => {
    setApprovingId(school.id);
    try {
      await approveSuperAdminSchool(school.id);
      setSchools((prev) => prev.filter((s) => s.id !== school.id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (school: SuperAdminSchool) => {
    if (!confirm(`Reject registration for "${school.name}"? The school will be marked as rejected.`)) return;
    setApprovingId(school.id);
    try {
      await rejectSuperAdminSchool(school.id);
      setSchools((prev) => prev.filter((s) => s.id !== school.id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      await createSuperAdminSchool({
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone || undefined,
        address: createForm.address || undefined,
        adminFirstName: createForm.adminFirstName,
        adminLastName: createForm.adminLastName,
        adminEmail: createForm.adminEmail,
        adminPassword: createForm.adminPassword,
        trialMonths: createForm.trialMonths,
      });
      setCreateModalOpen(false);
      setCreateForm({ name: '', email: '', phone: '', address: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '', trialMonths: 1 });
      fetchSchools(1, search, statusFilter);
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await getSuperAdminSchools({ page: 1, limit: 1000 });
      const rows = [['Name', 'Slug', 'Email', 'Tier', 'Status', 'Users', 'Classes', 'Created']];
      res.data.schools.forEach((s) => {
        rows.push([
          s.name,
          s.slug,
          s.email,
          s.subscriptionTier || '',
          s.isActive ? 'Active' : 'Inactive',
          String(s._count?.users ?? ''),
          String(s._count?.classes ?? ''),
          new Date(s.createdAt).toLocaleDateString(),
        ]);
      });
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `schools-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getTierLabel = (school: SuperAdminSchool) =>
    TIER_LABELS[school.subscriptionTier || ''] || school.subscriptionTier || '–';
  const getTierColor = (school: SuperAdminSchool) =>
    TIER_COLORS[school.subscriptionTier || ''] || 'bg-gray-100 text-gray-700';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-indigo-600 transition-colors flex items-center gap-1">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Schools</span>
        </nav>
      </AnimatedContent>

      {/* Header */}
      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-stunity-primary-100 rounded-xl">
              <School className="h-8 w-8 text-stunity-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">All Schools</h1>
              <p className="text-gray-600 mt-1">Manage and monitor schools across the platform</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-stunity-primary-600 text-white font-medium rounded-lg hover:bg-stunity-primary-700"
            >
              <Plus className="w-4 h-4" /> Add School
            </button>
          </div>
        </div>
      </AnimatedContent>

      {/* Search & Filters */}
      <AnimatedContent animation="slide-up" delay={100}>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, slug, or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500 focus:border-stunity-primary-500 text-gray-900 placeholder-gray-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setSearch(''); setPagination((p) => ({ ...p, page: 1 })); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-medium"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFilterOpen(!filterOpen); }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                  statusFilter !== 'all' ? 'border-stunity-primary-300 bg-stunity-primary-50 text-stunity-primary-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                >
                  <Filter className="w-4 h-4" />
                  Status: {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : statusFilter === 'pending' ? 'Pending' : 'Inactive'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                </button>
                {filterOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-2 z-10" onClick={(e) => e.stopPropagation()}>
                    {(['all', 'pending', 'active', 'inactive'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setStatusFilter(s); setPagination((p) => ({ ...p, page: 1 })); setFilterOpen(false); }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                          statusFilter === s ? 'bg-stunity-primary-50 text-stunity-primary-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {s === 'all' ? 'All schools' : s === 'pending' ? 'Pending approval' : s === 'active' ? 'Active only' : 'Inactive only'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(search || statusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Reset filters
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-3 bg-stunity-primary-600 text-white font-medium rounded-lg hover:bg-stunity-primary-700 transition-colors shadow-sm"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </AnimatedContent>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 flex items-center gap-3">
          <span className="font-medium">Failed to load schools</span>
          <span className="text-sm opacity-90">{error}</span>
        </div>
      )}

      {/* Table */}
      <AnimatedContent animation="slide-up" delay={150}>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading && schools.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-12 h-12 border-4 border-stunity-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : schools.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <div className="inline-flex p-5 bg-gray-100 rounded-full mb-4">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-900 font-semibold text-lg">No schools found</p>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Schools will appear here once they register on the platform.'}
              </p>
              {(search || statusFilter !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-stunity-primary-600 font-medium hover:bg-stunity-primary-50 rounded-lg transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        School
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Users</span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Classes</span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Created</span>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {                schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <Link href={`/${locale}/super-admin/schools/${school.id}`} className="block">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-stunity-primary-50 rounded-lg text-stunity-primary-600 group-hover:bg-stunity-primary-100 transition-colors">
                              <School className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 group-hover:text-stunity-primary-600 transition-colors">{school.name}</p>
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                {school.email}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">/{school.slug}</p>
                            </div>
                          </div>
                        </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-medium ${getTierColor(school)}`}>
                            {getTierLabel(school)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">
                          {school._count?.users ?? '–'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">
                          {school._count?.classes ?? '–'}
                        </td>
                        <td className="px-6 py-4">
                          {school.registrationStatus === 'PENDING' ? (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>
                              <button
                                onClick={() => handleApprove(school)}
                                disabled={approvingId === school.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                              >
                                {approvingId === school.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                              </button>
                              <button
                                onClick={() => handleReject(school)}
                                disabled={approvingId === school.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleActive(school)}
                              disabled={togglingId === school.id}
                              title={school.isActive ? 'Deactivate' : 'Activate'}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                school.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              } disabled:opacity-50`}
                            >
                              {togglingId === school.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : school.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                              {school.isActive ? 'Active' : 'Inactive'}
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(school.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/${locale}/super-admin/schools/${school.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-stunity-primary-600 hover:text-stunity-primary-700"
                          >
                            View <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing{' '}
                    <span className="font-medium text-gray-900">{(pagination.page - 1) * pagination.limit + 1}</span>
                    {' '}-{' '}
                    <span className="font-medium text-gray-900">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium text-gray-900">{pagination.total}</span>
                    {' '}schools
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium text-gray-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AnimatedContent>

      {/* Create School Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !createLoading && setCreateModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create New School</h3>
              <button onClick={() => !createLoading && setCreateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSchool} className="p-6 space-y-4">
              {createError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{createError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School name *</label>
                <input required value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School email *</label>
                <input type="email" required value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin first name *</label>
                  <input required value={createForm.adminFirstName} onChange={(e) => setCreateForm((f) => ({ ...f, adminFirstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin last name *</label>
                  <input required value={createForm.adminLastName} onChange={(e) => setCreateForm((f) => ({ ...f, adminLastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin email *</label>
                <input type="email" required value={createForm.adminEmail} onChange={(e) => setCreateForm((f) => ({ ...f, adminEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin password *</label>
                <input type="password" required minLength={8} value={createForm.adminPassword} onChange={(e) => setCreateForm((f) => ({ ...f, adminPassword: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trial (months)</label>
                <select value={createForm.trialMonths} onChange={(e) => setCreateForm((f) => ({ ...f, trialMonths: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-stunity-primary-500">
                  <option value={1}>1 month</option>
                  <option value={3}>3 months</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setCreateModalOpen(false)} disabled={createLoading} className="flex-1 py-2 px-4 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={createLoading} className="flex-1 py-2 px-4 bg-stunity-primary-600 text-white font-medium rounded-lg hover:bg-stunity-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
