'use client';

import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Users,
  GraduationCap,
  School,
  Download,
  Image as ImageIcon,
  FileDown,
  TrendingUp,
  Award,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  UserMinus,
  HeartHandshake,
  UserCheck,
  Medal
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import StatCard from '@/components/dashboard/StatCard';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { getSchoolReportsDashboard, SchoolReportsDashboardResponse, ReportPeriodType } from '@/lib/api/reports';
import { canViewReportsDashboard, isSchoolWideReportsRole } from '@/lib/permissions/reports';
import { KHMER_MONTHS, getKhmerMonthDisplayName } from '@/lib/reports/templates/khm-moeys/months';
import { formatKhmerDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import {
  captureDashboardImage,
  downloadDashboardJpg,
  downloadDashboardPdf,
  safeDashboardFileName,
} from '@/lib/export/dashboardExport';

// dataviz skill reference palette (references/palette.md) — validated, not eyeballed.
const SEQUENTIAL_BLUE = '#2a78d6'; // magnitude bars (subject/grade averages) — one hue, not a rainbow per bar
const STATUS_GOOD = '#0ca30c';
const STATUS_CRITICAL = '#d03b3b';
const GENDER_COLORS = ['#2a78d6', '#eb6834']; // categorical slots 1 & 2, fixed order
// Ordinal A→F severity ramp (best→worst), the standard "traffic light" reading
// for a grade-distribution report — green anchors STATUS_GOOD, red anchors
// STATUS_CRITICAL, with four ordered steps between.
const GRADE_LETTER_COLORS: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', string> = {
  A: '#15803d',
  B: '#65a30d',
  C: '#ca8a04',
  D: '#ea580c',
  E: '#dc2626',
  F: '#991b1b',
};

export default function ReportsDashboardPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const t = useTranslations('reportsDashboard');
  const { schoolId, currentYear, selectedYear } = useAcademicYear();
  const activeYear = selectedYear ?? currentYear;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [period, setPeriod] = useState<ReportPeriodType>('month');
  const [monthNumber, setMonthNumber] = useState<number>(new Date().getMonth() + 1);
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [classFilter, setClassFilter] = useState<string>('');

  const [data, setData] = useState<SchoolReportsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'jpg' | 'pdf' | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
  }, [locale, router]);

  const hasAccess = canViewReportsDashboard(user?.role);
  const canDrillDownByClass = isSchoolWideReportsRole(user?.role);

  const { classes } = useClasses({ academicYearId: activeYear?.id || undefined, limit: 200 });

  const academicStartYear = useMemo(() => {
    const parsed = activeYear?.name ? parseInt(activeYear.name.split('-')[0], 10) : NaN;
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }, [activeYear?.name]);

  useEffect(() => {
    if (!schoolId || !activeYear?.id || !isClient) return;
    if (!user) return;
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const calendarYear = monthNumber >= 11 ? academicStartYear : academicStartYear + 1;

    getSchoolReportsDashboard({
      schoolId,
      yearId: activeYear.id,
      period,
      semester,
      monthNumber: period === 'month' ? monthNumber : undefined,
      year: period === 'month' ? calendarYear : undefined,
      classId: classFilter || undefined,
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, activeYear?.id, period, semester, monthNumber, classFilter, isClient, hasAccess, user, academicStartYear]);

  const scaleLabel = data
    ? data.scale.system === 'KHM_MOEYS'
      ? t('scaleMoeys')
      : t('scaleGeneric')
    : '';

  const genderPieData = [
    { name: t('genderMale'), value: data?.genderBreakdown.male.count ?? 0 },
    { name: t('genderFemale'), value: data?.genderBreakdown.female.count ?? 0 },
  ];

  const subjectsByPassRate = useMemo(
    () => [...(data?.averageScoreBySubject || [])].sort((a, b) => a.passRatePercent - b.passRatePercent),
    [data?.averageScoreBySubject]
  );

  // 100%-stacked distribution chart data: each subject's A–F counts converted
  // to a share of that subject's own total, so bars are comparable across
  // subjects with different enrollment/attendance counts.
  const gradeDistributionChartData = useMemo(
    () =>
      (data?.averageScoreBySubject || []).map((s) => {
        const total = s.gradeDistribution.reduce((sum, band) => sum + band.total, 0) || 1;
        const row: Record<string, number | string> = { subjectKh: s.subjectKh };
        s.gradeDistribution.forEach((band) => {
          row[band.grade] = Math.round((band.total / total) * 1000) / 10;
        });
        return row;
      }),
    [data?.averageScoreBySubject]
  );

  const scopeClassName = classFilter ? classes.find((c) => c.id === classFilter)?.name || '' : '';

  const showClassRanking = (data?.averageScoreByClass.length || 0) > 1;
  const showTopBottom = Boolean(data?.scope.schoolWide) && (data?.topPerformingClasses.length || 0) > 0;
  const showGradeHonorRoll = !classFilter && (data?.topStudentsByGrade.length || 0) > 0;
  const showClassHonorRoll = Boolean(classFilter) && (data?.topStudentsInClass?.length || 0) > 0;

  const handleExport = async (kind: 'jpg' | 'pdf') => {
    if (!exportRef.current || !data) return;
    setExporting(kind);
    try {
      // Charts below have entrance animation disabled specifically so exports
      // are deterministic (see isAnimationActive={false}); this is just a small
      // paint-settle margin, not an animation wait.
      await new Promise((resolve) => setTimeout(resolve, 150));
      const { dataUrl, width, height } = await captureDashboardImage(exportRef.current);
      const fileName = safeDashboardFileName(school?.name || 'stunity', data.period.khmerLabel || data.period.label);
      if (kind === 'jpg') {
        downloadDashboardJpg(dataUrl, fileName);
      } else {
        await downloadDashboardPdf(dataUrl, fileName, width, height);
      }
    } catch (err) {
      console.error('Failed to export dashboard', err);
    } finally {
      setExporting(null);
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} />
      <div className="lg:ml-64 min-h-screen relative overflow-hidden">
        {/* Animated background blobs for extra depth */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 relative z-10">
          {!hasAccess ? (
            <AnimatedContent>
              <section className="mt-5 overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-16 text-center shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-rose-50 text-rose-600 shadow-inner">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t('accessDenied')}</h3>
              </section>
            </AnimatedContent>
          ) : (
            <>
              <AnimatedContent>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
                  <CompactHeroCard
                    eyebrow={t('eyebrow')}
                    title={t('title')}
                    description={t('description')}
                    icon={BarChart3}
                    backgroundClassName="bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40"
                    glowClassName="opacity-0"
                    eyebrowClassName="text-cyan-700/80 dark:text-cyan-400"
                    iconShellClassName="bg-cyan-950 dark:bg-cyan-900 text-white"
                    actions={
                      <>
                        <button
                          onClick={() => handleExport('jpg')}
                          disabled={!data || exporting !== null}
                          className="inline-flex items-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {exporting === 'jpg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                          {t('exportJpg')}
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          disabled={!data || exporting !== null}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-950 px-4 py-2.5 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                          {t('exportPdf')}
                        </button>
                      </>
                    }
                  />

                  <div className="flex flex-col justify-center overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-cyan-200 dark:border-cyan-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-200/40 dark:hover:shadow-black/40">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">{t('passRateTitle')}</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">{data?.passRate.passRatePercent ?? 0}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-slate-500 dark:text-gray-400">{scaleLabel}</span>
                    </div>
                    <div className="mt-8 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
                        style={{ width: `${Math.min(100, data?.passRate.passRatePercent ?? 0)}%` }}
                      />
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-100 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-5 py-4">
                        <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{data?.passRate.passing ?? 0}</p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">{t('passingLabel')}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-5 py-4">
                        <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{data?.passRate.failing ?? 0}</p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">{t('failingLabel')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedContent>

              <AnimatedContent delay={0.04}>
                <section className="mt-5 overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-gray-800/50 px-8 py-6">
                    {(['month', 'semester', 'year'] as ReportPeriodType[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                          period === p ? 'bg-cyan-950 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200'
                        }`}
                      >
                        {p === 'month' ? t('periodMonth') : p === 'semester' ? t('periodSemester') : t('periodYear')}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-6 px-8 py-6 lg:grid-cols-3">
                    {period === 'month' && (
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">{t('periodMonth')}</span>
                        <select
                          value={monthNumber}
                          onChange={(e) => setMonthNumber(Number(e.target.value))}
                          className="h-12 w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 px-4 text-sm font-medium text-slate-700 dark:text-gray-300 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-900/30"
                        >
                          {KHMER_MONTHS.map((m) => (
                            <option key={m.number} value={m.number}>
                              {getKhmerMonthDisplayName(m.number, m.label)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {period === 'semester' && (
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">{t('periodSemester')}</span>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value as '1' | '2')}
                          className="h-12 w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 px-4 text-sm font-medium text-slate-700 dark:text-gray-300 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-900/30"
                        >
                          <option value="1">{t('semester1')}</option>
                          <option value="2">{t('semester2')}</option>
                        </select>
                      </label>
                    )}

                    {canDrillDownByClass && (
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">{t('classFilterLabel')}</span>
                        <select
                          value={classFilter}
                          onChange={(e) => setClassFilter(e.target.value)}
                          className="h-12 w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 px-4 text-sm font-medium text-slate-700 dark:text-gray-300 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:focus:ring-cyan-900/30"
                        >
                          <option value="">{t('classFilterAll')}</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </section>
              </AnimatedContent>

              <BlurLoader isLoading={loading} showSpinner={false}>
                {error ? (
                  <AnimatedContent delay={0.06}>
                    <section className="mt-5 rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-10 text-center text-rose-700">
                      {error}
                    </section>
                  </AnimatedContent>
                ) : (
                  <div ref={exportRef} className="space-y-5 relative">
                    <AnimatedContent delay={0.06} className="mt-5">
                      <div className="flex items-center justify-between bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50">
                        <div>
                          <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{school?.name || ''}</p>
                          <p className="text-sm font-medium text-slate-500 dark:text-gray-400">{data?.period.khmerLabel || data?.period.label}</p>
                        </div>
                        <p className="text-xs font-medium text-slate-400 dark:text-gray-500">{formatKhmerDate(new Date())}</p>
                      </div>
                    </AnimatedContent>

                    {/* Bento grid — tile size/color follows content weight & category,
                        matching the reference mosaic (small facts = small tiles,
                        rich/detailed content = large tiles). */}
                    <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[minmax(0,auto)]">
                      {/* 1. Overview 4 Stat Cards FIRST */}
                      <AnimatedContent delay={0.06}>
                        <StatCard title={t('overviewStudents')} value={data?.overview.totalStudents ?? 0} icon={Users} iconColor="blue" />
                      </AnimatedContent>
                      <AnimatedContent delay={0.065}>
                        <StatCard title={t('overviewTeachers')} value={data?.overview.totalTeachers ?? 0} icon={GraduationCap} iconColor="purple" />
                      </AnimatedContent>
                      <AnimatedContent delay={0.07}>
                        <StatCard title={t('overviewClasses')} value={data?.overview.totalClasses ?? 0} icon={School} iconColor="amber" />
                      </AnimatedContent>
                      <AnimatedContent delay={0.075}>
                        <StatCard title={t('overviewAttendance')} value={`${data?.overview.attendanceRate ?? 0}%`} icon={TrendingUp} iconColor="green" />
                      </AnimatedContent>

                      {/* 2. Top 5 Honor Roll SECOND (Grade-level or Class-level) on Clean White Background */}
                      {showGradeHonorRoll && (
                        <AnimatedContent delay={0.08} className="col-span-2 lg:col-span-4">
                          <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-5 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                                  <Trophy className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('honorRollTitle')}</h3>
                                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">សិស្សឆ្នើមទាំង ៥ នាក់តាមកម្រិតថ្នាក់នីមួយៗ</p>
                                </div>
                              </div>
                            </div>
                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                              {data?.topStudentsByGrade.map((g) => (
                                <div key={g.grade} className="rounded-3xl bg-slate-50/60 dark:bg-gray-800/30 p-6 border border-slate-100 dark:border-gray-800/60">
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200/50 dark:border-amber-900/30">
                                      {t('gradeLevelLabel')} {g.grade}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400">Top 5</span>
                                  </div>
                                  <ul className="space-y-2.5">
                                    {g.students.map((s) => (
                                      <li key={s.studentId} className="flex items-center justify-between gap-3 rounded-2xl bg-white dark:bg-gray-900 px-4 py-3 shadow-xs border border-slate-100 dark:border-gray-800/60 transition-all hover:-translate-y-0.5 hover:shadow-md">
                                        <span className="flex items-center gap-3 truncate">
                                          <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                              s.rank === 1
                                                ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-xs'
                                                : s.rank === 2
                                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                                  : s.rank === 3
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                    : 'bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400'
                                            }`}
                                          >
                                            {s.rank <= 3 ? <Medal className="h-4 w-4" /> : s.rank}
                                          </span>
                                          <span className="truncate text-sm font-bold text-slate-800 dark:text-gray-200">{s.khmerName || s.name}</span>
                                        </span>
                                        <span className="shrink-0 text-sm font-black text-slate-950 dark:text-white bg-slate-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-gray-700">{s.average}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </section>
                        </AnimatedContent>
                      )}

                      {showClassHonorRoll && (
                        <AnimatedContent delay={0.08} className="col-span-2 lg:col-span-4">
                          <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 sm:p-10 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200/80 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-gray-800 pb-6 mb-8">
                              <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-3 text-white shadow-lg shadow-amber-500/20">
                                  <Trophy className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t('honorRollTitle')}</h3>
                                  <p className="text-sm font-medium text-slate-500 dark:text-gray-400">បញ្ជីសិស្សពូកែប្រចាំថ្នាក់ {scopeClassName}</p>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 text-xs font-black uppercase tracking-wider">
                                <Award className="h-4 w-4" /> Top 5 Students
                              </span>
                            </div>

                            {/* Creative Clean Podium on White Background */}
                            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 pt-4 pb-6 max-w-5xl mx-auto">
                              {/* Rank 2 */}
                              {data?.topStudentsInClass?.find(s => s.rank === 2) && (() => {
                                const rank2 = data.topStudentsInClass.find(s => s.rank === 2)!;
                                return (
                                  <div className="relative flex w-full max-w-[250px] flex-col items-center rounded-3xl bg-slate-50/80 dark:bg-gray-800/40 p-6 border border-slate-200/60 dark:border-gray-800 order-2 md:order-1 shadow-xs hover:shadow-md transition-all md:translate-y-4">
                                    <div className="absolute -top-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 ring-4 ring-white dark:ring-gray-900 shadow-md">
                                       <Medal className="h-6 w-6 text-slate-800" />
                                    </div>
                                    <div className="mt-5 text-center">
                                      <span className="inline-block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-slate-200 dark:border-gray-700">ចំណាត់ថ្នាក់ ២</span>
                                      <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{rank2.khmerName || rank2.name}</p>
                                      <div className="mt-4 rounded-xl bg-white dark:bg-gray-900 px-4 py-2 border border-slate-200/60 dark:border-gray-800 shadow-xs">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{rank2.average} <span className="text-xs font-semibold text-slate-400">ពិន្ទុ</span></p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Rank 1 */}
                              {data?.topStudentsInClass?.find(s => s.rank === 1) && (() => {
                                const rank1 = data.topStudentsInClass.find(s => s.rank === 1)!;
                                return (
                                  <div className="relative flex w-full max-w-[280px] flex-col items-center rounded-[2.2rem] bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-gray-900 dark:to-gray-900 p-8 border-2 border-amber-300/80 dark:border-amber-700/60 order-1 md:order-2 shadow-xl shadow-amber-500/10 z-10 md:-translate-y-3">
                                    <div className="absolute -top-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-yellow-950 ring-4 ring-white dark:ring-gray-900 shadow-lg shadow-amber-500/30">
                                       <Medal className="h-7 w-7 text-yellow-950" />
                                    </div>
                                    <div className="mt-6 text-center">
                                      <span className="inline-block text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/40 px-3.5 py-1 rounded-full">ចំណាត់ថ្នាក់ ១ 🏆</span>
                                      <p className="mt-3 text-xl font-black text-slate-900 dark:text-white truncate max-w-[220px]">{rank1.khmerName || rank1.name}</p>
                                      <div className="mt-4 rounded-xl bg-amber-500 text-white px-5 py-2 shadow-md shadow-amber-500/20">
                                        <p className="text-base font-black">{rank1.average} <span className="text-xs font-medium text-amber-100">ពិន្ទុ</span></p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Rank 3 */}
                              {data?.topStudentsInClass?.find(s => s.rank === 3) && (() => {
                                const rank3 = data.topStudentsInClass.find(s => s.rank === 3)!;
                                return (
                                  <div className="relative flex w-full max-w-[250px] flex-col items-center rounded-3xl bg-slate-50/80 dark:bg-gray-800/40 p-6 border border-slate-200/60 dark:border-gray-800 order-3 md:order-3 shadow-xs hover:shadow-md transition-all md:translate-y-4">
                                    <div className="absolute -top-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-300 to-amber-500 text-orange-950 ring-4 ring-white dark:ring-gray-900 shadow-md">
                                       <Medal className="h-6 w-6 text-orange-950" />
                                    </div>
                                    <div className="mt-5 text-center">
                                      <span className="inline-block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-slate-200 dark:border-gray-700">ចំណាត់ថ្នាក់ ៣</span>
                                      <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{rank3.khmerName || rank3.name}</p>
                                      <div className="mt-4 rounded-xl bg-white dark:bg-gray-900 px-4 py-2 border border-slate-200/60 dark:border-gray-800 shadow-xs">
                                        <p className="text-sm font-black text-slate-900 dark:text-white">{rank3.average} <span className="text-xs font-semibold text-slate-400">ពិន្ទុ</span></p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Rank 4 and 5 */}
                            {(() => {
                              const others = data?.topStudentsInClass?.filter(s => s.rank > 3) || [];
                              if (others.length === 0) return null;
                              return (
                                <div className="mt-8 grid gap-4 md:grid-cols-2 max-w-3xl mx-auto pt-6 border-t border-slate-100 dark:border-gray-800">
                                  {others.map(s => (
                                    <div key={s.studentId} className="flex items-center justify-between rounded-2xl bg-slate-50/60 dark:bg-gray-800/30 px-5 py-3.5 border border-slate-100 dark:border-gray-800 hover:bg-slate-100/60 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-gray-800 text-xs font-black text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700 shadow-xs">
                                          {s.rank}
                                        </span>
                                        <span className="font-bold text-slate-800 dark:text-gray-200 text-sm">{s.khmerName || s.name}</span>
                                      </div>
                                      <span className="font-black text-slate-950 dark:text-white text-sm bg-white dark:bg-gray-800 px-3 py-1 rounded-lg border border-slate-200/60 dark:border-gray-700">{s.average}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </section>
                        </AnimatedContent>
                      )}

                      {/* 3. MoEYS Mock Sections */}
                      <AnimatedContent delay={0.086} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-rose-200 dark:border-rose-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/40 dark:hover:shadow-black/40">
                          <h3 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                            <UserMinus className="h-5 w-5 text-rose-500" /> ស្ថានភាពសិស្ស (បោះបង់ & ផ្ទេរ)
                          </h3>
                          <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10 px-5 py-4">
                              <p className="text-sm font-bold text-rose-600 dark:text-rose-400">សិស្សបោះបង់ការសិក្សា</p>
                              <div className="mt-2 flex items-end justify-between">
                                <p className="text-3xl font-black text-slate-900 dark:text-white">១២ <span className="text-sm font-medium text-slate-500 dark:text-gray-400">នាក់</span></p>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 px-5 py-4">
                              <p className="text-sm font-bold text-orange-600 dark:text-orange-400">សិស្សផ្ទេរចេញ</p>
                              <div className="mt-2 flex items-end justify-between">
                                <p className="text-3xl font-black text-slate-900 dark:text-white">៥ <span className="text-sm font-medium text-slate-500 dark:text-gray-400">នាក់</span></p>
                              </div>
                            </div>
                          </div>
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.087} className="col-span-2 lg:col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-blue-200 dark:border-blue-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-200/40 dark:hover:shadow-black/40">
                          <h3 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                            <HeartHandshake className="h-5 w-5 text-blue-500" /> សិស្សអាហារូបករណ៍ / ក្រីក្រ
                          </h3>
                          <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 px-5 py-4">
                              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">ប័ណ្ណសមធម៌ ក្រ១</p>
                              <div className="mt-2 flex items-end justify-between">
                                <p className="text-3xl font-black text-slate-900 dark:text-white">៤៥ <span className="text-sm font-medium text-slate-500 dark:text-gray-400">នាក់</span></p>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 px-5 py-4">
                              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">ប័ណ្ណសមធម៌ ក្រ២</p>
                              <div className="mt-2 flex items-end justify-between">
                                <p className="text-3xl font-black text-slate-900 dark:text-white">៣០ <span className="text-sm font-medium text-slate-500 dark:text-gray-400">នាក់</span></p>
                              </div>
                            </div>
                          </div>
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.088} className="col-span-2 lg:col-span-4">
                        <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-emerald-200 dark:border-emerald-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-200/40 dark:hover:shadow-black/40">
                          <h3 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                            <UserCheck className="h-5 w-5 text-emerald-500" /> ស្ថិតិគ្រូបង្រៀន (កម្រិតវប្បធម៌ និងវត្តមាន)
                          </h3>
                          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-5 py-4">
                              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">បរិញ្ញាបត្រ / បរិញ្ញាបត្រជាន់ខ្ពស់</p>
                              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">២៨ <span className="text-sm font-medium text-slate-500 dark:text-gray-400">នាក់</span></p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-5 py-4">
                              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">គរុកោសល្យ</p>
                              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">៤២ <span className="text-sm font-medium text-slate-500 dark:text-gray-400">នាក់</span></p>
                            </div>
                            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 px-5 py-4">
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">អត្រាវត្តមានគ្រូប្រចាំខែ</p>
                              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">៩៨%</p>
                            </div>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 4. At Risk / Needs Attention LAST (or right after MoEYS metrics) */}
                      {(data?.atRiskStudents.length || 0) > 0 && (
                        <AnimatedContent delay={0.089} className="col-span-2 lg:col-span-4">
                          <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-rose-200 dark:border-rose-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/40 dark:hover:shadow-black/40">
                            <div className="flex items-center gap-3">
                              <div className="rounded-[1rem] bg-rose-100 p-3 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('needsAttentionTitle')}</h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-gray-400">{t('needsAttentionSubtitle')}</p>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {data?.atRiskStudents.map((s) => (
                                <div
                                  key={s.studentId}
                                  className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-rose-100 dark:bg-gray-900/60 dark:ring-rose-900/30"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-gray-200">{s.khmerName || s.name}</p>
                                    <p className="text-xs font-medium text-slate-400 dark:text-gray-500">{s.className}</p>
                                  </div>
                                  <span className="shrink-0 text-sm font-black text-rose-600 dark:text-rose-400">{s.average}</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        </AnimatedContent>
                      )}

                      <AnimatedContent delay={0.09} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('genderTitle')}</h3>
                          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                            <div className="h-[160px] w-[160px] shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={genderPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3} isAnimationActive={false}>
                                    {genderPieData.map((_, index) => (
                                      <Cell key={index} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid flex-1 grid-cols-2 gap-3">
                              <div className="rounded-2xl bg-slate-50 dark:bg-gray-800/50 px-5 py-4 border border-slate-100 dark:border-gray-800">
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: GENDER_COLORS[0] }} />
                                  {t('genderMale')}
                                </span>
                                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{data?.genderBreakdown.male.count ?? 0}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-gray-400">{t('passRateTitle')} {data?.genderBreakdown.male.passRatePercent ?? 0}%</p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 dark:bg-gray-800/50 px-5 py-4 border border-slate-100 dark:border-gray-800">
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: GENDER_COLORS[1] }} />
                                  {t('genderFemale')}
                                </span>
                                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{data?.genderBreakdown.female.count ?? 0}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-gray-400">{t('passRateTitle')} {data?.genderBreakdown.female.passRatePercent ?? 0}%</p>
                              </div>
                            </div>
                          </div>
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.1} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('averageByGrade')}</h3>
                          <div className="mt-4 h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data?.averageScoreByGradeLevel || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="grade" stroke="#64748b" fontSize={12} />
                                <YAxis domain={[0, data?.scale.maxAverage || 100]} stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="average" radius={[8, 8, 0, 0]} fill="#0891b2" isAnimationActive={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.11} className="col-span-2 lg:col-span-4">
                        <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('averageBySubject')}</h3>
                          <div className="mt-4 h-[340px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data?.averageScoreBySubject || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                                <YAxis type="category" dataKey="subjectKh" stroke="#64748b" fontSize={11} width={90} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="average" radius={[0, 8, 8, 0]} fill={SEQUENTIAL_BLUE} isAnimationActive={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.115} className="col-span-2 lg:col-span-4">
                        <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <div className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-8 py-6">
                            <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('subjectGradeSheetTitle')}</h3>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">{data?.period.khmerLabel || data?.period.label}{scopeClassName ? ` • ${scopeClassName}` : ''}</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px]">
                              <thead className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50">
                                <tr>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('subjectColumnLabel')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('averageScoreColumnLabel')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('studentsCount')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('passRateTitle')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                {(data?.averageScoreBySubject || []).map((s) => (
                                  <tr key={s.subject} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">{s.subjectKh}</td>
                                    <td className="px-5 py-3 font-black text-slate-950 dark:text-white">{s.average}</td>
                                    <td className="px-5 py-3 text-slate-600 dark:text-gray-400">{s.passCount}/{s.passCount + s.failCount}</td>
                                    <td className="px-5 py-3">
                                      <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
                                        style={{
                                          color: s.passRatePercent >= 50 ? STATUS_GOOD : STATUS_CRITICAL,
                                          backgroundColor: s.passRatePercent >= 50 ? `${STATUS_GOOD}1a` : `${STATUS_CRITICAL}1a`,
                                        }}
                                      >
                                        {s.passRatePercent >= 50 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                        {s.passRatePercent}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {(data?.averageScoreBySubject.length || 0) === 0 && (
                            <p className="px-5 py-8 text-center text-sm font-medium text-slate-500 dark:text-gray-400 sm:px-6">{t('noData')}</p>
                          )}
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.12} className="col-span-2 lg:col-span-4">
                        <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <div className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-8 py-6">
                            <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('gradeDistributionTitle')}</h3>
                            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">{t('gradeDistributionSubtitle')}</p>
                          </div>
                          <div className="border-b border-amber-100/70 px-5 py-6 sm:px-6">
                            <div style={{ height: Math.max(280, gradeDistributionChartData.length * 32) }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gradeDistributionChartData} layout="vertical" barCategoryGap="28%">
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" fontSize={12} />
                                  <YAxis type="category" dataKey="subjectKh" stroke="#64748b" fontSize={11} width={110} />
                                  <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: any, name: any) => [`${value}%`, name]}
                                  />
                                  <Legend />
                                  {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((letter) => (
                                    <Bar
                                      key={letter}
                                      dataKey={letter}
                                      name={letter}
                                      stackId="grades"
                                      fill={GRADE_LETTER_COLORS[letter]}
                                      isAnimationActive={false}
                                    />
                                  ))}
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px]">
                              <thead className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50">
                                <tr>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('subjectColumnLabel')}</th>
                                  {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((letter) => (
                                    <th key={letter} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                      {letter}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-50">
                                {(data?.averageScoreBySubject || []).map((s) => (
                                  <tr key={s.subject} className="hover:bg-amber-50/30">
                                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">{s.subjectKh}</td>
                                    {s.gradeDistribution.map((band) => (
                                      <td key={band.grade} className="px-3 py-3 text-center">
                                        {band.total > 0 ? (
                                          <div>
                                            <span className="text-sm font-black text-slate-950 dark:text-white">{band.total}</span>
                                            <span className="ml-1 text-[11px] font-medium text-slate-400 dark:text-gray-500">
                                              ({t('genderFemaleShort')}{band.female})
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-sm font-medium text-slate-300">—</span>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {(data?.averageScoreBySubject.length || 0) === 0 && (
                            <p className="px-5 py-8 text-center text-sm font-medium text-slate-500 dark:text-gray-400 sm:px-6">{t('noData')}</p>
                          )}
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.125} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('subjectPassRateTitle')}</h3>
                          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">{t('subjectPassRateSubtitle')}</p>
                          <ul className="mt-4 divide-y divide-rose-100/60">
                            {subjectsByPassRate.map((s) => (
                              <li key={s.subject} className="flex items-center justify-between gap-3 py-3">
                                <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">{s.subjectKh}</span>
                                <span className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-slate-400 dark:text-gray-500">{s.passCount}/{s.passCount + s.failCount}</span>
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
                                    style={{
                                      color: s.passRatePercent >= 50 ? STATUS_GOOD : STATUS_CRITICAL,
                                      backgroundColor: s.passRatePercent >= 50 ? `${STATUS_GOOD}1a` : `${STATUS_CRITICAL}1a`,
                                    }}
                                  >
                                    {s.passRatePercent >= 50 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                    {s.passRatePercent}%
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      </AnimatedContent>

                      <AnimatedContent delay={0.13} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('trendTitle')}</h3>
                          <div className="mt-4 h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={data?.trend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="khmerLabel" stroke="#64748b" fontSize={12} />
                                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Legend />
                                <Line type="monotone" dataKey="average" name={t('trendAverage')} stroke="#0891b2" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                                <Line type="monotone" dataKey="attendanceRate" name={t('trendAttendance')} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      </AnimatedContent>



                      {showTopBottom && (
                        <>
                          <AnimatedContent delay={0.15} className="col-span-2">
                            <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-emerald-200 dark:border-emerald-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-200/40 dark:hover:shadow-black/40">
                              <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-emerald-600">
                                <Award className="h-5 w-5" /> {t('topPerforming')}
                              </h3>
                              <ul className="mt-4 space-y-2">
                                {data?.topPerformingClasses.map((c) => (
                                  <li key={c.classId} className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
                                    <span className="font-semibold text-slate-800 dark:text-gray-200">{c.className}</span>
                                    <span className="font-black text-emerald-600">{c.average}</span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          </AnimatedContent>

                          <AnimatedContent delay={0.155} className="col-span-2">
                            <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-rose-200 dark:border-rose-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/40 dark:hover:shadow-black/40">
                              <h3 className="text-lg font-black tracking-tight text-rose-600">{t('bottomPerforming')}</h3>
                              <ul className="mt-4 space-y-2">
                                {data?.bottomPerformingClasses.map((c) => (
                                  <li key={c.classId} className="flex items-center justify-between rounded-xl bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
                                    <span className="font-semibold text-slate-800 dark:text-gray-200">{c.className}</span>
                                    <span className="font-black text-rose-600">{c.average}</span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          </AnimatedContent>
                        </>
                      )}

                      {showClassRanking && (
                        <AnimatedContent delay={0.17} className="col-span-2 lg:col-span-4">
                          <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                            <div className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-8 py-6">
                              <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('averageByClass')}</h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[600px]">
                                <thead className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50">
                                  <tr>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('rank')}</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('classFilterLabel')}</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('studentsCount')}</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('averageByClass')}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                  {data?.averageScoreByClass.map((c) => (
                                    <tr key={c.classId} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                                      <td className="px-5 py-3 font-bold text-slate-500 dark:text-gray-400">{c.rank}</td>
                                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">{c.className}</td>
                                      <td className="px-5 py-3 text-slate-600 dark:text-gray-400">{c.studentCount}</td>
                                      <td className="px-5 py-3 font-black text-slate-950 dark:text-white">{c.average}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </section>
                        </AnimatedContent>
                      )}

                      {!loading && data && data.overview.totalStudents === 0 && (
                        <AnimatedContent delay={0.06} className="col-span-2 lg:col-span-4">
                          <section className="rounded-[1.75rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-10 text-center text-slate-500 dark:text-gray-400">
                            {t('noData')}
                          </section>
                        </AnimatedContent>
                      )}
                    </div>
                  </div>
                )}
              </BlurLoader>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
