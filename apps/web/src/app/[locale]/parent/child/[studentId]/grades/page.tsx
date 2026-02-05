'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/api/auth';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Award,
  BookOpen,
  Filter,
  ChevronDown,
} from 'lucide-react';

const GRADE_SERVICE_URL = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL || 'http://localhost:3007';
const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

interface Grade {
  id: string;
  subjectId: string;
  subject: {
    name: string;
    nameKh: string;
    code: string;
    category: string;
  };
  score: number;
  maxScore: number;
  percentage: number;
  month: string;
  monthNumber: number;
  year: number;
}

interface StudentInfo {
  firstName: string;
  lastName: string;
  khmerName: string;
  class?: {
    id: string;
    name: string;
    grade: string;
  };
}

export default function ChildGradesPage({ 
  params: { locale, studentId } 
}: { 
  params: { locale: string; studentId: string } 
}) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/parent/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    if (userData.user?.role !== 'PARENT') {
      router.replace(`/${locale}/dashboard`);
      return;
    }

    // Verify access
    const children = userData.user?.children || [];
    if (!children.some((c: any) => c.id === studentId)) {
      setError('You do not have access to this student');
      setLoading(false);
      return;
    }

    fetchData(token);
  }, [locale, router, studentId]);

  const fetchData = async (token: string) => {
    try {
      // Fetch student details
      const studentRes = await fetch(`${STUDENT_SERVICE_URL}/students/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const studentData = await studentRes.json();
      if (studentData.success || studentData.data) {
        setStudent(studentData.data || studentData);
      }

      // Fetch grades
      const gradesRes = await fetch(`${GRADE_SERVICE_URL}/grades/student/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const gradesData = await gradesRes.json();
      if (gradesData.success || gradesData.data) {
        setGrades(gradesData.data || gradesData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (grades.length === 0) return null;
    
    const percentages = grades.map(g => g.percentage || (g.score / g.maxScore * 100));
    const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const passCount = percentages.filter(p => p >= 50).length;
    
    return {
      average: average.toFixed(1),
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      passRate: ((passCount / grades.length) * 100).toFixed(0),
      totalSubjects: new Set(grades.map(g => g.subjectId)).size,
    };
  };

  const stats = calculateStats();

  // Get unique months
  const months = [...new Set(grades.map(g => g.month))].sort((a, b) => {
    const monthOrder = ['September', 'October', 'November', 'December', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
    return monthOrder.indexOf(a) - monthOrder.indexOf(b);
  });

  // Filter grades by month
  const filteredGrades = selectedMonth === 'all' 
    ? grades 
    : grades.filter(g => g.month === selectedMonth);

  // Group by category
  const gradesByCategory = filteredGrades.reduce((acc, grade) => {
    const category = grade.subject?.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(grade);
    return acc;
  }, {} as Record<string, Grade[]>);

  // Get grade letter
  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return { letter: 'A', color: 'text-green-600 bg-green-100' };
    if (percentage >= 80) return { letter: 'B', color: 'text-blue-600 bg-blue-100' };
    if (percentage >= 70) return { letter: 'C', color: 'text-yellow-600 bg-yellow-100' };
    if (percentage >= 60) return { letter: 'D', color: 'text-orange-600 bg-orange-100' };
    if (percentage >= 50) return { letter: 'E', color: 'text-red-500 bg-red-100' };
    return { letter: 'F', color: 'text-red-700 bg-red-200' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href={`/${locale}/parent/child/${studentId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link
        href={`/${locale}/parent/child/${studentId}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {student?.khmerName || 'Student'}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-green-600" />
            Grades
          </h1>
          <p className="text-gray-600 mt-1">
            {student?.khmerName} • {student?.class?.name || 'No class'}
          </p>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">All Months</option>
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.average}%</p>
                <p className="text-xs text-gray-500">Average</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.highest}%</p>
                <p className="text-xs text-gray-500">Highest</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.lowest}%</p>
                <p className="text-xs text-gray-500">Lowest</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</p>
                <p className="text-xs text-gray-500">Subjects</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${Number(stats.passRate) >= 70 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <span className={`text-lg font-bold ${Number(stats.passRate) >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {stats.passRate}%
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Pass Rate</p>
                <p className="text-xs text-gray-500">≥50%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grades by Category */}
      {grades.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Grades Yet</h3>
          <p className="text-gray-600">
            Grades will appear here once they are published by teachers.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(gradesByCategory).map(([category, categoryGrades]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {categoryGrades.map((grade) => {
                  const percentage = grade.percentage || (grade.score / grade.maxScore * 100);
                  const gradeLetter = getGradeLetter(percentage);
                  
                  return (
                    <div key={grade.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gradeLetter.color}`}>
                          <span className="text-lg font-bold">{gradeLetter.letter}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{grade.subject?.nameKh || grade.subject?.name}</p>
                          <p className="text-sm text-gray-500">{grade.subject?.code} • {grade.month}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {grade.score}/{grade.maxScore}
                        </p>
                        <p className={`text-sm font-medium ${percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Grade Scale</h4>
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">A: 90-100%</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">B: 80-89%</span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">C: 70-79%</span>
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">D: 60-69%</span>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">E: 50-59%</span>
          <span className="px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm">F: &lt;50%</span>
        </div>
      </div>
    </div>
  );
}
