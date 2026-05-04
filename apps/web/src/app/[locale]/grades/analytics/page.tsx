'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  BookOpen,
  Award,
  ArrowUp,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { gradeAPI, GradeAnalyticsData } from '@/lib/api/grades';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';

// Chart colors
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const GRADE_COLORS: Record<string, string> = {
  A: '#10b981',
  B: '#22c55e',
  C: '#f59e0b',
  D: '#f97316',
  E: '#ef4444',
  F: '#dc2626',
};

function formatTermDateRange(term?: GradeAnalyticsData['term']) {
  if (!term?.startDate || !term?.endDate) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatter.format(new Date(term.startDate))} - ${formatter.format(new Date(term.endDate))}`;
}

export default function GradeAnalyticsPage() {
    const autoT = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [analyticsData, setAnalyticsData] = useState<GradeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();

  useEffect(() => {
    setIsClient(true);
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
    }
  }, [locale, router]);

  useEffect(() => {
    if (selectedYear && allYears.some((year) => year.id === selectedYear)) {
      return;
    }

    const preferredYearId =
      contextSelectedYear?.id || allYears.find((year) => year.isCurrent)?.id || allYears[0]?.id || '';

    if (preferredYearId) {
      setSelectedYear(preferredYearId);
    }
  }, [allYears, contextSelectedYear, selectedYear]);

  const { classes, isLoading: isLoadingClasses } = useClasses({
    academicYearId: selectedYear || undefined,
    limit: 100,
  });

  useEffect(() => {
    if (!classes.length) {
      setSelectedClass('');
      return;
    }

    if (!selectedClass || !classes.some((cls) => cls.id === selectedClass)) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  // Fetch grade data when filters change
  useEffect(() => {
    const fetchGradeData = async () => {
      if (!selectedClass || !selectedYear) return;

      setLoading(true);
      try {
        const year = allYears.find((y) => y.id === selectedYear);
        const yearNum = year ? parseInt(year.name.split('-')[0]) : new Date().getFullYear();

        const report = await gradeAPI.getGradeAnalytics(selectedClass, selectedSemester, yearNum);
        setAnalyticsData(report);
      } catch (error) {
        console.error('Failed to fetch grade data:', error);
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };

    if (selectedClass && selectedYear && isClient) {
      fetchGradeData();
    } else if (isClient) {
      setLoading(isLoadingClasses);
    }
  }, [selectedClass, selectedYear, selectedSemester, allYears, isClient, isLoadingClasses]);

  // Calculate monthly trend data
  const monthlyTrendData = useMemo(() => {
    return (analyticsData?.charts.monthlyTrend || []).map((item) => ({
      month: item.month,
      average: item.average,
    }));
  }, [analyticsData]);

  // Calculate subject performance data
  const subjectPerformanceData = useMemo(() => {
    return analyticsData?.charts.subjectPerformance || [];
  }, [analyticsData]);

  // Calculate grade distribution
  const gradeDistributionData = useMemo(() => {
    return analyticsData?.charts.gradeDistribution || [];
  }, [analyticsData]);

  // Calculate top performers
  const topPerformers = useMemo(() => {
    return analyticsData?.students.slice(0, 5) || [];
  }, [analyticsData]);

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (!analyticsData) return null;

    const { statistics } = analyticsData;
    return {
      classAverage: statistics.classAverage,
      highestAverage: statistics.highestAverage,
      lowestAverage: statistics.lowestAverage,
      passRate: statistics.passRate,
      passingCount: statistics.passingCount,
      failingCount: statistics.failingCount,
    };
  }, [analyticsData]);

  // Radar chart data for subject categories
  const subjectCategoryData = useMemo(() => {
    return analyticsData?.charts.categoryPerformance || [];
  }, [analyticsData]);

  if (!isClient) return null;

  const selectedClassDetails = classes.find((c) => c.id === selectedClass);
  const selectedClassName = selectedClassDetails?.name || '';
  const selectedYearLabel = allYears.find((year) => year.id === selectedYear)?.name || 'No year selected';
  const semesterLabel = analyticsData?.term?.name || (selectedSemester === 1 ? 'Semester 1' : 'Semester 2');
  const termDateRange = formatTermDateRange(analyticsData?.term);
  const pulseValue = classStats ? Math.round(classStats.passRate) : selectedClass ? 28 : 0;
  const pulseLabel = loading ? 'Loading' : analyticsData ? 'Ready' : 'Setup';
  const focusSummary = selectedClassName || 'Choose a class';
  const metricCards = [
    {
      label: 'Class Average',
      value: classStats ? `${classStats.classAverage.toFixed(1)}%` : '--',
      note: 'Overall class performance',
      tone: 'border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/80 to-blue-50/70',
    },
    {
      label: 'Pass Rate',
      value: classStats ? `${classStats.passRate.toFixed(0)}%` : '--',
      note: 'Students currently passing',
      tone: 'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70',
    },
    {
      label: 'Top Score',
      value: classStats ? `${classStats.highestAverage.toFixed(1)}%` : '--',
      note: 'Highest average in the class',
      tone: 'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70',
    },
    {
      label: 'Class Size',
      value: analyticsData?.totalStudents || '--',
      note: 'Students included in analytics',
      tone: 'border-violet-100/80 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/70',
    },
  ];

  return (
    <>
      <UnifiedNavigation user={user} school={school} />
      <div className="lg:ml-64 min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(99,102,241,0.08),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_52%,#f8fafc_100%)]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                eyebrow="Insight Studio"
                title={autoT("auto.web.locale_grades_analytics_page.k_e1510f46")}
                description="Track class performance and learner trends."
                icon={BarChart3}
                backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(238,242,255,0.97)_56%,rgba(243,244,255,0.92))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.18),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-indigo-600/80"
                actions={
                  <button
                    onClick={() => {
                      if (selectedClass && selectedYear) {
                        const year = allYears.find((y) => y.id === selectedYear);
                        const yearNum = year ? parseInt(year.name.split('-')[0]) : new Date().getFullYear();
                        setLoading(true);
                        gradeAPI
                          .getGradeAnalytics(selectedClass, selectedSemester, yearNum)
                          .then((report) => setAnalyticsData(report))
                          .catch(() => setAnalyticsData(null))
                          .finally(() => setLoading(false));
                      }
                    }}
                    disabled={!selectedClass || !selectedYear || loading}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_eb2bc7d4" />
                  </button>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-indigo-200/70 bg-[linear-gradient(145deg,rgba(55,48,163,0.98),rgba(79,70,229,0.94)_52%,rgba(124,58,237,0.88))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(55,48,163,0.5)] ring-1 ring-white/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-100/80"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_32c2f0ef" /></p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{pulseValue}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-indigo-100/75">
                        {pulseLabel}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-4 ring-1 ring-white/10 backdrop-blur">
                    <BarChart3 className="h-7 w-7 text-indigo-100" />
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-indigo-200 to-violet-200"
                    style={{ width: `${Math.min(100, pulseValue)}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Class', value: focusSummary },
                    { label: 'Year', value: selectedYearLabel },
                    { label: 'Term', value: semesterLabel },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-none dark:bg-gray-900/5 px-4 py-4 backdrop-blur-sm">
                      <p className="truncate text-lg font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-indigo-100/80">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-white/10 bg-white dark:bg-none dark:bg-gray-900/10 px-4 py-2 text-sm font-semibold text-indigo-50/90">
                  {analyticsData?.totalStudents || 0} <AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_ebd6dd1a" />
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-[1.3rem] border p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-white/75 ${card.tone}`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{card.value}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">{card.note}</p>
                </div>
              ))}
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.06}>
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_af8d5735" /></p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_0250b27c" /></h2>
                  <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_8d326f74" /></p>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200 dark:border-gray-800 bg-gradient-to-br from-indigo-50 to-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_49a9c021" /></p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{focusSummary}</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{selectedYearLabel} • {semesterLabel}{termDateRange ? ` • ${termDateRange}` : ''}</p>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_8ca9cea5" /></span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="">{autoT("auto.web.locale_grades_analytics_page.k_4d6bff50")}</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({autoT("auto.web.shared.dynamic.gradePrefix")} {cls.grade})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_4f1561c6" /></span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-none dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  >
                    {allYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_f1f4a9d0" /></span>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
                    className="h-12 w-full rounded-[0.95rem] border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value={1}>{autoT("auto.web.locale_grades_analytics_page.k_4070bd30")}</option>
                    <option value={2}>{autoT("auto.web.locale_grades_analytics_page.k_a63e0f70")}</option>
                  </select>
                </label>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent delay={0.08}>
            <BlurLoader isLoading={loading} showSpinner={false}>
              {analyticsData ? (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-5 lg:grid-cols-2">
                    <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white dark:bg-gray-900/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-[1rem] bg-indigo-50 p-3 text-indigo-600">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_8db2f946" /></p>
                          <h3 className="text-xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_eb409e09" /></h3>
                        </div>
                      </div>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                            <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px -32px rgba(15,23,42,0.35)' }} />
                            <Line
                              type="monotone"
                              dataKey="average"
                              stroke="#6366f1"
                              strokeWidth={3}
                              dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
                              activeDot={{ r: 8 }}
                              name="Average %"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white dark:bg-gray-900/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-[1rem] bg-emerald-50 p-3 text-emerald-600">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_8fb64240" /></p>
                          <h3 className="text-xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_fa8c6950" /></h3>
                        </div>
                      </div>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectPerformanceData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                            <YAxis type="category" dataKey="subject" stroke="#64748b" fontSize={11} width={90} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px -32px rgba(15,23,42,0.35)' }} />
                            <Bar dataKey="average" radius={[0, 8, 8, 0]} name="Average %">
                              {subjectPerformanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.average >= 50 ? '#10b981' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white dark:bg-gray-900/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-[1rem] bg-violet-50 p-3 text-violet-600">
                          <Award className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_bd96dab3" /></p>
                          <h3 className="text-xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_f662b38a" /></h3>
                        </div>
                      </div>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={gradeDistributionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                            >
                              {gradeDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade] || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px -32px rgba(15,23,42,0.35)' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white dark:bg-gray-900/90 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-[1rem] bg-amber-50 p-3 text-amber-600">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_4b7038fd" /></p>
                          <h3 className="text-xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_1a98d927" /></h3>
                        </div>
                      </div>
                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={subjectCategoryData}>
                            <PolarGrid stroke="#e2e8f0" />
                            <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                            <Radar name="Average Score" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 50px -32px rgba(15,23,42,0.35)' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  </div>

                  {topPerformers.length > 0 && (
                    <section className="overflow-hidden rounded-[1.6rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 shadow-[0_26px_75px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 bg-gradient-to-r from-amber-50/80 to-orange-50/60 px-5 py-5 sm:px-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_4a1dd3d8" /></p>
                        <h3 className="text-xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_94ba244b" /> {selectedClassName}</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px]">
                          <thead className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50">
                            <tr>
                              <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_0615dcb6" /></th>
                              <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_d125e800" /></th>
                              <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_dbcfc94d" /></th>
                              <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_c9f2e0bf" /></th>
                              <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_4bffe474" /></th>
                              <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_8db2f946" /></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {topPerformers.map((student, idx) => (
                              <tr key={student.studentId} className="transition-colors hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-none dark:bg-gray-800/50">
                                <td className="px-5 py-4">
                                  <div
                                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                                      idx === 0
                                        ? 'bg-amber-100 text-amber-700'
                                        : idx === 1
                                          ? 'bg-slate-200 text-slate-700 dark:text-gray-200'
                                          : idx === 2
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-slate-100 dark:bg-gray-800 text-slate-600'
                                    }`}
                                  >
                                    {student.rank}
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                                      <span className="font-semibold text-indigo-600">
                                        {student.student.firstName[0]}
                                        {student.student.lastName[0]}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-slate-950">
                                        {student.student.firstName} {student.student.lastName}
                                      </p>
                                      <p className="text-sm text-slate-500">{student.student.khmerName}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-lg font-black text-slate-950">{student.average.toFixed(1)}%</td>
                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                                      student.gradeLevel === 'A'
                                        ? 'bg-green-100 text-green-700'
                                        : student.gradeLevel === 'B'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : student.gradeLevel === 'C'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : student.gradeLevel === 'D'
                                              ? 'bg-orange-100 text-orange-700'
                                              : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    <AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_c9f2e0bf" /> {student.gradeLevel}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                                      student.isPassing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}
                                  >
                                    {student.isPassing ? 'Passing' : 'Failing'}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-1 text-emerald-600">
                                    <ArrowUp className="h-4 w-4" />
                                    <span className="text-sm font-medium"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_ad6e2c5b" /></span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </div>
              ) : !loading ? (
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-6 py-16 text-center shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-indigo-50 text-indigo-600 shadow-inner">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_b9c1dd80" /></h3>
                  <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">
                    <AutoI18nText i18nKey="auto.web.locale_grades_analytics_page.k_8c4541b1" />
                  </p>
                </section>
              ) : null}
            </BlurLoader>
          </AnimatedContent>
        </main>
      </div>
    </>
  );
}
