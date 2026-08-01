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
  { id: 'students', label: 'សិស្ស', short: 'សិស្ស', icon: Users },
  { id: 'teachers', label: 'គ្រូបង្រៀន', short: 'គ្រូ', icon: GraduationCap },
  { id: 'classes', label: 'ថ្នាក់រៀន', short: 'ថ្នាក់', icon: School },
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
    indigo: 'border-indigo-100 bg-indigo-50/70',
    emerald: 'border-emerald-100 bg-emerald-50/70',
    amber: 'border-amber-100 bg-amber-50/70',
    sky: 'border-sky-100 bg-sky-50/70',
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}
    >
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

const KHMER_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];

function formatDateLabel(value: string) {
  const date = new Date(value);
  return `${date.getUTCDate()} ${KHMER_MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
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

function ComparisonSkeleton({ user, school, onLogout }: { user: any; school: any; onLogout: () => void }) {
  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={onLogout} />
      <div className="min-h-screen bg-slate-50 lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
            <div className="mt-5 h-9 w-80 max-w-full animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-4 w-[28rem] max-w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="h-11 w-36 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-11 w-40 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-8 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-3 w-36 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="h-5 w-56 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-3 w-96 max-w-full animate-pulse rounded bg-slate-100" />
            </div>
            <div className="space-y-4 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 lg:grid-cols-[190px_1fr_120px]">
                  <div className="h-10 animate-pulse rounded bg-white" />
                  <div className="h-10 animate-pulse rounded bg-white" />
                  <div className="h-10 animate-pulse rounded bg-white" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
          <p className="mt-4 text-sm font-medium text-slate-500">កំពុងរៀបចំទំព័រប្រៀបធៀប...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ComparisonSkeleton user={user} school={school} onLogout={handleLogout} />;
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-slate-50 lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_360px]">
              <CompactHeroCard
                eyebrow="របាយការណ៍ឆ្នាំសិក្សា"
                title="ប្រៀបធៀបឆ្នាំសិក្សា"
                description="មើលការផ្លាស់ប្តូរចំនួនសិស្ស គ្រូ និងថ្នាក់រៀនតាមឆ្នាំសិក្សា ដើម្បីជួយសម្រេចចិត្តលើផែនការឆ្នាំក្រោយ។"
                icon={BarChart3}
                backgroundClassName="bg-white dark:bg-gray-950"
                glowClassName="hidden"
                eyebrowClassName="text-slate-500"
                iconShellClassName="bg-slate-950 text-white"
                actions={
                  <>
                    <button
                      onClick={loadComparison}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      ផ្ទុកទិន្នន័យឡើងវិញ
                    </button>
                    <button
                      onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      <Calendar className="h-4 w-4" />
                      បន្ថែមឆ្នាំសិក្សា
                    </button>
                  </>
                }
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500">សង្ខេបការប្រៀបធៀប</p>
                    <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{data?.summary.totalYearsCompared || 0}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">ឆ្នាំសិក្សាដែលបានរាប់បញ្ចូល</p>
                  </div>
                  <div className="rounded-xl bg-slate-950 p-3 text-white">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { label: 'មើលតាម', value: selectedMetricMeta.short },
                    { label: 'ឆ្នាំថ្មីបំផុត', value: data?.summary.latestYear || '--' },
                    { label: 'ឆ្នាំចាស់បំផុត', value: data?.summary.oldestYear || '--' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <span className="text-sm font-semibold text-slate-500">{item.label}</span>
                      <span className="text-sm font-black text-slate-950">{item.value}</span>
                    </div>
                  ))}
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
                  <p className="text-sm font-black">ត្រូវការសកម្មភាព</p>
                  <p className="mt-1 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={loadComparison}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  ព្យាយាមម្តងទៀត
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
                <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950">មិនទាន់មានឆ្នាំសិក្សាសម្រាប់ប្រៀបធៀប</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">បង្កើតឆ្នាំសិក្សាជាមុន ដើម្បីអាចមើលរបាយការណ៍ប្រៀបធៀបបាន។</p>
                <button
                  onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  បង្កើតឆ្នាំសិក្សា
                </button>
              </div>
            </AnimatedContent>
          ) : (
            <>
              <AnimatedContent delay={0.08}>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    label="ឆ្នាំដែលប្រៀបធៀប"
                    value={data.summary.totalYearsCompared}
                    helper="ចំនួនឆ្នាំសិក្សាក្នុងរបាយការណ៍"
                    tone="indigo"
                  />
                  <MetricCard
                    label="ឆ្នាំថ្មីបំផុត"
                    value={data.summary.latestYear || '--'}
                    helper="ឆ្នាំសិក្សាចុងក្រោយក្នុងទិន្នន័យ"
                    tone="emerald"
                  />
                  <MetricCard
                    label="ឆ្នាំចាប់ផ្តើម"
                    value={data.summary.oldestYear || '--'}
                    helper="ចំណុចចាប់ផ្តើមសម្រាប់ប្រៀបធៀប"
                    tone="amber"
                  />
                  <MetricCard
                    label="មាត្រដ្ឋានកំពុងមើល"
                    value={selectedMetricMeta.label}
                    helper="អាចប្ដូរទៅសិស្ស គ្រូ ឬថ្នាក់"
                    tone="sky"
                  />
                </div>
              </AnimatedContent>

              <AnimatedContent delay={0.1}>
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500">និន្នាការតាមឆ្នាំ</p>
                      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">ប្រៀបធៀបការកើន/ថយតាមឆ្នាំសិក្សា</h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">ជ្រើសមាត្រដ្ឋាន ហើយមើលឆ្នាំនីមួយៗធៀបនឹងឆ្នាំមុន។</p>
                    </div>

                    <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                      {METRIC_OPTIONS.map((metric) => {
                        const Icon = metric.icon;
                        const isActive = selectedMetric === metric.id;

                        return (
                          <button
                            key={metric.id}
                            onClick={() => setSelectedMetric(metric.id)}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${
                              isActive
                                ? 'bg-slate-950 text-white shadow-sm'
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
                      const changePercentage = trend?.changes?.[selectedMetric]?.percentage;
                      const trendMeta = getTrendMeta(change);

                      return (
                        <div key={yearData.year.id} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[220px_minmax(0,1fr)_150px] lg:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black tracking-tight text-slate-950">{yearData.year.name}</h3>
                              {yearData.year.isCurrent ? (
                                <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">
                                  បច្ចុប្បន្ន
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm font-medium text-slate-500">
                              {formatDateLabel(yearData.year.startDate)} - {formatDateLabel(yearData.year.endDate)}
                            </p>
                          </div>

                          <div>
                            <div className="h-12 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                              <div
                                className={`flex h-full items-center justify-end rounded-xl px-4 text-sm font-black text-white transition-all ${
                                  yearData.year.isCurrent
                                    ? 'bg-slate-950'
                                    : 'bg-slate-500'
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
                                  {change} {changePercentage == null ? '(ថ្មី)' : `(${changePercentage}%)`}
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-semibold text-slate-500">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ឆ្នាំគោល
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
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                    <p className="text-xs font-bold text-slate-500">តារាងទិន្នន័យ</p>
                    <h2 className="text-xl font-black tracking-tight text-slate-950">តារាងប្រៀបធៀបលម្អិត</h2>
                    <p className="text-sm font-medium text-slate-500">មើលចំនួនសរុប និងការបែងចែកសិស្សតាមភេទក្នុងឆ្នាំសិក្សានីមួយៗ។</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[960px] w-full text-left">
                      <thead className="bg-slate-50 dark:bg-gray-800/50">
                        <tr>
                          <th className="px-5 py-4 text-xs font-black text-slate-500">មាត្រដ្ឋាន</th>
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
                                  <span className="rounded-full border border-indigo-200 bg-white dark:bg-gray-900 px-2 py-0.5 text-[9px] text-indigo-700">បច្ចុប្បន្ន</span>
                                ) : null}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                        {[
                          { label: 'សិស្សសរុប', icon: <Users className="h-4 w-4 text-sky-500" />, getter: (year: YearStats) => year.stats.totalStudents },
                          { label: 'គ្រូបង្រៀន', icon: <GraduationCap className="h-4 w-4 text-emerald-500" />, getter: (year: YearStats) => year.stats.totalTeachers },
                          { label: 'ថ្នាក់រៀន', icon: <School className="h-4 w-4 text-amber-500" />, getter: (year: YearStats) => year.stats.totalClasses },
                          { label: 'មុខវិជ្ជា', icon: <BookOpen className="h-4 w-4 text-violet-500" />, getter: (year: YearStats) => year.stats.totalSubjects },
                          {
                            label: 'សិស្សប្រុស',
                            icon: <Users className="h-4 w-4 text-slate-400" />,
                            getter: (year: YearStats) => year.stats.studentsByGender.MALE || year.stats.studentsByGender.Male || 0,
                          },
                          {
                            label: 'សិស្សស្រី',
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
                  <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                      <p className="text-xs font-bold text-slate-500">លទ្ធផលឡើងថ្នាក់</p>
                      <h2 className="text-xl font-black tracking-tight text-slate-950">ការបែងចែកលទ្ធផលឡើងថ្នាក់</h2>
                      <p className="text-sm font-medium text-slate-500">បង្ហាញតែឆ្នាំដែលមានទិន្នន័យ progression រួចហើយ។</p>
                    </div>

                    <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3 sm:px-6 sm:py-6">
                      {promotionYears.map((yearData) => {
                        const total = Object.values(yearData.stats.promotions).reduce((sum, count) => sum + count, 0);

                        return (
                          <div key={yearData.year.id} className="rounded-[1.2rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-slate-500">ឆ្នាំសិក្សា</p>
                                <h3 className="mt-2 text-lg font-black tracking-tight text-slate-950">{yearData.year.name}</h3>
                              </div>
                              <div className="rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                                {total} សរុប
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
