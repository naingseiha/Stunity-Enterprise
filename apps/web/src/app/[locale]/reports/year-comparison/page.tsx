'use client';

import { useEffect, useState } from 'react';
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

export default function YearComparisonPage({ params }: { params: { locale: string } }) {
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

  const handleLogout = () => {
    TokenManager.clearTokens();
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
        `http://localhost:3002/schools/${schoolId}/academic-years/comparison?yearIds=all`,
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
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600 bg-green-50';
    if (change < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Calculate max value for bar chart scaling
  const getMaxValue = (metric: 'totalStudents' | 'totalTeachers' | 'totalClasses') => {
    if (!data) return 100;
    return Math.max(...data.years.map((y) => y.stats[metric])) || 100;
  };

  // Show loading skeleton while waiting for client-side hydration
  if (!isClient || !user || !school) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Skeleton Navigation */}
        <div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
          <div className="p-6">
            <div className="h-8 bg-gray-200 rounded-lg animate-pulse w-32" />
          </div>
        </div>
        <div className="lg:ml-64 min-h-screen">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 h-40" />
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow-sm border p-6 h-24 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                      <div className="h-6 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
          <button
            onClick={() => router.push(`/${locale}/settings/academic-years`)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Academic Years
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Year-Over-Year Comparison</h1>
                <p className="text-white/80 mt-1">
                  Compare key metrics across academic years
                </p>
              </div>
            </div>
            <button
              onClick={loadComparison}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <BlurLoader isLoading={loading}>
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
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Years Compared</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data.summary.totalYearsCompared}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Latest Year</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data.summary.latestYear || '-'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Oldest Year</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {data.summary.oldestYear || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Selector */}
              <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Trend Analysis</h2>
                  <div className="flex gap-2">
                    {[
                      { id: 'students', label: 'Students', icon: Users },
                      { id: 'teachers', label: 'Teachers', icon: GraduationCap },
                      { id: 'classes', label: 'Classes', icon: School },
                    ].map((metric) => (
                      <button
                        key={metric.id}
                        onClick={() => setSelectedMetric(metric.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                          selectedMetric === metric.id
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <metric.icon className="w-4 h-4" />
                        {metric.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="space-y-4">
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
                        className="flex items-center gap-4"
                      >
                        <div className="w-32 flex-shrink-0">
                          <p className="font-medium text-gray-900">{yearData.year.name}</p>
                          {yearData.year.isCurrent && (
                            <span className="text-xs text-indigo-600">Current</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="h-10 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className={`h-full rounded-lg transition-all duration-500 ${
                                yearData.year.isCurrent
                                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                  : 'bg-indigo-300'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <p className="font-bold text-gray-900">{metric.toLocaleString()}</p>
                        </div>
                        <div className="w-28">
                          {index < data.years.length - 1 && change !== undefined && (
                            <div
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg ${getTrendColor(
                                change
                              )}`}
                            >
                              {getTrendIcon(change)}
                              <span className="text-sm font-medium">
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
              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold text-gray-900">Detailed Comparison</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                          Metric
                        </th>
                        {data.years.map((yearData) => (
                          <th
                            key={yearData.year.id}
                            className={`px-6 py-4 text-center text-sm font-semibold ${
                              yearData.year.isCurrent
                                ? 'text-indigo-700 bg-indigo-50'
                                : 'text-gray-700'
                            }`}
                          >
                            {yearData.year.name}
                            {yearData.year.isCurrent && (
                              <span className="ml-2 px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded text-xs">
                                Current
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-500" />
                          Total Students
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-6 py-4 text-center text-sm ${
                              yearData.year.isCurrent ? 'bg-indigo-50 font-semibold' : ''
                            }`}
                          >
                            {yearData.stats.totalStudents.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-green-500" />
                          Total Teachers
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-6 py-4 text-center text-sm ${
                              yearData.year.isCurrent ? 'bg-indigo-50 font-semibold' : ''
                            }`}
                          >
                            {yearData.stats.totalTeachers.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                          <School className="w-4 h-4 text-orange-500" />
                          Total Classes
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-6 py-4 text-center text-sm ${
                              yearData.year.isCurrent ? 'bg-indigo-50 font-semibold' : ''
                            }`}
                          >
                            {yearData.stats.totalClasses.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-purple-500" />
                          Total Subjects
                        </td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-6 py-4 text-center text-sm ${
                              yearData.year.isCurrent ? 'bg-indigo-50 font-semibold' : ''
                            }`}
                          >
                            {yearData.stats.totalSubjects.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                          Student Gender Distribution
                        </td>
                        {data.years.map((yearData) => (
                          <td key={yearData.year.id} className="px-6 py-3" />
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-600 pl-10">Male</td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-6 py-4 text-center text-sm ${
                              yearData.year.isCurrent ? 'bg-indigo-50' : ''
                            }`}
                          >
                            {yearData.stats.studentsByGender['MALE'] ||
                              yearData.stats.studentsByGender['Male'] ||
                              0}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-6 py-4 text-sm text-gray-600 pl-10">Female</td>
                        {data.years.map((yearData) => (
                          <td
                            key={yearData.year.id}
                            className={`px-6 py-4 text-center text-sm ${
                              yearData.year.isCurrent ? 'bg-indigo-50' : ''
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
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mt-8">
                  <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Promotion Statistics</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Student progression outcomes by academic year
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            className="p-4 bg-gray-50 rounded-xl"
                          >
                            <h3 className="font-semibold text-gray-900 mb-3">
                              {yearData.year.name}
                            </h3>
                            <div className="space-y-2">
                              {Object.entries(promotions).map(([type, count]) => (
                                <div
                                  key={type}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm text-gray-600 capitalize">
                                    {type.toLowerCase().replace('_', ' ')}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      {count}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({((count / total) * 100).toFixed(1)}%)
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
