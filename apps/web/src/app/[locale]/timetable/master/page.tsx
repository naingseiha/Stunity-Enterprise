'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import { TokenManager } from '@/lib/api/auth';
import { AcademicYear, getAcademicYearsAuto } from '@/lib/api/academic-years';
import { timetableAPI } from '@/lib/api/timetable';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit3,
  Grid3X3,
  GraduationCap,
  Home,
  List,
  Loader2,
  Printer,
  RefreshCw,
  School,
  Sparkles,
} from 'lucide-react';
import {
  DAYS,
  DAY_LABELS,
  DayOfWeek,
  GradeLevel,
  ShiftType,
  getDefaultShift,
  getGradeLevel,
} from '@/components/timetable/types';

type ViewMode = 'overview' | 'list';

interface ClassStats {
  id: string;
  name: string;
  grade: number;
  section: string;
  gradeLevel: GradeLevel;
  entryCount: number;
  totalSlots: number;
  coverage: number;
  conflicts: number;
  shiftSchedule: Array<{ dayOfWeek: DayOfWeek; shiftType: ShiftType }>;
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
  tone: 'emerald' | 'sky' | 'amber' | 'rose';
}) {
  const tones = {
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/30',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/30',
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/30',
    rose: 'border-rose-100/80 bg-gradient-to-br from-white via-rose-50/80 to-pink-50/70 shadow-rose-100/30',
  };

  return (
    <div
      className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75 ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function getCoverageTone(coverage: number) {
  if (coverage >= 85) {
    return {
      text: 'text-emerald-700',
      bar: 'from-emerald-400 to-teal-500',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (coverage >= 60) {
    return {
      text: 'text-amber-700',
      bar: 'from-amber-400 to-orange-500',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }
  return {
    text: 'text-rose-700',
    bar: 'from-rose-400 to-pink-500',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
  };
}

function getShiftTone(shiftType?: ShiftType) {
  if (shiftType === 'MORNING') {
    return 'bg-gradient-to-r from-amber-300 to-orange-400';
  }
  return 'bg-gradient-to-r from-sky-400 to-indigo-500';
}

export default function MasterTimetablePage() {
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [teacherCount, setTeacherCount] = useState(0);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel>('HIGH_SCHOOL');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [expandedGrades, setExpandedGrades] = useState<Set<number>>(new Set([10, 11, 12]));
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');

  const loadClassStats = useCallback(async (yearId: string) => {
    try {
      setLoadingData(true);
      setError('');
      const masterStatsRes = await timetableAPI.getMasterStats(yearId);
      const masterStats = masterStatsRes.data;

      const classStats: ClassStats[] = (masterStats.classes || []).map((cls: any) => {
        const grade = typeof cls.grade === 'string' ? parseInt(cls.grade, 10) : cls.grade;
        const gradeLevel = getGradeLevel(grade);

        return {
          id: cls.id,
          name: cls.name,
          grade,
          section: cls.section || cls.name.replace(/\d+/g, '').trim(),
          gradeLevel,
          entryCount: cls.entryCount,
          totalSlots: cls.totalSlots,
          coverage: cls.coverage,
          conflicts: cls.conflicts,
          shiftSchedule: DAYS.map((day) => ({
            dayOfWeek: day,
            shiftType: getDefaultShift(gradeLevel, day),
          })),
        };
      });

      setClasses(classStats);
      setTeacherCount(masterStats.teacherStats?.total || 0);
    } catch (err) {
      console.error('Error loading class stats:', err);
      setError('Unable to load the master timetable right now. Please try again.');
      setClasses([]);
      setTeacherCount(0);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const yearsRes = await getAcademicYearsAuto();
      const yearsData = yearsRes.data.academicYears || [];
      setAcademicYears(yearsData);

      const defaultYear = yearsData.find((year: AcademicYear) => year.isCurrent) || yearsData[0];
      if (defaultYear) {
        setSelectedYearId(defaultYear.id);
        await loadClassStats(defaultYear.id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Unable to initialize the timetable workspace.');
    } finally {
      setLoading(false);
    }
  }, [loadClassStats]);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData?.user) {
      setUser(userData.user);
      setSchool(userData.school || { id: userData.user.schoolId, name: 'School' });
    }

    loadInitialData();
  }, [loadInitialData, locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const filteredClasses = useMemo(
    () => classes.filter((item) => item.gradeLevel === selectedGradeLevel),
    [classes, selectedGradeLevel]
  );

  const classesByGrade = useMemo(() => {
    const grouped: Record<number, ClassStats[]> = {};
    filteredClasses.forEach((cls) => {
      if (!grouped[cls.grade]) {
        grouped[cls.grade] = [];
      }
      grouped[cls.grade].push(cls);
    });

    Object.keys(grouped).forEach((grade) => {
      grouped[Number(grade)].sort((a, b) => a.name.localeCompare(b.name));
    });

    return grouped;
  }, [filteredClasses]);

  const visibleStats = useMemo(() => {
    const totalClasses = filteredClasses.length;
    const totalSlots = filteredClasses.reduce((sum, cls) => sum + cls.totalSlots, 0);
    const filledSlots = filteredClasses.reduce((sum, cls) => sum + cls.entryCount, 0);
    const conflicts = filteredClasses.reduce((sum, cls) => sum + cls.conflicts, 0);
    const coverage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

    return {
      totalClasses,
      totalSlots,
      filledSlots,
      conflicts,
      coverage,
    };
  }, [filteredClasses]);

  const selectedYear = academicYears.find((year) => year.id === selectedYearId);
  const gradeLabel = selectedGradeLevel === 'HIGH_SCHOOL' ? 'High School' : 'Secondary';
  const gradeDescription = selectedGradeLevel === 'HIGH_SCHOOL' ? 'Grades 10-12' : 'Grades 7-9';
  const largestGradeLoad = useMemo(() => {
    const totals = Object.values(classesByGrade).map((group) => group.reduce((sum, cls) => sum + cls.entryCount, 0));
    return totals.length ? Math.max(...totals) : 0;
  }, [classesByGrade]);

  const toggleGrade = (grade: number) => {
    setExpandedGrades((current) => {
      const next = new Set(current);
      if (next.has(grade)) {
        next.delete(grade);
      } else {
        next.add(grade);
      }
      return next;
    });
  };

  const navigateToClassEditor = (classId: string) => {
    router.push(`/${locale}/timetable?classId=${classId}`);
  };

  if (loading) {
    return <PageSkeleton type="table" />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.15),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.08),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_52%,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                icon={CalendarClock}
                eyebrow="Scheduling Studio"
                title="Master timetable"
                description="Review slot coverage and open class editors from one cleaner control room."
                chipsPosition="below"
                backgroundClassName="bg-[linear-gradient(135deg,#ffffff_0%,#ecfdf5_48%,#e0f2fe_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.16),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-emerald-700"
                iconShellClassName="bg-gradient-to-br from-emerald-600 to-sky-500 text-white"
                breadcrumbs={
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-slate-500">
                      <Home className="h-3.5 w-3.5" />
                      Timetable
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-slate-950">Master View</span>
                  </div>
                }
                chips={
                  <>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <School className="h-3.5 w-3.5 text-emerald-500" />
                      {selectedYear?.name || 'No year selected'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-500" />
                      {gradeLabel}
                    </span>
                  </>
                }
                actions={
                  <>
                    <button
                      onClick={() => selectedYearId && loadClassStats(selectedYearId)}
                      disabled={loadingData || !selectedYearId}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950 disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                      Refresh Grid
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Printer className="h-4 w-4" />
                      Print View
                    </button>
                  </>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-teal-200/70 bg-[linear-gradient(145deg,rgba(17,94,89,0.98),rgba(13,148,136,0.95)_52%,rgba(14,116,144,0.9))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(15,118,110,0.48)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-50/80">Grid Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{visibleStats.coverage}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-emerald-50/75">Ready</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <CalendarClock className="h-7 w-7 text-emerald-50" />
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-sky-200"
                    style={{ width: `${Math.min(100, visibleStats.coverage)}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Visible', value: visibleStats.totalClasses },
                    { label: 'Filled', value: visibleStats.filledSlots },
                    { label: 'Conflict', value: visibleStats.conflicts },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                      <p className="text-3xl font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-emerald-50/80">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold text-emerald-50/90">
                  {selectedYear?.name || 'No year selected'} · {gradeLabel}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Visible Classes"
                value={visibleStats.totalClasses}
                helper={`${gradeDescription} currently in view`}
                tone="emerald"
              />
              <MetricCard
                label="Faculty Pool"
                value={teacherCount}
                helper="Teachers available in this timetable year"
                tone="sky"
              />
              <MetricCard
                label="Slots Filled"
                value={`${visibleStats.filledSlots}/${visibleStats.totalSlots}`}
                helper="Scheduled blocks across visible classes"
                tone="amber"
              />
              <MetricCard
                label="Open Attention"
                value={visibleStats.conflicts}
                helper="Conflicts or gaps still needing review"
                tone="rose"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.06}>
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Master timetable filters</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">Choose the academic year, focus area, and view mode for the grid below.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedGradeLevel('HIGH_SCHOOL');
                      setExpandedGrades(new Set([10, 11, 12]));
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      selectedGradeLevel === 'HIGH_SCHOOL'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    High School
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGradeLevel('SECONDARY');
                      setExpandedGrades(new Set([7, 8, 9]));
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      selectedGradeLevel === 'SECONDARY'
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                        : 'border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    <School className="h-4 w-4" />
                    Secondary
                  </button>
                </div>
              </div>

              <div className="flex flex-nowrap items-stretch gap-3 px-5 py-5 sm:px-6 overflow-x-auto">
                {/* Academic Year */}
                <select
                  value={selectedYearId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSelectedYearId(value);
                    if (value) {
                      loadClassStats(value);
                    }
                  }}
                  className="h-[52px] w-[170px] flex-shrink-0 rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>

                {/* View Mode Toggle */}
                <div className="flex-1 rounded-[1.1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-1.5">
                  <div className="grid grid-cols-2 gap-1.5 h-full">
                    {[
                      { id: 'overview', label: 'Overview', icon: Grid3X3 },
                      { id: 'list', label: 'List', icon: List },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = viewMode === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setViewMode(item.id as ViewMode)}
                          className={`inline-flex items-center justify-center gap-2 rounded-[0.9rem] px-4 text-sm font-semibold transition ${
                            isActive ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10' : 'text-slate-500 hover:text-slate-800 dark:text-gray-100'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Shift Logic */}
                <div className="flex-1 rounded-[1.2rem] border border-slate-200 dark:border-gray-800 bg-gradient-to-br from-slate-50 to-white px-5 shadow-sm flex items-center gap-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 flex-shrink-0">Shift Logic</span>
                  <div className="flex items-center gap-5 text-sm font-medium text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 flex-shrink-0" />
                      Morning
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 flex-shrink-0" />
                      Afternoon
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          {error ? (
            <AnimatedContent delay={0.08}>
              <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => selectedYearId && loadClassStats(selectedYearId)}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white dark:bg-none dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.1}>
            <BlurLoader isLoading={loadingData} showSpinner={false}>
              {filteredClasses.length === 0 ? (
                <div className="mt-5 rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 px-6 py-20 text-center shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  {loadingData ? (
                    <>
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-500" />
                      <p className="mt-4 text-sm font-medium text-slate-500">Refreshing timetable coverage...</p>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-slate-50 dark:bg-none dark:bg-gray-800/50 shadow-sm ring-1 ring-slate-200/80">
                        <GraduationCap className="h-8 w-8 text-slate-300" />
                      </div>
                      <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">No classes found in this view</h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        No classes are available for {gradeLabel.toLowerCase()} {selectedYear ? `in ${selectedYear.name}` : 'yet'}.
                      </p>
                    </>
                  )}
                </div>
              ) : viewMode === 'overview' ? (
                <div className="mt-5 space-y-5">
                  {Object.entries(classesByGrade)
                    .sort(([left], [right]) => Number(left) - Number(right))
                    .map(([grade, classList]) => {
                      const gradeNumber = Number(grade);
                      const gradeCoverage =
                        classList.reduce((sum, cls) => sum + cls.entryCount, 0) /
                        Math.max(classList.reduce((sum, cls) => sum + cls.totalSlots, 0), 1);
                      const gradeCoveragePercent = Math.round(gradeCoverage * 100);
                      const gradeTone = getCoverageTone(gradeCoveragePercent);
                      const gradeEntries = classList.reduce((sum, cls) => sum + cls.entryCount, 0);

                      return (
                        <section key={grade} className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                          <button
                            onClick={() => toggleGrade(gradeNumber)}
                            className="flex w-full items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800/70 px-5 py-5 text-left sm:px-6"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`rounded-[1rem] p-3 ${selectedGradeLevel === 'HIGH_SCHOOL' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>
                                <GraduationCap className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h3 className="text-xl font-black tracking-tight text-slate-950">Grade {grade}</h3>
                                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${gradeTone.badge}`}>
                                    {gradeCoveragePercent}% coverage
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-medium text-slate-500">
                                  {classList.length} classes · {gradeEntries} scheduled blocks · {classList.reduce((sum, cls) => sum + cls.conflicts, 0)} conflicts
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="hidden min-w-[140px] sm:block">
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${gradeTone.bar}`}
                                    style={{ width: `${gradeCoveragePercent}%` }}
                                  />
                                </div>
                              </div>
                              {expandedGrades.has(gradeNumber) ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {expandedGrades.has(gradeNumber) ? (
                            <div className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
                              {classList.map((cls) => {
                                const tone = getCoverageTone(cls.coverage);
                                return (
                                  <button
                                    key={cls.id}
                                    onClick={() => navigateToClassEditor(cls.id)}
                                    className="group rounded-[1.3rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-white via-slate-50/80 to-white p-5 text-left shadow-[0_18px_55px_-42px_rgba(15,23,42,0.32)] transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_26px_70px_-40px_rgba(16,185,129,0.24)]"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Class</p>
                                        <h4 className="mt-2 text-xl font-black tracking-tight text-slate-950">{cls.name}</h4>
                                        <p className="mt-1 text-sm font-medium text-slate-500">Section {cls.section || 'A'} · {cls.totalSlots} total slots</p>
                                      </div>
                                      <div className="rounded-[0.9rem] bg-slate-100 dark:bg-none dark:bg-gray-800 p-2.5 text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                        <Edit3 className="h-4 w-4" />
                                      </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-medium text-slate-500">Coverage</p>
                                        <p className={`text-2xl font-black tracking-tight ${tone.text}`}>{cls.coverage}%</p>
                                      </div>
                                      <div className="rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-slate-600">
                                        {cls.entryCount}/{cls.totalSlots}
                                      </div>
                                    </div>

                                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                                      <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${cls.coverage}%` }} />
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-slate-500">
                                      <span className="inline-flex items-center gap-2">
                                        <AlertTriangle className={`h-4 w-4 ${cls.conflicts > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                                        {cls.conflicts > 0 ? `${cls.conflicts} conflicts` : 'No conflicts'}
                                      </span>
                                      <span className="inline-flex items-center gap-2 text-slate-700 dark:text-gray-200">
                                        Open editor
                                        <ArrowRight className="h-4 w-4" />
                                      </span>
                                    </div>

                                    <div className="mt-4 border-t border-slate-200 dark:border-gray-800/70 pt-4">
                                      <div className="flex gap-1.5">
                                        {DAYS.map((day) => {
                                          const shift = cls.shiftSchedule.find((item) => item.dayOfWeek === day);
                                          return (
                                            <div key={day} className="flex-1">
                                              <div className={`h-2.5 rounded-full ${getShiftTone(shift?.shiftType)}`} title={`${DAY_LABELS[day].short}: ${shift?.shiftType || 'Not set'}`} />
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                        <span>Mon</span>
                                        <span>Sat</span>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </section>
                      );
                    })}
                </div>
              ) : (
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Directory</p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">Master timetable list</h2>
                    <p className="text-sm font-medium text-slate-500">A denser enterprise view for class-by-class scheduling status.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full text-left">
                      <thead className="bg-slate-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Class</th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Grade</th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Coverage</th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Slots</th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Conflicts</th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Shift Mix</th>
                          <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                        {filteredClasses.map((cls) => {
                          const tone = getCoverageTone(cls.coverage);
                          return (
                            <tr key={cls.id} className="transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                              <td className="px-5 py-4">
                                <div>
                                  <p className="font-bold text-slate-950">{cls.name}</p>
                                  <p className="mt-1 text-sm font-medium text-slate-500">Section {cls.section || 'A'}</p>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm font-semibold text-slate-600">Grade {cls.grade}</td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-black ${tone.text}`}>{cls.coverage}%</span>
                                  <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-200/80">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${cls.coverage}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm font-semibold text-slate-600">{cls.entryCount}/{cls.totalSlots}</td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${cls.conflicts > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                  {cls.conflicts > 0 ? `${cls.conflicts} open` : 'Clear'}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex gap-1.5">
                                  {DAYS.map((day) => {
                                    const shift = cls.shiftSchedule.find((item) => item.dayOfWeek === day);
                                    return <div key={day} className={`h-2.5 w-7 rounded-full ${getShiftTone(shift?.shiftType)}`} />;
                                  })}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() => navigateToClassEditor(cls.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-gray-200 transition hover:text-slate-950"
                                >
                                  Open
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </BlurLoader>
          </AnimatedContent>

          <AnimatedContent delay={0.12}>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Guidance</p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">Shift and readiness legend</h2>
                  <p className="text-sm font-medium text-slate-500">Use these signals to read the timetable grid faster across every class.</p>
                </div>
                <div className="grid gap-4 px-5 py-5 md:grid-cols-2 sm:px-6">
                  {[
                    { title: 'High readiness', body: 'Coverage above 85% with minimal open slots.', swatch: 'bg-gradient-to-r from-emerald-400 to-teal-500' },
                    { title: 'Watchlist', body: 'Coverage between 60% and 84% may still need assignment balancing.', swatch: 'bg-gradient-to-r from-amber-400 to-orange-500' },
                    { title: 'Needs action', body: 'Coverage below 60% or conflict-heavy classes should be reviewed first.', swatch: 'bg-gradient-to-r from-rose-400 to-pink-500' },
                    { title: 'Shift preview', body: 'Amber bars indicate morning blocks, while blue bars indicate afternoon blocks.', swatch: 'bg-gradient-to-r from-sky-400 to-indigo-500' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-none dark:bg-gray-800/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-3 w-10 rounded-full ${item.swatch}`} />
                        <div>
                          <h3 className="text-base font-black tracking-tight text-slate-950">{item.title}</h3>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 dark:border-gray-800/80 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 p-6 text-white shadow-[0_32px_80px_-44px_rgba(15,23,42,0.52)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-100/70">Operations Note</p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight">Where to focus next</h2>
                  </div>
                  <div className="rounded-[1rem] bg-white dark:bg-none dark:bg-gray-900/10 p-3 ring-1 ring-white/10">
                    <Sparkles className="h-5 w-5 text-emerald-100" />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-[1.1rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 p-4">
                    <p className="text-sm font-semibold text-emerald-50/90">Most loaded grade</p>
                    <p className="mt-2 text-3xl font-black tracking-tight">{largestGradeLoad}</p>
                    <p className="mt-2 text-sm font-medium text-emerald-100/75">Scheduled blocks in the busiest grade group.</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 p-4">
                    <p className="text-sm font-semibold text-emerald-50/90">Action priority</p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {visibleStats.conflicts > 0
                        ? `${visibleStats.conflicts} conflict${visibleStats.conflicts === 1 ? '' : 's'} still need resolution.`
                        : 'No active conflicts in the visible timetable set.'}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/10 bg-white dark:bg-gray-900/5 p-4">
                    <p className="text-sm font-semibold text-emerald-50/90">Current lens</p>
                    <p className="mt-2 text-base font-semibold text-white">{gradeLabel} · {viewMode === 'overview' ? 'Card overview' : 'Dense list view'}</p>
                  </div>
                </div>
              </section>
            </div>
          </AnimatedContent>
        </main>
      </div>
    </div>
  );
}
