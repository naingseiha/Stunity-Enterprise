'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
import CompactHeroCard from '@/components/layout/CompactHeroCard';
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
  Home,
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
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'gold' | 'sky' | 'emerald' | 'slate';
  icon: typeof Calendar;
}) {
  const tones = {
    gold: {
      surface: 'from-amber-400 via-orange-500 to-rose-500 shadow-amber-200/70 dark:shadow-orange-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    sky: {
      surface: 'from-blue-500 via-cyan-500 to-sky-500 shadow-blue-200/70 dark:shadow-blue-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    emerald: {
      surface: 'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-200/70 dark:shadow-emerald-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    slate: {
      surface: 'from-violet-500 via-fuchsia-500 to-pink-500 shadow-violet-200/70 dark:shadow-violet-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
  };
  const classes = tones[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-gradient-to-br ${classes.surface} p-5 text-white shadow-xl transition-all duration-500 hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl dark:border-white/5`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${classes.glow}`} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-white/30 via-white/10 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 opacity-30 transition-opacity group-hover:opacity-40">
        <svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none">
          <path
            d="M0 34 Q 18 28, 35 31 T 68 24 T 100 28 V 40 H 0 Z"
            fill="currentColor"
            className="text-white/20"
          />
          <path
            d="M0 34 Q 18 28, 35 31 T 68 24 T 100 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="text-white/30"
          />
        </svg>
      </div>
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">{label}</p>
          <p className="mt-3 text-3xl font-black leading-none tracking-tight text-white">{value}</p>
          <div className="mt-3 inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-md">
            {helper}
          </div>
        </div>
        <div className={`rounded-[1rem] p-3.5 shadow-lg backdrop-blur-md ring-1 ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
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
              <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_49090fd2" />
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
    const autoT = useTranslations();
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

      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] py-8 text-slate-900 transition-colors duration-500 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1120_52%,#020617_100%)] dark:text-white lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <CompactHeroCard
              eyebrow={autoT("auto.web.settings_academic_years_page.k_9514e3cc")}
              title="Academic years"
              description="Plan and manage yearly cycles from one workspace."
              icon={Calendar}
              breadcrumbs={
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500/70">
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200">
                    <Home className="h-3.5 w-3.5" />
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_0294d612" />
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-slate-900 dark:text-gray-100">Academic years</span>
                </div>
              }
              backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(255,247,237,0.96)_48%,rgba(254,243,199,0.9))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
              glowClassName="bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.14),transparent_58%)] dark:bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.12),transparent_58%)]"
              eyebrowClassName="text-orange-700 dark:text-orange-300"
              iconShellClassName="bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
              actions={
                <>
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
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950 dark:hover:text-white"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_cada1811" />
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
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:from-indigo-500 hover:via-violet-500 hover:to-blue-500"
                  >
                    <Sparkles className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_e19251ee" />
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950 dark:hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_f32da73f" />
                  </button>
                </>
              }
            />

            <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-gray-800 dark:bg-gray-900/95 dark:text-gray-100">
              <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
              <div className="absolute -right-14 top-6 h-40 w-40 rounded-full bg-amber-300/10 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_646c3e25" />
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">{years.length}</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_e6a507e3" />
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15">
                    <Calendar className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="text-xl font-black text-slate-900 dark:text-gray-100">{activeCount}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_036d4aa6" />
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="text-xl font-black text-slate-900 dark:text-gray-100">{promotionReadyCount}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_0479f2db" />
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_161a6d3c" />
                  </p>
                  <p className="mt-2 text-base font-black tracking-tight">
                    {currentYear?.name || 'Not assigned yet'}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
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
                <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_60e44598" /></p>
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
                <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_49178c43" /></p>
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
                label={autoT("auto.web.settings_academic_years_page.k_2eaf5176")}
                value={years.length}
                helper="All school years on record"
                tone="gold"
                icon={Calendar}
              />
              <MetricCard
                label={autoT("auto.web.settings_academic_years_page.k_e272c68e")}
                value={planningCount}
                helper="Cycles still being prepared"
                tone="sky"
                icon={Clock}
              />
              <MetricCard
                label={autoT("auto.web.settings_academic_years_page.k_5d0524bc")}
                value={archivedCount}
                helper="Closed and protected for reference"
                tone="slate"
                icon={Archive}
              />
              <MetricCard
                label={autoT("auto.web.settings_academic_years_page.k_a3d0836d")}
                value={promotionReadyCount}
                helper="Cycles waiting on final advancement"
                tone="emerald"
                icon={TrendingUp}
              />
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={160}>
            <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white dark:bg-gray-900/90 p-6 shadow-[0_34px_100px_-46px_rgba(15,23,42,0.35)] ring-1 ring-white/90 backdrop-blur dark:border-gray-800/80 dark:bg-gray-950/80 dark:ring-gray-800/70 sm:p-7">
              <div className="flex flex-col gap-5 border-b border-slate-200 dark:border-gray-800/80 pb-5 dark:border-gray-800 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_7d46bbce" />
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_a11e9048" />
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_7bcbee4f" />
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
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_44cd9963" />
                  </h3>
                  <p className="mt-3 max-w-md text-sm font-medium text-slate-500 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_8f1a18e2" />
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-[0_20px_45px_-22px_rgba(245,158,11,0.72)] transition hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_ca667391" />
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
                        className={`rounded-[1.55rem] border p-5 shadow-sm transition dark:border-gray-800 dark:bg-gray-950/90 ${
                          year.isCurrent
                            ? 'border-amber-200 bg-white ring-1 ring-amber-100/80 dark:border-amber-900/40 dark:bg-gray-950'
                            : 'border-slate-200 bg-white dark:border-gray-800/80 dark:bg-gray-950/90'
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
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_524d8380" />
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
                              <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_6d363632" />
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                                  {getDurationLabel(year.startDate, year.endDate)}
                                </p>
                              </div>
                              <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_f3be0054" />
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                                  {year.isPromotionDone ? 'Completed' : 'Pending'}
                                </p>
                              </div>
                              <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900/70">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_8c5e8ee2" />
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
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_52f3b4b0" />
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
                                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_2b40647b" />
                                  </button>
                                )}

                              {year.isPromotionDone && (
                                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_11662fc9" />
                                </span>
                              )}

                              <button
                                onClick={() => handleOpenCopyModal(year)}
                                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700 transition hover:bg-sky-600 hover:text-white dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-300"
                              >
                                <Copy className="h-4 w-4" />
                                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_7998dd0f" />
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
                                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_e2f771fb" />
                              </button>

                              {year.status === 'ENDED' && !year.isPromotionDone && (
                                <button
                                  onClick={() => handleArchiveYear(year)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700 dark:text-gray-200 transition hover:bg-slate-950 hover:text-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white dark:bg-gray-900 dark:hover:text-slate-900 dark:text-white"
                                >
                                  <Archive className="h-4 w-4" />
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_f63a471d" />
                                </button>
                              )}

                              {!year.isCurrent && year.status === 'PLANNING' && (
                                <button
                                  onClick={() => handleDeleteYear(year)}
                                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-rose-700 transition hover:bg-rose-600 hover:text-white dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_5906f2d3" />
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
          title={autoT("auto.web.settings_academic_years_page.k_2bc24a51")}
          subtitle="Define the calendar window and optionally inherit structure from a previous cycle."
          onClose={closeCreateModal}
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeCreateModal}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 transition hover:text-slate-950 dark:border-gray-800 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_4cffa94f" />
              </button>
              <button
                onClick={handleCreateYear}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_20px_45px_-22px_rgba(245,158,11,0.72)] transition hover:-translate-y-0.5"
              >
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_6c224945" />
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="rounded-[1.4rem] border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_aa1e2440" />
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-gray-300">
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_e1c18534" />
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_1cc05a2e" /></FieldLabel>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newYearName}
                    onChange={(e) => setNewYearName(e.target.value)}
                    placeholder={autoT("auto.web.settings_academic_years_page.k_843c6bba")}
                    className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_ac25b9c6" /></FieldLabel>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_bd639e93" /></FieldLabel>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_632f23ad" /></FieldLabel>
                <div className="relative">
                  <select
                    value={copyFromYearId}
                    onChange={(e) => setCopyFromYearId(e.target.value)}
                    className="w-full appearance-none rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 pr-12 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">{autoT("auto.web.settings_academic_years_page.k_fb8e7494")}</option>
                    {years.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} ({autoT("auto.web.shared.dynamic.copyIncludes")})
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 rotate-90 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {showEditModal && selectedYear && (
        <ModalShell
          title={autoT("auto.web.settings_academic_years_page.k_977389de")}
          subtitle={`Update the calendar window for ${selectedYear.name}.`}
          onClose={closeEditModal}
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 transition hover:text-slate-950 dark:border-gray-800 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_4cffa94f" />
              </button>
              <button
                onClick={handleUpdateYear}
                className="flex-1 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-none dark:bg-gray-900 dark:text-slate-950 dark:hover:bg-slate-100 dark:bg-none dark:bg-gray-800"
              >
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_ea44ed2e" />
              </button>
            </div>
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_1cc05a2e" /></FieldLabel>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={editYearName}
                  onChange={(e) => setEditYearName(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 py-3.5 pl-12 pr-4 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_ac25b9c6" /></FieldLabel>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-500/10 dark:border-gray-800 dark:bg-none dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_bd639e93" /></FieldLabel>
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
          title={autoT("auto.web.settings_academic_years_page.k_a3dc4d85")}
          subtitle={`This permanently removes ${selectedYear.name} if no dependent records are attached.`}
          onClose={closeDeleteModal}
          maxWidth="max-w-lg"
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeDeleteModal}
                className="flex-1 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-5 py-3 text-sm font-bold text-slate-700 dark:text-gray-200 transition hover:text-slate-950 dark:border-gray-800 dark:bg-none dark:bg-gray-950 dark:text-gray-300 dark:hover:text-white"
              >
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_4cffa94f" />
              </button>
              <button
                onClick={confirmDeleteYear}
                className="flex-1 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
              >
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_2d5786be" />
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
                  <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_d48cb1d2" />
                </p>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {showCopyModal && copySourceYear && (
        <ModalShell
          title={autoT("auto.web.settings_academic_years_page.k_b098d044")}
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
                <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_4cffa94f" />
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
                      <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_b0c0c218" />
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <MetricCard
                    label={autoT("auto.web.settings_academic_years_page.k_27c06af6")}
                    value={copyPreviewData?.subjectsCount || 0}
                    helper="Subjects available to copy"
                    tone="sky"
                  />
                  <MetricCard
                    label={autoT("auto.web.settings_academic_years_page.k_dcdf3756")}
                    value={copyPreviewData?.teachersCount || 0}
                    helper="Teacher assignments available"
                    tone="emerald"
                  />
                  <MetricCard
                    label={autoT("auto.web.settings_academic_years_page.k_b6e09360")}
                    value={copyPreviewData?.classesCount || 0}
                    helper="Classes available to copy"
                    tone="gold"
                  />
                </>
              )}
            </div>

            <div>
              <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_365eab00" /></FieldLabel>
              <div className="relative">
                <select
                  value={copyTargetYearId}
                  onChange={(e) => setCopyTargetYearId(e.target.value)}
                  disabled={copyLoading}
                  className="w-full appearance-none rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-4 py-3.5 pr-12 text-sm font-semibold text-slate-900 dark:text-white outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">{autoT("auto.web.settings_academic_years_page.k_a7f49ecd")}</option>
                  {years
                    .filter((year) => year.id !== copySourceYear.id)
                    .map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name}
                      </option>
                    ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 rotate-90 text-slate-400" />
              </div>
            </div>

            <div>
              <FieldLabel><AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_24809b0d" /></FieldLabel>
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
                        <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_cf30c55e" />
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                        <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_cd55cc9d" />
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
                        <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_91f06326" />
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                        <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_7386b976" />
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
                        <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_f6c92431" />
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                        <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_7a280421" />
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
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_cb3d4a63" />
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600 dark:text-gray-400">
                    <AutoI18nText i18nKey="auto.web.settings_academic_years_page.k_79b1f571" />
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
