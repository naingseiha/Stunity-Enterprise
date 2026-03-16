'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ArrowLeft,
  BarChart3,
  RefreshCw,
  ChevronRight,
  School,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Award,
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

export default function YearComparisonPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;

  // Client-side only state for user data
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<'students' | 'teachers' | 'classes'>('students');

  // Initialize client-side data
  useEffect(() => {
    setIsClient(true);
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
    } else {
      router.push(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  // Load comparison data when school is available
  useEffect(() => {
    if (school?.id) {
      loadComparison();
    }
  }, [school?.id]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const loadComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const token = TokenManager.getAccessToken();
      const schoolId = school?.id;
      if (!schoolId) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002'}/schools/${schoolId}/academic-years/comparison?yearIds=all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load comparison data');
      }
    } catch (err) {
      setError('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
    if (change < 0) return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20';
    return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800';
  };

  // Calculate max value for bar chart scaling
  const getMaxValue = (metric: 'totalStudents' | 'totalTeachers' | 'totalClasses') => {
    if (!data) return 100;
    return Math.max(...data.years.map((y) => y.stats[metric])) || 100;
  };

  if (!isClient || !user || !school) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-8">
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse w-32 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="lg:ml-64 min-h-screen">
          <div className="bg-indigo-600 dark:bg-indigo-950/40 p-12 h-64" />
          <div className="p-12 -mt-32">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 h-32 animate-pulse shadow-sm" />
              ))}
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800 h-96 animate-pulse shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-violet-950/40 text-white p-12 relative overflow-hidden group">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
          <div className="relative z-10">
            <button
              onClick={() => router.push(`/${locale}/settings/academic-years`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white/80 hover:text-white mb-8 transition-all font-black uppercase tracking-widest text-[10px] border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Vector Archive
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-md border border-white/10 group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-10 h-10" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-2">Temporal Analytical Matrix</div>
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tighter">Year-Over-Year</h1>
                  <p className="text-white/60 mt-2 font-medium">Comparative longitudinal data mapping.</p>
                </div>
              </div>
              <button
                onClick={loadComparison}
                disabled={loading}
                className="flex items-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Synchronize
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-12 -mt-10 relative z-20">
          <BlurLoader isLoading={loading} showSpinner={false}>
          {error ? (
            <div className="text-center py-20">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadComparison}
                className="mt-4 text-indigo-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : !data || data.years.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No academic years to compare</p>
              <button
                onClick={() => router.push(`/${locale}/settings/academic-years/new/wizard`)}
                className="mt-4 text-indigo-600 hover:underline"
              >
                Create your first academic year
              </button>
            </div>
          ) : (
            <div>
              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="group bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 hover:border-indigo-500/30 transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Epochs Compared</div>
                      <p className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                        {data.summary.totalYearsCompared}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="group bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 hover:border-emerald-500/30 transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Current Vector</div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter truncate max-w-[150px]">
                        {data.summary.latestYear || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="group bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-8 hover:border-purple-500/30 transition-all duration-500">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                      <Award className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Origin Point</div>
                      <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter truncate max-w-[150px]">
                        {data.summary.oldestYear || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Selector */}
              <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-10 mb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Delta Analysis</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cross-referencing organizational growth.</p>
                  </div>
                  <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    {[
                      { id: 'students', label: 'Entities', icon: Users },
                      { id: 'teachers', label: 'Nodes', icon: GraduationCap },
                      { id: 'classes', label: 'Clusters', icon: School },
                    ].map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => setSelectedMetric(metric.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                          selectedMetric === metric.id
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <metric.icon className="w-3.5 h-3.5" />
                        {metric.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="space-y-8">
                  {data.years.map((yearData, index) => {
                    const metric =
                      selectedMetric === 'students'
                        ? yearData.stats.totalStudents
                        : selectedMetric === 'teachers'
                        ? yearData.stats.totalTeachers
                        : yearData.stats.totalClasses;
                    const maxValue = getMaxValue(
                      selectedMetric === 'students'
                        ? 'totalStudents'
                        : selectedMetric === 'teachers'
                        ? 'totalTeachers'
                        : 'totalClasses'
                    );
                    const percentage = (metric / maxValue) * 100;
                    const trend = data.trends.find((t) => t.yearId === yearData.year.id);
                    const change =
                      trend?.changes?.[selectedMetric]?.value || 0;
                    const changePercentage =
                      trend?.changes?.[selectedMetric]?.percentage || null;

                    return (
                      <div
                        key={yearData.year.id}
                        className="group flex flex-col md:flex-row md:items-center gap-6"
                      >
                        <div className="w-40 flex-shrink-0">
                          <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight">{yearData.year.name}</p>
                          {yearData.year.isCurrent && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] font-black uppercase tracking-widest mt-1">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                              Active Matrix
                            </div>
                          )}
                        </div>
                        <div className="flex-1 relative">
                          <div className="h-14 bg-gray-50 dark:bg-gray-800/50 rounded-2xl overflow-hidden p-1.5 border border-gray-100 dark:border-gray-800">
                            <div
                              className={`h-full rounded-xl transition-all duration-1000 relative group-hover:scale-[1.01] origin-left ${
                                yearData.year.isCurrent
                                  ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 shadow-lg shadow-indigo-500/20'
                                  : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-700 dark:to-gray-600'
                              }`}
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            >
                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white/10" />
                            </div>
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{metric.toLocaleString()}</p>
                        </div>
                        <div className="w-32">
                          {index < data.years.length - 1 && change !== undefined && (
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-transparent transition-all hover:shadow-lg ${getTrendColor(
                                change
                              )}`}
                            >
                              {getTrendIcon(change)}
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {change > 0 ? '+' : ''}
                                {change} ({changePercentage || 0}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Comparison Table */}
              <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden mb-12">
                <div className="p-10 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
                  <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-600">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Granular Comparison</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">High-fidelity data breakdown by year.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-100 dark:border-gray-800">
                        <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          Variable Indicator
                        </th>
                        {data.years.map((yearData) => (
                          <th
                            key={yearData.year.id}
                            className={`px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest ${
                              yearData.year.isCurrent
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/5'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              {yearData.year.name}
                              {yearData.year.isCurrent && (
                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded text-[8px] font-black">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-8 py-6 text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                          <Users className="w-4 h-4 text-blue-500" />
                          Population Total
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-8 py-6 text-center text-lg font-black tracking-tighter ${
                              yearData.year.isCurrent ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {yearData.stats.totalStudents.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-8 py-6 text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                          <GraduationCap className="w-4 h-4 text-emerald-500" />
                          Faculty Nodes
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-8 py-6 text-center text-lg font-black tracking-tighter ${
                              yearData.year.isCurrent ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {yearData.stats.totalTeachers.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-8 py-6 text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                          <School className="w-4 h-4 text-amber-500" />
                          Cohort Clusters
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-8 py-6 text-center text-lg font-black tracking-tighter ${
                              yearData.year.isCurrent ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {yearData.stats.totalClasses.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-8 py-6 text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                          <BookOpen className="w-4 h-4 text-violet-500" />
                          Subject Matrix
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-8 py-6 text-center text-lg font-black tracking-tighter ${
                              yearData.year.isCurrent ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {yearData.stats.totalSubjects.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-100/50 dark:bg-gray-800/30">
                        <td className="px-8 py-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                          Gender Distribution Metrics
                        </td>
                        {data.years.map((yearData) => (
                          <td key={yearData.year.id} className="px-8 py-4" />
                        ))}
                      </tr>
                      <tr className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-8 py-6 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-16">Male Variant</td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-8 py-6 text-center text-[15px] font-black tracking-tight ${
                              yearData.year.isCurrent ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {yearData.stats.studentsByGender['MALE'] ||
                              yearData.stats.studentsByGender['Male'] ||
                              0}
                          </td>
                        ))}
                      </tr>
                      <tr className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-8 py-6 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-16">Female Variant</td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-8 py-6 text-center text-[15px] font-black tracking-tight ${
                              yearData.year.isCurrent ? 'bg-indigo-500/5 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {yearData.stats.studentsByGender['FEMALE'] ||
                              yearData.stats.studentsByGender['Female'] ||
                              0}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Promotion Stats */}
              {data.years.some((y) => Object.keys(y.stats.promotions).length > 0) && (
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden mt-12 mb-12">
                  <div className="p-10 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Outcome Flow</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Longitudinal progression analysis across vectors.
                    </p>
                  </div>
                  <div className="p-10">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {data.years.map((yearData) => {
                        const promotions = yearData.stats.promotions;
                        if (Object.keys(promotions).length === 0) return null;

                        const total = Object.values(promotions).reduce(
                          (sum, count) => sum + count,
                          0
                        );

                        return (
                          <div
                            key={yearData.year.id}
                            className="p-8 bg-gray-50/50 dark:bg-gray-800/30 rounded-[2rem] border border-gray-100 dark:border-gray-800 border-dashed"
                          >
                            <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                              {yearData.year.name} Matrix
                            </h3>
                            <div className="space-y-4">
                              {Object.entries(promotions).map(([type, count]) => (
                                <div
                                  key={type}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {type.toLowerCase().replace('_', ' ')}
                                  </span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">
                                      {count}
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-md text-[8px] font-black text-gray-500 dark:text-gray-400">
                                      {((count / total) * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </BlurLoader>
        </div>
      </div>
    </div>
  );
}
