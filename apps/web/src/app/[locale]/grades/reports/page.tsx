'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import StudentReportCard from '@/components/reports/StudentReportCard';
import ClassReportCard from '@/components/reports/ClassReportCard';
import { TokenManager } from '@/lib/api/auth';
import { gradeAPI, StudentReportCard as ReportCardType, ClassReportSummary } from '@/lib/api/grades';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
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
  Sparkles,
  Settings,
  X,
} from 'lucide-react';

type ViewMode = 'select' | 'class' | 'student';

export default function ReportCardsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string>('');
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();

  // Selection state
  const [selectedYear, setSelectedYear] = useState<string>('');
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

  const { classes } = useClasses({
    academicYearId: selectedYear || undefined,
    limit: 100,
  });

  useEffect(() => {
    if (selectedClass && !classes.some((cls) => cls.id === selectedClass)) {
      setSelectedClass('');
    }
  }, [classes, selectedClass]);

  const handleLoadClassReport = async (forceFresh = false) => {
    if (!selectedClass) return;
    
    setLoadingData(true);
    setError('');
    
    try {
      const year = allYears.find(y => y.id === selectedYear);
      const yearNum = year ? parseInt(year.name.split('-')[0]) : new Date().getFullYear();
      
      const report = await gradeAPI.getClassReport(selectedClass, selectedSemester, yearNum, { forceFresh });
      setClassReport(report);
      setViewMode('class');
    } catch (err: any) {
      setError(err.message || 'Failed to load class report');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectStudent = async (studentId: string, forceFresh = false) => {
    setLoadingData(true);
    setError('');
    setSelectedStudentId(studentId);
    
    try {
      const year = allYears.find(y => y.id === selectedYear);
      const yearNum = year ? parseInt(year.name.split('-')[0]) : new Date().getFullYear();
      
      const reportCard = await gradeAPI.getStudentReportCard(studentId, selectedSemester, yearNum, { forceFresh });
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
  const selectedYearData = allYears.find(y => y.id === selectedYear);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} />

      {/* Main Content - Left margin for sidebar */}
      <div className="lg:ml-64 min-h-screen">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-violet-950/40 relative overflow-hidden border-b border-white/10 print:hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
          <div className="max-w-7xl mx-auto px-8 py-16 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center border border-white/20 shadow-2xl">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    Certification Engine
                  </div>
                  <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">
                    Report <span className="text-indigo-300">Cards</span>
                  </h1>
                  <p className="text-white/70 font-medium mt-2 max-w-xl">
                    Generate and synthesize high-fidelity academic credential summaries for the student body.
                  </p>
                </div>
              </div>

              {viewMode !== 'select' && (
                <div className="flex items-center gap-4 relative z-10">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Regress Phase
                  </button>
                  <button
                    onClick={handlePrint}
                    className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-blue-500/30 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    <Printer className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Execute Print</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-8 py-12">

        {/* Selection Panel */}
        {viewMode === 'select' && (
          <AnimatedContent animation="slide-up" delay={100}>
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-10 mb-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Configuration Parameters</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Academic Year */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Academic Epoch
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold text-gray-900 dark:text-white"
                >
                  <option value="">Select Year</option>
                  {allYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Cohort Segment
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 font-bold text-gray-900 dark:text-white"
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
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  Periodic Slice
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold text-gray-900 dark:text-white"
                >
                  <option value={1}>First Semester (ឆមាសទី១)</option>
                  <option value={2}>Second Semester (ឆមាសទី២)</option>
                </select>
              </div>

              {/* Generate Button */}
              <div className="flex items-end">
                <button
                  onClick={() => handleLoadClassReport()}
                  disabled={!selectedClass || loadingData}
                  className="w-full group relative flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:scale-100 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                  {loadingData ? (
                    <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  ) : (
                    <Users className="w-4 h-4 relative z-10" />
                  )}
                  <span className="relative z-10">Synthesize Logs</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-8 flex items-center gap-4 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-6 py-4 rounded-2xl border border-rose-100 dark:border-rose-500/20 font-bold">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
          </AnimatedContent>
        )}

        {/* Class Report View */}
        {viewMode === 'class' && classReport && (
          <AnimatedContent animation="slide-up" delay={100}>
            <BlurLoader isLoading={loadingData} showSpinner={false}>
              <div>
                {/* Info Banner */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 mb-8 flex items-center justify-between print:hidden">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{selectedYearData?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 border-l border-gray-100 dark:border-gray-800 pl-6">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{classReport.totalStudents} Personas</span>
                    </div>
                    <div className="flex items-center gap-3 border-l border-gray-100 dark:border-gray-800 pl-6">
                      <div className="p-2 bg-violet-500/10 rounded-lg text-violet-600">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                        {selectedSemester === 1 ? 'Phase I' : 'Phase II'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoadClassReport(true)}
                    className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                    Refresh Stream
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
            <BlurLoader isLoading={loadingData} showSpinner={false}>
              <div>
                {/* Info Banner */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 mb-8 flex items-center justify-between print:hidden">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{selectedYearData?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 border-l border-gray-100 dark:border-gray-800 pl-6">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-600">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{studentReportCard.student.khmerName}</span>
                    </div>
                    <div className="flex items-center gap-3 border-l border-gray-100 dark:border-gray-800 pl-6">
                      <div className="p-2 bg-violet-500/10 rounded-lg text-violet-600">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                        {selectedSemester === 1 ? 'Phase I' : 'Phase II'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectStudent(selectedStudentId, true)}
                      className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                      Refresh Stream
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
            <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-20 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-grid-gray-900/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
              <div className="relative z-10">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-950 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 dark:border-gray-800 shadow-inner group-hover:scale-110 transition-transform duration-700">
                  <FileText className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Deployment Pending</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed">
                  Initiate the Synthesis Engine by selecting an Academic Epoch and Cohort Segment above.
                </p>
              </div>
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
