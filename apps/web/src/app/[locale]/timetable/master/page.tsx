'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
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
    emerald: 'border-emerald-200/60 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-white',
    sky: 'border-sky-200/60 bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 text-white',
    amber: 'border-amber-200/60 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white',
    rose: 'border-fuchsia-200/60 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-500 text-white',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm ${tones[tone]}`}
    >
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-20 w-32 rounded-full border border-white/25" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_50%)]" />
      <p className="relative text-[10px] font-black uppercase tracking-[0.24em] text-white/85">{label}</p>
      <p className="relative mt-3 text-2xl font-black tracking-tight text-white">{value}</p>
      <p className="relative mt-2 text-sm font-medium text-white/90">{helper}</p>
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
    const autoT = useTranslations();
  const router = useRouter();
  const t = useTranslations('common');
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)] dark:bg-[linear-gradient(180deg,#0f172a_0%,#111827_220px,#111827_100%)]">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                icon={CalendarClock}
                eyebrow="Scheduling Studio"
                title={autoT("auto.web.locale_timetable_master_page.k_8e477201")}
                description="Track coverage and open class editors."
                chipsPosition="below"
                backgroundClassName="bg-white dark:bg-gray-900/95"
                glowClassName="opacity-0"
                eyebrowClassName="text-emerald-700"
                iconShellClassName="bg-emerald-600 text-white"
                breadcrumbs={
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-3 py-1.5 text-slate-500">
                      <Home className="h-3.5 w-3.5" />
                      <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_c09b11da" />
                    </span>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-slate-950 dark:text-gray-100"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_47a40b71" /></span>
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
                      <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_e59d7cc7" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Printer className="h-4 w-4" />
                      <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_576f5b0c" />
                    </button>
                  </>
                }
              />

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_cef589b0" /></p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-gray-100">{visibleStats.coverage}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-slate-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_77d42111" /></span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-500/15">
                    <CalendarClock className="h-6 w-6 text-blue-700" />
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Math.min(100, visibleStats.coverage)}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Visible', value: visibleStats.totalClasses },
                    { label: 'Filled', value: visibleStats.filledSlots },
                    { label: 'Conflict', value: visibleStats.conflicts },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800/70">
                      <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-gray-100">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 dark:text-gray-400">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200">
                  {selectedYear?.name || 'No year selected'} · {gradeLabel}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={autoT("auto.web.locale_timetable_master_page.k_cc5fb90a")}
                value={visibleStats.totalClasses}
                helper={`${gradeDescription} in view`}
                tone="emerald"
              />
              <MetricCard
                label={autoT("auto.web.locale_timetable_master_page.k_7b95c17d")}
                value={teacherCount}
                helper="Teachers in this year"
                tone="sky"
              />
              <MetricCard
                label={autoT("auto.web.locale_timetable_master_page.k_efac8c53")}
                value={`${visibleStats.filledSlots}/${visibleStats.totalSlots}`}
                helper="Blocks scheduled"
                tone="amber"
              />
              <MetricCard
                label={autoT("auto.web.locale_timetable_master_page.k_114eb2fb")}
                value={visibleStats.conflicts}
                helper="Needs review"
                tone="rose"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.06}>
            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_fccc38c8" /></p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-gray-100"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_a40cd146" /></h2>
                  <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_7538f2c4" /></p>
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
                    <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_b4176fc4" />
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
                    <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_31627997" />
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
                  <option value="">{autoT("auto.web.locale_timetable_master_page.k_cf0c34d2")}</option>
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
                <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-5 shadow-sm flex items-center gap-6 dark:border-gray-800 dark:bg-gray-800/60">
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 flex-shrink-0"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_49fdd50e" /></span>
                  <div className="flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 flex-shrink-0" />
                      <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_6c6e4671" />
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 flex-shrink-0" />
                      <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_656c3067" />
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
                  <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_7e92f86e" /></p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => selectedYearId && loadClassStats(selectedYearId)}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white dark:bg-none dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_da51dc35" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.1}>
            <BlurLoader isLoading={loadingData} showSpinner={false}>
              {filteredClasses.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
                  {loadingData ? (
                    <>
                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-500" />
                      <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_c9d57eda" /></p>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-slate-50 dark:bg-none dark:bg-gray-800/50 shadow-sm ring-1 ring-slate-200/80">
                        <GraduationCap className="h-8 w-8 text-slate-300" />
                      </div>
                      <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-gray-100"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_a3766c77" /></h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_7f7611da" /> {gradeLabel.toLowerCase()} {selectedYear ? `in ${selectedYear.name}` : 'yet'}.
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
                        <section key={grade} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
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
                                  <h3 className="text-lg font-black tracking-tight text-slate-950 dark:text-gray-100"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_ce25ecee" /> {grade}</h3>
                                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${gradeTone.badge}`}>
                                    {gradeCoveragePercent}<AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_62b52615" />
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-medium text-slate-500">
                                  {classList.length} <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_3c797cc3" /> {gradeEntries} <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_46cff0a4" /> {classList.reduce((sum, cls) => sum + cls.conflicts, 0)} <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_edb30d8a" />
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
                                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-blue-400/60"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_d043ddd2" /></p>
                                        <h4 className="mt-2 text-lg font-black tracking-tight text-slate-950 dark:text-gray-100">{cls.name}</h4>
                                        <p className="mt-1 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_417f8452" /> {cls.section || 'A'} · {cls.totalSlots} <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_70ef8a03" /></p>
                                      </div>
                                      <div className="rounded-[0.9rem] bg-slate-100 dark:bg-none dark:bg-gray-800 p-2.5 text-slate-500 transition group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                        <Edit3 className="h-4 w-4" />
                                      </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_57a35fb1" /></p>
                                        <p className={`text-xl font-black tracking-tight ${tone.text}`}>{cls.coverage}%</p>
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
                                        <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_4d0d25a0" />
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
                                        <span><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_646d9a02" /></span>
                                        <span><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_f5325098" /></span>
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
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
                  <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_8af40f13" /></p>
                    <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-gray-100"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_40bf5fcf" /></h2>
                    <p className="text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_7ae9e54f" /></p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full text-left">
                      <thead className="bg-slate-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_d043ddd2" /></th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_ce25ecee" /></th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_57a35fb1" /></th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_2cc21a45" /></th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_64b07065" /></th>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_bd061f09" /></th>
                          <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_5fc482d9" /></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                        {filteredClasses.map((cls) => {
                          const tone = getCoverageTone(cls.coverage);
                          return (
                            <tr key={cls.id} className="transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                              <td className="px-5 py-4">
                                <div>
                                  <p className="font-bold text-slate-950 dark:text-gray-100">{cls.name}</p>
                                  <p className="mt-1 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_417f8452" /> {cls.section || 'A'}</p>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm font-semibold text-slate-600"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_ce25ecee" /> {cls.grade}</td>
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
                                  <AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_11f60068" />
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
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/90">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_b0f39c4f" /></p>
                  <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-gray-100"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_b67801e3" /></h2>
                  <p className="text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_68a2b707" /></p>
                </div>
                <div className="grid gap-4 px-5 py-5 md:grid-cols-2 sm:px-6">
                  {[
                    { title: 'High readiness', body: 'Coverage above 85%.', swatch: 'bg-gradient-to-r from-emerald-400 to-teal-500' },
                    { title: 'Watchlist', body: 'Coverage 60-84%.', swatch: 'bg-gradient-to-r from-amber-400 to-orange-500' },
                    { title: 'Needs action', body: 'Coverage below 60% or high conflicts.', swatch: 'bg-gradient-to-r from-rose-400 to-pink-500' },
                    { title: 'Shift preview', body: 'Amber: morning, blue: afternoon.', swatch: 'bg-gradient-to-r from-sky-400 to-indigo-500' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-none dark:bg-gray-800/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-3 w-10 rounded-full ${item.swatch}`} />
                        <div>
                          <h3 className="text-base font-black tracking-tight text-slate-950 dark:text-gray-100">{item.title}</h3>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_d3822bf2" /></p>
                    <h2 className="mt-3 text-xl font-black tracking-tight"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_30ee49db" /></h2>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-500/15">
                    <Sparkles className="h-5 w-5 text-blue-700" />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="text-sm font-semibold text-slate-700 dark:text-gray-200"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_093edf2d" /></p>
                    <p className="mt-2 text-2xl font-black tracking-tight">{largestGradeLoad}</p>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_c940318e" /></p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="text-sm font-semibold text-slate-700 dark:text-gray-200"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_387eac88" /></p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-gray-100">
                      {visibleStats.conflicts > 0
                        ? `${visibleStats.conflicts} conflict${visibleStats.conflicts === 1 ? '' : 's'} to resolve.`
                        : 'No active conflicts.'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="text-sm font-semibold text-slate-700 dark:text-gray-200"><AutoI18nText i18nKey="auto.web.locale_timetable_master_page.k_f21f0ca2" /></p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-gray-100">{gradeLabel} · {viewMode === 'overview' ? 'Overview' : 'List'}</p>
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
