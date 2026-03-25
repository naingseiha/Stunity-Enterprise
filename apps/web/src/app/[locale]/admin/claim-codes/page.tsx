'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  Upload,
  XCircle,
} from 'lucide-react';
import { claimCodeService, type ClaimCode, type ClaimCodeStats } from '@/lib/api/claimCodes';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { TokenManager } from '@/lib/api/auth';
import { GenerateCodesModal } from '@/components/claim-codes/GenerateCodesModal';
import BulkUploadModal from '@/components/claim-codes/BulkUploadModal';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useDebounce } from '@/hooks/useDebounce';

type StatusState = {
  type: 'success' | 'error';
  message: string;
} | null;

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'emerald' | 'sky' | 'amber' | 'violet';
}) {
  const tones = {
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/40',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/40',
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/40',
    violet:
      'border-violet-100/80 bg-gradient-to-br from-white via-violet-50/80 to-indigo-50/70 shadow-violet-100/40',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/70 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ClaimCodesPage() {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'en';
  const { schoolId } = useAcademicYear();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [bulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [codes, setCodes] = useState<ClaimCode[]>([]);
  const [stats, setStats] = useState<ClaimCodeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<StatusState>(null);

  const userData = TokenManager.getUserData();
  const user = userData.user;
  const school = userData.school;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const loadData = useCallback(async (refresh = false) => {
    if (!schoolId) return;

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const query: Record<string, string | number> = { page, limit: 20 };
      if (typeFilter !== 'all') query.type = typeFilter.toUpperCase();
      if (statusFilter !== 'all') query.status = statusFilter;
      if (debouncedSearch) query.search = debouncedSearch;

      const [{ codes: fetchedCodes, pages }, fetchedStats] = await Promise.all([
        claimCodeService.list(schoolId, query),
        claimCodeService.getStats(schoolId),
      ]);

      setCodes(fetchedCodes);
      setTotalPages(pages);
      setStats(fetchedStats);
    } catch (error) {
      console.error('Failed to load claim codes:', error);
      setStatus({ type: 'error', message: 'Unable to load claim codes right now.' });
    } finally {
      setLoading(false);
      if (refresh) setIsRefreshing(false);
    }
  }, [debouncedSearch, page, schoolId, statusFilter, typeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 3200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleExport = async () => {
    if (!schoolId) return;

    try {
      const blob = await claimCodeService.export(schoolId, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `claim-codes-${Date.now()}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
      setStatus({ type: 'success', message: 'Claim codes exported successfully.' });
    } catch (error) {
      console.error('Failed to export claim codes:', error);
      setStatus({ type: 'error', message: 'Export failed. Please try again.' });
    }
  };

  const handleRevoke = async (codeId: string) => {
    if (!schoolId) return;

    try {
      await claimCodeService.revoke(schoolId, codeId);
      setStatus({ type: 'success', message: 'Claim code revoked.' });
      await loadData(true);
    } catch (error) {
      console.error('Failed to revoke claim code:', error);
      setStatus({ type: 'error', message: 'Unable to revoke this claim code.' });
    }
  };

  const getStatusMeta = useCallback((code: ClaimCode) => {
    const now = new Date();
    if (code.revokedAt) {
      return {
        label: 'Revoked',
        className: 'border-rose-200 bg-rose-50 text-rose-700',
      };
    }
    if (code.claimedAt) {
      return {
        label: 'Claimed',
        className: 'border-slate-200 bg-slate-100 text-slate-700',
      };
    }
    if (new Date(code.expiresAt) < now) {
      return {
        label: 'Expired',
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    }
    if (code.isActive) {
      return {
        label: 'Active',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }
    return {
      label: 'Inactive',
      className: 'border-slate-200 bg-slate-100 text-slate-600',
    };
  }, []);

  const getTypeMeta = useCallback((type: string) => {
    const colors: Record<string, string> = {
      STUDENT: 'border-sky-200 bg-sky-50 text-sky-700',
      TEACHER: 'border-violet-200 bg-violet-50 text-violet-700',
      STAFF: 'border-amber-200 bg-amber-50 text-amber-700',
      PARENT: 'border-rose-200 bg-rose-50 text-rose-700',
    };

    return colors[type] || 'border-slate-200 bg-slate-100 text-slate-700';
  }, []);

  const readyScore = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.active / stats.total) * 100);
  }, [stats]);

  const claimedShare = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.claimed / stats.total) * 100);
  }, [stats]);

  if (!schoolId) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.12),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 lg:ml-64">
          <div className="flex min-h-screen items-center justify-center">
            <div className="rounded-[1.75rem] border border-white/75 bg-white/92 px-10 py-12 text-center shadow-[0_30px_90px_-44px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
              <p className="mt-4 text-sm font-medium text-slate-500">Loading claim code workspace...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.16),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                eyebrow="Access Inventory"
                title="Claim code registry"
                description="Generate, upload, and manage school access codes from one cleaner workspace."
                icon={Ticket}
                backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#eef2ff_56%,#e0f2fe_100%)]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.18),transparent_58%)]"
                eyebrowClassName="text-indigo-500"
                iconShellClassName="bg-slate-950 text-white"
                actions={
                  <>
                    <button
                      onClick={() => setBulkUploadModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950"
                    >
                      <Upload className="h-4 w-4 text-indigo-500" />
                      Bulk Upload
                    </button>
                    <button
                      onClick={() => setGenerateModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      Generate Codes
                    </button>
                  </>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(49,46,129,0.98),rgba(67,56,202,0.94)_52%,rgba(14,116,144,0.9))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(49,46,129,0.5)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-100/80">Code Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{readyScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-indigo-100/75">Live</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <ShieldCheck className="h-7 w-7 text-indigo-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-sky-200 to-indigo-200"
                    style={{ width: `${readyScore}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total', value: stats?.total ?? 0 },
                    { label: 'Active', value: stats?.active ?? 0 },
                    { label: 'Claimed', value: `${claimedShare}%` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-indigo-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-indigo-50/90">
                  {stats?.expired ? `${stats.expired} cleanup due` : 'Inventory healthy'}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Active" value={stats?.active ?? 0} helper="Ready for registration" tone="emerald" />
              <MetricCard label="Claimed" value={stats?.claimed ?? 0} helper="Already used by families or staff" tone="sky" />
              <MetricCard label="Expired" value={stats?.expired ?? 0} helper="No longer valid for onboarding" tone="amber" />
              <MetricCard label="Inventory" value={stats?.total ?? 0} helper="Total codes in circulation" tone="violet" />
            </div>
          </AnimatedContent>

          {status ? (
            <AnimatedContent delay={0.08}>
              <div
                className={`mt-5 flex items-start gap-4 rounded-[1.35rem] px-5 py-4 shadow-sm ${
                  status.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                <div className={`rounded-xl p-2 ${status.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {status.type === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                  )}
                </div>
                <div className="flex-1 pt-0.5 text-sm font-medium">{status.message}</div>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.1}>
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/92 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Directory</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Claim code registry</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Filter by type, status, or code and keep the onboarding inventory tidy.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => loadData(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </button>
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by code, email, or person"
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        setPage(1);
                      }}
                      className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-11 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>

                  <select
                    value={typeFilter}
                    onChange={(event) => {
                      setTypeFilter(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All types</option>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="staff">Staff</option>
                    <option value="parent">Parent</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPage(1);
                    }}
                    className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="all">All status</option>
                    <option value="active">Active</option>
                    <option value="claimed">Claimed</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.15rem] border border-slate-200/80 bg-slate-50/70">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                      <p className="mt-4 text-sm font-medium text-slate-500">Loading claim codes...</p>
                    </div>
                  ) : codes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="rounded-[1.2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                        <Ticket className="h-8 w-8 text-slate-300" />
                      </div>
                      <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950">No claim codes match this view</h3>
                      <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                        Adjust your filters or generate a new batch to reopen registration access.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200/80 text-left">
                          <thead className="bg-white/80">
                            <tr>
                              {['Code', 'Type', 'Status', 'Assigned', 'Expires', 'Claimed By', 'Action'].map((label) => (
                                <th
                                  key={label}
                                  className={`px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 ${label === 'Action' ? 'text-right' : ''}`}
                                >
                                  {label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70 bg-white/70">
                            {codes.map((code) => {
                              const owner = code.student || code.teacher;
                              const ownerName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null;
                              const statusMeta = getStatusMeta(code);
                              const typeClass = getTypeMeta(code.type);
                              const ownerInitial = ownerName?.charAt(0)?.toUpperCase() || code.type.charAt(0);

                              return (
                                <tr key={code.id} className="transition hover:bg-slate-50/90">
                                  <td className="px-5 py-4">
                                    <div className="font-mono text-sm font-semibold text-slate-950">{code.code}</div>
                                    <div className="mt-1 text-xs font-medium text-slate-400">Created {formatDateLabel(code.createdAt)}</div>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${typeClass}`}>
                                      {code.type}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    {ownerName ? (
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                                          {ownerInitial}
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900">{ownerName}</p>
                                          <p className="text-xs font-medium text-slate-400">Linked roster</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-sm font-medium text-slate-400">Unassigned</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-4 text-sm font-medium text-slate-500">{formatDateLabel(code.expiresAt)}</td>
                                  <td className="px-5 py-4 text-sm font-medium text-slate-500">
                                    {code.claimedByUser?.email || '--'}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <button
                                      onClick={() => handleRevoke(code.id)}
                                      disabled={Boolean(code.revokedAt) || Boolean(code.claimedAt)}
                                      className="inline-flex items-center gap-1.5 rounded-[0.85rem] px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Revoke
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {totalPages > 1 ? (
                        <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-slate-500">
                            Page <span className="font-semibold text-slate-950">{page}</span> of{' '}
                            <span className="font-semibold text-slate-950">{totalPages}</span>
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPage((current) => Math.max(1, current - 1))}
                              disabled={page === 1}
                              className="rounded-[0.85rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                              disabled={page === totalPages}
                              className="rounded-[0.85rem] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      <GenerateCodesModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onCodesGenerated={() => void loadData(true)}
      />

      <BulkUploadModal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        onSuccess={() => void loadData(true)}
        schoolId={schoolId}
      />
    </>
  );
}
