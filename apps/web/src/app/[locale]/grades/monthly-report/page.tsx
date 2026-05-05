'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Users,
} from 'lucide-react';
import AnimatedContent from '@/components/AnimatedContent';
import PageSkeleton from '@/components/layout/PageSkeleton';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import MonthlyReportPrint from '@/components/reports/MonthlyReportPrint';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { TokenManager } from '@/lib/api/auth';
import { gradeAPI, type KhmerMonthlyReportData, type MonthlyReportFormat } from '@/lib/api/grades';
import { formatEducationModelLabel } from '@/lib/educationModel';
import {
  getKhmerMonthDisplayName,
  getKhmerMonthLabel,
  KHMER_MONTHS,
  sortSubjectsByOrder,
} from '@/lib/reports/khmerMonthly';

type ReportScope = 'class' | 'grade';

const SETTINGS_STORAGE = 'stunity:monthly-report-print-settings:v1';

type StoredPrintSettings = {
  province?: string;
  examCenter?: string;
  roomNumber?: string;
  reportTitle?: string;
  examSession?: string;
  reportDate?: string;
  principalName?: string;
  teacherName?: string;
  showAttendance?: boolean;
  showSubjects?: boolean;
  showTotal?: boolean;
  showAverage?: boolean;
  showRank?: boolean;
  showGradeLevel?: boolean;
  showClassName?: boolean;
  showCircles?: boolean;
  autoCircle?: boolean;
  firstPageStudentCount?: number;
  nextPageStudentCount?: number;
  tableFontSize?: number;
};

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
  const t = useTranslations('monthlyReport');
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
  const [reportFormat, setReportFormat] = useState<MonthlyReportFormat>('summary');
  const [hiddenSubjects, setHiddenSubjects] = useState<Set<string>>(new Set());
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
    if (!school?.id || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`${SETTINGS_STORAGE}:${school.id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredPrintSettings;
      setSettings((prev) => ({
        ...prev,
        ...parsed,
      }));
    } catch {
      /* ignore */
    }
  }, [school?.id]);

  useEffect(() => {
    if (!school?.id || typeof window === 'undefined') return;
    const { province, examCenter, ...rest } = settings;
    const payload: StoredPrintSettings = rest;
    if (province) payload.province = province;
    if (examCenter) payload.examCenter = examCenter;
    localStorage.setItem(`${SETTINGS_STORAGE}:${school.id}`, JSON.stringify(payload));
  }, [school?.id, settings]);

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
    return Array.from(new Set(classes.map((classItem) => String(classItem.grade)).filter(Boolean))).sort(
      (a, b) => Number(a) - Number(b)
    );
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

  useEffect(() => {
    if (reportFormat === 'semester-1') {
      setSelectedMonthNumber(2);
    }
  }, [reportFormat]);

  useEffect(() => {
    setHiddenSubjects(new Set());
  }, [report]);

  const selectedYearData = allYears.find((year) => year.id === selectedYear);
  const selectedClassData = classes.find((classItem) => classItem.id === selectedClass);
  const selectedMonthLabel = getKhmerMonthLabel(selectedMonthNumber);
  const selectedMonthDisplay = getKhmerMonthDisplayName(selectedMonthNumber, selectedMonthLabel);
  const academicStartYear = selectedYearData ? Number.parseInt(selectedYearData.name, 10) : new Date().getFullYear();
  const canGenerate = selectedYear && (scope === 'class' ? selectedClass : selectedGrade);
  const educationModelLabel = formatEducationModelLabel(school?.educationModel || 'KHM_MOEYS');

  const templateQuery =
    school?.educationModel === 'CUSTOM' ? 'KHM_MOEYS' : undefined;

  const sortedSubjects = useMemo(() => {
    if (!report?.subjects?.length) return [];
    return sortSubjectsByOrder(report.subjects, report.grade);
  }, [report]);

  const visibleSubjects = useMemo(() => {
    return sortedSubjects.filter((s) => !hiddenSubjects.has(s.id));
  }, [sortedSubjects, hiddenSubjects]);

  const handleGenerate = async (forceFresh = false) => {
    if (!canGenerate) return;

    setLoadingReport(true);
    setError('');

    try {
      const data = await gradeAPI.getMonthlyReport({
        scope,
        classId: scope === 'class' ? selectedClass : undefined,
        grade: scope === 'grade' ? selectedGrade : selectedClassData?.grade,
        month: selectedMonthLabel,
        monthNumber: selectedMonthNumber,
        year: Number.isFinite(academicStartYear) ? academicStartYear : undefined,
        academicYearId: selectedYear,
        format: reportFormat,
        template: templateQuery,
        options: { forceFresh },
      });
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  };

  const updateSetting = <K extends keyof typeof DEFAULT_SETTINGS>(key: K, value: (typeof DEFAULT_SETTINGS)[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const toggleSubject = (subjectId: string) => {
    setHiddenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" showFilters={false} />;
  }

  const semesterMonthLabels = ['វិច្ឆិកា', 'ធ្នូ', 'មករា', 'កុម្ភៈ'];

  const metricCards = [
    {
      label: t('systemBadge'),
      value: educationModelLabel,
      note: t('metricPassNote'),
      tone: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/80 to-cyan-50/70',
    },
    {
      label: t('academicYear'),
      value: selectedYearData?.name || '--',
      note: t('metricFemale', { count: report?.statistics.femaleStudents ?? '--' }),
      tone: 'border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/80 to-blue-50/70',
    },
    {
      label: t('students'),
      value: report?.statistics.totalStudents ?? '--',
      note: report ? t('metricFemale', { count: report.statistics.femaleStudents }) : t('metricGenerate'),
      tone: 'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/80 to-teal-50/70',
    },
    {
      label: t('passed'),
      value: report?.statistics.passedStudents ?? '--',
      note: report ? `${t('failed')}: ${report.statistics.failedStudents}` : t('metricPassNote'),
      tone: 'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/80 to-orange-50/70',
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_52%,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen print:hidden">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.35)]">
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
                        <FileText className="h-7 w-7" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">{t('eyebrow')}</p>
                        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{t('title')}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          {t('description', { model: educationModelLabel })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {reportFormat === 'semester-1' ? t('formatSemester1') : selectedMonthDisplay}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {report ? `${report.students.length} ${t('students').toLowerCase()}` : t('metricReady')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
                    <div>
                      <span className="text-sm font-semibold text-slate-700">{t('formatLabel')}</span>
                      <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                        {(['summary', 'detailed', 'semester-1'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setReportFormat(fmt)}
                            className={`rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                              reportFormat === fmt ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                            }`}
                          >
                            {fmt === 'summary' ? t('formatSummary') : fmt === 'detailed' ? t('formatDetailed') : t('formatSemester1')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-semibold text-slate-700">{t('reportSetup')}</span>
                      <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                        {(['class', 'grade'] as ReportScope[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setScope(item)}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              scope === item ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                            }`}
                          >
                            {item === 'class' ? t('scopeByClass') : t('scopeByGrade')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">{t('systemTemplate')}</span>
                      <select
                        className="mt-2 h-[42px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600"
                        value={school?.educationModel || 'KHM_MOEYS'}
                        disabled
                      >
                        <option value="KHM_MOEYS">{t('templateMoeys')}</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">{t('academicYear')}</span>
                      <select
                        className="mt-2 h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                        value={selectedYear}
                        onChange={(event) => setSelectedYear(event.target.value)}
                      >
                        {allYears.map((year) => (
                          <option key={year.id} value={year.id}>
                            {year.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {scope === 'class' ? (
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">{t('class')}</span>
                        <select
                          className="mt-2 h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
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
                        <span className="text-sm font-semibold text-slate-700">{t('grade')}</span>
                        <select
                          className="mt-2 h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
                          value={selectedGrade}
                          onChange={(event) => setSelectedGrade(event.target.value)}
                        >
                          {grades.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {reportFormat !== 'semester-1' ? (
                      <label className="block">
                        <span className="text-sm font-semibold text-slate-700">{t('monthLabel')}</span>
                        <select
                          className="mt-2 h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
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
                    ) : (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
                        <p className="font-semibold">{t('formatSemester1')}</p>
                        <p className="mt-1 text-xs text-blue-700">
                          {t('monthsIncluded')}: {semesterMonthLabels.join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {report && sortedSubjects.length > 0 && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-700">{t('subjectColumns')}</span>
                        <div className="flex gap-3">
                          <button type="button" className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => setHiddenSubjects(new Set())}>
                            {t('showAllSubjects')}
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-600 hover:underline"
                            onClick={() => setHiddenSubjects(new Set(sortedSubjects.map((s) => s.id)))}
                          >
                            {t('hideAllSubjects')}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                        {sortedSubjects.map((subject) => (
                          <button
                            key={subject.id}
                            type="button"
                            onClick={() => toggleSubject(subject.id)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                              hiddenSubjects.has(subject.id)
                                ? 'border border-slate-200 bg-white text-slate-500 line-through'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                            }`}
                          >
                            {subject.nameKh || subject.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleGenerate(false)}
                      disabled={!canGenerate || loadingReport}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {t('generate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      disabled={!canGenerate || loadingReport}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('refresh')}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      disabled={!report}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4" />
                      {t('print')}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/80 p-5 sm:grid-cols-2 xl:border-l xl:border-t-0 xl:grid-cols-1">
                  {metricCards.map((card) => (
                    <div key={card.label} className={`rounded-xl border p-4 shadow-sm ${card.tone}`}>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                      <div className="mt-2 text-2xl font-bold text-slate-950">{card.value}</div>
                      <div className="mt-1 text-sm text-slate-600">{card.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-5">
              <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-950">{t('printSettings')}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{t('a4Portrait')}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {(
                    [
                      ['province', 'province'],
                      ['examCenter', 'examCenter'],
                      ['roomNumber', 'roomNumber'],
                      ['reportTitle', 'reportTitle'],
                      ['examSession', 'examSession'],
                      ['reportDate', 'reportDate'],
                      ['principalName', 'principal'],
                      ['teacherName', 'teacher'],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <label className="block" key={key}>
                      <span className="text-sm font-medium text-slate-700">{t(labelKey)}</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={settings[key as keyof typeof DEFAULT_SETTINGS] as string}
                        onChange={(event) => updateSetting(key as keyof typeof DEFAULT_SETTINGS, event.target.value as never)}
                      />
                    </label>
                  ))}

                  {(
                    [
                      ['firstPageStudentCount', 'firstPageRows'],
                      ['nextPageStudentCount', 'nextPageRows'],
                      ['tableFontSize', 'tableFontSize'],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <label className="block" key={key}>
                      <span className="text-sm font-medium text-slate-700">{t(labelKey)}</span>
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
                  {(
                    [
                      ['showAttendance', 'toggleAttendance'],
                      ['showSubjects', 'toggleSubjects'],
                      ['showTotal', 'toggleTotal'],
                      ['showAverage', 'toggleAverage'],
                      ['showRank', 'toggleRank'],
                      ['showGradeLevel', 'toggleGradeLetter'],
                      ['showClassName', 'toggleClassName'],
                      ['showCircles', 'toggleCircles'],
                      ['autoCircle', 'toggleAutoCircle'],
                    ] as const
                  ).map(([key, labelKey]) => (
                    <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={settings[key as keyof typeof DEFAULT_SETTINGS] as boolean}
                        onChange={(event) => updateSetting(key as keyof typeof DEFAULT_SETTINGS, event.target.checked as never)}
                      />
                      {t(labelKey)}
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <section className="mt-6 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{t('previewTitle')}</h2>
                  <p className="text-sm text-slate-600">{t('previewHint')}</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                  <Users className="h-4 w-4" />
                  {report?.students.length ?? 0}
                </div>
              </div>

              {loadingReport && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm font-medium text-blue-700">{t('loading')}</div>
              )}

              {!report && !loadingReport && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">{t('empty')}</div>
              )}

              {report && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">{t('rank')}</th>
                        <th className="px-3 py-2">{t('student')}</th>
                        <th className="px-3 py-2">{t('class')}</th>
                        <th className="px-3 py-2 text-right">{t('total')}</th>
                        <th className="px-3 py-2 text-right">{t('average')}</th>
                        <th className="px-3 py-2 text-center">{t('gradeLetter')}</th>
                        <th className="px-3 py-2 text-center">{t('absent')}</th>
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
                    <div className="mt-3 text-sm text-slate-500">{t('previewOverflow', { count: report.students.length })}</div>
                  )}
                </div>
              )}
            </section>
          </AnimatedContent>
        </main>
      </div>

      {report && <MonthlyReportPrint report={report} settings={settings} subjects={visibleSubjects} />}
    </div>
  );
}
