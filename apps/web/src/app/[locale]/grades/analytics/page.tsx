'use client';

import { useState, useEffect, useMemo } from 'react';
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
  TrendingDown,
  BarChart3,
  BookOpen,
  Award,
  ArrowUp,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { gradeAPI, GradeAnalyticsData } from '@/lib/api/grades';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';

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

// Semester months
const SEMESTER_1_MONTH_LABELS: Record<number, string> = {
  1: 'Oct',
  2: 'Nov',
  3: 'Dec',
  4: 'Jan',
  5: 'Feb',
};
const SEMESTER_2_MONTH_LABELS: Record<number, string> = {
  6: 'Mar',
  7: 'Apr',
  8: 'May',
  9: 'Jun',
  10: 'Jul',
};

export default function GradeAnalyticsPage() {
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
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
    }
  }, []);

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
    const monthLabels = selectedSemester === 1 ? SEMESTER_1_MONTH_LABELS : SEMESTER_2_MONTH_LABELS;
    return (analyticsData?.charts.monthlyTrend || []).map((item) => ({
      month: monthLabels[item.monthNumber] || item.month,
      average: item.average,
    }));
  }, [analyticsData, selectedSemester]);

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

  const selectedClassName = classes.find((c) => c.id === selectedClass)?.name || '';

  return (
    <>
      <UnifiedNavigation user={user} school={school} />
      
      <div className="lg:ml-64 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Grade Analytics</h1>
              <p className="text-indigo-100">
                Performance trends, subject analysis, and class statistics
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Grade {cls.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {allYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={1}>Semester 1 (Oct - Feb)</option>
                  <option value={2}>Semester 2 (Mar - Jul)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Overview Cards */}
          {classStats && (
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Class Average</p>
                    <p className="text-3xl font-bold mt-1">
                      {classStats.classAverage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-xl">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Pass Rate</p>
                    <p className="text-3xl font-bold mt-1">
                      {classStats.passRate.toFixed(0)}%
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-green-100 text-xs mt-2">
                  {classStats.passingCount} passing, {classStats.failingCount} failing
                </p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">Highest Score</p>
                    <p className="text-3xl font-bold mt-1">
                      {classStats.highestAverage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Lowest Score</p>
                    <p className="text-3xl font-bold mt-1">
                      {classStats.lowestAverage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white/20 p-3 rounded-xl">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Trend Chart */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Monthly Grade Trend
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
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
            </div>

            {/* Subject Performance Chart */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-500" />
                Subject Performance
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="subject"
                      stroke="#6b7280"
                      fontSize={11}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Bar dataKey="average" radius={[0, 4, 4, 0]} name="Average %">
                      {subjectPerformanceData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.average >= 50 ? '#10b981' : '#ef4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grade Distribution Pie Chart */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Grade Distribution
              </h3>
              <div className="h-[300px]">
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
                      label={({ name, percent }) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {gradeDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            GRADE_COLORS[entry.grade] ||
                            COLORS[index % COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Category Radar Chart */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Performance by Category
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={subjectCategoryData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Average Score"
                      dataKey="score"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.5}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Performers Table */}
          {topPerformers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Top Performers - {selectedClassName}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Average
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topPerformers.map((student, idx) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-700'
                                : idx === 1
                                ? 'bg-gray-200 text-gray-700'
                                : idx === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {student.rank}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-semibold">
                                {student.student.firstName[0]}
                                {student.student.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {student.student.firstName} {student.student.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{student.student.khmerName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold text-gray-900">
                            {student.average.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
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
                            Grade {student.gradeLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              student.isPassing
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {student.isPassing ? 'Passing' : 'Failing'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowUp className="w-4 h-4" />
                            <span className="text-sm">Stable</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No data state */}
          {!analyticsData && !loading && (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500">
                Select a class and academic year to view grade analytics
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
