'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Award,
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
import { schoolAPI } from '@/lib/api/school';
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
  province: '',
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
  firstPageStudentCount: 38,
  nextPageStudentCount: 34,
  tableFontSize: 10,
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
  const [reports, setReports] = useState<KhmerMonthlyReportData[]>([]);
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();

  const [selectedYear, setSelectedYear] = useState('');
  const [scope, setScope] = useState<ReportScope>('class');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(2);
  const [reportType, setReportType] = useState<'monthly' | 'semester'>('monthly');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'monthly' | 'transcript' | 'certificate'>('monthly');
  const reportFormat: MonthlyReportFormat = reportType === 'monthly' ? 'detailed' : (selectedSemester === 1 ? 'semester-1' : 'semester-2');
  const [hiddenSubjects, setHiddenSubjects] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [schoolProfile, setSchoolProfile] = useState<any>(null);
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

    const fetchSchoolProfile = async () => {
      if (!data.school?.id) return;
      try {
        const res = await schoolAPI.getProfile(data.school.id);
        if (res.success && res.data) {
          setSchoolProfile(res.data);
          setSettings((current) => ({
            ...current,
            province: res.data.province ? `ខេត្ត${res.data.province}` : current.province,
            examCenter: res.data.nameKh || res.data.name || data.school?.name || current.examCenter,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch school profile:', err);
      }
    };

    fetchSchoolProfile();
    setLoading(false);
  }, [locale, router]);

  useEffect(() => {
    if (!school?.id || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`${SETTINGS_STORAGE}:${school.id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredPrintSettings;
      // Do NOT load province or examCenter from localStorage cache
      // so they are always dynamically loaded from the school profile
      const { province, examCenter, ...rest } = parsed;
      setSettings((prev) => ({
        ...prev,
        ...rest,
      }));
    } catch {
      /* ignore */
    }
  }, [school?.id]);

  useEffect(() => {
    if (!school?.id || typeof window === 'undefined') return;
    // Do NOT save province or examCenter in localStorage cache
    const { province, examCenter, ...rest } = settings;
    const payload: StoredPrintSettings = rest;
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
    if (selectedClasses.length === 0 && classes[0]?.id) setSelectedClasses([classes[0].id]);
    if (!selectedGrade && grades[0]) setSelectedGrade(grades[0]);
  }, [classes, grades, selectedClasses, selectedGrade]);

  useEffect(() => {
    const validClasses = selectedClasses.filter(id => classes.some(c => c.id === id));
    if (selectedClasses.length > 0 && validClasses.length === 0) {
      setSelectedClasses(classes[0]?.id ? [classes[0].id] : []);
    } else if (validClasses.length !== selectedClasses.length) {
      setSelectedClasses(validClasses);
    }
  }, [classes, selectedClasses]);

  useEffect(() => {
    if (selectedGrade && !grades.includes(selectedGrade)) {
      setSelectedGrade(grades[0] || '');
    }
  }, [grades, selectedGrade]);

  useEffect(() => {
    if (reportType === 'semester') {
      setSelectedMonthNumber(selectedSemester === 1 ? 2 : 7);
    }
  }, [reportType, selectedSemester]);

  useEffect(() => {
    setHiddenSubjects(new Set());
    setTablePage(0);
  }, [reports]);

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
  const selectedMonthLabel = getKhmerMonthLabel(selectedMonthNumber);
  const selectedMonthDisplay = getKhmerMonthDisplayName(selectedMonthNumber, selectedMonthLabel);
  const academicStartYear = selectedYearData ? Number.parseInt(selectedYearData.name, 10) : new Date().getFullYear();
  const canGenerate = selectedYear && (scope === 'class' ? selectedClasses.length > 0 : selectedGrade);
  const educationModelLabel = formatEducationModelLabel(school?.educationModel || 'KHM_MOEYS');

  const templateQuery =
    school?.educationModel === 'CUSTOM' ? 'KHM_MOEYS' : undefined;

  const groupedClasses = useMemo(() => {
    const groups: { [grade: string]: typeof classes } = {};
    classes.forEach((classItem) => {
      const g = classItem.grade || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(classItem);
    });

    Object.keys(groups).forEach((g) => {
      groups[g].sort((a, b) => a.name.localeCompare(b.name, 'km', { numeric: true }));
    });

    return Object.keys(groups)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10);
        const numB = parseInt(b.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .map((g) => ({
        grade: g,
        classItems: groups[g],
      }));
  }, [classes]);

  const sortedSubjects = useMemo(() => {
    if (!reports.length) return [];
    const subjectMap = new Map<string, NonNullable<KhmerMonthlyReportData['subjects']>[number]>();
    reports.forEach((report) => {
      report.subjects?.forEach((subject) => {
        const key = subject.nameKh || subject.name;
        if (!subjectMap.has(key)) {
          subjectMap.set(key, subject);
        }
      });
    });
    return sortSubjectsByOrder(Array.from(subjectMap.values()), reports[0]?.grade || 10);
  }, [reports]);

  const sortedStudents = useMemo(() => {
    const previewReport = reports[0];
    if (!previewReport?.students?.length) return [];
    const list = [...previewReport.students];
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
  }, [reports, tableSort]);

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
      if (scope === 'class') {
        const promises = selectedClasses.map(async (classId) => {
          const classData = classes.find((c) => c.id === classId);
          return gradeAPI.getMonthlyReport({
            scope,
            classId,
            grade: classData?.grade,
            month: selectedMonthLabel,
            monthNumber: selectedMonthNumber,
            year: Number.isFinite(academicStartYear) ? academicStartYear : undefined,
            academicYearId: selectedYear,
            format: reportFormat,
            template: templateQuery,
            options: { forceFresh },
          });
        });
        const results = await Promise.all(promises);
        setReports(results.filter(Boolean));
      } else {
        const data = await gradeAPI.getMonthlyReport({
          scope,
          classId: undefined,
          grade: selectedGrade,
          month: selectedMonthLabel,
          monthNumber: selectedMonthNumber,
          year: Number.isFinite(academicStartYear) ? academicStartYear : undefined,
          academicYearId: selectedYear,
          format: reportFormat,
          template: templateQuery,
          options: { forceFresh },
        });
        setReports(data ? [data] : []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  };

  const updateSetting = <K extends keyof typeof DEFAULT_SETTINGS>(key: K, value: (typeof DEFAULT_SETTINGS)[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const toggleSubject = (subjectName: string) => {
    setHiddenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectName)) next.delete(subjectName);
      else next.add(subjectName);
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
      } else if (key === 'p' && reports.length > 0) {
        event.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate, loadingReport, reports]);

  if (loading) {
    return <PageSkeleton user={user} school={school} type="form" showFilters={false} />;
  }

  const semesterMonthLabels = ['វិច្ឆិកា', 'ធ្នូ', 'មករា', 'កុម្ភៈ'];

  const metricCards = [
    {
      label: t('students'),
      value: reports[0]?.statistics.totalStudents ?? '—',
      note: reports.length > 0 ? t('metricFemale', { count: reports[0].statistics.femaleStudents }) : t('metricGenerate'),
      Icon: Users,
      accent: 'border-blue-100 bg-blue-50/70 text-blue-700',
      iconTone: 'bg-blue-100 text-blue-700',
    },
    {
      label: t('passed'),
      value: reports[0]?.statistics.passedStudents ?? '—',
      note: reports.length > 0 ? `${t('failed')}: ${reports[0].statistics.failedStudents}` : t('metricPassNote'),
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
    monthly: t('formatMonthly'),
    semester: t('formatSemester'),
  } as const;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)]">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <AnimatedContent>
            {/* Hero / Configuration */}
            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
              <div>
                {/* Left: configuration */}
                <div className="p-5 sm:p-7">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 leading-none">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                          {t('eyebrow')}
                        </h1>
                      </div>
                    </div>

                    {/* Compact Horizontal Statistics Row */}
                    <div className="grid grid-cols-3 gap-3 w-full lg:w-[480px]">
                      {metricCards.map((card) => {
                        const Icon = card.Icon;
                        return (
                          <div
                            key={card.label}
                            className={`flex items-center gap-2.5 rounded-xl border p-2 ${card.accent}`}
                          >
                            <span className={`rounded-lg p-1.5 ${card.iconTone} shrink-0`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500/80 truncate">
                                {card.label}
                              </span>
                              <span className="block text-sm font-extrabold text-slate-900 leading-tight">
                                {card.value}
                              </span>
                              <span className="block text-[9px] text-slate-500 truncate leading-none mt-0.5">
                                {card.note}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Premium Enterprise-Grade Tab Switcher */}
                  <div className="flex border-b border-slate-100 -mx-5 px-5 sm:-mx-7 sm:px-7 mt-2 mb-6 print:hidden overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setActiveTab('monthly')}
                      className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition duration-150 focus:outline-none whitespace-nowrap ${
                        activeTab === 'monthly'
                          ? 'text-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>{t('formatMonthly')} (របាយការណ៍ប្រចាំខែ)</span>
                      {activeTab === 'monthly' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('transcript')}
                      className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition duration-150 focus:outline-none whitespace-nowrap ${
                        activeTab === 'transcript'
                          ? 'text-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>Transcript (ព្រឹត្តិបត្រពិន្ទុ)</span>
                      {activeTab === 'transcript' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('certificate')}
                      className={`relative flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition duration-150 focus:outline-none whitespace-nowrap ${
                        activeTab === 'certificate'
                          ? 'text-blue-600'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Award className="h-4 w-4" />
                      <span>Certificate (វិញ្ញាបនបត្រ)</span>
                      {activeTab === 'certificate' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-full" />
                      )}
                    </button>
                  </div>

                  {/* Output options */}
                  {activeTab === 'monthly' && (
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
                          {(['monthly', 'semester'] as const).map((fmt, idx) => (
                            <button
                              key={fmt}
                              type="button"
                              role="tab"
                              aria-pressed={reportType === fmt}
                              onClick={() => setReportType(fmt)}
                              className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                                idx > 0 ? 'border-l border-slate-200' : ''
                              } ${
                                reportType === fmt
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
                  )}

                  {/* Filters and Actions */}
                  {activeTab !== 'certificate' ? (
                    <>
                      {/* Filters */}
                      <div className={`mt-6 grid gap-4 ${scope === 'class' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
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

                        {scope === 'grade' && (
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

                        {reportType === 'monthly' ? (
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
                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('formatSemester')}
                            </span>
                            <select
                              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              value={selectedSemester}
                              onChange={(event) => setSelectedSemester(Number(event.target.value) as 1 | 2)}
                            >
                              <option value={1}>{t('formatSemester1')}</option>
                              <option value={2}>{t('formatSemester2')}</option>
                            </select>
                          </label>
                        )}
                      </div>

                      {scope === 'class' && (
                        <div className="mt-5 block">
                          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {t('class')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedClasses.length === classes.length) {
                                  setSelectedClasses([]);
                                } else {
                                  setSelectedClasses(classes.map(c => c.id));
                                }
                              }}
                              className="text-xs font-medium text-blue-600 transition hover:text-blue-700 active:scale-95"
                            >
                              {selectedClasses.length === classes.length ? t('deselectAll', { fallback: 'Deselect All' }) : t('selectAll', { fallback: 'Select All' })}
                            </button>
                          </div>
                          {groupedClasses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                              <Inbox className="h-8 w-8 stroke-1" />
                              <span className="mt-2 text-xs font-medium">{t('noClassesFound') || 'No classes found for this year'}</span>
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {groupedClasses.map(({ grade, classItems }) => {
                                const gradeClassIds = classItems.map(c => c.id);
                                const allSelected = gradeClassIds.every(id => selectedClasses.includes(id));

                                return (
                                  <div key={grade} className="flex items-start gap-4 py-3.5 first:pt-1 last:pb-1">
                                    {/* Aligned Left Grade Indicator */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (allSelected) {
                                          setSelectedClasses(prev => prev.filter(id => !gradeClassIds.includes(id)));
                                        } else {
                                          setSelectedClasses(prev => {
                                            const filtered = prev.filter(id => !gradeClassIds.includes(id));
                                            return [...filtered, ...gradeClassIds];
                                          });
                                        }
                                      }}
                                      className="w-20 shrink-0 text-left transition hover:opacity-80 active:scale-95"
                                    >
                                      <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold transition duration-150 ${
                                        allSelected
                                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200/50'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        ថ្នាក់ទី {grade}
                                      </span>
                                    </button>
      
                                    {/* Wrapping Class Chips on the Right */}
                                    <div className="flex flex-wrap gap-2">
                                      {classItems.map((classItem) => {
                                        const isSelected = selectedClasses.includes(classItem.id);
                                        return (
                                          <button
                                            key={classItem.id}
                                            type="button"
                                            onClick={() => {
                                              if (isSelected) {
                                                setSelectedClasses(selectedClasses.filter(id => id !== classItem.id));
                                              } else {
                                                setSelectedClasses([...selectedClasses, classItem.id]);
                                              }
                                            }}
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 duration-100 ${
                                              isSelected 
                                                ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-200/50 hover:from-blue-700 hover:to-indigo-700' 
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                          >
                                            <span>{classItem.name}</span>
                                            <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                              ({classItem._count?.students || 0})
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

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
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-indigo-200/50 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100"
                        >
                          {loadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                          {t('generate')}
                          <kbd className="ml-1.5 hidden rounded border border-white/20 bg-white/10 px-1 text-[9px] text-white/80 sm:inline">⌘G</kbd>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerate(true)}
                          disabled={!canGenerate || loadingReport}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100 shadow-sm"
                        >
                          <RefreshCw className="h-4 w-4" />
                          {t('refresh')}
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          disabled={reports.length === 0}
                          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100 shadow-sm"
                        >
                          <Printer className="h-4 w-4" />
                          {t('print')}
                          <kbd className="ml-1.5 hidden rounded border border-violet-200 bg-violet-100/50 px-1 text-[9px] text-violet-600 sm:inline">⌘P</kbd>
                        </button>
                        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                          {loadingReport ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {t('loading')}
                            </span>
                          ) : reports.length > 0 ? (
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {reports[0].students.length} {t('students').toLowerCase()}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              {t('metricReady')}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-blue-50 bg-slate-50/20 p-8 text-center shadow-sm">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 text-white shadow-md shadow-amber-200/50">
                        <Award className="h-8 w-8 animate-bounce" />
                      </div>
                      <h2 className="mt-5 text-xl font-extrabold text-slate-900 tracking-tight">
                        Official Certificate Designer
                      </h2>
                      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                        Design, customize, and issue elegant MoEYS certificates, outstanding academic achievement awards, and graduation recognitions.
                      </p>
                      
                      {/* Premium Animated Coming Soon Badge */}
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1 text-xs font-bold text-amber-800 shadow-sm animate-pulse">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span>FEATURE LAUNCHING SOON · វគ្គបន្ទាប់</span>
                      </div>

                      {/* Grid of Mock Templates */}
                      <div className="mt-8 grid gap-4 sm:grid-cols-3">
                        {[
                          { title: 'សញ្ញាបត្របញ្ចប់ការសិក្សា', type: 'Graduation Certificate', desc: 'Official MoEYS layout with golden seals.' },
                          { title: 'លិខិតសរសើរ សិស្សពូកែ', type: 'Honor Roll Award', desc: 'Outstanding academic excellence recognition.' },
                          { title: 'វិញ្ញាបនបត្របញ្ជាក់ការសិក្សា', type: 'Completion Certificate', desc: 'General study completion letter template.' }
                        ].map((tmpl, idx) => (
                          <div key={idx} className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50">
                            <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-50/20 group-hover:bg-blue-50 transition duration-300" />
                            <Award className="h-5 w-5 text-slate-400 group-hover:text-amber-500 transition duration-300 relative z-10" />
                            <h4 className="mt-3 text-sm font-bold text-slate-900 relative z-10">{tmpl.title}</h4>
                            <span className="block text-[10px] font-semibold text-blue-600 relative z-10 mt-0.5">{tmpl.type}</span>
                            <p className="mt-2 text-xs text-slate-500 relative z-10 leading-relaxed">{tmpl.desc}</p>
                            <button type="button" disabled className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-center text-xs font-bold text-slate-400 cursor-not-allowed group-hover:bg-blue-600 group-hover:text-white transition duration-300">
                              Preview Layout
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-indigo-200/50 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100"
                    >
                      {loadingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {t('generate')}
                      <kbd className="ml-1.5 hidden rounded border border-white/20 bg-white/10 px-1 text-[9px] text-white/80 sm:inline">⌘G</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerate(true)}
                      disabled={!canGenerate || loadingReport}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100 shadow-sm"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t('refresh')}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      disabled={reports.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-100 hover:border-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 duration-100 shadow-sm"
                    >
                      <Printer className="h-4 w-4" />
                      {t('print')}
                      <kbd className="ml-1.5 hidden rounded border border-violet-200 bg-violet-100/50 px-1 text-[9px] text-violet-600 sm:inline">⌘P</kbd>
                    </button>
                    <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                      {loadingReport ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t('loading')}
                        </span>
                      ) : reports.length > 0 ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {reports[0].students.length} {t('students').toLowerCase()}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          {t('metricReady')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Subject columns */}
            {reports.length > 0 && sortedSubjects.length > 0 && (
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
                      onClick={() => setHiddenSubjects(new Set(sortedSubjects.map((s) => s.nameKh || s.name)))}
                    >
                      {t('hideAllSubjects')}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                  {sortedSubjects.map((subject) => {
                    const subjectName = subject.nameKh || subject.name;
                    const hidden = hiddenSubjects.has(subjectName);
                    return (
                      <button
                        key={subjectName}
                        type="button"
                        onClick={() => toggleSubject(subjectName)}
                        aria-pressed={!hidden}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                          hidden
                            ? 'border-slate-200 bg-white text-slate-500 line-through'
                            : 'border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50'
                        }`}
                      >
                        {subjectName}
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
                {/* Institution & Signatures */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-md bg-blue-100 p-1 text-blue-700">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-800">Institution & Signatures</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Province (ខេត្ត)
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. ព្រះសីហនុ"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={settings.province || ''}
                        onChange={(event) => updateSetting('province', event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        School / Institution
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. អនុវិទ្យាល័យ ទំនប់រលក"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={settings.examCenter || ''}
                        onChange={(event) => updateSetting('examCenter', event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Report Date (កាលបរិច្ឆេទ)
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. ថ្ងៃសុក្រ ៤ កើត ខែជេស្ឋ..."
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={settings.reportDate || ''}
                        onChange={(event) => updateSetting('reportDate', event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Principal Name (នាយក)
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. សុខ វ៉ាន់"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={settings.principalName || ''}
                        onChange={(event) => updateSetting('principalName', event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Teacher Name (គ្រូ)
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. កែម មុន្នីកាល"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={settings.teacherName || ''}
                        onChange={(event) => updateSetting('teacherName', event.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {/* Layout & columns (Monthly tab) */}
                {activeTab === 'monthly' && (
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
                )}

                {/* Font size settings for individual transcripts */}
                {activeTab === 'transcript' && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-md bg-violet-100 p-1 text-violet-700">
                        <Layout className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="text-sm font-semibold text-slate-800">Transcript Scaling</h3>
                    </div>
                    <label className="block max-w-[200px]">
                      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>{t('tableFontSize')}</span>
                        <span className="font-normal normal-case text-slate-400">px</span>
                      </span>
                      <input
                        type="number"
                        min={7}
                        max={16}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={settings.tableFontSize || 10}
                        onChange={(event) =>
                          updateSetting('tableFontSize', Number(event.target.value))
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            </section>

            {/* Preview Section - Using the actual print layout as preview */}
            <div className="mt-8 pb-20">
              {loadingReport && (
                <div className="mx-auto max-w-[210mm] animate-pulse rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
                  <div className="mb-8 flex justify-between">
                    <div className="h-20 w-20 rounded bg-slate-100" />
                    <div className="space-y-3">
                      <div className="h-4 w-40 rounded bg-slate-100" />
                      <div className="h-4 w-32 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} className="h-8 w-full rounded bg-slate-50" />
                    ))}
                  </div>
                </div>
              )}

              {reports.length === 0 && !loadingReport && (
                <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 shadow-sm">
                    <FileText className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{t('generateTitle') || 'Ready to generate report'}</h3>
                  <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
                    {t('generateDesc') || 'Select your filters above and click generate to view the official print-ready report.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerate(false)}
                    disabled={!canGenerate}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('generate')}
                  </button>
                </div>
              )}

              {reports.length > 0 && !loadingReport && (
                <div className="khmer-report-preview-container mx-auto">
                  {reports.map((rep, idx) => {
                    const repVisibleSubjects = rep.subjects?.filter(
                      (s) => !hiddenSubjects.has(s.nameKh || s.name)
                    );
                    return (
                      <div 
                        key={rep.class?.id || idx} 
                        style={{ pageBreakAfter: idx < reports.length - 1 ? 'always' : 'auto' }}
                      >
                        <MonthlyReportPrint 
                          report={rep} 
                          settings={settings} 
                          subjects={repVisibleSubjects}
                          schoolProfile={schoolProfile}
                          activeTab={activeTab}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
              disabled={reports.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Print (⌘P)"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}


      <style>{`
        @media print {
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          
          /* Hide all UI elements */
          nav, aside, .UnifiedNavigation, .PageSkeleton, .print\\:hidden { 
            display: none !important; 
          }
          
          /* Reset layout wrappers */
          .lg\\:ml-64 { margin-left: 0 !important; width: 100% !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }

          /* Hide UI-only sections like settings and hero */
          section, .mx-auto.max-w-2xl {
            display: none !important;
          }

          /* Specifically show the preview container even if inside hidden parents (overriding display: none on parents is hard, so we ensure the path is clear) */
          /* But since we only hide 'section' and 'mx-auto.max-w-2xl', and the report is in a plain 'div', it should stay visible. */
          
          .khmer-report-preview-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
