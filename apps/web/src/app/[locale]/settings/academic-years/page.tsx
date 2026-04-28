'use client';

import { useMemo, useRef, useState, use, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import {
  archiveAcademicYear,
  copySettings,
  createAcademicYear,
  deleteAcademicYear,
  getCopyPreview,
  setCurrentAcademicYear,
  type AcademicYear,
  updateAcademicYear,
} from '@/lib/api/academic-years';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useAcademicYearsList } from '@/hooks/useAcademicYears';
import {
  prefetchAcademicYearComparison,
  prefetchSetupTemplates,
} from '@/hooks/useAcademicYearResources';
import {
  AlertCircle,
  Archive,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Edit,
  GraduationCap,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDurationLabel(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  );
  return `${months} mo`;
}

function getStatusMeta(status: string) {
  const statusMap = {
    PLANNING: {
      label: 'Planning',
      icon: Clock,
      badge:
        'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
      helper: 'Preparation and setup',
    },
    ACTIVE: {
      label: 'Active',
      icon: CheckCircle2,
      badge:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
      helper: 'Live academic operations',
    },
    ENDED: {
      label: 'Ended',
      icon: TrendingUp,
      badge:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
      helper: 'Ready for close-out actions',
    },
    ARCHIVED: {
      label: 'Archived',
      icon: Archive,
      badge:
        'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 text-slate-700 dark:text-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300',
      helper: 'Locked for record keeping',
    },
  } as const;

  return statusMap[status as keyof typeof statusMap] || statusMap.PLANNING;
}

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'gold' | 'sky' | 'emerald' | 'slate';
}) {
  const tones = {
    gold:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/75',
    sky:
      'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/75',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/75',
    slate:
      'border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/95 to-slate-100/80',
  };

  return (
    <div
      className={`rounded-[1.35rem] border p-5 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.22)] ring-1 ring-white/70 dark:border-gray-800/70 dark:bg-gray-900/80 dark:ring-gray-800/70 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidth} overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-gray-800/80 bg-white dark:bg-gray-900 shadow-[0_42px_120px_-44px_rgba(15,23,42,0.45)] ring-1 ring-white/80 dark:border-gray-800 dark:bg-gray-950 dark:ring-gray-800 animate-in slide-in-from-bottom-3 duration-300`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-gray-800/80 px-6 py-5 dark:border-gray-800">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
              Cycle Management
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
              {subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-slate-400 transition hover:text-slate-900 dark:text-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[72vh] overflow-y-auto px-6 py-6">{children}</div>
        <div className="border-t border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/70">
          {footer}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-3 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
      {children}
    </label>
  );
}

export default function AcademicYearsManagementPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;

  const userData = TokenManager.getUserData();
  const user = userData?.user;
  const school = userData?.school;
  const { refreshYears } = useAcademicYear();
  const { years, isLoading: isLoadingYears, mutate: mutateYears } = useAcademicYearsList(school?.id);

  const successTimeoutRef = useRef<number | null>(null);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);

  const [newYearName, setNewYearName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [copyFromYearId, setCopyFromYearId] = useState('');

  const [editYearName, setEditYearName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState<AcademicYear | null>(null);
  const [copyTargetYearId, setCopyTargetYearId] = useState('');
  const [copyPreviewData, setCopyPreviewData] = useState<any>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copySubjects, setCopySubjects] = useState(true);
  const [copyTeachers, setCopyTeachers] = useState(true);
  const [copyClasses, setCopyClasses] = useState(true);

  const loading = Boolean(school?.id) && isLoadingYears && years.length === 0;

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const refreshAcademicYearsData = async () => {
    await Promise.allSettled([mutateYears(), refreshYears()]);
  };

  const showTimedSuccess = (message: string) => {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }
    setSuccessMessage(message);
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessMessage('');
      successTimeoutRef.current = null;
    }, 3000);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setError('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedYear(null);
    setError('');
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedYear(null);
    setError('');
  };

  const closeCopyModal = () => {
    setShowCopyModal(false);
    setCopySourceYear(null);
    setCopyTargetYearId('');
    setCopyPreviewData(null);
    setCopyError('');
  };

  const handleCreateYear = async () => {
    if (!newYearName || !newStartDate || !newEndDate) {
      setError('Please fill all fields');
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      await createAcademicYear(
        schoolId,
        {
          name: newYearName,
          startDate: new Date(newStartDate).toISOString(),
          endDate: new Date(newEndDate).toISOString(),
          copiedFromYearId: copyFromYearId || undefined,
        },
        token
      );

      setError('');
      setNewYearName('');
      setNewStartDate('');
      setNewEndDate('');
      setCopyFromYearId('');
      closeCreateModal();
      await refreshAcademicYearsData();
      showTimedSuccess('Academic year created successfully.');
    } catch (err: any) {
      setError(`Error creating academic year: ${err.message}`);
    }
  };

  const handleSetCurrent = async (yearId: string) => {
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await setCurrentAcademicYear(schoolId, yearId, token);
      setError('');
      await refreshAcademicYearsData();
      showTimedSuccess('Current academic year updated.');
    } catch (err: any) {
      setError(`Error setting current year: ${err.message}`);
    }
  };

  const handleEditYear = (year: AcademicYear) => {
    setSelectedYear(year);
    setEditYearName(year.name);
    setEditStartDate(year.startDate.split('T')[0]);
    setEditEndDate(year.endDate.split('T')[0]);
    setShowEditModal(true);
  };

  const handleUpdateYear = async () => {
    if (!editYearName || !editStartDate || !editEndDate || !selectedYear) {
      setError('Please fill all fields');
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await updateAcademicYear(
        schoolId,
        selectedYear.id,
        {
          name: editYearName,
          startDate: new Date(editStartDate).toISOString(),
          endDate: new Date(editEndDate).toISOString(),
        },
        token
      );

      setError('');
      closeEditModal();
      setEditYearName('');
      setEditStartDate('');
      setEditEndDate('');
      await refreshAcademicYearsData();
      showTimedSuccess('Academic year updated successfully.');
    } catch (err: any) {
      setError(`Error updating year: ${err.message}`);
    }
  };

  const handleDeleteYear = (year: AcademicYear) => {
    setSelectedYear(year);
    setShowDeleteModal(true);
  };

  const confirmDeleteYear = async () => {
    if (!selectedYear) return;

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await deleteAcademicYear(schoolId, selectedYear.id, token);
      setError('');
      closeDeleteModal();
      await refreshAcademicYearsData();
      showTimedSuccess('Academic year deleted successfully.');
    } catch (err: any) {
      setError(`Error deleting year: ${err.message}`);
    }
  };

  const handleArchiveYear = async (year: AcademicYear) => {
    if (!confirm(`Archive academic year "${year.name}"? This will make it read-only.`)) {
      return;
    }

    try {
      const token = TokenManager.getAccessToken();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) {
        router.push(`/${locale}/auth/login`);
        return;
      }

      await archiveAcademicYear(schoolId, year.id, token);
      setError('');
      await refreshAcademicYearsData();
      showTimedSuccess(`Academic year "${year.name}" has been archived successfully.`);
    } catch (err: any) {
      setError(`Error archiving year: ${err.message}`);
    }
  };

  const handleOpenCopyModal = async (year: AcademicYear) => {
    setCopySourceYear(year);
    setCopyTargetYearId('');
    setCopySubjects(true);
    setCopyTeachers(true);
    setCopyClasses(true);
    setCopyError('');
    setCopyPreviewData(null);
    setShowCopyModal(true);

    try {
      setCopyLoading(true);
      const token = TokenManager.getAccessToken();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      const preview = await getCopyPreview(schoolId, year.id, token);
      setCopyPreviewData(preview);
    } catch (err: any) {
      setCopyError(`Failed to load preview: ${err.message}`);
    } finally {
      setCopyLoading(false);
    }
  };

  const handleExecuteCopy = async () => {
    if (!copySourceYear || !copyTargetYearId) {
      setCopyError('Please select a target year');
      return;
    }

    if (!copySubjects && !copyTeachers && !copyClasses) {
      setCopyError('Please select at least one option to copy');
      return;
    }

    try {
      setCopyLoading(true);
      setCopyError('');
      const token = TokenManager.getAccessToken();
      const schoolId = userData?.school?.id || userData?.school?.id;

      if (!token || !schoolId) return;

      await copySettings(
        schoolId,
        copySourceYear.id,
        {
          toAcademicYearId: copyTargetYearId,
          copySettings: {
            subjects: copySubjects,
            teachers: copyTeachers,
            classes: copyClasses,
          },
        },
        token
      );

      closeCopyModal();
      await refreshAcademicYearsData();
      showTimedSuccess('Settings copied successfully.');
    } catch (err: any) {
      setCopyError(`Failed to copy settings: ${err.message}`);
    } finally {
      setCopyLoading(false);
    }
  };

  const currentYear = years.find((year) => year.isCurrent);

  const orderedYears = useMemo(
    () =>
      [...years].sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }),
    [years]
  );

  const planningCount = years.filter((year) => year.status === 'PLANNING').length;
  const activeCount = years.filter((year) => year.status === 'ACTIVE').length;
  const archivedCount = years.filter((year) => year.status === 'ARCHIVED').length;
  const promotionReadyCount = years.filter(
    (year) => (year.isCurrent || year.status === 'ENDED') && !year.isPromotionDone
  ).length;

  if (loading) {
    return <PageSkeleton user={user} school={school} type="cards" showFilters={false} />;
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.06),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] py-8 text-slate-900 dark:text-white transition-colors duration-500 dark:bg-none dark:bg-gray-950 dark:text-white lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
            <span>Settings</span>
            <ChevronRight className="h-4 w-4" />
            <span>Academic Years</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-white via-orange-50/75 to-amber-50/90 p-7 shadow-[0_8px_32px_-8px_rgba(15,23,42,0.18)] ring-1 ring-white/80 dark:border-gray-800/80 dark:bg-none dark:bg-gray-900/90 dark:ring-gray-800/70 sm:p-8">
              <div className="absolute inset-y-0 right-0 w-64 bg-[radial-gradient(circle_at_center,_rgba(251,146,60,0.22),_transparent_66%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/70 bg-white dark:bg-gray-900/80 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-orange-700 shadow-sm shadow-orange-100/50 dark:border-orange-900/60 dark:bg-gray-900/80 dark:text-orange-300">
                  <Calendar className="h-3.5 w-3.5" />
                  Cycle Administration
                </div>
                <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[2.75rem]">
                  Academic years with cleaner control and better flow.
                </h1>
                <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-gray-400">
                  Run each school cycle from planning to promotion in one calm workspace.
                  Setup, activate, archive, and copy structure without losing operational
                  clarity.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    onClick={() => router.push(`/${locale}/reports/year-comparison`)}
                    onMouseEnter={() => {
                      router.prefetch(`/${locale}/reports/year-comparison`);
                      prefetchAcademicYearComparison(school?.id);
                    }}
                    onFocus={() => {
                      router.prefetch(`/${locale}/reports/year-comparison`);
                      prefetchAcademicYearComparison(school?.id);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Compare Years
                  </button>
                  <button
                    onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                    onMouseEnter={() => {
                      router.prefetch(`/${locale}/settings/academic-years/new/wizard`);
                      prefetchSetupTemplates(school?.id);
                    }}
                    onFocus={() => {
                      router.prefetch(`/${locale}/settings/academic-years/new/wizard`);
                      prefetchSetupTemplates(school?.id);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200/80 bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-[0_20px_45px_-22px_rgba(234,88,12,0.7)] transition hover:-translate-y-0.5 hover:bg-orange-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    Setup Wizard
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_20px_45px_-22px_rgba(245,158,11,0.72)] transition hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    Quick Create
                  </button>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 p-6 text-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.45)] ring-1 ring-white/10 dark:border-gray-800/90">
              <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="absolute -right-14 top-6 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/60">
                      Cycle Pulse
                    </p>
                    <h2 className="mt-3 text-4xl font-black tracking-tight">{years.length}</h2>
                    <p className="mt-2 text-sm font-medium text-white/70">
                      Academic cycles tracked in this school setup.
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-white dark:bg-gray-900/10 ring-1 ring-white/10">
                    <Calendar className="h-7 w-7 text-amber-200" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.15rem] border border-white/10 bg-white dark:bg-gray-900/5 p-4">
                    <p className="text-2xl font-black">{activeCount}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                      Active
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/10 bg-white dark:bg-gray-900/5 p-4">
                    <p className="text-2xl font-black">{promotionReadyCount}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                      Promotion Ready
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white dark:bg-gray-900/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                    Current Cycle
                  </p>
                  <p className="mt-3 text-lg font-black tracking-tight">
                    {currentYear?.name || 'Not assigned yet'}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/60">
                    {currentYear
                      ? `${formatDateLabel(currentYear.startDate)} - ${formatDateLabel(
                          currentYear.endDate
                        )}`
                      : 'Set one cycle as current to keep planning and promotion actions in sync.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
              <div className="rounded-xl bg-rose-100 p-2 dark:bg-rose-900/40">
                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                <p className="mt-1 text-sm font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-rose-400 transition hover:text-rose-600 dark:hover:text-rose-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mt-6 flex items-start gap-4 rounded-[1.35rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              <div className="rounded-xl bg-emerald-100 p-2 dark:bg-emerald-900/40">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-[0.18em]">Success</p>
                <p className="mt-1 text-sm font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage('')}
                className="text-emerald-400 transition hover:text-emerald-600 dark:hover:text-emerald-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <AnimatedContent animation="slide-up" delay={100}>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Cycles"
                value={years.length}
                helper="All school years on record"
                tone="gold"
              />
              <MetricCard
                label="Planning"
                value={planningCount}
                helper="Cycles still being prepared"
                tone="sky"
              />
              <MetricCard
                label="Archived"
                value={archivedCount}
                helper="Closed and protected for reference"
                tone="slate"
              />
              <MetricCard
                label="Promotion Queue"
                value={promotionReadyCount}
                helper="Cycles waiting on final advancement"
                tone="emerald"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={160}>
            <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white dark:bg-gray-900/90 p-6 shadow-[0_34px_100px_-46px_rgba(15,23,42,0.35)] ring-1 ring-white/90 backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/80 dark:ring-gray-800/70 sm:p-7">
              <div className="flex flex-col gap-5 border-b border-slate-200 dark:border-gray-800/80 pb-5 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    Cycle Workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    All academic years
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    Review lifecycle status, set the active cycle, and manage rollover
                    actions from one clean list.
                  </p>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 py-3 text-sm font-medium text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                  {currentYear ? `Current cycle: ${currentYear.name}` : 'No current cycle assigned'}
                </div>
              </div>

              {orderedYears.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-20 text-center dark:border-gray-800 dark:bg-gray-900/70">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white dark:bg-gray-900 shadow-sm dark:bg-gray-950">
                    <Calendar className="h-8 w-8 text-slate-300 dark:text-gray-600" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    No academic years yet
                  </h3>
                  <p className="mt-3 max-w-md text-sm font-medium text-slate-500 dark:text-gray-400">
                    Create the first cycle to start planning classes, promotion, and annual
                    reporting around one academic calendar.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-[0_20px_45px_-22px_rgba(245,158,11,0.72)] transition hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    Create Academic Year
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {orderedYears.map((year) => {
                    const status = getStatusMeta(year.status);
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={year.id}
                        className={`rounded-[1.55rem] border p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_32px_90px_-42px_rgba(15,23,42,0.4)] dark:border-gray-800 dark:bg-none dark:bg-gray-950/90 ${
                          year.isCurrent
                            ? 'border-amber-200 bg-gradient-to-br from-white via-amber-50/50 to-orange-50/50 ring-1 ring-amber-100/80 dark:border-amber-900/40 dark:bg-none dark:bg-gray-950'
                            : 'border-slate-200 dark:border-gray-800/80 bg-white dark:bg-none dark:bg-gray-950/90'
                        }`}
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                                {year.name}
                              </h3>
                              {year.isCurrent && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                                  <Star className="h-3.5 w-3.5 fill-current" />
                                  Current
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${status.badge}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {status.label}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-gray-400">
                              {formatDateLabel(year.startDate)} - {formatDateLabel(year.endDate)}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                              {status.helper}
                            </p>

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                              <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.1)] dark:border-gray-800 dark:bg-gray-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                  Duration
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                                  {getDurationLabel(year.startDate, year.endDate)}
                                </p>
                              </div>
                              <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.1)] dark:border-gray-800 dark:bg-gray-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                  Promotion
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                                  {year.isPromotionDone ? 'Completed' : 'Pending'}
                                </p>
                              </div>
                              <div className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.1)] dark:border-gray-800 dark:bg-gray-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                  Cycle Type
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                                  {year.isCurrent
                                    ? 'Live'
                                    : year.status === 'ARCHIVED'
                                      ? 'Historic'
                                      : 'Managed'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="xl:w-[330px]">
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                              {!year.isCurrent && year.status !== 'ARCHIVED' && (
                                <button
                                  onClick={() => handleSetCurrent(year.id)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-amber-700 transition hover:bg-amber-600 hover:text-white dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300"
                                >
                                  <Play className="h-4 w-4 fill-current" />
                                  Set Current
                                </button>
                              )}

                              {(year.isCurrent || year.status === 'ENDED') &&
                                !year.isPromotionDone && (
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/${locale}/settings/academic-years/${year.id}/promote`
                                      )
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 transition hover:bg-emerald-600 hover:text-white dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300"
                                  >
                                    <TrendingUp className="h-4 w-4" />
                                    Promote Students
                                  </button>
                                )}

                              {year.isPromotionDone && (
                                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Promotion Complete
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenCopyModal(year)}
                                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700 transition hover:bg-sky-600 hover:text-white dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300"
                              >
                                <Copy className="h-4 w-4" />
                                Copy Settings
                              </button>

                              <button
                                onClick={() => handleEditYear(year)}
                                disabled={year.status === 'ARCHIVED'}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] transition ${
                                  year.status === 'ARCHIVED'
                                    ? 'cursor-not-allowed border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 text-slate-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                                    : 'border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 hover:bg-slate-950 hover:text-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white dark:bg-gray-900 dark:hover:text-slate-900 dark:text-white'
                                }`}
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </button>

                              {year.status === 'ENDED' && !year.isPromotionDone && (
                                <button
                                  onClick={() => handleArchiveYear(year)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 dark:text-gray-200 transition hover:bg-slate-950 hover:text-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white dark:bg-gray-900 dark:hover:text-slate-900 dark:text-white"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </button>
                              )}

                              {!year.isCurrent && year.status === 'PLANNING' && (
                                <button
                                  onClick={() => handleDeleteYear(year)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-rose-700 transition hover:bg-rose-600 hover:text-white dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </AnimatedContent>
        </div>
      </div>

      {showCreateModal && (
        <ModalShell
          title="Create academic year"
          subtitle="Define the calendar window and optionally inherit structure from a previous cycle."
          onClose={closeCreateModal}
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeCreateModal}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 transition hover:text-slate-950 dark:border-gray-800 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateYear}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_20px_45px_-22px_rgba(245,158,11,0.72)] transition hover:-translate-y-0.5"
              >
                Create Year
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="rounded-[1.4rem] border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                Planning Note
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-gray-300">
                New cycles start in planning mode so your team can finalize classes, staff,
                and promotion timing before going live.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel>Academic Year Name</FieldLabel>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/0 text-slate-400" />
                  <input
                    type="text"
                    value={newYearName}
                    onChange={(e) => setNewYearName(e.target.value)}
                    placeholder="e.g., 2026-2027"
                    className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Start Date</FieldLabel>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <FieldLabel>End Date</FieldLabel>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Copy From Existing Cycle</FieldLabel>
                <div className="relative">
                  <select
                    value={copyFromYearId}
                    onChange={(e) => setCopyFromYearId(e.target.value)}
                    className="w-full appearance-none rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 pr-12 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Start from scratch</option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} (Classes, Subjects, Teachers)
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/0 rotate-90 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {showEditModal && selectedYear && (
        <ModalShell
          title="Edit academic year"
          subtitle={`Update the calendar window for ${selectedYear.name}.`}
          onClose={closeEditModal}
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 transition hover:text-slate-950 dark:border-gray-800 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateYear}
                className="flex-1 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-none dark:bg-gray-900 dark:text-slate-950 dark:hover:bg-slate-100 dark:bg-none dark:bg-gray-800"
              >
                Save Changes
              </button>
            </div>
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Academic Year Name</FieldLabel>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/0 text-slate-400" />
                <input
                  type="text"
                  value={editYearName}
                  onChange={(e) => setEditYearName(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Start Date</FieldLabel>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <FieldLabel>End Date</FieldLabel>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </ModalShell>
      )}

      {showDeleteModal && selectedYear && (
        <ModalShell
          title="Delete academic year"
          subtitle={`This permanently removes ${selectedYear.name} if no dependent records are attached.`}
          onClose={closeDeleteModal}
          maxWidth="max-w-lg"
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 transition hover:text-slate-950 dark:border-gray-800 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteYear}
                className="flex-1 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                Delete Year
              </button>
            </div>
          }
        >
          <div className="space-y-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-rose-50 dark:bg-rose-950/30">
              <Trash2 className="h-8 w-8 text-rose-600 dark:text-rose-300" />
            </div>
            <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-300" />
                <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
                  Deletion only succeeds if classes, records, or other linked data are not
                  attached to this cycle.
                </p>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {showCopyModal && copySourceYear && (
        <ModalShell
          title="Copy institutional settings"
          subtitle={`Move structure forward from ${copySourceYear.name} without carrying student records.`}
          onClose={closeCopyModal}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeCopyModal}
                disabled={copyLoading}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCopy}
                disabled={copyLoading || !copyTargetYearId}
                className="flex-[1.4] rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copyLoading ? 'Copying Settings...' : 'Apply Copy'}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {copyLoading && !copyPreviewData ? (
                <div className="md:col-span-3 flex items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 py-16 dark:border-gray-800 dark:bg-gray-900/70">
                  <div className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-700 dark:text-gray-200">
                      Preparing copy preview...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <MetricCard
                    label="Subjects"
                    value={copyPreviewData?.subjectsCount || 0}
                    helper="Subjects available to copy"
                    tone="sky"
                  />
                  <MetricCard
                    label="Teachers"
                    value={copyPreviewData?.teachersCount || 0}
                    helper="Teacher assignments available"
                    tone="emerald"
                  />
                  <MetricCard
                    label="Classes"
                    value={copyPreviewData?.classesCount || 0}
                    helper="Classes available to copy"
                    tone="gold"
                  />
                </>
              )}
            </div>

            <div>
              <FieldLabel>Target Academic Year</FieldLabel>
              <div className="relative">
                <select
                  value={copyTargetYearId}
                  onChange={(e) => setCopyTargetYearId(e.target.value)}
                  disabled={copyLoading}
                  className="w-full appearance-none rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 py-3.5 pr-12 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Select destination cycle...</option>
                  {years
                    .filter((year) => year.id !== copySourceYear.id)
                    .map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/0 rotate-90 text-slate-400" />
              </div>
            </div>

            <div>
              <FieldLabel>What To Copy</FieldLabel>
              <div className="grid gap-4 md:grid-cols-3">
                <label
                  className={`rounded-[1.2rem] border p-4 transition ${
                    copySubjects
                      ? 'border-sky-300 bg-sky-50 dark:border-sky-900/60 dark:bg-sky-950/20'
                      : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:border-gray-800 dark:bg-gray-950'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={copySubjects}
                    onChange={(e) => setCopySubjects(e.target.checked)}
                    disabled={copyLoading}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        copySubjects
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:bg-gray-900 dark:text-gray-400'
                      }`}
                    >
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        Subjects
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                        Course structure and subject catalog
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`rounded-[1.2rem] border p-4 transition ${
                    copyTeachers
                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:border-gray-800 dark:bg-gray-950'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={copyTeachers}
                    onChange={(e) => setCopyTeachers(e.target.checked)}
                    disabled={copyLoading}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        copyTeachers
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:bg-gray-900 dark:text-gray-400'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        Teachers
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                        Faculty assignment framework
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`rounded-[1.2rem] border p-4 transition ${
                    copyClasses
                      ? 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:border-gray-800 dark:bg-gray-950'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={copyClasses}
                    onChange={(e) => setCopyClasses(e.target.checked)}
                    disabled={copyLoading}
                    className="sr-only"
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        copyClasses
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:bg-gray-900 dark:text-gray-400'
                      }`}
                    >
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        Classes
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                        Grade and section shell only
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">
                    Copy rules
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                    This creates independent copies. Student enrollments, attendance, and
                    transactional records are not moved into the new cycle.
                  </p>
                </div>
              </div>
            </div>

            {copyError && (
              <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600 dark:text-rose-300" />
                  <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
                    {copyError}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </>
  );
}
