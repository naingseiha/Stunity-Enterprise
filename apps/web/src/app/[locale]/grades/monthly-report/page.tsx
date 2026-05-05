'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Settings2,
  Users,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import PageSkeleton from '@/components/layout/PageSkeleton';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import KhmerMonthlyReportPrint from '@/components/reports/KhmerMonthlyReportPrint';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { TokenManager } from '@/lib/api/auth';
import { gradeAPI, type KhmerMonthlyReportData } from '@/lib/api/grades';
import { formatEducationModelLabel } from '@/lib/educationModel';
import { getKhmerMonthDisplayName, getKhmerMonthLabel, KHMER_MONTHS } from '@/lib/reports/khmerMonthly';

type ReportScope = 'class' | 'grade';

const DEFAULT_SETTINGS = {
  province: 'ខេត្តកំពង់ចាម',
  examCenter: '',
  roomNumber: '',
  reportTitle: '',
  examSession: '',
  reportDate: '',
  principalName: '',
  teacherName: '',
  showAttendance: true,
  showSubjects: true,
  showTotal: true,
  showAverage: true,
  showRank: true,
  showGradeLevel: true,
  showClassName: true,
  showCircles: true,
  autoCircle: true,
  firstPageStudentCount: 29,
  nextPageStudentCount: 34,
  tableFontSize: 9,
};

export default function KhmerMonthlyReportPage() {
  const router = useRouter();
  const locale = useLocale();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<KhmerMonthlyReportData | null>(null);
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();

  const [selectedYear, setSelectedYear] = useState('');
  const [scope, setScope] = useState<ReportScope>('class');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(2);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    const data = TokenManager.getUserData();
    setUser(data.user);
    setSchool(data.school);
    setSettings((current) => ({
      ...current,
      examCenter: data.school?.name || current.examCenter,
    }));
    setLoading(false);
  }, [locale, router]);

  useEffect(() => {
    if (selectedYear && allYears.some((year) => year.id === selectedYear)) return;
    const preferredYearId =
      contextSelectedYear?.id || allYears.find((year) => year.isCurrent)?.id || allYears[0]?.id || '';
    if (preferredYearId) setSelectedYear(preferredYearId);
  }, [allYears, contextSelectedYear, selectedYear]);

  const { classes, isLoading: loadingClasses } = useClasses({
    academicYearId: selectedYear || undefined,
    limit: 200,
  });

  const grades = useMemo(() => {
    return Array.from(new Set(classes.map((classItem) => String(classItem.grade)).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  }, [classes]);

  useEffect(() => {
    if (!selectedClass && classes[0]?.id) setSelectedClass(classes[0].id);
    if (!selectedGrade && grades[0]) setSelectedGrade(grades[0]);
  }, [classes, grades, selectedClass, selectedGrade]);

  useEffect(() => {
    if (selectedClass && !classes.some((classItem) => classItem.id === selectedClass)) {
      setSelectedClass(classes[0]?.id || '');
    }
  }, [classes, selectedClass]);

  useEffect(() => {
    if (selectedGrade && !grades.includes(selectedGrade)) {
      setSelectedGrade(grades[0] || '');
    }
  }, [grades, selectedGrade]);

  const selectedYearData = allYears.find((year) => year.id === selectedYear);
  const selectedClassData = classes.find((classItem) => classItem.id === selectedClass);
  const selectedMonthLabel = getKhmerMonthLabel(selectedMonthNumber);
  const selectedMonthDisplay = getKhmerMonthDisplayName(selectedMonthNumber, selectedMonthLabel);
  const academicStartYear = selectedYearData ? Number.parseInt(selectedYearData.name, 10) : new Date().getFullYear();
  const canGenerate = selectedYear && (scope === 'class' ? selectedClass : selectedGrade);
  const educationModelLabel = formatEducationModelLabel(school?.educationModel || 'KHM_MOEYS');

  const handleGenerate = async (forceFresh = false) => {
    if (!canGenerate) return;

    setLoadingReport(true);
    setError('');

    try {
      const data = await gradeAPI.getKhmerMonthlyReport({
        scope,
        classId: scope === 'class' ? selectedClass : undefined,
        grade: scope === 'grade' ? selectedGrade : selectedClassData?.grade,
        month: selectedMonthLabel,
        monthNumber: selectedMonthNumber,
        year: Number.isFinite(academicStartYear) ? academicStartYear : undefined,
        academicYearId: selectedYear,
        options: { forceFresh },
      });
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Khmer monthly report');
    } finally {
      setLoadingReport(false);
    }
  };

  const updateSetting = <K extends keyof typeof DEFAULT_SETTINGS>(key: K, value: (typeof DEFAULT_SETTINGS)[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" showFilters={false} />;
  }

  const metricCards = [
    {
      label: 'Report System',
      value: 'Khmer MOEYS',
      note: 'Template ready for Cambodia, extensible later',
      tone: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70',
    },
    {
      label: 'Academic Year',
      value: selectedYearData?.name || '--',
      note: 'Used to resolve Nov-Mar calendar years',
      tone: 'border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/80 to-blue-50/70',
    },
    {
      label: 'Students',
      value: report?.statistics.totalStudents ?? '--',
      note: report ? `Female ${report.statistics.femaleStudents}` : 'Generate to inspect roster',
      tone: 'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70',
    },
    {
      label: 'Passed',
      value: report?.statistics.passedStudents ?? '--',
      note: report ? `Failed ${report.statistics.failedStudents}` : 'MOEYS pass threshold 25',
      tone: 'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70',
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_52%,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen print:hidden">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                eyebrow="Monthly Report"
                title="Khmer Monthly Report"
                description={`Generate MOEYS-style monthly score reports from Stunity data. Current school model: ${educationModelLabel}.`}
                icon={FileText}
                chips={
                  <div className="grid gap-2">
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {selectedMonthDisplay}
                    </span>
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {report ? `${report.students.length} students` : 'Ready'}
                    </span>
                  </div>
                }
                actions={
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerate(false)}
                      disabled={!canGenerate || loadingReport}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Generate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      disabled={!canGenerate || loadingReport}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      disabled={!report}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </div>
                }
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {metricCards.map((card) => (
                  <div key={card.label} className={`rounded-xl border p-4 shadow-sm ${card.tone}`}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                    <div className="mt-2 text-2xl font-bold text-slate-950">{card.value}</div>
                    <div className="mt-1 text-sm text-slate-600">{card.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
              <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-950">Report Setup</h2>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">System Template</span>
                    <select className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" value="KHM_MOEYS" disabled>
                      <option value="KHM_MOEYS">Khmer System (MOEYS)</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                    {(['class', 'grade'] as ReportScope[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setScope(item)}
                        className={`rounded-md px-3 py-2 text-sm font-semibold transition ${scope === item ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
                      >
                        {item === 'class' ? 'By Class' : 'By Grade'}
                      </button>
                    ))}
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Academic Year</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                    >
                      {allYears.map((year) => (
                        <option key={year.id} value={year.id}>{year.name}</option>
                      ))}
                    </select>
                  </label>

                  {scope === 'class' ? (
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Class</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={selectedClass}
                        onChange={(event) => setSelectedClass(event.target.value)}
                        disabled={loadingClasses}
                      >
                        {classes.map((classItem) => (
                          <option key={classItem.id} value={classItem.id}>
                            {classItem.name} ({classItem._count?.students || 0})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Grade</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={selectedGrade}
                        onChange={(event) => setSelectedGrade(event.target.value)}
                      >
                        {grades.map((grade) => (
                          <option key={grade} value={grade}>Grade {grade}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="block">
                    <span className="text-sm font-medium text-slate-700">Month / Semester</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={selectedMonthNumber}
                      onChange={(event) => setSelectedMonthNumber(Number(event.target.value))}
                    >
                      {KHMER_MONTHS.map((month) => (
                        <option key={month.number} value={month.number}>
                          {getKhmerMonthDisplayName(month.number, month.label)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {error && (
                    <div className="flex gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-950">Print Settings</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">A4 portrait</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['province', 'Province'],
                    ['examCenter', 'Office / Center'],
                    ['roomNumber', 'Room'],
                    ['reportTitle', 'Report Title'],
                    ['examSession', 'Session'],
                    ['reportDate', 'Report Date'],
                    ['principalName', 'Principal'],
                    ['teacherName', 'Teacher'],
                  ].map(([key, label]) => (
                    <label className="block" key={key}>
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={settings[key as keyof typeof DEFAULT_SETTINGS] as string}
                        onChange={(event) => updateSetting(key as keyof typeof DEFAULT_SETTINGS, event.target.value as never)}
                      />
                    </label>
                  ))}

                  {[
                    ['firstPageStudentCount', 'First Page Rows'],
                    ['nextPageStudentCount', 'Next Page Rows'],
                    ['tableFontSize', 'Table Font Size'],
                  ].map(([key, label]) => (
                    <label className="block" key={key}>
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <input
                        type="number"
                        min={key === 'tableFontSize' ? 7 : 15}
                        max={key === 'tableFontSize' ? 12 : 50}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={settings[key as keyof typeof DEFAULT_SETTINGS] as number}
                        onChange={(event) => updateSetting(key as keyof typeof DEFAULT_SETTINGS, Number(event.target.value) as never)}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['showAttendance', 'Attendance'],
                    ['showSubjects', 'Subjects'],
                    ['showTotal', 'Total'],
                    ['showAverage', 'Average'],
                    ['showRank', 'Rank'],
                    ['showGradeLevel', 'Grade'],
                    ['showClassName', 'Class Name'],
                    ['showCircles', 'Circle Pass'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={settings[key as keyof typeof DEFAULT_SETTINGS] as boolean}
                        onChange={(event) => updateSetting(key as keyof typeof DEFAULT_SETTINGS, event.target.checked as never)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Generated Report Preview</h2>
                  <p className="text-sm text-slate-600">
                    This preview uses the same data as the printable Khmer MOEYS report.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  <Users className="h-4 w-4" />
                  {report?.students.length ?? 0}
                </div>
              </div>

              {loadingReport && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm font-medium text-blue-700">
                  Generating Khmer monthly report...
                </div>
              )}

              {!report && !loadingReport && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
                  Select the class or grade, choose the month, then generate the report.
                </div>
              )}

              {report && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Rank</th>
                        <th className="px-3 py-2">Student</th>
                        <th className="px-3 py-2">Class</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-right">Average</th>
                        <th className="px-3 py-2 text-center">Grade</th>
                        <th className="px-3 py-2 text-center">Absent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.students.slice(0, 25).map((student) => (
                        <tr key={student.studentId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-semibold text-slate-900">{student.rank}</td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-slate-900">{student.studentName}</div>
                            <div className="text-xs text-slate-500">{student.studentCode || student.studentId}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{student.className}</td>
                          <td className="px-3 py-2 text-right font-medium">{student.totalScore}</td>
                          <td className="px-3 py-2 text-right font-medium">{student.average}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{student.gradeLevel}</span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-600">{student.absent + student.permission}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {report.students.length > 25 && (
                    <div className="mt-3 text-sm text-slate-500">
                      Showing first 25 students in preview. Print output includes all {report.students.length}.
                    </div>
                  )}
                </div>
              )}
            </section>
          </AnimatedContent>
        </main>
      </div>

      {report && <KhmerMonthlyReportPrint report={report} settings={settings} />}
    </div>
  );
}
