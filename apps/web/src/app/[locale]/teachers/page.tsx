'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Edit,
  Eye,
  Lock,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import DirectoryPagination from '@/components/DirectoryPagination';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AdminResetPasswordModal from '@/components/AdminResetPasswordModal';
import TeacherModal from '@/components/teachers/TeacherModal';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { TokenManager } from '@/lib/api/auth';
import { claimCodeService } from '@/lib/api/claimCodes';
import { deleteTeacher } from '@/lib/api/teachers';
import { useTeachers, type Teacher } from '@/hooks/useTeachers';
import { useDebounce } from '@/hooks/useDebounce';
import { useAcademicYear } from '@/contexts/AcademicYearContext';

const ITEMS_PER_PAGE = 20;
const TEACHER_SERVICE_URL = process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004';

function formatGenderLabel(value?: string | null) {
  switch ((value || '').toUpperCase()) {
    case 'MALE':
      return 'Male';
    case 'FEMALE':
      return 'Female';
    default:
      return 'Unspecified';
  }
}

function getTeacherInitials(teacher: Teacher) {
  const firstInitial = teacher.firstNameLatin?.charAt(0) ?? '';
  const lastInitial = teacher.lastNameLatin?.charAt(0) ?? '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'TC';
}

function getTeacherStatus(teacher: Teacher) {
  if (!teacher.isActive) {
    return {
      label: 'Inactive',
      helper: 'Teacher record exists but is not active.',
      needsAction: true,
      pillClass:
        'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    };
  }

  if (!teacher.position && !teacher.email && !teacher.phoneNumber) {
    return {
      label: 'Needs profile',
      helper: 'Add role and contact information.',
      needsAction: true,
      pillClass:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    };
  }

  if (!teacher.position) {
    return {
      label: 'Missing role',
      helper: 'Add teaching role or department.',
      needsAction: true,
      pillClass:
        'bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20',
    };
  }

  if (!teacher.email && !teacher.phoneNumber) {
    return {
      label: 'No contact',
      helper: 'Add phone or email for follow-up.',
      needsAction: true,
      pillClass:
        'bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
    };
  }

  return {
    label: 'Ready',
    helper: 'Role and contact details are present.',
    needsAction: false,
    pillClass:
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  };
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: 'violet' | 'emerald' | 'blue' | 'slate';
}) {
  const toneClasses = {
    violet: {
      shell:
        'border-violet-100/80 bg-gradient-to-br from-white via-violet-50/70 to-fuchsia-50/70 shadow-violet-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    },
    emerald: {
      shell:
        'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-teal-50/80 shadow-emerald-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    blue: {
      shell:
        'border-blue-100/80 bg-gradient-to-br from-white via-blue-50/70 to-cyan-50/80 shadow-blue-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
    slate: {
      shell:
        'border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 shadow-slate-200/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
    },
  };

  const styles = toneClasses[tone];

  return (
    <div className={`relative overflow-hidden rounded-[1.2rem] border p-5 shadow-xl backdrop-blur-xl ${styles.shell}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/65 blur-2xl dark:bg-white/5" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-[0.95rem] p-3 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  title,
  onClick,
  disabled,
  tone,
  icon: Icon,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  tone: 'slate' | 'blue' | 'amber' | 'rose';
  icon: LucideIcon;
}) {
  const toneClasses = {
    slate:
      'border-slate-200/70 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white',
    blue:
      'border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:border-blue-500/30',
    amber:
      'border-amber-100 bg-amber-50 text-amber-600 hover:border-amber-200 hover:text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:border-amber-500/30',
    rose:
      'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-200 hover:text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:border-rose-500/30',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function TeachersPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [page, setPage] = useState(1);
  const { selectedYear } = useAcademicYear();

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;
  const schoolId = school?.id;

  const {
    teachers,
    pagination,
    isLoading,
    isValidating,
    error,
    mutate,
    isEmpty,
  } = useTeachers({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch,
  });

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalCount = pagination.total || 0;
  const visibleCount = teachers.length;
  const reachableCount = useMemo(
    () => teachers.filter((teacher) => Boolean(teacher.email || teacher.phoneNumber)).length,
    [teachers]
  );
  const withRoleCount = useMemo(
    () => teachers.filter((teacher) => Boolean(teacher.position)).length,
    [teachers]
  );
  const readyCount = useMemo(
    () => teachers.filter((teacher) => !getTeacherStatus(teacher).needsAction).length,
    [teachers]
  );
  const needsAttentionCount = useMemo(
    () => teachers.filter((teacher) => getTeacherStatus(teacher).needsAction).length,
    [teachers]
  );
  const facultyReadinessRate = visibleCount > 0 ? Math.round((readyCount / visibleCount) * 100) : 0;
  const hasSearch = Boolean(debouncedSearch.trim());

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const handleGenerateCode = async (teacher: Teacher) => {
    if (!schoolId) return;

    try {
      setIsGenerating(teacher.id);
      const codes = await claimCodeService.generate(schoolId, {
        type: 'TEACHER',
        count: 1,
        teacherIds: [teacher.id],
        expiresInDays: 30,
      });

      if (codes && codes.length > 0) {
        await navigator.clipboard.writeText(codes[0]);
        alert(`Claim code generated for ${teacher.firstNameLatin} ${teacher.lastNameLatin}:\n\n${codes[0]}\n\nThis code has been copied to your clipboard.`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to generate claim code for this teacher.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;

    try {
      await deleteTeacher(id);
      mutate();
    } catch (error: any) {
      alert(error.message || 'Failed to delete teacher.');
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedTeacher(null);
    setShowModal(true);
  };

  const handleModalClose = (refresh?: boolean) => {
    setShowModal(false);
    setSelectedTeacher(null);
    if (refresh) {
      mutate();
    }
  };

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-gray-50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/10" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/10" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <CompactHeroCard
                  eyebrow="Faculty Operations"
                  title="Teacher directory"
                  description="Manage faculty records and onboarding tools."
                  icon={UserCog}
                  chipsPosition="below"
                  backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(238,242,255,0.96)_48%,rgba(224,242,254,0.92))]"
                  glowClassName="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_58%)]"
                  eyebrowClassName="text-violet-700"
                  chips={
                    <>
                      <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                        {selectedYear?.name || 'No academic year selected'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                        {totalCount} faculty records
                      </span>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                        {needsAttentionCount} need attention
                      </span>
                      {hasSearch ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                          Search active
                        </span>
                      ) : null}
                    </>
                  }
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => mutate()}
                        disabled={isValidating}
                        className="inline-flex items-center gap-2 rounded-[0.75rem] border border-slate-200/60 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800/60 dark:bg-gray-900/90 dark:text-gray-200"
                      >
                        <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={handleAdd}
                        className="inline-flex items-center gap-2 rounded-[0.75rem] bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 px-5 py-2.5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="h-4 w-4" />
                        Add Teacher
                      </button>
                    </>
                  }
                />
              </div>

              <div className="relative h-full overflow-hidden rounded-[1.65rem] border border-violet-300/85 bg-gradient-to-br from-white via-violet-200/80 to-blue-200/90 p-6 text-slate-900 shadow-[0_34px_90px_-38px_rgba(99,102,241,0.28)] ring-1 ring-violet-200/80 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-400/45 blur-3xl dark:bg-violet-500/20" />
                <div className="pointer-events-none absolute -bottom-14 left-0 h-40 w-40 rounded-full bg-blue-400/35 blur-3xl dark:bg-blue-500/20" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Faculty Pulse
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{facultyReadinessRate}%</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          ready
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border border-violet-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-violet-200/75 dark:border-white/10 dark:bg-white/10 dark:ring-white/10">
                      <UserCog className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-200/75 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 transition-all duration-700"
                      style={{ width: `${Math.max(visibleCount ? facultyReadinessRate : 0, visibleCount > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-violet-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-violet-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{visibleCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Visible
                      </p>
                    </div>
                    <div className="rounded-[0.95rem] border border-violet-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-violet-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{readyCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Ready
                      </p>
                    </div>
                    <div className="rounded-[0.95rem] border border-violet-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-violet-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{needsAttentionCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Action
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="inline-flex items-center rounded-full border border-violet-200/85 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      Profile health
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={50}>
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Faculty Total"
                value={String(totalCount)}
                helper="Directory total"
                icon={UserCog}
                tone="violet"
              />
              <MetricCard
                label="Reachable"
                value={String(reachableCount)}
                helper="Phone or email present"
                icon={Mail}
                tone="emerald"
              />
              <MetricCard
                label="With Role"
                value={String(withRoleCount)}
                helper="Position recorded"
                icon={Briefcase}
                tone="blue"
              />
              <MetricCard
                label="Ready Profiles"
                value={String(readyCount)}
                helper="Operationally complete"
                icon={BookOpen}
                tone="slate"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={100}>
            <section className="overflow-hidden rounded-[1.35rem] border border-slate-200/60 bg-white/80 shadow-xl shadow-slate-200/35 backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-black/20">
              <div className="border-b border-slate-200/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      Faculty Workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {hasSearch ? 'Filtered teacher results' : 'Teacher operations directory'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {visibleCount} visible
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {hasSearch ? `Search: "${debouncedSearch}"` : 'No keyword filter'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by teacher, ID, phone, or email"
                      className="h-14 w-full rounded-[0.75rem] border border-slate-200/70 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                    />
                  </label>

                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-[0.75rem] border border-slate-200/70 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      Reset Search
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                {isValidating && !isLoading ? (
                  <div className="absolute right-6 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-lg dark:bg-white dark:text-slate-900">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Syncing
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="overflow-x-auto px-6 py-4 sm:px-8">
                    <table className="min-w-full">
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                        <TableSkeleton rows={8} />
                      </tbody>
                    </table>
                  </div>
                ) : error ? (
                  <div className="px-6 py-16 text-center sm:px-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">Failed to load teachers</h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {error instanceof Error ? error.message : 'Something went wrong while loading teachers.'}
                    </p>
                  </div>
                ) : isEmpty ? (
                  <div className="px-6 py-16 text-center sm:px-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20">
                      <UserCog className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                      {hasSearch ? 'No teachers match this search' : 'No teachers found yet'}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {hasSearch
                        ? 'Try a different keyword for teacher, ID, or contact details.'
                        : 'Start by adding your first teacher record to the directory.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="mt-5 inline-flex items-center gap-2 rounded-[0.8rem] bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 px-4 py-2.5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Teacher
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-800">
                        <thead className="bg-slate-50/80 dark:bg-gray-950/40">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500 sm:px-8">
                              Faculty Member
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Contact
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Assignment
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Status
                            </th>
                            <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                          {teachers.map((teacher) => {
                            const teacherStatus = getTeacherStatus(teacher);

                            return (
                              <tr
                                key={teacher.id}
                                className="align-top transition-colors hover:bg-slate-50/70 dark:hover:bg-gray-950/30"
                              >
                                <td className="px-6 py-4 sm:px-8">
                                  <div className="flex items-start gap-3.5">
                                    {teacher.photoUrl ? (
                                      <img
                                        src={`${TEACHER_SERVICE_URL}${teacher.photoUrl}`}
                                        alt={`${teacher.firstNameLatin} ${teacher.lastNameLatin}`}
                                        className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-gray-800"
                                      />
                                    ) : (
                                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 text-sm font-black text-white shadow-lg shadow-blue-500/15">
                                        {getTeacherInitials(teacher)}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                          {teacher.firstNameLatin} {teacher.lastNameLatin}
                                        </p>
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                          ID {teacher.teacherId}
                                        </span>
                                      </div>
                                      {teacher.firstNameKhmer ? (
                                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                                          {teacher.firstNameKhmer} {teacher.lastNameKhmer || ''}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="space-y-1.5">
                                    <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300">
                                      <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500" />
                                      {teacher.phoneNumber || 'No phone'}
                                    </p>
                                    <p className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                                      <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-gray-500" />
                                      {teacher.email || 'No email'}
                                    </p>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="space-y-2">
                                    <div className="rounded-[0.95rem] border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 dark:border-gray-800/70 dark:bg-gray-950/50">
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {teacher.position || 'Role not assigned'}
                                      </p>
                                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                                        {teacher.department || 'No department'}
                                      </p>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                      {formatGenderLabel(teacher.gender)}
                                    </span>
                                  </div>
                                </td>

                                <td className="px-6 py-4">
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${teacherStatus.pillClass}`}>
                                    {teacherStatus.label}
                                  </span>
                                  <p className="mt-2 max-w-xs text-xs font-medium leading-5 text-slate-500 dark:text-gray-400">
                                    {teacherStatus.helper}
                                  </p>
                                </td>

                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <ActionButton
                                      title="Generate Claim Code"
                                      onClick={() => handleGenerateCode(teacher)}
                                      disabled={isGenerating === teacher.id}
                                      tone="blue"
                                      icon={Ticket}
                                    />
                                    <ActionButton
                                      title="View"
                                      onClick={() => router.push(`/${locale}/teachers/${teacher.id}`)}
                                      tone="slate"
                                      icon={Eye}
                                    />
                                    <ActionButton
                                      title="Reset Password"
                                      onClick={() => {
                                        setSelectedTeacher(teacher);
                                        setShowResetModal(true);
                                      }}
                                      tone="amber"
                                      icon={Lock}
                                    />
                                    <ActionButton
                                      title="Edit"
                                      onClick={() => handleEdit(teacher)}
                                      tone="slate"
                                      icon={Edit}
                                    />
                                    <ActionButton
                                      title="Delete"
                                      onClick={() => handleDelete(teacher.id)}
                                      tone="rose"
                                      icon={Trash2}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <DirectoryPagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={setPage}
                      totalItems={pagination.total}
                      itemsPerPage={pagination.limit}
                    />
                  </>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {showModal ? <TeacherModal teacher={selectedTeacher} onClose={handleModalClose} /> : null}

      {showResetModal && selectedTeacher ? (
        <AdminResetPasswordModal
          user={{
            id: selectedTeacher.id,
            name: `${selectedTeacher.firstNameLatin} ${selectedTeacher.lastNameLatin}`,
            email: selectedTeacher.email ?? undefined,
          }}
          onClose={() => {
            setShowResetModal(false);
            setSelectedTeacher(null);
          }}
        />
      ) : null}
    </>
  );
}
