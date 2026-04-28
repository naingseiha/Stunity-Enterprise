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
  Trash2,
  UserCog,
  CheckSquare,
  Square,
  X,
  LayoutGrid,
  List,
  BarChart3,
  Download,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  Search,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useCallback } from 'react';
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

function getTeacherDisplayName(teacher: Teacher) {
  const native = [teacher.lastName, teacher.firstName].filter(Boolean).join(' ').trim();
  if (native) return native;
  return teacher.khmerName?.trim() || 'N/A';
}

function getTeacherInternationalName(teacher: Teacher, nativeName?: string) {
  const english = [teacher.englishLastName, teacher.englishFirstName].filter(Boolean).join(' ').trim();
  if (!english || english === nativeName) return 'N/A';
  return english;
}

type TeacherStatus = {
  label: string;
  helper: string;
  tone: 'rose' | 'amber' | 'orange' | 'emerald';
  needsAction: boolean;
  pillClass: string;
};

function getTeacherStatus(teacher: Teacher): TeacherStatus {
  if (!teacher.isActive) {
    return {
      label: 'Inactive',
      helper: 'Profile disabled',
      tone: 'rose',
      needsAction: true,
      pillClass:
        'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    };
  }

  if (!teacher.position && !teacher.email && !teacher.phoneNumber) {
    return {
      label: 'Draft',
      helper: 'Missing role & contact',
      tone: 'amber',
      needsAction: true,
      pillClass:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    };
  }

  if (!teacher.position) {
    return {
      label: 'Incomplete',
      helper: 'Missing teaching role',
      tone: 'orange',
      needsAction: true,
      pillClass:
        'bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20',
    };
  }

  return {
    label: 'Verified',
    helper: 'Operational ready',
    tone: 'emerald',
    needsAction: false,
    pillClass:
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  };
}

function GenderBadge({ gender }: { gender: string }) {
  const isMale = gender.toUpperCase() === 'MALE';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isMale
          ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20'
          : 'bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-100 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20'
      }`}
    >
      {isMale ? 'M' : 'F'}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone?: 'emerald' | 'blue' | 'amber' | 'slate' | 'violet';
}) {
  const toneClasses = {
    emerald: {
      shell: 'border-emerald-500/10 bg-emerald-500/5 dark:border-emerald-500/20 dark:bg-emerald-500/5',
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    },
    blue: {
      shell: 'border-blue-500/10 bg-blue-500/5 dark:border-blue-500/20 dark:bg-blue-500/5',
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    },
    amber: {
      shell: 'border-amber-500/10 bg-amber-500/5 dark:border-amber-500/20 dark:bg-amber-500/5',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    },
    violet: {
      shell: 'border-violet-500/10 bg-violet-500/5 dark:border-violet-500/20 dark:bg-violet-500/5',
      icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    },
    slate: {
      shell: 'border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/50 dark:border-gray-800/60 dark:bg-gray-900/40',
      icon: 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:bg-gray-800 dark:text-gray-400',
    },
  };

  const styles = toneClasses[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.4rem] border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/40 ${styles.shell}`}
    >
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-4 text-4xl font-black tracking-tighter text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-gray-400">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3.5 transition-transform duration-300 group-hover:scale-110 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  title,
  onClick,
  tone = 'neutral',
  disabled = false,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  tone?: 'neutral' | 'blue' | 'amber' | 'rose' | 'emerald';
  disabled?: boolean;
}) {
  const toneClasses = {
    neutral: 'text-slate-500 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800',
    blue: 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10',
    emerald: 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10',
    amber: 'text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-gray-400 dark:hover:text-amber-300 dark:hover:bg-amber-500/10',
    rose: 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200 dark:border-gray-800/60 dark:hover:border-gray-800 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[tone]}`}
    >
      <Icon className="h-[1.1rem] w-[1.1rem]" />
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
  const [isCompactView, setIsCompactView] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
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

  const placementData = useMemo(() => [
    { name: 'Ready', value: readyCount, color: '#10B981' },
    { name: 'Action Needed', value: needsAttentionCount, color: '#F59E0B' },
  ], [readyCount, needsAttentionCount]);

  const genderData = useMemo(() => {
    const counts = teachers.reduce((acc: any, teacher) => {
      const gender = (teacher.gender || 'UNKNOWN').toUpperCase();
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ 
      name: name === 'MALE' ? 'Male' : name === 'FEMALE' ? 'Female' : 'Other', 
      value,
      color: name === 'MALE' ? '#3B82F6' : name === 'FEMALE' ? '#D946EF' : '#64748B'
    }));
  }, [teachers]);

  const handleExport = useCallback(() => {
    const exportData = teachers.map(teacher => ({
      'Teacher ID': teacher.teacherId,
      'Last Name': teacher.lastName || '-',
      'First Name': teacher.firstName || '-',
      'International Full Name': getTeacherInternationalName(teacher),
      'Gender': teacher.gender,
      'Position': teacher.position || 'N/A',
      'Department': teacher.department || 'N/A',
      'Email': teacher.email || 'N/A',
      'Phone': teacher.phoneNumber || 'N/A',
      'Status': getTeacherStatus(teacher).label
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Teachers');
    XLSX.writeFile(wb, `Teachers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [teachers]);

  const toggleTeacherSelection = (id: string) => {
    const newSelection = new Set(selectedTeachers);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTeachers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTeachers.size === teachers.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(teachers.map(t => t.id)));
    }
  };

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
        alert(`Claim code generated for ${teacher.lastName} ${teacher.firstName}:\n\n${codes[0]}\n\nThis code has been copied to your clipboard.`);
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

      <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-800/50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-blue-50/90 via-white/40 to-transparent dark:from-blue-950/10 dark:via-transparent" />
        <div className="pointer-events-none absolute -left-16 top-0 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-[100px] transition-all duration-1000 dark:bg-blue-500/20" />
        <div className="pointer-events-none absolute right-0 top-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-[120px] dark:bg-cyan-500/20" />
        <div className="pointer-events-none absolute bottom-10 right-10 h-96 w-96 rounded-full bg-amber-300/10 blur-[140px] dark:bg-amber-500/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/0 -translate-y-1/0 rounded-full bg-indigo-500/5 blur-[100px] transition-all duration-1000 dark:bg-indigo-500/10" />

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <CompactHeroCard
                  eyebrow="Faculty Operations"
                  title="Teacher directory"
                  description="Manage faculty records and onboarding tools."
                  icon={UserCog}
                  chipsPosition="below"
                  backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(238,242,255,0.96)_48%,rgba(224,242,254,0.92))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                  glowClassName="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_58%)] dark:opacity-50"
                  eyebrowClassName="text-violet-700"
                  chips={
                    <>
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
                        {selectedYear?.name || 'No academic year selected'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:text-gray-200 dark:ring-gray-700/70">
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
                      <div className="flex items-center gap-1.5 rounded-[0.9rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/50 p-1 dark:border-gray-800/60 dark:bg-gray-900/50">
                        <button
                          type="button"
                          onClick={() => setIsCompactView(false)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.6rem] transition-all ${!isCompactView ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:text-blue-400 dark:ring-gray-700' : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                          title="Comfortable view"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCompactView(true)}
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.6rem] transition-all ${isCompactView ? 'bg-white dark:bg-gray-900 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:text-blue-400 dark:ring-gray-700' : 'text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300'}`}
                          title="Compact view"
                        >
                          <List className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`inline-flex items-center gap-2 rounded-[0.75rem] border border-slate-200 dark:border-gray-800/60 px-4 py-2.5 text-sm font-semibold transition-all ${showAnalytics ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20' : 'bg-white dark:bg-gray-900/90 text-slate-700 dark:text-gray-200 dark:bg-gray-900/90 dark:text-gray-200'}`}
                      >
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                      </button>

                      <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex items-center gap-2 rounded-[0.75rem] border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/90 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)] dark:border-gray-800/60 dark:bg-gray-900/90 dark:text-gray-200"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>

                      <button
                        type="button"
                        onClick={handleAdd}
                        className="inline-flex items-center gap-2 rounded-[0.75rem] bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Plus className="h-4 w-4" />
                        Add Teacher
                      </button>
                    </>
                  }
                />
              </div>

              <div className="relative h-full overflow-hidden rounded-[1.65rem] border border-violet-300/80 bg-gradient-to-br from-white via-violet-200/80 to-blue-200/90 p-6 text-slate-900 dark:text-white shadow-[0_8px_32px_-8px_rgba(99,102,241,0.3)] ring-1 ring-violet-200/80 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-400/40 blur-3xl dark:bg-violet-500/20" />
                <div className="pointer-events-none absolute -bottom-14 left-0 h-40 w-40 rounded-full bg-blue-400/30 blur-3xl dark:bg-blue-500/20" />
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                        Faculty Pulse
                      </p>
                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-5xl font-black tracking-tighter">{facultyReadinessRate}%</span>
                        <span className="pb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          ready
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[0.95rem] border border-violet-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-violet-200/75 dark:border-white/10 dark:bg-gray-900/10 dark:ring-white/10">
                      <UserCog className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-violet-200/75 dark:bg-gray-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 transition-all duration-700"
                      style={{ width: `${Math.max(visibleCount ? facultyReadinessRate : 0, visibleCount > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-violet-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-violet-200/60 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{visibleCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Visible
                      </p>
                    </div>
                    <div className="rounded-[0.95rem] border border-violet-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-violet-200/60 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{readyCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Ready
                      </p>
                    </div>
                    <div className="rounded-[0.95rem] border border-violet-200/80 bg-white dark:bg-gray-900/95 p-3 shadow-sm ring-1 ring-violet-200/60 dark:border-white/10 dark:bg-gray-900/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{needsAttentionCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Action
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="inline-flex items-center rounded-full border border-violet-200/80 bg-white dark:bg-gray-900/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-gray-900/5 dark:text-slate-300">
                      Profile health
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          {showAnalytics && !isEmpty && (
            <AnimatedContent animation="slide-up" delay={25}>
              <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile Readiness</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Faculty profiles completeness status</p>
                    </div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{visibleCount} Records</div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="h-32 w-32 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={placementData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {placementData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {placementData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-slate-900 dark:text-white">{item.value}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded dark:bg-gray-800">
                              {Math.round((item.value / (visibleCount || 1)) * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gender Diversity</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Breakdown of faculty members</p>
                    </div>
                    <UserCog className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={genderData} layout="vertical" margin={{ left: -20, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl border border-white/10">
                                  {payload[0].value} Teachers
                                </div>
                              );
                            }
                              return null;
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 4, 4, 0]} 
                          barSize={20}
                        >
                          {genderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </AnimatedContent>
          )}

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
            <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-800/60 bg-white dark:bg-gray-900/80 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-gray-800/60 dark:bg-gray-900/80 dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)]">
              <div className="border-b border-slate-200 dark:border-gray-800/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      Faculty Workspace
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                      {hasSearch ? 'Filtered teacher results' : 'Teacher operations directory'}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {visibleCount} visible
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-gray-800/80 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {hasSearch ? `Search: "${debouncedSearch}"` : 'No keyword filter'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/0 text-slate-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by teacher, ID, phone, or email"
                      className="h-14 w-full rounded-[0.75rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 pl-11 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                    />
                  </label>

                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-[0.75rem] border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 px-5 text-sm font-semibold text-slate-700 dark:text-gray-200 transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      Reset Search
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                {isValidating && !isLoading ? (
                  <div className="absolute right-6 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.55)] dark:bg-gray-900 dark:text-white">
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
                        <thead className={`bg-slate-50 dark:bg-none dark:bg-gray-800/50 dark:bg-none dark:bg-gray-950/40 ${isCompactView ? 'h-10' : ''}`}>
                          <tr className="border-b border-slate-200 dark:border-gray-800/70 dark:border-gray-800/70">
                            <th className={`w-14 px-6 ${isCompactView ? 'py-2' : 'py-5'} sm:px-8`}>
                              <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="inline-flex items-center justify-center"
                              >
                                {selectedTeachers.size === teachers.length && teachers.length > 0 ? (
                                  <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                ) : selectedTeachers.size > 0 ? (
                                  <div className="h-[18px] w-[18px] rounded border-2 border-blue-500 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.25)]" />
                                ) : (
                                  <Square className="h-[18px] w-[18px] text-slate-300 transition-colors hover:text-slate-500 dark:text-gray-700 dark:text-gray-200 dark:hover:text-gray-500" />
                                )}
                              </button>
                            </th>
                            <th className={`px-6 ${isCompactView ? 'py-2' : 'py-5'} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}>
                              Faculty Member
                            </th>
                            <th className={`px-4 ${isCompactView ? 'py-2' : 'py-5'} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}>
                              Teacher ID
                            </th>
                            <th className={`px-4 ${isCompactView ? 'py-2' : 'py-5'} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}>
                              Assignment
                            </th>
                            <th className={`px-4 ${isCompactView ? 'py-2' : 'py-5'} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}>
                              Status
                            </th>
                            <th className={`px-6 ${isCompactView ? 'py-2' : 'py-5'} text-right text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                          {teachers.map((teacher) => {
                            const nativeName = getTeacherDisplayName(teacher);
                            const internationalName = getTeacherInternationalName(teacher, nativeName);
                            const teacherStatus = getTeacherStatus(teacher);

                            return (
                              <tr
                                key={teacher.id}
                                className={`group transition-colors ${selectedTeachers.has(teacher.id) ? 'bg-blue-50/40 dark:bg-blue-500/5' : 'hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-950/30'}`}
                              >
                                <td className={`px-6 ${isCompactView ? 'py-2' : 'py-4'} align-top sm:px-8`}>
                                  <button
                                    type="button"
                                    onClick={() => toggleTeacherSelection(teacher.id)}
                                    className={`${isCompactView ? 'mt-0' : 'mt-2'} inline-flex items-center justify-center`}
                                  >
                                    {selectedTeachers.has(teacher.id) ? (
                                      <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                    ) : (
                                      <Square className="h-[18px] w-[18px] text-slate-300 transition-colors group-hover:text-slate-500 dark:text-gray-700 dark:text-gray-200 dark:group-hover:text-gray-500" />
                                    )}
                                  </button>
                                </td>
                                <td className={`px-6 ${isCompactView ? 'py-2' : 'py-4'}`}>
                                  <div className="flex items-start gap-4">
                                    {!isCompactView && (
                                      teacher.photoUrl ? (
                                        <img
                                          src={`${TEACHER_SERVICE_URL}${teacher.photoUrl}`}
                                          alt={`${teacher.lastName} ${teacher.firstName}`}
                                          className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-gray-800 shadow-sm"
                                        />
                                      ) : (
                                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 text-sm font-black text-white shadow-lg shadow-blue-500/10">
                                          {teacher.lastName?.[0] || 'T'}{teacher.firstName?.[0] || ''}
                                        </div>
                                      )
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className={`truncate font-black tracking-tight text-slate-900 dark:text-white ${isCompactView ? 'text-xs' : 'text-sm'}`}>
                                          {getTeacherDisplayName(teacher)}
                                        </p>
                                        <GenderBadge gender={teacher.gender} />
                                      </div>
                                        <div className="mt-0.5 flex flex-col gap-0.5">
                                          {(internationalName === 'N/A' || internationalName !== nativeName) && (
                                            <p className="truncate text-[10px] font-bold text-blue-500/70 dark:text-blue-400/70 uppercase tracking-[0.14em]">
                                              {internationalName}
                                            </p>
                                          )}
                                        </div>
                                    </div>
                                  </div>
                                </td>

                                <td className={`px-4 ${isCompactView ? 'py-2' : 'py-4'} align-top`}>
                                  <div className={`inline-flex rounded-[0.65rem] bg-slate-100 dark:bg-gray-800 font-mono font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700/70 ${isCompactView ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-2 text-xs'}`}>
                                    {teacher.teacherId}
                                  </div>
                                </td>

                                <td className={`px-4 ${isCompactView ? 'py-2' : 'py-4'} align-top`}>
                                  <div className="min-w-0">
                                    <p className={`font-bold text-slate-800 dark:text-white ${isCompactView ? 'text-xs' : 'text-sm'}`}>
                                      {teacher.position || 'No Role'}
                                    </p>
                                    {!isCompactView && teacher.department && (
                                      <div className="mt-1.5 inline-flex items-center rounded-md bg-slate-50 dark:bg-gray-800/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100 dark:bg-gray-800/50 dark:text-gray-400 dark:ring-gray-700/50 uppercase tracking-tight">
                                        {teacher.department}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className={`px-4 text-center ${isCompactView ? 'py-2' : 'py-4'} align-top`}>
                                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm ${teacherStatus.pillClass}`}>
                                    {teacherStatus.label}
                                  </span>
                                </td>

                                <td className={`px-6 ${isCompactView ? 'py-1' : 'py-4'} align-top`}>
                                  <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                                    <ActionButton
                                      title="View"
                                      icon={Eye}
                                      onClick={() => router.push(`/${locale}/teachers/${teacher.id}`)}
                                    />
                                    <ActionButton
                                      title="Edit"
                                      icon={Edit}
                                      onClick={() => handleEdit(teacher)}
                                    />
                                    <ActionButton
                                      title="Claim Code"
                                      icon={Ticket}
                                      onClick={() => handleGenerateCode(teacher)}
                                      disabled={isGenerating === teacher.id}
                                      tone="blue"
                                    />
                                    <ActionButton
                                      title="Reset Password"
                                      icon={Lock}
                                      onClick={() => {
                                        setSelectedTeacher(teacher);
                                        setShowResetModal(true);
                                      }}
                                      tone="amber"
                                    />
                                    <ActionButton
                                      title="Delete"
                                      icon={Trash2}
                                      onClick={() => handleDelete(teacher.id)}
                                      tone="rose"
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

        {selectedTeachers.size > 0 && (
          <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/0 lg:left-[calc(50%+128px)]">
            <AnimatedContent animation="slide-up" delay={0}>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-900/90 px-6 py-4 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/20 dark:bg-slate-950/90">
                <div className="flex items-center gap-3 border-r border-white/10 pr-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 font-bold text-white shadow-lg shadow-blue-500/20">
                    {selectedTeachers.size}
                  </div>
                  <p className="text-sm font-bold">Selected</p>
                </div>
                
                <div className="flex items-center gap-2 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert('Bulk Claim Code generation triggered for ' + selectedTeachers.size + ' teachers.');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white dark:bg-gray-900/20"
                  >
                    <Ticket className="h-4 w-4" />
                    Codes
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      alert('Bulk Password Reset triggered for ' + selectedTeachers.size + ' teachers.');
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white dark:bg-gray-900/20"
                  >
                    <Lock className="h-4 w-4" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${selectedTeachers.size} teachers?`)) {
                        Array.from(selectedTeachers).forEach(id => deleteTeacher(id));
                        setSelectedTeachers(new Set());
                        mutate();
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition-colors hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>

                <div className="border-l border-white/10 pl-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTeachers(new Set())}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white dark:bg-gray-900/10 hover:text-white"
                    title="Clear selection"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </AnimatedContent>
          </div>
        )}
      </div>

      {showModal ? <TeacherModal teacher={selectedTeacher} onClose={handleModalClose} /> : null}

      {showResetModal && selectedTeacher ? (
        <AdminResetPasswordModal
          user={{
            id: selectedTeacher.id,
            name: `${selectedTeacher.lastName} ${selectedTeacher.firstName}`,
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
