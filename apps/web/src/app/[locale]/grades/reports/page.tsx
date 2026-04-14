'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
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
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { formatEducationModelLabel } from '@/lib/educationModel';
import {
  FileText,
  Printer,
  Loader2,
  Users,
  User,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';

type ViewMode = 'select' | 'class' | 'student';

export default function ReportCardsPage() {
  const router = useRouter();
  const locale = useLocale();
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
      router.push(`/${locale}/auth/login`);
      return;
    }
    const data = TokenManager.getUserData();
    setUser(data.user);
    setSchool(data.school);
    setLoading(false);
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

  const selectedClassData = classes.find((c) => c.id === selectedClass);
  const selectedYearData = allYears.find((y) => y.id === selectedYear);
  const educationModelLabel = formatEducationModelLabel(school?.educationModel);
  const semesterLabel = selectedSemester === 1 ? 'Semester 1' : 'Semester 2';
  const readinessValue =
    viewMode === 'student' ? 100 : viewMode === 'class' ? 76 : selectedClass ? 42 : selectedYear ? 18 : 0;
  const readinessLabel =
    viewMode === 'student' ? 'Student card' : viewMode === 'class' ? 'Class report' : 'Setup';
  const activeViewLabel =
    viewMode === 'student' ? 'Student' : viewMode === 'class' ? 'Class' : 'Selection';
  const pulseFooterLabel =
    viewMode === 'student' ? 'Student detail' : viewMode === 'class' ? 'Class summary' : 'Selection pending';
  const metricCards = [
    {
      label: 'Academic Years',
      value: allYears.length,
      tone: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70',
      note: 'Cycles available for reports',
    },
    {
      label: 'Classes',
      value: classes.length,
      tone: 'border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/80 to-blue-50/70',
      note: 'Visible in the selected year',
    },
    {
      label: 'Current View',
      value: activeViewLabel,
      tone: 'border-violet-100/80 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/70',
      note: 'Current reporting workspace',
    },
    {
      label: 'Focus',
      value:
        viewMode === 'student'
          ? studentReportCard?.summary.classRank || '--'
          : viewMode === 'class'
            ? classReport?.totalStudents || '--'
            : selectedSemester,
      tone: 'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70',
      note:
        viewMode === 'student'
          ? 'Selected student rank'
          : viewMode === 'class'
            ? 'Students in the report'
            : 'Selected semester',
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.08),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_52%,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px] print:hidden">
              <CompactHeroCard
                eyebrow="Reporting Studio"
                title="Academic report cards"
                description="Generate class and student report cards."
                icon={FileText}
                backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(240,249,255,0.97)_56%,rgba(224,242,254,0.9))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_58%)]"
                eyebrowClassName="text-sky-600/80"
                actions={
                  <>
                    {viewMode !== 'select' && (
                      <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                    )}
                    {viewMode === 'class' && (
                      <button
                        onClick={() => handleLoadClassReport(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                        Refresh class
                      </button>
                    )}
                    {viewMode === 'student' && (
                      <button
                        onClick={() => handleSelectStudent(selectedStudentId, true)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950"
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                        Refresh student
                      </button>
                    )}
                    {viewMode !== 'select' && (
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                    )}
                  </>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-sky-200/70 bg-[linear-gradient(145deg,rgba(14,116,144,0.98),rgba(14,165,233,0.92)_54%,rgba(59,130,246,0.88))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(14,116,144,0.52)] ring-1 ring-white/10 print:hidden">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-50/80">Report Pulse</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{readinessValue}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-cyan-50/75">
                        {readinessLabel}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                    <FileText className="h-7 w-7 text-cyan-50" />
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/12">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-200 via-sky-200 to-indigo-200"
                    style={{ width: `${Math.min(100, readinessValue)}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'View', value: activeViewLabel },
                    { label: 'Year', value: selectedYearData?.name || 'Not set' },
                    { label: 'Focus', value: semesterLabel },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
                      <p className="truncate text-lg font-black tracking-tight">{item.value}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.26em] text-cyan-50/80">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-cyan-50/90">
                  {pulseFooterLabel}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
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

          {error ? (
            <div className="mt-5 flex items-start gap-4 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm print:hidden">
              <div className="rounded-xl bg-rose-100 p-2">
                <AlertCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-[0.18em]">Action Needed</p>
                <p className="mt-1 text-sm font-medium">{error}</p>
              </div>
            </div>
          ) : null}

          {viewMode === 'select' && (
            <AnimatedContent animation="slide-up" delay={0.08}>
              <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white/92 shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl print:hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Generate report cards</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      Choose the academic year, class, and semester before generating a class pack or drilling into an individual student report.
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-slate-200 bg-gradient-to-br from-sky-50 to-white px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Current Selection</p>
                    <p className="mt-2 text-base font-semibold text-slate-950">{selectedClassData?.name || 'No class selected'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {selectedYearData?.name || 'Choose a year'} • {semesterLabel}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-sky-700">
                      {educationModelLabel}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Academic Year</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">Select year</option>
                      {allYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name} {year.isCurrent && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Class</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      disabled={!selectedYear || classes.length === 0}
                      className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      <option value="">Select class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Semester</span>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
                      className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </select>
                  </label>

                  <button
                    onClick={() => handleLoadClassReport()}
                    disabled={!selectedClass || loadingData}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[0.95rem] bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                    Generate
                  </button>
                </div>

                <div className="border-t border-slate-200/80 px-5 py-10 sm:px-6">
                  <div className="rounded-[1.6rem] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50/90 to-white px-6 py-12 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-sky-50 text-sky-600 shadow-inner">
                      <FileText className="h-9 w-9" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">Ready when you are</h3>
                    <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-slate-500">
                      Start with a class-level report, then open any student card from the ranking list for a printable individual view.
                    </p>
                  </div>
                </div>
              </section>
            </AnimatedContent>
          )}

          {viewMode === 'class' && classReport && (
            <AnimatedContent animation="slide-up" delay={0.08}>
              <BlurLoader isLoading={loadingData} showSpinner={false}>
                <div className="mt-5 space-y-5">
                  <section className="overflow-hidden rounded-[1.5rem] border border-white/75 bg-white/92 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 backdrop-blur-xl print:hidden">
                    <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-[1rem] bg-sky-50 p-3 text-sky-600">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Class Report</p>
                          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">{classReport.class.name}</h3>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {selectedYearData?.name || 'Selected year'} • {semesterLabel} • {classReport.totalStudents} students
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                        Pass rate {classReport.statistics.passRate}%
                      </div>
                    </div>
                  </section>

                  <ClassReportCard
                    report={classReport}
                    onSelectStudent={handleSelectStudent}
                    schoolName={school?.name}
                    educationModel={school?.educationModel}
                  />
                </div>
              </BlurLoader>
            </AnimatedContent>
          )}

          {viewMode === 'student' && studentReportCard && (
            <AnimatedContent animation="slide-up" delay={0.08}>
              <BlurLoader isLoading={loadingData} showSpinner={false}>
                <div className="mt-5 space-y-5">
                  <section className="overflow-hidden rounded-[1.5rem] border border-white/75 bg-white/92 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70 backdrop-blur-xl print:hidden">
                    <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-[1rem] bg-indigo-50 p-3 text-indigo-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Student Report</p>
                          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">{studentReportCard.student.khmerName}</h3>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {selectedYearData?.name || 'Selected year'} • {semesterLabel} • Rank #{studentReportCard.summary.classRank}
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                        Average {studentReportCard.summary.overallAverage.toFixed(1)}
                      </div>
                    </div>
                  </section>

                  <StudentReportCard
                    reportCard={studentReportCard}
                    schoolName={school?.name}
                    educationModel={school?.educationModel}
                  />
                </div>
              </BlurLoader>
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
