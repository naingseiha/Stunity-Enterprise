'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  Upload,
  XCircle,
  QrCode,
} from 'lucide-react';
import { claimCodeService, type ClaimCode, type ClaimCodeStats, type PendingLink } from '@/lib/api/claimCodes';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { TokenManager } from '@/lib/api/auth';
import { GenerateCodesModal } from '@/components/claim-codes/GenerateCodesModal';
import BulkUploadModal from '@/components/claim-codes/BulkUploadModal';
import { QRCodeModal } from '@/components/claim-codes/QRCodeModal';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useDebounce } from '@/hooks/useDebounce';

import { useTranslations } from 'next-intl';
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
      'border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/90 to-teal-100/40 shadow-emerald-100/30',
    sky: 'border-sky-200/60 bg-gradient-to-br from-white via-sky-50/90 to-cyan-100/40 shadow-sky-100/30',
    amber:
      'border-amber-200/60 bg-gradient-to-br from-white via-amber-50/90 to-orange-100/40 shadow-amber-100/30',
    violet:
      'border-violet-200/60 bg-gradient-to-br from-white via-violet-50/90 to-indigo-100/40 shadow-violet-100/30',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/70 backdrop-blur-sm ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-400">{helper}</p>
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

function formatDateTimeLabel(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function humanizeFieldKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function displayRequestValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => Boolean(entryValue))
      .map(([key, entryValue]) => `${humanizeFieldKey(key)}: ${displayRequestValue(entryValue)}`)
      .join(', ');
  }
  return String(value);
}

function getProfileRequestItems(requestedData: Record<string, any> = {}) {
  const requestedRegional = requestedData.customFields?.regional || {};
  const items: [string, string][] = [];

  if (requestedData.lastName || requestedData.firstName) {
    items.push(['Native name', [requestedData.lastName, requestedData.firstName].filter(Boolean).join(' ')]);
  }
  if (requestedData.englishLastName || requestedData.englishFirstName) {
    items.push(['International name', [requestedData.englishLastName, requestedData.englishFirstName].filter(Boolean).join(' ')]);
  }

  [
    ['Headline', requestedData.headline],
    ['Bio', requestedData.bio],
    ['Location', requestedData.location],
    ['Interests', requestedData.interests],
    ['Social links', requestedData.socialLinks],
    ['Profile photo', requestedData.profilePictureUrl ? 'New photo uploaded' : ''],
    ['Cover photo', requestedData.coverPhotoUrl ? 'New cover uploaded' : ''],
  ].forEach(([label, value]) => {
    const displayValue = displayRequestValue(value);
    if (displayValue.trim()) items.push([String(label), displayValue]);
  });

  Object.entries(requestedRegional)
    .filter(([, value]) => String(value || '').trim())
    .forEach(([key, value]) => items.push([humanizeFieldKey(key), String(value)]));

  return items;
}

export default function ClaimCodesPage() {
    const autoT = useTranslations();
  const router = useRouter();
  const t = useTranslations('common');
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'pending' | 'profile-requests'>('inventory');
  const [pendingLinks, setPendingLinks] = useState<PendingLink[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  
  // Profile requests state
  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [profileRequestsLoading, setProfileRequestsLoading] = useState(false);
  const [profileRequestSearch, setProfileRequestSearch] = useState('');
  const [profileRoleFilter, setProfileRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [reviewingProfileRequest, setReviewingProfileRequest] = useState<any | null>(null);
  const [rejectingProfileRequestId, setRejectingProfileRequestId] = useState<string | null>(null);
  const [profileRejectionReason, setProfileRejectionReason] = useState('');

  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [qrModalCode, setQrModalCode] = useState<ClaimCode | null>(null);
  const [reviewingPendingLink, setReviewingPendingLink] = useState<PendingLink | null>(null);
  const [approvingLinkId, setApprovingLinkId] = useState<string | null>(null);
  const [confirmingApproveLink, setConfirmingApproveLink] = useState<PendingLink | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [confirmingApproveProfileRequest, setConfirmingApproveProfileRequest] = useState<any | null>(null);
  const [approvingProfileRequestId, setApprovingProfileRequestId] = useState<string | null>(null);

  const userData = TokenManager.getUserData();
  const user = userData.user;
  const school = userData.school;
  const filteredProfileRequests = useMemo(() => {
    const query = profileRequestSearch.trim().toLowerCase();

    return profileRequests.filter((req) => {
      const role = req.user?.student ? 'student' : req.user?.teacher ? 'teacher' : 'unknown';
      if (profileRoleFilter !== 'all' && role !== profileRoleFilter) return false;
      if (!query) return true;

      const requestedItems = getProfileRequestItems(req.requestedData || {});
      const searchable = [
        req.user?.email,
        req.user?.student?.studentId,
        req.user?.teacher?.employeeId,
        req.user?.student?.firstName,
        req.user?.student?.lastName,
        req.user?.teacher?.firstName,
        req.user?.teacher?.lastName,
        ...requestedItems.flat(),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [profileRequests, profileRequestSearch, profileRoleFilter]);

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
      if (activeTab === 'inventory') {
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
      } else if (activeTab === 'pending') {
        setPendingLoading(true);
        const fetchedPending = await claimCodeService.getPendingLinks(schoolId);
        setPendingLinks(fetchedPending);
        setPendingLoading(false);
      } else if (activeTab === 'profile-requests') {
        setProfileRequestsLoading(true);
        const token = TokenManager.getAccessToken();
        if (token) {
          const { getProfileChangeRequests } = await import('@/lib/api/auth');
          const requests = await getProfileChangeRequests(token);
          setProfileRequests(requests);
        }
        setProfileRequestsLoading(false);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setStatus({ type: 'error', message: 'Unable to load data right now.' });
    } finally {
      setLoading(false);
      setPendingLoading(false);
      setProfileRequestsLoading(false);
      if (refresh) setIsRefreshing(false);
    }
  }, [activeTab, debouncedSearch, page, schoolId, statusFilter, typeFilter]);

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

  const handleApproveLink = async (userId: string) => {
    setApprovingLinkId(userId);
    setIsProcessingAction(true);
    try {
      await claimCodeService.approveLink(userId);
      setStatus({ type: 'success', message: 'Account link approved successfully.' });
      setConfirmingApproveLink(null);
      await loadData(true);
    } catch (error: any) {
      console.error('Failed to approve link:', error);
      setStatus({ type: 'error', message: error.message || 'Approval failed.' });
    } finally {
      setApprovingLinkId(null);
      setIsProcessingAction(false);
    }
  };

  const handleRejectLink = async () => {
    if (!rejectingUserId) return;
    setIsProcessingAction(true);
    try {
      await claimCodeService.rejectLink(rejectingUserId, rejectionReason);
      setStatus({ type: 'success', message: 'Account link rejected.' });
      setRejectingUserId(null);
      setRejectionReason('');
      await loadData(true);
    } catch (error: any) {
      console.error('Failed to reject link:', error);
      setStatus({ type: 'error', message: error.message || 'Rejection failed.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleApproveProfileChange = async (requestId: string) => {
    setApprovingProfileRequestId(requestId);
    setIsProcessingAction(true);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;
      const { approveProfileChangeRequest } = await import('@/lib/api/auth');
      await approveProfileChangeRequest(token, requestId);
      setStatus({ type: 'success', message: 'Profile change request approved.' });
      setConfirmingApproveProfileRequest(null);
      setReviewingProfileRequest(null);
      await loadData(true);
    } catch (error: any) {
      console.error('Failed to approve profile change:', error);
      setStatus({ type: 'error', message: error.message || 'Approval failed.' });
    } finally {
      setApprovingProfileRequestId(null);
      setIsProcessingAction(false);
    }
  };

  const handleRejectProfileChange = async () => {
    if (!rejectingProfileRequestId) return;
    setIsProcessingAction(true);
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;
      const { rejectProfileChangeRequest } = await import('@/lib/api/auth');
      await rejectProfileChangeRequest(token, rejectingProfileRequestId, profileRejectionReason.trim() || undefined);
      setStatus({ type: 'success', message: 'Profile change request rejected.' });
      setReviewingProfileRequest(null);
      setRejectingProfileRequestId(null);
      setProfileRejectionReason('');
      await loadData(true);
    } catch (error: any) {
      console.error('Failed to reject profile change:', error);
      setStatus({ type: 'error', message: error.message || 'Rejection failed.' });
    } finally {
      setIsProcessingAction(false);
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
        className: 'border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200',
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
      className: 'border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 text-slate-600',
    };
  }, []);

  const getTypeMeta = useCallback((type: string) => {
    const colors: Record<string, string> = {
      STUDENT: 'border-sky-200 bg-sky-50 text-sky-700',
      TEACHER: 'border-violet-200 bg-violet-50 text-violet-700',
      STAFF: 'border-amber-200 bg-amber-50 text-amber-700',
      PARENT: 'border-rose-200 bg-rose-50 text-rose-700',
    };

    return colors[type] || 'border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200';
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
            <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_30px_90px_-44px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
              <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_e7e83ab9" /></p>
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
                title={autoT("auto.web.admin_claim_codes_page.k_dcda99b0")}
                description="Generate, upload, and manage school access codes from one cleaner workspace."
                icon={Ticket}
                backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#f5f8ff_56%,#f0f9ff_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.18),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-indigo-600 font-bold"
                iconShellClassName="bg-slate-950 text-white shadow-lg shadow-indigo-500/20"
                actions={
                  <>
                    <button
                      onClick={() => setBulkUploadModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4 text-indigo-600" />
                      <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_ace06e2b" />
                    </button>
                    <button
                      onClick={() => setGenerateModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_e679efcc" />
                    </button>
                  </>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(49,46,129,0.98),rgba(67,56,202,0.94)_52%,rgba(14,116,144,0.9))] p-6 text-white shadow-[0_8px_32px_-8px_rgba(49,46,129,0.5)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_6d79fee4" /></p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight text-white">{readyScore}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-white/80"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_934ffc50" /></span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <ShieldCheck className="h-7 w-7 text-indigo-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-gray-900/10">
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
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/5 dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight text-white">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-white/70">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm font-black text-white backdrop-blur-md">
                  {stats?.expired ? `${stats.expired} cleanup due` : 'Inventory healthy'}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={autoT("auto.web.admin_claim_codes_page.k_e40472a4")} value={stats?.active ?? 0} helper="Ready for registration" tone="emerald" />
              <MetricCard label={autoT("auto.web.admin_claim_codes_page.k_f70d1505")} value={stats?.claimed ?? 0} helper="Already used by families or staff" tone="sky" />
              <MetricCard label={autoT("auto.web.admin_claim_codes_page.k_23e47a90")} value={stats?.expired ?? 0} helper="No longer valid for onboarding" tone="amber" />
              <MetricCard label={autoT("auto.web.admin_claim_codes_page.k_280b6d66")} value={stats?.total ?? 0} helper="Total codes in circulation" tone="violet" />
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
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 pt-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col">
                  <div className="flex gap-8 border-b border-transparent">
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className={`pb-4 text-sm font-black uppercase tracking-[0.2em] transition-colors ${
                        activeTab === 'inventory' ? 'border-b-2 border-indigo-500 text-slate-950' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_8ee4d99e" />
                    </button>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`relative pb-4 text-sm font-black uppercase tracking-[0.2em] transition-colors ${
                        activeTab === 'pending' ? 'border-b-2 border-indigo-500 text-slate-950' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_ea675ffe" />
                      {pendingLinks.length > 0 && (
                        <span className="absolute -right-4 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-lg shadow-rose-500/30 ring-2 ring-white">
                          {pendingLinks.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('profile-requests')}
                      className={`relative pb-4 text-sm font-black uppercase tracking-[0.2em] transition-colors ${
                        activeTab === 'profile-requests' ? 'border-b-2 border-indigo-500 text-slate-950' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_b77cf2fe" />
                      {profileRequests.length > 0 && (
                        <span className="absolute -right-4 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white shadow-lg shadow-amber-500/30 ring-2 ring-white">
                          {profileRequests.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pb-4">
                  <button
                    onClick={() => loadData(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:opacity-60"
                  >
                    {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_fec8ffdd" />
                  </button>
                  {activeTab === 'inventory' && (
                    <button
                      onClick={handleExport}
                      className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50"
                    >
                      <Download className="h-4 w-4" />
                      <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_2cd3a7bb" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                {activeTab === 'inventory' ? (
                  <>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px]">
                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder={autoT("auto.web.admin_claim_codes_page.k_a12a3062")}
                          value={searchQuery}
                          onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setPage(1);
                          }}
                          className="w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-11 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>

                      <select
                        value={typeFilter}
                        onChange={(event) => {
                          setTypeFilter(event.target.value);
                          setPage(1);
                        }}
                        className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="all">{autoT("auto.web.admin_claim_codes_page.k_adc3076b")}</option>
                        <option value="student">{autoT("auto.web.admin_claim_codes_page.k_1bb74a83")}</option>
                        <option value="teacher">{autoT("auto.web.admin_claim_codes_page.k_b90c37ef")}</option>
                        <option value="staff">{autoT("auto.web.admin_claim_codes_page.k_46b34a54")}</option>
                        <option value="parent">{autoT("auto.web.admin_claim_codes_page.k_b015a0ec")}</option>
                      </select>

                      <select
                        value={statusFilter}
                        onChange={(event) => {
                          setStatusFilter(event.target.value);
                          setPage(1);
                        }}
                        className="rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="all">{autoT("auto.web.admin_claim_codes_page.k_cef9cf4d")}</option>
                        <option value="active">{autoT("auto.web.admin_claim_codes_page.k_e40472a4")}</option>
                        <option value="claimed">{autoT("auto.web.admin_claim_codes_page.k_f70d1505")}</option>
                        <option value="expired">{autoT("auto.web.admin_claim_codes_page.k_23e47a90")}</option>
                        <option value="revoked">{autoT("auto.web.admin_claim_codes_page.k_868cf695")}</option>
                      </select>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                          <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_6d207ce3" /></p>
                        </div>
                      ) : codes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <div className="rounded-[1.2rem] bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-slate-200/80">
                            <Ticket className="h-8 w-8 text-slate-300" />
                          </div>
                          <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_4cc04063" /></h3>
                          <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                            <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_951f5c5f" />
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800/80 text-left">
                              <thead className="bg-white dark:bg-gray-900/80">
                                <tr>
                                  {['Code', 'Type', 'Status', 'Assigned', 'Expires', 'Claimed By', 'Action'].map((label) => (
                                    <th
                                      key={label}
                                      className={`px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 ${label === 'Action' ? 'text-right' : ''}`}
                                    >
                                      {label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                                {codes.map((code) => {
                                  const owner = code.student || code.teacher;
                                  const ownerName = owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null;
                                  const statusMeta = getStatusMeta(code);
                                  const typeClass = getTypeMeta(code.type);
                                  const ownerInitial = ownerName?.charAt(0)?.toUpperCase() || code.type.charAt(0);

                                  return (
                                    <tr key={code.id} className="transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                                      <td className="px-5 py-4">
                                        <div className="font-mono text-sm font-semibold text-slate-950">{code.code}</div>
                                        <div className="mt-1 text-xs font-medium text-slate-400"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_95e68454" /> {formatDateLabel(code.createdAt)}</div>
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
                                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{ownerName}</p>
                                              <p className="text-xs font-medium text-slate-400"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_42a5072d" /></p>
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-sm font-medium text-slate-400"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_efeb7d27" /></span>
                                        )}
                                      </td>
                                      <td className="px-5 py-4 text-sm font-medium text-slate-500">{formatDateLabel(code.expiresAt)}</td>
                                      <td className="px-5 py-4 text-sm font-medium text-slate-500">
                                        {code.claimedByUser?.email || '--'}
                                      </td>
                                      <td className="px-5 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                          {code.isActive && !code.claimedAt && !code.revokedAt && (
                                            <button
                                              onClick={() => setQrModalCode(code)}
                                              className="inline-flex items-center gap-1.5 rounded-[0.85rem] px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:bg-gray-800 hover:text-slate-900 dark:text-white shadow-sm"
                                              title={autoT("auto.web.admin_claim_codes_page.k_566e513d")}
                                            >
                                              <QrCode className="h-4 w-4" />
                                              QR
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleRevoke(code.id)}
                                            disabled={Boolean(code.revokedAt) || Boolean(code.claimedAt)}
                                            className="inline-flex items-center gap-1.5 rounded-[0.85rem] px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent shadow-sm"
                                          >
                                            <XCircle className="h-4 w-4" />
                                            <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_a7e002b2" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {totalPages > 1 ? (
                            <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-sm font-medium text-slate-500">
                                <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_44e74deb" /> <span className="font-semibold text-slate-950">{page}</span> <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_d5166b85" />{' '}
                                <span className="font-semibold text-slate-950">{totalPages}</span>
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                                  disabled={page === 1}
                                  className="rounded-[0.85rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_82e7f437" />
                                </button>
                                <button
                                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                  disabled={page === totalPages}
                                  className="rounded-[0.85rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_ee493a3e" />
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </>
                ) : activeTab === 'pending' ? (
                  <>
                    <div className="overflow-hidden rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50">
                      {pendingLoading ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                          <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_73f040be" /></p>
                        </div>
                      ) : pendingLinks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <div className="rounded-[1.2rem] bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-slate-200/80">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                          </div>
                          <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_a6368e05" /></h3>
                          <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                            <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_52baef18" />
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800/80 text-left">
                            <thead className="bg-white dark:bg-gray-900/80">
                              <tr>
                                {['User', 'Type', 'Code', 'Submitted', 'Actions'].map((label) => (
                                  <th
                                    key={label}
                                    className={`px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 ${label === 'Actions' ? 'text-right' : ''}`}
                                  >
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                              {pendingLinks.map((link) => {
                                const submittedAt = (link.pendingLinkData as any).submittedAt;
                                const type = link.pendingLinkData.type;
                                const typeClass = getTypeMeta(type);

                                return (
                                  <tr key={link.id} className="transition hover:bg-slate-50 dark:hover:bg-gray-800/50">
                                    <td className="px-5 py-3.5">
                                      <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white overflow-hidden shadow-sm ring-2 ring-white">
                                          {link.profilePictureUrl ? (
                                            <img src={link.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                            link.firstName.charAt(0)
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{link.firstName} {link.lastName}</p>
                                          <p className="text-xs text-slate-400">{link.email}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${typeClass}`}>
                                        {type}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-gray-300">{link.pendingLinkData.code}</span>
                                    </td>
                                    <td className="px-5 py-3.5 text-xs text-slate-500">
                                      {formatDateLabel(submittedAt)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => setRejectingUserId(link.id)}
                                          disabled={isProcessingAction}
                                          className="inline-flex items-center gap-1.5 rounded-[0.8rem] border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                          title={autoT("auto.web.admin_claim_codes_page.k_f03819e3")}
                                        >
                                          <XCircle className="h-3.5 w-3.5" />
                                          Reject
                                        </button>
                                        <button
                                          onClick={() => setReviewingPendingLink(link)}
                                          disabled={isProcessingAction}
                                          className="inline-flex items-center gap-1.5 rounded-[0.8rem] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 disabled:opacity-50"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          View
                                        </button>
                                        <button
                                          onClick={() => setConfirmingApproveLink(link)}
                                          disabled={isProcessingAction}
                                          className="inline-flex items-center gap-1.5 rounded-[0.8rem] bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                          {approvingLinkId === link.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                          )}
                                          Approve
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                ) : activeTab === 'profile-requests' ? (
                  <>
                    <div className="overflow-hidden rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50">
                      {profileRequestsLoading ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                          <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_11d521cc" /></p>
                        </div>
                      ) : profileRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                          <div className="rounded-[1.2rem] bg-white dark:bg-gray-900 p-4 shadow-sm ring-1 ring-slate-200/80">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                          </div>
                          <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_8e0ff2ce" /></h3>
                          <p className="mt-2 max-w-md text-sm font-medium text-slate-500">
                            <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_ca480546" />
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-gray-900/70">
                          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-gray-800/80 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-sm font-black text-slate-950 dark:text-white">
                                {filteredProfileRequests.length} of {profileRequests.length} pending requests
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Latest edits are shown first. Search by student, teacher, ID, or changed field.
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                  value={profileRequestSearch}
                                  onChange={(event) => setProfileRequestSearch(event.target.value)}
                                  placeholder="Search requests"
                                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 sm:w-64"
                                />
                              </div>
                              <select
                                value={profileRoleFilter}
                                onChange={(event) => setProfileRoleFilter(event.target.value as 'all' | 'student' | 'teacher')}
                                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                              >
                                <option value="all">All roles</option>
                                <option value="student">Students</option>
                                <option value="teacher">Teachers</option>
                              </select>
                            </div>
                          </div>

                          {filteredProfileRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                              <Search className="h-8 w-8 text-slate-300" />
                              <p className="mt-4 text-sm font-bold text-slate-500">No matching profile requests.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800/80 text-left">
                                <thead className="bg-white dark:bg-gray-900/80">
                                  <tr>
                                    {['User', 'Role', 'Fields Changed', 'Updated', 'Actions'].map((label) => (
                                      <th
                                        key={label}
                                        className={`px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 ${label === 'Actions' ? 'text-right' : ''}`}
                                      >
                                        {label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                                  {filteredProfileRequests.map((req) => {
                                    const role = req.user.student ? 'STUDENT' : req.user.teacher ? 'TEACHER' : 'UNKNOWN';
                                    const currentName = req.user.student
                                      ? `${req.user.student.lastName} ${req.user.student.firstName}`
                                      : req.user.teacher
                                      ? `${req.user.teacher.lastName} ${req.user.teacher.firstName}`
                                      : 'Unknown User';
                                    const targetId = req.user.student?.studentId || req.user.teacher?.employeeId || '--';
                                    const requestedItems = getProfileRequestItems(req.requestedData || {});

                                    return (
                                      <tr key={req.id} className="transition hover:bg-slate-50 dark:hover:bg-gray-800/50">
                                        <td className="px-5 py-3.5">
                                          <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                                              {currentName.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentName}</p>
                                              <p className="truncate text-xs text-slate-400">{req.user.email || targetId}</p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                                            role === 'STUDENT'
                                              ? 'border-sky-200 bg-sky-50 text-sky-700'
                                              : 'border-violet-200 bg-violet-50 text-violet-700'
                                          }`}>
                                            {role}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                                            {requestedItems.length} field{requestedItems.length !== 1 ? 's' : ''}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-500">
                                          {formatDateTimeLabel(req.updatedAt || req.createdAt)}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            <button
                                              onClick={() => {
                                                setRejectingProfileRequestId(req.id);
                                                setProfileRejectionReason('');
                                              }}
                                              disabled={isProcessingAction}
                                              className="inline-flex items-center gap-1.5 rounded-[0.8rem] border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                            >
                                              <XCircle className="h-3.5 w-3.5" />
                                              Reject
                                            </button>
                                            <button
                                              onClick={() => setReviewingProfileRequest(req)}
                                              disabled={isProcessingAction}
                                              className="inline-flex items-center gap-1.5 rounded-[0.8rem] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 disabled:opacity-50"
                                            >
                                              <Eye className="h-3.5 w-3.5" />
                                              View
                                            </button>
                                            <button
                                              onClick={() => setConfirmingApproveProfileRequest(req)}
                                              disabled={isProcessingAction}
                                              className="inline-flex items-center gap-1.5 rounded-[0.8rem] bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                              {approvingProfileRequestId === req.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                              )}
                                              Approve
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      <GenerateCodesModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onCodesGenerated={() => {
          setPage(1);
          void loadData(true);
        }}
      />

      <BulkUploadModal
        isOpen={bulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        onSuccess={() => {
          setPage(1);
          void loadData(true);
        }}
        schoolId={schoolId}
      />

      <QRCodeModal
        isOpen={!!qrModalCode}
        onClose={() => setQrModalCode(null)}
        claimCode={qrModalCode}
      />

      {reviewingProfileRequest && (() => {
        const req = reviewingProfileRequest;
        const role = req.user?.student ? 'STUDENT' : req.user?.teacher ? 'TEACHER' : 'UNKNOWN';
        const currentName = req.user?.student
          ? `${req.user.student.lastName} ${req.user.student.firstName}`
          : req.user?.teacher
          ? `${req.user.teacher.lastName} ${req.user.teacher.firstName}`
          : 'Unknown User';
        const targetId = req.user?.student?.studentId || req.user?.teacher?.employeeId || '--';
        const requestedData = req.requestedData || {};
        const requestedItems = getProfileRequestItems(requestedData);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-white/75 bg-white shadow-2xl ring-1 ring-slate-200/70 dark:bg-gray-900">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                    {currentName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">{currentName}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                        role === 'STUDENT'
                          ? 'border-sky-200 bg-sky-50 text-sky-700'
                          : 'border-violet-200 bg-violet-50 text-violet-700'
                      }`}>
                        {role}
                      </span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                        Pending
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{req.user?.email || 'No email'} • Target ID: {targetId}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Submitted {formatDateTimeLabel(req.createdAt)} • Updated {formatDateTimeLabel(req.updatedAt || req.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewingProfileRequest(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                  aria-label="Close review"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-5">
                {(requestedData.coverPhotoUrl || requestedData.profilePictureUrl) && (
                  <div className="mb-5 grid gap-4 sm:grid-cols-2">
                    {requestedData.coverPhotoUrl && (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-950">
                        <div className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pending Cover Photo</div>
                        <img src={requestedData.coverPhotoUrl} alt="Pending cover" className="h-40 w-full object-cover" />
                      </div>
                    )}
                    {requestedData.profilePictureUrl && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pending Profile Photo</p>
                        <img src={requestedData.profilePictureUrl} alt="Pending profile" className="mt-3 h-24 w-24 rounded-2xl object-cover ring-4 ring-white" />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                  {requestedItems.length > 0 ? (
                    requestedItems.map(([label, value]) => (
                      <div key={`${req.id}-modal-${label}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-950 dark:text-white">{value}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-bold text-slate-500 dark:border-gray-800 dark:bg-gray-950">
                      No field details available for this request.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:justify-end">
                <button
                  onClick={() => {
                    setRejectingProfileRequestId(req.id);
                    setProfileRejectionReason('');
                    setReviewingProfileRequest(null);
                  }}
                  disabled={isProcessingAction}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-black text-rose-600 transition hover:bg-rose-50 dark:bg-gray-900 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => setConfirmingApproveProfileRequest(req)}
                  disabled={isProcessingAction}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {approvingProfileRequestId === req.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {reviewingPendingLink && (() => {
        const link = reviewingPendingLink;
        const typeClass = getTypeMeta(link.pendingLinkData.type);
        const targetId = (link.pendingLinkData as any).studentId || (link.pendingLinkData as any).teacherId || 'Auto-create';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-white/75 bg-white shadow-2xl ring-1 ring-slate-200/70 dark:bg-gray-900">
              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-gray-800">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-sm ring-2 ring-white">
                    {link.profilePictureUrl ? (
                      <img src={link.profilePictureUrl} alt="" className="h-full w-full object-cover rounded-2xl" />
                    ) : (
                      link.firstName.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{link.firstName} {link.lastName}</h3>
                    <p className="text-sm font-semibold text-slate-500">{link.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReviewingPendingLink(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-gray-800 dark:bg-gray-900"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Account Type</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${typeClass}`}>
                      {link.pendingLinkData.type}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Claim Code</p>
                    <p className="mt-2 font-mono text-sm font-black text-indigo-600">{link.pendingLinkData.code}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Target Profile ID</p>
                    <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{targetId}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Submitted On</p>
                    <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{formatDateLabel((link.pendingLinkData as any).submittedAt)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 dark:border-gray-800 sm:flex-row sm:justify-end">
                <button
                  onClick={() => {
                    setRejectingUserId(link.id);
                    setReviewingPendingLink(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-black text-rose-600 transition hover:bg-rose-50 dark:bg-gray-900"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => {
                    void handleApproveLink(link.id);
                    setReviewingPendingLink(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Link
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {rejectingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900 p-8 shadow-2xl ring-1 ring-slate-200/70">
            <h3 className="text-xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_6fbbb29c" /></h3>
            <p className="mt-3 text-sm font-medium text-slate-500">
              <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_0140a960" />
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={autoT("auto.web.admin_claim_codes_page.k_0d417ba4")}
              disabled={isProcessingAction}
              className="mt-5 h-28 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setRejectingUserId(null)}
                disabled={isProcessingAction}
                className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:opacity-50"
              >
                <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_6952105b" />
              </button>
              <button
                onClick={handleRejectLink}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isProcessingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_b553b5c1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingApproveLink && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900 p-8 shadow-2xl ring-1 ring-slate-200/70">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Confirm Approval</h3>
            <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">
              Are you sure you want to approve the account link for <span className="font-bold text-slate-950 dark:text-white">{confirmingApproveLink.firstName} {confirmingApproveLink.lastName}</span>? This will grant them access to their school profile immediately.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setConfirmingApproveLink(null)}
                disabled={isProcessingAction}
                className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800/50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveLink(confirmingApproveLink.id)}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isProcessingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve Now
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectingProfileRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900 p-8 shadow-2xl ring-1 ring-slate-200/70">
            <h3 className="text-xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_a2426bc5" /></h3>
            <p className="mt-3 text-sm font-medium text-slate-500">
              <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_de6eb4d3" />
            </p>
            <textarea
              value={profileRejectionReason}
              onChange={(e) => setProfileRejectionReason(e.target.value)}
              placeholder={autoT("auto.web.admin_claim_codes_page.k_64bf4e60")}
              disabled={isProcessingAction}
              className="mt-5 h-28 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 py-3 text-sm font-medium outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setRejectingProfileRequestId(null);
                  setProfileRejectionReason('');
                }}
                disabled={isProcessingAction}
                className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 disabled:opacity-50"
              >
                <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_6952105b" />
              </button>
              <button
                onClick={handleRejectProfileChange}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isProcessingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                <AutoI18nText i18nKey="auto.web.admin_claim_codes_page.k_b553b5c1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmingApproveProfileRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900 p-8 shadow-2xl ring-1 ring-slate-200/70">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">Confirm Profile Update</h3>
            <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">
              Are you sure you want to approve the profile changes for <span className="font-bold text-slate-950 dark:text-white">
                {confirmingApproveProfileRequest.user?.student 
                  ? `${confirmingApproveProfileRequest.user.student.lastName} ${confirmingApproveProfileRequest.user.student.firstName}`
                  : `${confirmingApproveProfileRequest.user?.teacher?.lastName} ${confirmingApproveProfileRequest.user?.teacher?.firstName}`
                }
              </span>? This will overwrite their current profile data.
            </p>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setConfirmingApproveProfileRequest(null)}
                disabled={isProcessingAction}
                className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-gray-800/50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveProfileChange(confirmingApproveProfileRequest.id)}
                disabled={isProcessingAction}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isProcessingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
