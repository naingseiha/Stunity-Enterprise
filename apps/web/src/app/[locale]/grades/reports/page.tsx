'use client';

import { useTranslations } from 'next-intl';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
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
import { formatEducationModelLabel } from '@/lib/educationModel';
import {
  FileText,
  Printer,
  Loader2,
  Users,
  User,
  Eye,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';

type ViewMode = 'select' | 'class' | 'student';

function formatTermDateRange(term?: ReportCardType['term'] | ClassReportSummary['term']) {
  if (!term?.startDate || !term?.endDate) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatter.format(new Date(term.startDate))} - ${formatter.format(new Date(term.endDate))}`;
}

export default function ReportCardsPage() {
    const autoT = useTranslations();
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
  const activeTerm = studentReportCard?.term || classReport?.term;
  const semesterLabel = activeTerm?.name || (selectedSemester === 1 ? 'Semester 1' : 'Semester 2');
  const termDateRange = formatTermDateRange(activeTerm);
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
      tone: 'from-sky-500 via-blue-500 to-cyan-500',
      note: 'Cycles available for reports',
      Icon: GraduationCap,
    },
    {
      label: 'Classes',
      value: classes.length,
      tone: 'from-emerald-500 via-teal-500 to-cyan-500',
      note: 'Visible in the selected year',
      Icon: Users,
    },
    {
      label: 'Current View',
      value: activeViewLabel,
      tone: 'from-violet-500 via-fuchsia-500 to-pink-500',
      note: 'Current reporting workspace',
      Icon: Eye,
    },
    {
      label: 'Focus',
      value:
        viewMode === 'student'
          ? studentReportCard?.summary.classRank || '--'
          : viewMode === 'class'
            ? classReport?.totalStudents || '--'
            : selectedSemester,
      tone: 'from-orange-500 via-amber-500 to-rose-500',
      note:
        viewMode === 'student'
          ? 'Selected student rank'
          : viewMode === 'class'
            ? 'Students in the report'
            : 'Selected semester',
      Icon: FileText,
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white print:hidden">
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-2xl font-semibold leading-none tracking-tight text-slate-900">
                          <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_0e7bcc67" />
                        </h1>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {viewMode !== 'select' && (
                        <button
                          onClick={handleBack}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_0d7ed8bf" />
                        </button>
                      )}
                      {viewMode === 'class' && (
                        <button
                          onClick={() => handleLoadClassReport(true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                          <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_6df1a6d0" />
                        </button>
                      )}
                      {viewMode === 'student' && (
                        <button
                          onClick={() => handleSelectStudent(selectedStudentId, true)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                          <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_ea6d5d38" />
                        </button>
                      )}
                      {viewMode !== 'select' && (
                        <button
                          onClick={handlePrint}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          <Printer className="h-4 w-4" />
                          <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_b75d459d" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'View', value: activeViewLabel, tone: 'border-blue-100 bg-blue-50/70 text-blue-700' },
                      { label: 'Year', value: selectedYearData?.name || 'Not set', tone: 'border-violet-100 bg-violet-50/70 text-violet-700' },
                      { label: 'Focus', value: semesterLabel, tone: 'border-cyan-100 bg-cyan-50/70 text-cyan-700' },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-xl border px-3 py-3.5 ${item.tone}`}>
                        <p className="truncate text-sm font-semibold">{item.value}</p>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-75">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-blue-100 bg-blue-50/40 p-6 xl:border-l xl:border-t-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_cb2d2546" />
                      </p>
                      <div className="mt-2 flex items-end gap-2">
                        <span className="text-3xl font-semibold tracking-tight text-slate-900">{readinessValue}%</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-white p-3 text-blue-700">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.min(100, readinessValue)}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 print:hidden">
              {metricCards.map((card) => (
                <div
                  key={card.label}
                  className={`relative min-h-[132px] overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-sm ${card.tone}`}
                >
                  <div className="relative flex items-start justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">{card.label}</p>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white backdrop-blur-sm">
                      <card.Icon className="h-4.5 w-4.5" />
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.2),transparent_45%)]" />
                  <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-36 rounded-full border border-white/25" />
                  <p className="relative mt-2 text-3xl font-bold tracking-tight text-white">{card.value}</p>
                  <p className="relative mt-1 text-sm text-white/90">{card.note}</p>
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
                <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_b41a8491" /></p>
                <p className="mt-1 text-sm font-medium">{error}</p>
              </div>
            </div>
          ) : null}

          {viewMode === 'select' && (
            <AnimatedContent animation="slide-up" delay={0.08}>
              <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white print:hidden">
                <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/35 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_9d703cc6" /></p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_0dff5392" /></h2>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_547c2688" /></p>
                    <p className="mt-1.5 text-base font-semibold text-slate-900">{selectedClassData?.name || 'No class selected'}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedYearData?.name || 'Choose a year'} • {semesterLabel}{termDateRange ? ` • ${termDateRange}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end">
                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_5b00d6b0" /></span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">{autoT("auto.web.locale_grades_reports_page.k_40be63d4")}</option>
                      {allYears.map((year) => (
                        <option key={year.id} value={year.id}>
                          {year.name} {year.isCurrent && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_8108c6be" /></span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      disabled={!selectedYear || classes.length === 0}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      <option value="">{autoT("auto.web.locale_grades_reports_page.k_36cd779a")}</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_1478a811" /></span>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value={1}>{autoT("auto.web.locale_grades_reports_page.k_5d3038f9")}</option>
                      <option value={2}>{autoT("auto.web.locale_grades_reports_page.k_31d439e4")}</option>
                    </select>
                  </label>

                  <button
                    onClick={() => handleLoadClassReport()}
                    disabled={!selectedClass || loadingData}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                    <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_1c07a79f" />
                  </button>
                </div>

                <div className="border-t border-slate-200 dark:border-gray-800/80 px-5 py-10 sm:px-6">
                  <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700">
                      <FileText className="h-9 w-9" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_0b140a7a" /></h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                      <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_ae54e328" />
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
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:hidden">
                    <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_cbcd1e7b" /></p>
                          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{classReport.class.name}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {selectedYearData?.name || 'Selected year'} • {semesterLabel}{termDateRange ? ` • ${termDateRange}` : ''} • {classReport.totalStudents} <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_5643d965" />
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                        <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_097ad61c" /> {classReport.statistics.passRate}%
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
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:hidden">
                    <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 text-violet-700">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700"><AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_0b41a2e0" /></p>
                          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{studentReportCard.student.khmerName}</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {selectedYearData?.name || 'Selected year'} • {semesterLabel}{termDateRange ? ` • ${termDateRange}` : ''} <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_8282144a" />{studentReportCard.summary.classRank}
                          </p>
                        </div>
                      </div>
                      <div className="inline-flex rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                        <AutoI18nText i18nKey="auto.web.locale_grades_reports_page.k_640acc95" /> {studentReportCard.summary.overallAverage.toFixed(1)}
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
