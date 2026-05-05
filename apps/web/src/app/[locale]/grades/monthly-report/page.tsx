'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  Inbox,
  Layout,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  RotateCcw,
  Settings2,
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
  const [tablePage, setTablePage] = useState(0);
  const [tableSort, setTableSort] = useState<{
    field: 'rank' | 'total' | 'average' | 'absent';
    direction: 'asc' | 'desc';
  }>({ field: 'rank', direction: 'asc' });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [hiddenTableColumns, setHiddenTableColumns] = useState<Set<string>>(new Set());
  const [savedFlash, setSavedFlash] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

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
    setTablePage(0);
  }, [report]);

  useEffect(() => {
    if (!school?.id) return;
    setSavedFlash(true);
    const handle = window.setTimeout(() => setSavedFlash(false), 1200);
    return () => window.clearTimeout(handle);
  }, [settings, school?.id]);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const sortedStudents = useMemo(() => {
    if (!report?.students?.length) return [];
    const list = [...report.students];
    const dir = tableSort.direction === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let aVal: number;
      let bVal: number;
      if (tableSort.field === 'rank') {
        aVal = a.rank;
        bVal = b.rank;
      } else if (tableSort.field === 'total') {
        aVal = a.totalScore;
        bVal = b.totalScore;
      } else if (tableSort.field === 'average') {
        aVal = a.average;
        bVal = b.average;
      } else {
        aVal = a.absent + a.permission;
        bVal = b.absent + b.permission;
      }
      return (aVal - bVal) * dir;
    });
    return list;
  }, [report, tableSort]);

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / PAGE_SIZE));
  const pagedStudents = useMemo(
    () => sortedStudents.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE),
    [sortedStudents, tablePage]
  );

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

  const toggleTableColumn = (columnId: string) => {
    setHiddenTableColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      return next;
    });
  };

  const handleSort = (field: 'rank' | 'total' | 'average' | 'absent') => {
    setTableSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    );
    setTablePage(0);
  };

  const restoreDefaults = () => {
    setSettings({
      ...DEFAULT_SETTINGS,
      examCenter: school?.name || '',
    });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isFormElement = tag === 'input' || tag === 'textarea' || tag === 'select';
      const key = event.key.toLowerCase();
      if (key === 'g' && !isFormElement) {
        event.preventDefault();
        if (canGenerate && !loadingReport) handleGenerate(false);
      } else if (key === 'r' && !isFormElement && event.shiftKey) {
        event.preventDefault();
        if (canGenerate && !loadingReport) handleGenerate(true);
      } else if (key === 'p' && report) {
        event.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, loadingReport, report]);

  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" showFilters={false} />;
  }

  const semesterMonthLabels = ['វិច្ឆិកា', 'ធ្នូ', 'មករា', 'កុម្ភៈ'];

  const metricCards = [
    {
      label: t('students'),
      value: report?.statistics.totalStudents ?? '—',
      note: report ? t('metricFemale', { count: report.statistics.femaleStudents }) : t('metricGenerate'),
      Icon: Users,
      accent: 'border-blue-100 bg-blue-50/70 text-blue-700',
      iconTone: 'bg-blue-100 text-blue-700',
    },
    {
      label: t('passed'),
      value: report?.statistics.passedStudents ?? '—',
      note: report ? `${t('failed')}: ${report.statistics.failedStudents}` : t('metricPassNote'),
      Icon: CheckCircle2,
      accent: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
      iconTone: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: t('academicYear'),
      value: selectedYearData?.name || '—',
      note: educationModelLabel,
      Icon: GraduationCap,
      accent: 'border-violet-100 bg-violet-50/70 text-violet-700',
      iconTone: 'bg-violet-100 text-violet-700',
    },
  ];

  const tableColumns: Array<{ id: string; label: string; align?: 'left' | 'right' | 'center' }> = [
    { id: 'rank', label: t('rank') },
    { id: 'student', label: t('student') },
    ...(scope === 'class' ? [] : [{ id: 'class', label: t('class') }]),
    { id: 'total', label: t('total'), align: 'right' as const },
    { id: 'average', label: t('average'), align: 'right' as const },
    { id: 'gradeLevel', label: t('gradeLetter'), align: 'center' as const },
    { id: 'absent', label: t('absent'), align: 'center' as const },
  ];

  const Switch = ({
    checked,
    onChange,
    label,
    hint,
  }: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
    hint?: string;
  }) => (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );

  const SortIcon = ({ field }: { field: 'rank' | 'total' | 'average' | 'absent' }) => {
    if (tableSort.field !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400" />;
    return tableSort.direction === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-600" />
    );
  };

  const sortableColumns: Record<string, 'rank' | 'total' | 'average' | 'absent'> = {
    rank: 'rank',
    total: 'total',
    average: 'average',
    absent: 'absent',
  };

  const formatLabelMap = {
    summary: t('formatSummary'),
    detailed: t('formatDetailed'),
    'semester-1': t('formatSemester1'),
  } as const;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen print:hidden">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <AnimatedContent>
            {/* Hero / Configuration */}
            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                {/* Left: configuration */}
                <div className="p-5 sm:p-7">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 leading-none">
                      <h1 className="text-2xl font-semibold leading-none tracking-tight text-slate-900">
                        {t('eyebrow')}
                      </h1>
                    </div>
                  </div>

                  {/* Output options */}
                  <div className="mt-6 space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('formatLabel')}
                    </span>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div
                        role="tablist"
                        aria-label={t('formatLabel')}
                        className="inline-flex w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                      >
                        {(['summary', 'detailed', 'semester-1'] as const).map((fmt, idx) => (
                          <button
                            key={fmt}
                            type="button"
                            role="tab"
                            aria-pressed={reportFormat === fmt}
                            onClick={() => setReportFormat(fmt)}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                              idx > 0 ? 'border-l border-slate-200' : ''
                            } ${
                              reportFormat === fmt
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            } focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300`}
                          >
                            {formatLabelMap[fmt]}
                          </button>
                        ))}
                      </div>
                      <div
                        role="tablist"
                        aria-label={t('reportSetup')}
                        className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white"
                      >
                        {(['class', 'grade'] as ReportScope[]).map((item, idx) => (
                          <button
                            key={item}
                            type="button"
                            role="tab"
                            aria-pressed={scope === item}
                            onClick={() => setScope(item)}
                            className={`px-4 py-2 text-sm font-medium transition ${
                              idx > 0 ? 'border-l border-slate-200' : ''
                            } ${
                              scope === item
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            } focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300`}
                          >
                            {item === 'class' ? t('scopeByClass') : t('scopeByGrade')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('academicYear')}
                      </span>
                      <select
                        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('class')}
                        </span>
                        <select
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('grade')}
                        </span>
                        <select
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('monthLabel')}
                        </span>
                        <select
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                      <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2.5">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t('formatSemester1')}
                        </span>
                        <p className="mt-0.5 text-xs text-cyan-700">
                          {t('monthsIncluded')}: {semesterMonthLabels.join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div
                      role="alert"
                      aria-live="assertive"
                      className="mt-5 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5">
                    <button
                      type="button"
                      onClick={() => handleGenerate(false)}
                      disabled={!canGenerate || loadingReport}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {t('generate')}
                      <kbd className="ml-1 hidden rounded border border-white/20 bg-white/10 px-1 text-[10px] text-white/80 sm:inline">⌘G</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      disabled={!canGenerate || loadingReport}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('refresh')}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      disabled={!report}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4" />
                      {t('print')}
                      <kbd className="ml-1 hidden rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-500 sm:inline">⌘P</kbd>
                    </button>
                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                      {loadingReport ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t('loading')}
                        </span>
                      ) : report ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {report.students.length} {t('students').toLowerCase()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          {t('metricReady')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: context panel */}
                <div className="flex flex-col gap-3 border-t border-blue-100 bg-blue-50/40 p-5 xl:border-l xl:border-t-0">
                  <div className="rounded-lg border border-blue-100 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('systemTemplate')}
                      </span>
                      <span className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        {educationModelLabel}
                      </span>
                    </div>
                    <select
                      className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700"
                      value={school?.educationModel || 'KHM_MOEYS'}
                      disabled
                    >
                      <option value="KHM_MOEYS">{t('templateMoeys')}</option>
                    </select>
                  </div>

                  {metricCards.map((card) => {
                    const Icon = card.Icon;
                    return (
                      <div
                        key={card.label}
                        className={`rounded-lg border p-3 ${card.accent}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                            {card.label}
                          </span>
                          <span className={`rounded-md p-1 ${card.iconTone}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <div className="mt-1.5 text-xl font-semibold text-slate-900">
                          {card.value}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">{card.note}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Subject columns */}
            {report && sortedSubjects.length > 0 && (
            <section className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{t('subjectColumns')}</span>
                  <div className="flex gap-3 text-xs">
                    <button
                      type="button"
                      className="font-medium text-blue-600 hover:underline"
                      onClick={() => setHiddenSubjects(new Set())}
                    >
                      {t('showAllSubjects')}
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      className="font-medium text-slate-600 hover:underline"
                      onClick={() => setHiddenSubjects(new Set(sortedSubjects.map((s) => s.id)))}
                    >
                      {t('hideAllSubjects')}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                  {sortedSubjects.map((subject) => {
                    const hidden = hiddenSubjects.has(subject.id);
                    return (
                      <button
                        key={subject.id}
                        type="button"
                        onClick={() => toggleSubject(subject.id)}
                        aria-pressed={!hidden}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                          hidden
                            ? 'border-slate-200 bg-white text-slate-500 line-through'
                            : 'border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50'
                        }`}
                      >
                        {subject.nameKh || subject.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Print Settings */}
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/35 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-100 p-1 text-blue-700">
                    <Settings2 className="h-3.5 w-3.5" />
                  </span>
                  <h2 className="text-base font-semibold text-slate-900">{t('printSettings')}</h2>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                    {t('a4Portrait')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    aria-live="polite"
                    className={`inline-flex items-center gap-1 text-xs transition ${
                      savedFlash ? 'text-emerald-600 opacity-100' : 'text-transparent opacity-0'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Saved
                  </span>
                  <button
                    type="button"
                    onClick={restoreDefaults}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore defaults
                  </button>
                </div>
              </header>

              <div className="space-y-6 p-5">
                {/* Document info */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-md bg-sky-100 p-1 text-sky-700">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800">Document info</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {(
                      [
                        ['reportTitle', 'reportTitle'],
                        ['examSession', 'examSession'],
                        ['reportDate', 'reportDate'],
                        ['principalName', 'principal'],
                        ['teacherName', 'teacher'],
                      ] as const
                    ).map(([key, labelKey]) => (
                      <label className="block" key={key}>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t(labelKey)}
                        </span>
                        <input
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings[key as keyof typeof DEFAULT_SETTINGS] as string}
                          onChange={(event) =>
                            updateSetting(key as keyof typeof DEFAULT_SETTINGS, event.target.value as never)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-md bg-emerald-100 p-1 text-emerald-700">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800">Location</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {(
                      [
                        ['province', 'province'],
                        ['examCenter', 'examCenter'],
                        ['roomNumber', 'roomNumber'],
                      ] as const
                    ).map(([key, labelKey]) => (
                      <label className="block" key={key}>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {t(labelKey)}
                        </span>
                        <input
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings[key as keyof typeof DEFAULT_SETTINGS] as string}
                          onChange={(event) =>
                            updateSetting(key as keyof typeof DEFAULT_SETTINGS, event.target.value as never)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Layout & columns */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-md bg-violet-100 p-1 text-violet-700">
                      <Layout className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800">Layout & columns</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {(
                      [
                        ['firstPageStudentCount', 'firstPageRows', 'rows'],
                        ['nextPageStudentCount', 'nextPageRows', 'rows'],
                        ['tableFontSize', 'tableFontSize', 'px'],
                      ] as const
                    ).map(([key, labelKey, unit]) => (
                      <label className="block" key={key}>
                        <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <span>{t(labelKey)}</span>
                          <span className="font-normal normal-case text-slate-400">{unit}</span>
                        </span>
                        <input
                          type="number"
                          min={key === 'tableFontSize' ? 7 : 15}
                          max={key === 'tableFontSize' ? 12 : 50}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={settings[key as keyof typeof DEFAULT_SETTINGS] as number}
                          onChange={(event) =>
                            updateSetting(key as keyof typeof DEFAULT_SETTINGS, Number(event.target.value) as never)
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Columns
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          [
                            ['showAttendance', 'toggleAttendance'],
                            ['showSubjects', 'toggleSubjects'],
                            ['showTotal', 'toggleTotal'],
                            ['showAverage', 'toggleAverage'],
                            ['showRank', 'toggleRank'],
                            ['showGradeLevel', 'toggleGradeLetter'],
                            ['showClassName', 'toggleClassName'],
                          ] as const
                        ).map(([key, labelKey]) => (
                          <Switch
                            key={key}
                            label={t(labelKey)}
                            checked={settings[key as keyof typeof DEFAULT_SETTINGS] as boolean}
                            onChange={(next) =>
                              updateSetting(key as keyof typeof DEFAULT_SETTINGS, next as never)
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Display
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          [
                            ['showCircles', 'toggleCircles'],
                            ['autoCircle', 'toggleAutoCircle'],
                          ] as const
                        ).map(([key, labelKey]) => (
                          <Switch
                            key={key}
                            label={t(labelKey)}
                            checked={settings[key as keyof typeof DEFAULT_SETTINGS] as boolean}
                            onChange={(next) =>
                              updateSetting(key as keyof typeof DEFAULT_SETTINGS, next as never)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Preview */}
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/35 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{t('previewTitle')}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{t('previewHint')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    <Users className="h-3.5 w-3.5" />
                    {report?.students.length ?? 0}
                  </span>
                  {report && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowColumnMenu((s) => !s)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Columns
                      </button>
                      {showColumnMenu && (
                        <div
                          role="menu"
                          className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
                        >
                          {tableColumns.map((col) => {
                            const hidden = hiddenTableColumns.has(col.id);
                            return (
                              <button
                                key={col.id}
                                role="menuitemcheckbox"
                                aria-checked={!hidden}
                                onClick={() => toggleTableColumn(col.id)}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                <span>{col.label}</span>
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                                    hidden ? 'border-slate-300 bg-white' : 'border-blue-600 bg-blue-600 text-white'
                                  }`}
                                >
                                  {!hidden && <CheckCircle2 className="h-3 w-3" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </header>

              <div className="p-5">
                {loadingReport && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-7 gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                      {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-3 rounded bg-slate-200/80" />
                      ))}
                    </div>
                    {Array.from({ length: 6 }).map((_, row) => (
                      <div
                        key={row}
                        className="grid animate-pulse grid-cols-7 gap-3 border-b border-slate-100 px-3 py-3"
                      >
                        {Array.from({ length: 7 }).map((_, col) => (
                          <div key={col} className="h-3 rounded bg-slate-100" />
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {!report && !loadingReport && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700">
                      <Inbox className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-700">{t('empty')}</p>
                    <button
                      type="button"
                      onClick={() => handleGenerate(false)}
                      disabled={!canGenerate}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileText className="h-4 w-4" />
                      {t('generate')}
                    </button>
                  </div>
                )}

                {report && !loadingReport && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="max-h-[520px] overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-[1] bg-emerald-50 text-left text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                          <tr>
                            {tableColumns.map((col) => {
                              if (hiddenTableColumns.has(col.id)) return null;
                              const sortField = sortableColumns[col.id];
                              const align =
                                col.align === 'right'
                                  ? 'text-right'
                                  : col.align === 'center'
                                  ? 'text-center'
                                  : 'text-left';
                              return (
                                <th
                                  key={col.id}
                                  className={`whitespace-nowrap border-b border-emerald-100 px-3 py-2.5 ${align}`}
                                >
                                  {sortField ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSort(sortField)}
                                      className="inline-flex items-center gap-1 hover:text-slate-900"
                                    >
                                      {col.label}
                                      <SortIcon field={sortField} />
                                    </button>
                                  ) : (
                                    col.label
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {pagedStudents.map((student) => (
                            <tr key={student.studentId} className="transition hover:bg-slate-50/80">
                              {!hiddenTableColumns.has('rank') && (
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900">
                                  {student.rank}
                                </td>
                              )}
                              {!hiddenTableColumns.has('student') && (
                                <td className="px-3 py-2.5">
                                  <div className="font-medium text-slate-900">{student.studentName}</div>
                                  <div className="text-xs text-slate-500">
                                    {student.studentCode || student.studentId}
                                  </div>
                                </td>
                              )}
                              {scope !== 'class' && !hiddenTableColumns.has('class') && (
                                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                                  {student.className}
                                </td>
                              )}
                              {!hiddenTableColumns.has('total') && (
                                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-800">
                                  {student.totalScore}
                                </td>
                              )}
                              {!hiddenTableColumns.has('average') && (
                                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-800">
                                  {student.average}
                                </td>
                              )}
                              {!hiddenTableColumns.has('gradeLevel') && (
                                <td className="whitespace-nowrap px-3 py-2.5 text-center">
                                  <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-md border border-blue-100 bg-blue-50 px-1.5 text-xs font-semibold text-blue-700">
                                    {student.gradeLevel}
                                  </span>
                                </td>
                              )}
                              {!hiddenTableColumns.has('absent') && (
                                <td className="whitespace-nowrap px-3 py-2.5 text-center text-slate-600">
                                  {student.absent + student.permission}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-3 py-2">
                      <span className="text-xs text-slate-600">
                        {tablePage * PAGE_SIZE + 1}–
                        {Math.min((tablePage + 1) * PAGE_SIZE, sortedStudents.length)} of{' '}
                        {sortedStudents.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                          disabled={tablePage === 0}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-2 text-xs font-medium text-slate-700">
                          {tablePage + 1} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={tablePage >= totalPages - 1}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {/* Sticky action bar */}
      {showStickyBar && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-30 print:hidden">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-blue-100 bg-white p-1 shadow-lg shadow-blue-950/10">
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={!canGenerate || loadingReport}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Generate (⌘G)"
            >
              {loadingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {t('generate')}
            </button>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={!canGenerate || loadingReport}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Refresh (⌘⇧R)"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              disabled={!report}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Print (⌘P)"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {report && <MonthlyReportPrint report={report} settings={settings} subjects={visibleSubjects} />}
    </div>
  );
}
