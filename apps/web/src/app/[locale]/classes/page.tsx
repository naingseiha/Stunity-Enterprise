'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BookMarked,
  ClipboardList,
  Edit2,
  Eye,
  GraduationCap,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  RefreshCw,
  School,
  Search,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import ClassModal from '@/components/classes/ClassModal';
import { CardSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { useDebounce } from '@/hooks/useDebounce';
import { TokenManager } from '@/lib/api/auth';
import { deleteClass, type Class } from '@/lib/api/classes';

type MetricTone = 'emerald' | 'blue' | 'amber' | 'slate';
type ViewMode = 'grid' | 'list';

const FALLBACK_GRADES = [7, 8, 9, 10, 11, 12];

const gradeThemes = [
  {
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20',
    avatar: 'from-sky-500 to-cyan-500 shadow-sky-500/20',
    card:
      'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/85 to-cyan-50/85 shadow-sky-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
  },
  {
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20',
    avatar: 'from-indigo-500 to-violet-500 shadow-indigo-500/20',
    card:
      'border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/85 to-violet-50/85 shadow-indigo-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
  },
  {
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20',
    avatar: 'from-violet-500 to-fuchsia-500 shadow-violet-500/20',
    card:
      'border-violet-100/80 bg-gradient-to-br from-white via-violet-50/85 to-fuchsia-50/85 shadow-violet-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
  },
  {
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    avatar: 'from-emerald-500 to-teal-500 shadow-emerald-500/20',
    card:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/85 to-teal-50/85 shadow-emerald-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
  },
  {
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    avatar: 'from-amber-500 to-orange-500 shadow-amber-500/20',
    card:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/85 to-orange-50/85 shadow-amber-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
  },
  {
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
    avatar: 'from-rose-500 to-pink-500 shadow-rose-500/20',
    card:
      'border-rose-100/80 bg-gradient-to-br from-white via-rose-50/85 to-pink-50/85 shadow-rose-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
  },
] as const;

function getGradeTheme(grade: number) {
  return gradeThemes[Math.abs(grade - 1) % gradeThemes.length];
}

function formatTeacherName(classItem: Class) {
  if (!classItem.homeroomTeacher) return 'Unassigned';
  return `${classItem.homeroomTeacher.firstNameLatin} ${classItem.homeroomTeacher.lastNameLatin}`.trim();
}

function formatTrackLabel(track?: string | null) {
  if (!track) return 'General';

  const normalized = track.toLowerCase();
  if (normalized === 'social') return 'Social Studies';

  return normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCapacityState(classItem: Class) {
  const studentCount = classItem._count?.students || 0;
  const capacity = classItem.capacity || 0;

  if (!capacity) {
    return {
      studentCount,
      capacity,
      percent: studentCount > 0 ? Math.min(studentCount * 8, 60) : 12,
      label: 'Capacity open',
      helper: studentCount > 0 ? `${studentCount} students without a set cap.` : 'Add a seat cap when ready.',
      pillClass:
        'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20',
      barClass: 'from-slate-500 via-slate-400 to-slate-300',
      isFull: false,
    };
  }

  const percent = Math.round((studentCount / capacity) * 100);

  if (percent >= 100) {
    return {
      studentCount,
      capacity,
      percent: 100,
      label: 'Full',
      helper: `${studentCount} of ${capacity} seats are occupied.`,
      pillClass:
        'bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
      barClass: 'from-rose-500 via-pink-500 to-orange-400',
      isFull: true,
    };
  }

  if (percent >= 85) {
    return {
      studentCount,
      capacity,
      percent,
      label: 'Near full',
      helper: `${studentCount} of ${capacity} seats are occupied.`,
      pillClass:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
      barClass: 'from-amber-500 via-orange-500 to-rose-400',
      isFull: false,
    };
  }

  return {
    studentCount,
    capacity,
    percent,
    label: 'Open',
    helper: `${studentCount} of ${capacity} seats are occupied.`,
    pillClass:
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    barClass: 'from-emerald-500 via-teal-500 to-cyan-400',
    isFull: false,
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
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: MetricTone;
}) {
  const toneClasses = {
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
    amber: {
      shell:
        'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/70 to-orange-50/80 shadow-amber-100/35 dark:border-gray-800/70 dark:bg-gray-900/80 dark:shadow-black/15',
      icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
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
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">{label}</p>
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

function ActionIconButton({
  title,
  onClick,
  tone,
  icon: Icon,
}: {
  title: string;
  onClick: () => void;
  tone: 'slate' | 'blue' | 'rose';
  icon: LucideIcon;
}) {
  const toneClasses = {
    slate:
      'border-slate-200/70 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white',
    blue:
      'border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:border-blue-500/30',
    rose:
      'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-200 hover:text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:border-rose-500/30',
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] border transition-all ${toneClasses[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ViewToggleButton({
  active,
  title,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-[0.8rem] transition-all ${
        active
          ? 'border border-emerald-200/80 bg-white text-emerald-600 shadow-sm dark:border-emerald-500/20 dark:bg-gray-950 dark:text-emerald-300'
          : 'text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-200'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function ClassesPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const { selectedYear } = useAcademicYear();

  const [selectedGrade, setSelectedGrade] = useState<number | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;

  const { classes, isLoading, isValidating, error, mutate } = useClasses({
    academicYearId: selectedYear?.id,
  });

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  const filteredClasses = useMemo(() => {
    const query = debouncedSearch.toLowerCase();

    return classes.filter((classItem) => {
      if (selectedGrade !== undefined && classItem.grade !== selectedGrade) {
        return false;
      }

      if (!debouncedSearch.trim()) {
        return true;
      }

      const teacherName = formatTeacherName(classItem).toLowerCase();

      return (
        classItem.name.toLowerCase().includes(query) ||
        classItem.section?.toLowerCase().includes(query) ||
        classItem.room?.toLowerCase().includes(query) ||
        classItem.track?.toLowerCase().includes(query) ||
        teacherName.includes(query)
      );
    });
  }, [classes, debouncedSearch, selectedGrade]);

  const availableGrades = useMemo(() => {
    const grades = Array.from(new Set(classes.map((classItem) => classItem.grade))).sort((a, b) => a - b);
    return grades.length > 0 ? grades : FALLBACK_GRADES;
  }, [classes]);

  const visibleCount = filteredClasses.length;
  const totalStudents = useMemo(
    () => filteredClasses.reduce((sum, classItem) => sum + (classItem._count?.students || 0), 0),
    [filteredClasses]
  );
  const averageStudents = visibleCount > 0 ? Math.round(totalStudents / visibleCount) : 0;
  const gradeLevelCount = useMemo(() => new Set(filteredClasses.map((classItem) => classItem.grade)).size, [filteredClasses]);
  const staffedCount = useMemo(
    () => filteredClasses.filter((classItem) => Boolean(classItem.homeroomTeacher)).length,
    [filteredClasses]
  );
  const configuredCount = useMemo(
    () =>
      filteredClasses.filter(
        (classItem) => Boolean(classItem.homeroomTeacher) && Boolean(classItem.room) && Boolean(classItem.capacity)
      ).length,
    [filteredClasses]
  );
  const fullClassesCount = useMemo(
    () => filteredClasses.filter((classItem) => getCapacityState(classItem).isFull).length,
    [filteredClasses]
  );
  const readinessRate = visibleCount > 0 ? Math.round((configuredCount / visibleCount) * 100) : 0;
  const hasSearch = Boolean(debouncedSearch.trim());
  const hasActiveFilters = hasSearch || selectedGrade !== undefined;

  const handleLogout = useCallback(async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  }, [locale, router]);

  const handleRefresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  const handleAdd = useCallback(() => {
    if (!selectedYear?.id) return;
    setSelectedClass(null);
    setShowModal(true);
  }, [selectedYear?.id]);

  const handleEdit = useCallback((classItem: Class) => {
    setSelectedClass(classItem);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = window.confirm('Delete this class? Student assignments will be removed from the roster.');
      if (!confirmed) return;

      try {
        await deleteClass(id);
        await mutate();
      } catch (deleteError: any) {
        window.alert(deleteError.message || 'Failed to delete class');
      }
    },
    [mutate]
  );

  const handleModalClose = useCallback(
    (refresh?: boolean) => {
      setShowModal(false);
      setSelectedClass(null);
      if (refresh) {
        void mutate();
      }
    },
    [mutate]
  );

  const loadingSkeleton =
    viewMode === 'grid' ? (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    ) : (
      <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-white dark:border-gray-800/70 dark:bg-gray-900/80">
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              <TableSkeleton rows={6} />
            </tbody>
          </table>
        </div>
      </div>
    );

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_35%),linear-gradient(180deg,_#f7fbfa_0%,_#f8fafc_45%,_#f8fafc_100%)] text-slate-900 transition-colors duration-500 dark:bg-gray-950 dark:text-white lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="grid gap-5 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <CompactHeroCard
                  eyebrow="Academic Structure"
                  title="Class directory"
                  description={`Organize rooms and capacity for ${selectedYear?.name || 'the selected academic year'}.`}
                  icon={School}
                  chipsPosition="below"
                  backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(236,253,245,0.96)_50%,rgba(204,251,241,0.92))]"
                  glowClassName="bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_58%)]"
                  eyebrowClassName="text-emerald-700"
                  chips={
                    <>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                        {selectedYear?.name || 'Select academic year'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        {visibleCount} visible
                      </span>
                      {selectedGrade !== undefined ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                          Grade {selectedGrade}
                        </span>
                      ) : null}
                      {hasSearch ? (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                          Search active
                        </span>
                      ) : null}
                    </>
                  }
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isValidating}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                      >
                        <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>

                      <button
                        type="button"
                        onClick={handleAdd}
                        disabled={!selectedYear?.id}
                        className="inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add Class
                      </button>
                    </>
                  }
                />
              </div>

              <div className="relative overflow-hidden rounded-[1.65rem] border border-emerald-300/85 bg-gradient-to-br from-white via-emerald-200/80 to-teal-200/90 p-6 text-slate-900 shadow-[0_34px_90px_-38px_rgba(16,185,129,0.28)] ring-1 ring-emerald-200/80 dark:border-gray-800/70 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 dark:text-white dark:shadow-black/20 dark:ring-gray-800/70 xl:col-span-4 sm:p-7">
                <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-400/40 blur-3xl dark:bg-emerald-500/20" />
                <div className="pointer-events-none absolute -bottom-12 left-0 h-40 w-40 rounded-full bg-teal-400/30 blur-3xl dark:bg-cyan-500/20" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">Class Readiness</p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-4xl font-black tracking-tight">{readinessRate}%</span>
                        <span className="pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">ready</span>
                      </div>
                    </div>

                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/75 dark:border-white/10 dark:bg-white/10 dark:ring-white/10">
                      <School className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    </div>
                  </div>

                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-emerald-200/75 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400 transition-all duration-700"
                      style={{ width: `${Math.max(visibleCount ? readinessRate : 0, visibleCount > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{visibleCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Visible</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{staffedCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Staffed</p>
                    </div>
                    <div className="rounded-[0.95rem] border border-emerald-200/85 bg-white/95 p-3 shadow-sm ring-1 ring-emerald-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                      <p className="text-xl font-black tracking-tight">{fullClassesCount}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Full</p>
                    </div>
                  </div>

                  <div className="mt-4 inline-flex items-center rounded-full border border-emerald-200/85 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    Rooms, teachers, and capacity coverage in the current view
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Classes" value={visibleCount} helper="Visible in the current view." icon={School} tone="emerald" />
              <MetricCard label="Students" value={totalStudents} helper="Enrolled across visible classes." icon={Users} tone="blue" />
              <MetricCard label="Average Load" value={averageStudents} helper="Average students per visible class." icon={ClipboardList} tone="amber" />
              <MetricCard label="Grade Levels" value={gradeLevelCount} helper="Grade bands currently represented." icon={GraduationCap} tone="slate" />
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={80}>
            <section className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/88 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-gray-900/82 dark:shadow-black/20 dark:ring-gray-800/70">
              <div className="border-b border-slate-200/70 px-5 py-5 dark:border-gray-800/70 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">Operations</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Class Workspace</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
                      Search the directory, switch grades, and move between overview and roster workflows.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {hasActiveFilters ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        Filters applied
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                        All classes in scope
                      </span>
                    )}
                    {selectedYear?.name ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20">
                        {selectedYear.name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-1 flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="relative max-w-xl flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search classes, rooms, tracks, or homeroom teachers"
                        className="w-full rounded-[0.95rem] border border-slate-200/80 bg-slate-50/85 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950/80 dark:text-white dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGrade(undefined)}
                        className={`inline-flex items-center rounded-[0.8rem] px-3.5 py-2 text-xs font-semibold transition-all ${
                          selectedGrade === undefined
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                            : 'border border-slate-200/70 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white'
                        }`}
                      >
                        All grades
                      </button>

                      {availableGrades.map((grade) => {
                        const theme = getGradeTheme(grade);
                        const count = classes.filter((classItem) => classItem.grade === grade).length;

                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => setSelectedGrade((currentGrade) => (currentGrade === grade ? undefined : grade))}
                            className={`inline-flex items-center gap-2 rounded-[0.8rem] px-3.5 py-2 text-xs font-semibold transition-all ${
                              selectedGrade === grade
                                ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-900 dark:shadow-none'
                                : `${theme.badge} hover:-translate-y-0.5`
                            }`}
                          >
                            <span>Grade {grade}</span>
                            {count > 0 ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                  selectedGrade === grade
                                    ? 'bg-white/15 text-white dark:bg-slate-200 dark:text-slate-900'
                                    : 'bg-white/80 text-slate-600 dark:bg-gray-950/70 dark:text-gray-300'
                                }`}
                              >
                                {count}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-[0.9rem] border border-slate-200/70 bg-slate-50/80 p-1.5 dark:border-gray-800/70 dark:bg-gray-950/70">
                    <ViewToggleButton active={viewMode === 'grid'} title="Grid view" onClick={() => setViewMode('grid')} icon={LayoutGrid} />
                    <ViewToggleButton active={viewMode === 'list'} title="List view" onClick={() => setViewMode('list')} icon={List} />
                  </div>
                </div>
              </div>

              {error ? (
                <div className="border-b border-slate-200/70 bg-rose-50/80 px-5 py-4 text-sm font-medium text-rose-700 dark:border-gray-800/70 dark:bg-rose-500/10 dark:text-rose-300 sm:px-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>{error.message || 'Unable to load classes right now.'}</p>
                  </div>
                </div>
              ) : null}

              <div className="p-5 sm:p-6">
                <BlurLoader isLoading={isLoading} blur={false} skeleton={loadingSkeleton}>
                  {!selectedYear ? (
                    <div className="rounded-[1.2rem] border border-dashed border-slate-200/80 bg-slate-50/70 px-6 py-14 text-center dark:border-gray-800/80 dark:bg-gray-950/60">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-500 dark:ring-gray-800">
                        <School className="h-7 w-7" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">Select an academic year first</h3>
                      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-gray-400">
                        Classes are grouped by academic year, so choose the year from the navigation before managing sections and rosters.
                      </p>
                    </div>
                  ) : filteredClasses.length === 0 ? (
                    <div className="rounded-[1.2rem] border border-dashed border-slate-200/80 bg-slate-50/70 px-6 py-14 text-center dark:border-gray-800/80 dark:bg-gray-950/60">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-500 dark:ring-gray-800">
                        <BookMarked className="h-7 w-7" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                        {hasActiveFilters ? 'No classes match this view' : 'No classes created yet'}
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-gray-400">
                        {hasActiveFilters
                          ? 'Try a different search or remove the grade filter to bring more classes back into view.'
                          : `Create the first class for ${selectedYear.name} to start assigning rooms, teachers, and rosters.`}
                      </p>
                      {!hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={handleAdd}
                          className="mt-6 inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                        >
                          <Plus className="h-4 w-4" />
                          Create Class
                        </button>
                      ) : null}
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {filteredClasses.map((classItem) => {
                        const theme = getGradeTheme(classItem.grade);
                        const capacityState = getCapacityState(classItem);
                        const teacherName = formatTeacherName(classItem);

                        return (
                          <article
                            key={classItem.id}
                            className={`relative overflow-hidden rounded-[1.25rem] border p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${theme.card}`}
                          >
                            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/50 blur-3xl dark:bg-white/5" />
                            <div className="relative z-10">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatar} text-sm font-black text-white shadow-lg`}>
                                    {classItem.grade}
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{classItem.name}</h3>
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
                                        Grade {classItem.grade}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-slate-200/70 dark:bg-gray-950/60 dark:ring-gray-800/70">
                                        <UserRound className="h-3.5 w-3.5" />
                                        {teacherName}
                                      </span>
                                      {classItem.room ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-slate-200/70 dark:bg-gray-950/60 dark:ring-gray-800/70">
                                          <MapPin className="h-3.5 w-3.5" />
                                          {classItem.room}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <ActionIconButton title="Manage class" onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)} tone="blue" icon={Eye} />
                                  <ActionIconButton title="Edit class" onClick={() => handleEdit(classItem)} tone="slate" icon={Edit2} />
                                  <ActionIconButton title="Delete class" onClick={() => handleDelete(classItem.id)} tone="rose" icon={Trash2} />
                                </div>
                              </div>

                              <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-[0.95rem] border border-white/80 bg-white/85 p-3 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Track</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatTrackLabel(classItem.track)}</p>
                                </div>
                                <div className="rounded-[0.95rem] border border-white/80 bg-white/85 p-3 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Section</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{classItem.section || 'Standard'}</p>
                                </div>
                              </div>

                              <div className="mt-5 rounded-[1rem] border border-white/80 bg-white/85 p-4 shadow-sm ring-1 ring-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:ring-white/10">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Capacity</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                                      {capacityState.studentCount}
                                      {capacityState.capacity ? ` / ${capacityState.capacity}` : ''}
                                    </p>
                                  </div>
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${capacityState.pillClass}`}>
                                    {capacityState.label}
                                  </span>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${capacityState.barClass}`}
                                    style={{ width: `${Math.max(Math.min(capacityState.percent, 100), 8)}%` }}
                                  />
                                </div>

                                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-gray-400">{capacityState.helper}</p>
                              </div>

                              <div className="mt-5 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                                  className="inline-flex flex-1 items-center justify-center rounded-[0.9rem] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                                >
                                  Manage
                                </button>
                                <button
                                  type="button"
                                  onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                                  className="inline-flex flex-1 items-center justify-center rounded-[0.9rem] border border-slate-200/70 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                                >
                                  Roster
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200/70 bg-white dark:border-gray-800/70 dark:bg-gray-900/80">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px]">
                          <thead>
                            <tr className="border-b border-slate-200/70 bg-slate-50/80 dark:border-gray-800/70 dark:bg-gray-950/60">
                              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Class</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Teacher</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Room</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Track</th>
                              <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Capacity</th>
                              <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/70 dark:divide-gray-800/70">
                            {filteredClasses.map((classItem) => {
                              const theme = getGradeTheme(classItem.grade);
                              const capacityState = getCapacityState(classItem);

                              return (
                                <tr key={classItem.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-gray-950/40">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatar} text-sm font-black text-white shadow-lg`}>
                                        {classItem.grade}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">{classItem.name}</span>
                                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}>
                                            Grade {classItem.grade}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                                          {classItem.section ? `Section ${classItem.section}` : 'Standard section'}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-gray-300">{formatTeacherName(classItem)}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-gray-300">{classItem.room || 'Not set'}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-gray-300">{formatTrackLabel(classItem.track)}</td>
                                  <td className="px-6 py-4">
                                    <div className="max-w-[220px]">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                                          {capacityState.studentCount}
                                          {capacityState.capacity ? ` / ${capacityState.capacity}` : ''}
                                        </span>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${capacityState.pillClass}`}>
                                          {capacityState.label}
                                        </span>
                                      </div>
                                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                                        <div
                                          className={`h-full rounded-full bg-gradient-to-r ${capacityState.barClass}`}
                                          style={{ width: `${Math.max(Math.min(capacityState.percent, 100), 8)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/${locale}/classes/${classItem.id}/manage`)}
                                        className="inline-flex items-center rounded-[0.8rem] border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-all hover:border-blue-200 hover:text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"
                                      >
                                        Manage
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/${locale}/classes/${classItem.id}/roster`)}
                                        className="inline-flex items-center rounded-[0.8rem] border border-slate-200/70 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:text-slate-900 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
                                      >
                                        Roster
                                      </button>
                                      <ActionIconButton title="Edit class" onClick={() => handleEdit(classItem)} tone="slate" icon={Edit2} />
                                      <ActionIconButton title="Delete class" onClick={() => handleDelete(classItem.id)} tone="rose" icon={Trash2} />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </BlurLoader>
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {showModal ? (
        <ClassModal
          classItem={selectedClass}
          defaultAcademicYearId={selectedYear?.id}
          academicYearLabel={selectedYear?.name || null}
          onClose={handleModalClose}
        />
      ) : null}
    </>
  );
}
