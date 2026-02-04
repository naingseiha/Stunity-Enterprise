'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
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
import { gradeAPI, Grade, ClassReportSummary } from '@/lib/api/grades';
import { getClasses, Class } from '@/lib/api/classes';
import { getAcademicYearsAuto, AcademicYear } from '@/lib/api/academic-years';
import { TokenManager } from '@/lib/api/auth';

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
const SEMESTER_1_MONTHS = ['October', 'November', 'December', 'January', 'February'];
const SEMESTER_2_MONTHS = ['March', 'April', 'May', 'June', 'July'];

export default function GradeAnalyticsPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [classReport, setClassReport] = useState<ClassReportSummary | null>(null);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData);
      setSchool({ name: 'School' });
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classesRes, yearsRes] = await Promise.all([
          getClasses(),
          getAcademicYearsAuto(),
        ]);
        const classesData = classesRes.data.classes || [];
        const yearsData = yearsRes.data.academicYears || [];
        
        setClasses(classesData);
        setAcademicYears(yearsData);

        // Select active year and first class by default
        const activeYear = yearsData.find((y: AcademicYear) => y.isCurrent);
        if (activeYear) setSelectedYear(activeYear.id);
        if (classesData.length > 0) setSelectedClass(classesData[0].id);
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isClient) {
      fetchInitialData();
    }
  }, [isClient]);

  // Fetch grade data when filters change
  useEffect(() => {
    const fetchGradeData = async () => {
      if (!selectedClass || !selectedYear) return;

      setLoading(true);
      try {
        const year = academicYears.find((y) => y.id === selectedYear);
        const yearNum = year ? parseInt(year.name.split('-')[0]) : new Date().getFullYear();

        // Fetch class report
        const report = await gradeAPI.getClassReport(selectedClass, selectedSemester, yearNum);
        setClassReport(report);

        // Fetch all grades for charts
        const grades = await gradeAPI.getClassGrades(selectedClass);
        setAllGrades(grades);
      } catch (error) {
        console.error('Failed to fetch grade data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedClass && selectedYear && isClient) {
      fetchGradeData();
    }
  }, [selectedClass, selectedYear, selectedSemester, academicYears, isClient]);

  // Calculate monthly trend data
  const monthlyTrendData = useMemo(() => {
    const months = selectedSemester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;
    const monthlyAverages: Record<string, { total: number; count: number }> = {};

    months.forEach((month) => {
      monthlyAverages[month] = { total: 0, count: 0 };
    });

    allGrades.forEach((grade) => {
      if (monthlyAverages[grade.month]) {
        monthlyAverages[grade.month].total += grade.percentage;
        monthlyAverages[grade.month].count += 1;
      }
    });

    return months.map((month) => ({
      month: month.substring(0, 3),
      average:
        monthlyAverages[month].count > 0
          ? Math.round(monthlyAverages[month].total / monthlyAverages[month].count)
          : 0,
    }));
  }, [allGrades, selectedSemester]);

  // Calculate subject performance data
  const subjectPerformanceData = useMemo(() => {
    const subjectAverages: Record<string, { total: number; count: number; name: string }> = {};

    allGrades.forEach((grade) => {
      if (grade.subject) {
        if (!subjectAverages[grade.subjectId]) {
          subjectAverages[grade.subjectId] = {
            total: 0,
            count: 0,
            name: grade.subject.name,
          };
        }
        subjectAverages[grade.subjectId].total += grade.percentage;
        subjectAverages[grade.subjectId].count += 1;
      }
    });

    return Object.entries(subjectAverages)
      .map(([, data]) => ({
        subject: data.name.length > 10 ? data.name.substring(0, 10) + '...' : data.name,
        fullName: data.name,
        average: data.count > 0 ? Math.round(data.total / data.count) : 0,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
  }, [allGrades]);

  // Calculate grade distribution
  const gradeDistributionData = useMemo(() => {
    if (!classReport) return [];

    const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };

    classReport.students.forEach((student) => {
      if (distribution.hasOwnProperty(student.gradeLevel)) {
        distribution[student.gradeLevel]++;
      }
    });

    return Object.entries(distribution)
      .filter(([, count]) => count > 0)
      .map(([grade, count]) => ({
        name: `Grade ${grade}`,
        value: count,
        grade,
      }));
  }, [classReport]);

  // Calculate top performers
  const topPerformers = useMemo(() => {
    if (!classReport) return [];
    return classReport.students.slice(0, 5);
  }, [classReport]);

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (!classReport) return null;

    const { statistics } = classReport;
    return {
      classAverage: statistics.classAverage,
      highestAverage: statistics.highestAverage,
      lowestAverage: statistics.lowestAverage,
      passRate: statistics.passRate,
      passingCount: statistics.passingCount,
      failingCount: statistics.failingCount,
    };
  }, [classReport]);

  // Radar chart data for subject categories
  const subjectCategoryData = useMemo(() => {
    const categories: Record<string, { total: number; count: number }> = {
      Sciences: { total: 0, count: 0 },
      Mathematics: { total: 0, count: 0 },
      Languages: { total: 0, count: 0 },
      Social: { total: 0, count: 0 },
      Arts: { total: 0, count: 0 },
    };

    // Map subjects to categories (simplified)
    allGrades.forEach((grade) => {
      if (grade.subject) {
        const name = grade.subject.name.toLowerCase();
        let category = 'Social';

        if (
          name.includes('math') ||
          name.includes('algebra') ||
          name.includes('geometry') ||
          name.includes('calculus')
        ) {
          category = 'Mathematics';
        } else if (
          name.includes('physics') ||
          name.includes('chemistry') ||
          name.includes('biology') ||
          name.includes('science')
        ) {
          category = 'Sciences';
        } else if (
          name.includes('english') ||
          name.includes('khmer') ||
          name.includes('french') ||
          name.includes('language') ||
          name.includes('literature')
        ) {
          category = 'Languages';
        } else if (name.includes('art') || name.includes('music') || name.includes('drama')) {
          category = 'Arts';
        }

        categories[category].total += grade.percentage;
        categories[category].count += 1;
      }
    });

    return Object.entries(categories).map(([category, data]) => ({
      category,
      score: data.count > 0 ? Math.round(data.total / data.count) : 0,
      fullMark: 100,
    }));
  }, [allGrades]);

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
                  {academicYears.map((year) => (
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
          {!classReport && !loading && (
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
