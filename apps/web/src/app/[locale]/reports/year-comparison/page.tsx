'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useAcademicYearComparison } from '@/hooks/useAcademicYearResources';
import {
  AlertCircle,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Minus,
  RefreshCw,
  School,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

interface YearStats {
  year: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    isCurrent: boolean;
  };
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    studentsByGender: Record<string, number>;
    classesByGrade: Record<string, number>;
    promotions: Record<string, number>;
  };
}

interface YearTrend {
  yearId: string;
  changes: {
    students: { value: number; percentage: string | null };
    teachers: { value: number; percentage: string | null };
    classes: { value: number; percentage: string | null };
  } | null;
}

interface ComparisonData {
  years: YearStats[];
  trends: YearTrend[];
  summary: {
    totalYearsCompared: number;
    latestYear: string | null;
    oldestYear: string | null;
  };
}

type MetricMode = 'students' | 'teachers' | 'classes';

const METRIC_OPTIONS: Array<{
  id: MetricMode;
  label: string;
  short: string;
  icon: typeof Users;
}> = [
  { id: 'students', label: 'Students', short: 'Learners', icon: Users },
  { id: 'teachers', label: 'Teachers', short: 'Faculty', icon: GraduationCap },
  { id: 'classes', label: 'Classes', short: 'Cohorts', icon: School },
];

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'indigo' | 'emerald' | 'amber' | 'sky';
}) {
  const tones = {
    indigo:
      'border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/80 to-blue-50/70 shadow-indigo-100/30',
    emerald:
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70 shadow-emerald-100/30',
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70 shadow-amber-100/30',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70 shadow-sky-100/30',
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

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getTrendMeta(change: number) {
  if (change > 0) {
    return {
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  if (change < 0) {
    return {
      icon: <TrendingDown className="h-4 w-4 text-rose-500" />,
      className: 'border-rose-200 bg-rose-50 text-rose-700',
    };
  }
  return {
    icon: <Minus className="h-4 w-4 text-slate-400" />,
    className: 'border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800 text-slate-600',
  };
}

export default function YearComparisonPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricMode>('students');

  const {
    data,
    isLoading: isLoadingComparison,
    error: comparisonError,
    mutate: mutateComparison,
  } = useAcademicYearComparison<ComparisonData>(school?.id);

  const loading = Boolean(school?.id) && isLoadingComparison && !data;
  const error = comparisonError?.message || '';

  useEffect(() => {
    setIsClient(true);
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
      return;
    }
    router.push(`/${locale}/auth/login`);
  }, [locale, router]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const loadComparison = async () => {
    try {
      await mutateComparison();
    } catch {
      // SWR preserves the latest error state for the UI.
    }
  };

  const metricKey = useMemo(() => {
    if (selectedMetric === 'students') return 'totalStudents' as const;
    if (selectedMetric === 'teachers') return 'totalTeachers' as const;
    return 'totalClasses' as const;
  }, [selectedMetric]);

  const maxMetricValue = useMemo(() => {
    if (!data?.years?.length) return 100;
    return Math.max(...data.years.map((year) => year.stats[metricKey])) || 100;
  }, [data, metricKey]);

  const selectedMetricMeta = METRIC_OPTIONS.find((item) => item.id === selectedMetric) || METRIC_OPTIONS[0];
  const promotionYears = data?.years.filter((year) => Object.keys(year.stats.promotions).length > 0) || [];

  if (!isClient || !user || !school) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6">
        <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
          <p className="mt-4 text-sm font-medium text-slate-500">Loading comparison workspace...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 lg:ml-64">
          <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">Loading year comparison...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.15),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(244,114,182,0.1),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)] lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                eyebrow="Reporting Studio"
                title="Academic year comparison"
                description="Review year-to-year growth and trend movement."
                icon={BarChart3}
                backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(238,242,255,0.97)_56%,rgba(250,245,255,0.9))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.18),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-indigo-600"
                actions={
                  <>
                    <button
                      onClick={loadComparison}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white dark:bg-gray-900/80 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 shadow-sm transition hover:text-slate-950 disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh Comparison
                    </button>
                    <button
                      onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Calendar className="h-4 w-4" />
                      Add Academic Year
                    </button>
                  </>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(49,46,129,0.98),rgba(79,70,229,0.94)_52%,rgba(124,58,237,0.88))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(49,46,129,0.52)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-100/80">Growth Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{data?.summary.totalYearsCompared || 0}</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-indigo-100/75">Years</span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <BarChart3 className="h-7 w-7 text-indigo-100" />
                  </div>
                </div>
                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-indigo-200 to-fuchsia-200"
                    style={{ width: `${Math.min(100, (data?.summary.totalYearsCompared || 0) * 25)}%` }}
                  />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Metric', value: selectedMetricMeta.short },
                    { label: 'Latest', value: data?.summary.latestYear || '--' },
                    { label: 'Origin', value: data?.summary.oldestYear || '--' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                      <p className="truncate text-lg font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-indigo-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold text-indigo-50/90">
                  Longitudinal view
                </div>
              </div>
            </div>
          </AnimatedContent>

          {error ? (
            <AnimatedContent delay={0.04}>
              <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={loadComparison}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          {!data || data.years.length === 0 ? (
            <AnimatedContent delay={0.06}>
              <div className="mt-5 rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-6 py-20 text-center shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-slate-50 dark:bg-gray-800/50 shadow-sm ring-1 ring-slate-200/80">
                  <Calendar className="h-8 w-8 text-slate-300" />
                </div>
                <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">No academic years to compare yet</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">Create your first academic year to unlock comparison reporting.</p>
                <button
                  onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create Academic Year
                </button>
              </div>
            </AnimatedContent>
          ) : (
            <>
              <AnimatedContent delay={0.08}>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Years Compared"
                    value={data.summary.totalYearsCompared}
                    helper="Cycles included in the report"
                    tone="indigo"
                  />
                  <MetricCard
                    label="Latest Year"
                    value={data.summary.latestYear || '--'}
                    helper="Newest academic cycle in view"
                    tone="emerald"
                  />
                  <MetricCard
                    label="Origin Year"
                    value={data.summary.oldestYear || '--'}
                    helper="Starting point of the comparison"
                    tone="amber"
                  />
                  <MetricCard
                    label="Metric Focus"
                    value={selectedMetricMeta.label}
                    helper="Current lens for growth analysis"
                    tone="sky"
                  />
                </div>
              </AnimatedContent>

              <AnimatedContent delay={0.1}>
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Growth View</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Year-over-year trend chart</h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">Switch the metric and compare each academic year against the strongest point in the series.</p>
                    </div>

                    <div className="flex flex-wrap gap-2 rounded-[1rem] border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 p-1.5">
                      {METRIC_OPTIONS.map((metric) => {
                        const Icon = metric.icon;
                        const isActive = selectedMetric === metric.id;

                        return (
                          <button
                            key={metric.id}
                            onClick={() => setSelectedMetric(metric.id)}
                            className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2 text-sm font-semibold transition ${
                              isActive
                                ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                                : 'text-slate-500 hover:text-slate-800 dark:text-gray-100'
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-indigo-500'}`} />
                            {metric.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                    {data.years.map((yearData, index) => {
                      const metricValue = yearData.stats[metricKey];
                      const percentage = maxMetricValue > 0 ? Math.max((metricValue / maxMetricValue) * 100, 6) : 0;
                      const trend = data.trends.find((item) => item.yearId === yearData.year.id);
                      const change = trend?.changes?.[selectedMetric]?.value ?? 0;
                      const changePercentage = trend?.changes?.[selectedMetric]?.percentage ?? '0';
                      const trendMeta = getTrendMeta(change);

                      return (
                        <div key={yearData.year.id} className="grid gap-4 rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-4 lg:grid-cols-[220px_minmax(0,1fr)_150px] lg:items-center lg:p-5">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black tracking-tight text-slate-950">{yearData.year.name}</h3>
                              {yearData.year.isCurrent ? (
                                <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">
                                  Current
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-500">
                              {formatDateLabel(yearData.year.startDate)} - {formatDateLabel(yearData.year.endDate)}
                            </p>
                          </div>

                          <div>
                            <div className="h-14 overflow-hidden rounded-[1rem] bg-white dark:bg-gray-900 ring-1 ring-slate-200/70">
                              <div
                                className={`flex h-full items-center justify-end rounded-[1rem] px-4 text-sm font-black text-white transition-all ${
                                  yearData.year.isCurrent
                                    ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500'
                                    : 'bg-gradient-to-r from-slate-400 to-slate-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              >
                                {metricValue.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-start lg:justify-end">
                            {index < data.years.length - 1 ? (
                              <div className={`inline-flex items-center gap-2 rounded-[0.95rem] border px-3 py-2 text-sm font-semibold ${trendMeta.className}`}>
                                {trendMeta.icon}
                                <span>
                                  {change > 0 ? '+' : ''}
                                  {change} ({changePercentage || 0}%)
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-slate-500">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                Baseline
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </AnimatedContent>

              <AnimatedContent delay={0.12}>
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Dataset</p>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">Detailed comparison table</h2>
                    <p className="text-sm font-medium text-slate-500">Core totals and gender distribution across all academic years in the report.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[960px] w-full text-left">
                      <thead className="bg-slate-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Metric</th>
                          {data.years.map((yearData) => (
                            <th
                              key={yearData.year.id}
                              className={`px-5 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] ${
                                yearData.year.isCurrent ? 'text-indigo-600 bg-indigo-50/70' : 'text-slate-400'
                              }`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span>{yearData.year.name}</span>
                                {yearData.year.isCurrent ? (
                                  <span className="rounded-full border border-indigo-200 bg-white dark:bg-gray-900 px-2 py-0.5 text-[9px] text-indigo-700">Current</span>
                                ) : null}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                        {[
                          { label: 'Students', icon: <Users className="h-4 w-4 text-sky-500" />, getter: (year: YearStats) => year.stats.totalStudents },
                          { label: 'Teachers', icon: <GraduationCap className="h-4 w-4 text-emerald-500" />, getter: (year: YearStats) => year.stats.totalTeachers },
                          { label: 'Classes', icon: <School className="h-4 w-4 text-amber-500" />, getter: (year: YearStats) => year.stats.totalClasses },
                          { label: 'Subjects', icon: <BookOpen className="h-4 w-4 text-violet-500" />, getter: (year: YearStats) => year.stats.totalSubjects },
                          {
                            label: 'Male Students',
                            icon: <Users className="h-4 w-4 text-slate-400" />,
                            getter: (year: YearStats) => year.stats.studentsByGender.MALE || year.stats.studentsByGender.Male || 0,
                          },
                          {
                            label: 'Female Students',
                            icon: <Users className="h-4 w-4 text-slate-400" />,
                            getter: (year: YearStats) => year.stats.studentsByGender.FEMALE || year.stats.studentsByGender.Female || 0,
                          },
                        ].map((row) => (
                          <tr key={row.label} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 transition">
                            <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                              <div className="inline-flex items-center gap-3">
                                {row.icon}
                                {row.label}
                              </div>
                            </td>
                            {data.years.map((yearData) => (
                              <td
                                key={`${yearData.year.id}-${row.label}`}
                                className={`px-5 py-4 text-center text-sm font-bold ${
                                  yearData.year.isCurrent ? 'bg-indigo-50/40 text-indigo-700' : 'text-slate-600'
                                }`}
                              >
                                {row.getter(yearData).toLocaleString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </AnimatedContent>

              {promotionYears.length > 0 ? (
                <AnimatedContent delay={0.14}>
                  <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                    <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Outcomes</p>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">Promotion outcomes</h2>
                      <p className="text-sm font-medium text-slate-500">Promotion distribution by academic year where progression data exists.</p>
                    </div>

                    <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3 sm:px-6 sm:py-6">
                      {promotionYears.map((yearData) => {
                        const total = Object.values(yearData.stats.promotions).reduce((sum, count) => sum + count, 0);

                        return (
                          <div key={yearData.year.id} className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Academic Year</p>
                                <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">{yearData.year.name}</h3>
                              </div>
                              <div className="rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                                {total} total
                              </div>
                            </div>

                            <div className="mt-5 space-y-3">
                              {Object.entries(yearData.stats.promotions).map(([type, count]) => (
                                <div key={type} className="rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-3 ring-1 ring-slate-200/70">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                                      {type.replaceAll('_', ' ')}
                                    </span>
                                    <span className="text-sm font-black text-slate-950">{count}</span>
                                  </div>
                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500"
                                      style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </AnimatedContent>
              ) : null}
            </>
          )}
        </main>
      </div>
    </>
  );
}
