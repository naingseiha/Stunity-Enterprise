'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import StudentReportCard from '@/components/reports/StudentReportCard';
import ClassReportCard from '@/components/reports/ClassReportCard';
import { TokenManager } from '@/lib/api/auth';
import { gradeAPI, StudentReportCard as ReportCardType, ClassReportSummary } from '@/lib/api/grades';
import { getClasses, Class } from '@/lib/api/classes';
import { getAcademicYears, AcademicYear } from '@/lib/api/academic-years';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import {
  FileText,
  Printer,
  Download,
  Loader2,
  ChevronRight,
  Users,
  User,
  AlertCircle,
  Home,
  Calendar,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';

type ViewMode = 'select' | 'class' | 'student';

export default function ReportCardsPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string>('');

  // Selection state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('select');
  const [classReport, setClassReport] = useState<ClassReportSummary | null>(null);
  const [studentReportCard, setStudentReportCard] = useState<ReportCardType | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Check authentication
  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push('/auth/login');
      return;
    }
    const data = TokenManager.getUserData();
    setUser(data.user);
    setSchool(data.school);
    setLoading(false);
  }, [router]);

  // Load academic years
  useEffect(() => {
    if (school?.id) {
      loadAcademicYears();
    }
  }, [school]);

  // Load classes when year changes
  useEffect(() => {
    if (selectedYear) {
      loadClasses();
    }
  }, [selectedYear]);

  const loadAcademicYears = async () => {
    try {
      const tokens = TokenManager.getTokens();
      const years = await getAcademicYears(school.id, tokens?.accessToken || '');
      setAcademicYears(years);
      // Select current year
      const currentYear = years.find((y: AcademicYear) => y.isCurrent);
      if (currentYear) {
        setSelectedYear(currentYear.id);
      } else if (years.length > 0) {
        setSelectedYear(years[0].id);
      }
    } catch (error) {
      console.error('Failed to load academic years:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await getClasses({ academicYearId: selectedYear });
      setClasses(response.data.classes || []);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  const handleLoadClassReport = async () => {
    if (!selectedClass) return;
    
    setLoadingData(true);
    setError('');
    
    try {
      const year = academicYears.find(y => y.id === selectedYear);
      const yearNum = year ? parseInt(year.name.split('-')[0]) : new Date().getFullYear();
      
      const report = await gradeAPI.getClassReport(selectedClass, selectedSemester, yearNum);
      setClassReport(report);
      setViewMode('class');
    } catch (err: any) {
      setError(err.message || 'Failed to load class report');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectStudent = async (studentId: string) => {
    setLoadingData(true);
    setError('');
    setSelectedStudentId(studentId);
    
    try {
      const year = academicYears.find(y => y.id === selectedYear);
      const yearNum = year ? parseInt(year.name.split('-')[0]) : new Date().getFullYear();
      
      const reportCard = await gradeAPI.getStudentReportCard(studentId, selectedSemester, yearNum);
      setStudentReportCard(reportCard);
      setViewMode('student');
    } catch (err: any) {
      setError(err.message || 'Failed to load student report card');
    } finally {
      setLoadingData(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    if (viewMode === 'student') {
      setViewMode('class');
      setStudentReportCard(null);
    } else if (viewMode === 'class') {
      setViewMode('select');
      setClassReport(null);
    }
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" showFilters={false} />;
  }

  const selectedClassData = classes.find(c => c.id === selectedClass);
  const selectedYearData = academicYears.find(y => y.id === selectedYear);

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedNavigation user={user} school={school} />

      {/* Main Content - Left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <AnimatedContent animation="fade" delay={0}>
            <div className="mb-8 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white shadow-lg">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Report Cards</h1>
                    <p className="text-gray-600 mt-1">Generate and view student report cards</p>
                  </div>
                </div>
                
                {viewMode !== 'select' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-colors shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </div>
                )}
              </div>
            </div>
          </AnimatedContent>

        {/* Selection Panel */}
        {viewMode === 'select' && (
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Class and Semester</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Academic Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Year</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedYear || classes.length === 0}
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={1}>First Semester (ឆមាសទី១)</option>
                  <option value={2}>Second Semester (ឆមាសទី២)</option>
                </select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <button
                  onClick={handleLoadClassReport}
                  disabled={!selectedClass || loadingData}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loadingData ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  Generate Reports
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}
          </div>
          </AnimatedContent>
        )}

        {/* Class Report View */}
        {viewMode === 'class' && classReport && (
          <AnimatedContent animation="slide-up" delay={100}>
            <BlurLoader isLoading={loadingData}>
              <div>
                {/* Info Banner */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center justify-between print:hidden">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {selectedYearData?.name}
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      {classReport.totalStudents} Students
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="text-gray-600">
                      {selectedSemester === 1 ? 'First Semester' : 'Second Semester'}
                    </div>
                  </div>
                  <button
                    onClick={handleLoadClassReport}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <ClassReportCard 
                  report={classReport} 
                  onSelectStudent={handleSelectStudent}
                  schoolName={school?.name}
                />
              </div>
            </BlurLoader>
          </AnimatedContent>
        )}

        {/* Student Report Card View */}
        {viewMode === 'student' && studentReportCard && (
          <AnimatedContent animation="slide-up" delay={100}>
            <BlurLoader isLoading={loadingData}>
              <div>
                {/* Info Banner */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex items-center justify-between print:hidden">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {selectedYearData?.name}
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      {studentReportCard.student.khmerName}
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="text-gray-600">
                      {selectedSemester === 1 ? 'First Semester' : 'Second Semester'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectStudent(selectedStudentId)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>
                </div>

                <StudentReportCard reportCard={studentReportCard} schoolName={school?.name} />
              </div>
            </BlurLoader>
          </AnimatedContent>
        )}

        {/* Empty State */}
        {viewMode === 'select' && !error && (
          <AnimatedContent animation="fade" delay={150}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Selected</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Select an academic year, class, and semester above to generate report cards
                for all students in the class.
              </p>
            </div>
          </AnimatedContent>
        )}
      </main>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          nav, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
