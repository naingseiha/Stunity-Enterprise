'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileDown,
  Filter,
  Hash,
  Home,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Play,
  RotateCcw,
  School,
  ScrollText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import CleanReportsDashboard from '@/components/reports/dashboard/CleanReportsDashboard';
import PortraitInfographicSheet from '@/components/reports/dashboard/PortraitInfographicSheet';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { schoolAPI } from '@/lib/api/school';
import { getSchoolReportsDashboard, type ReportPeriodType, type SchoolReportsDashboardResponse } from '@/lib/api/reports';
import { canViewReportsDashboard, isSchoolWideReportsRole } from '@/lib/permissions/reports';
import { KHMER_MONTHS, getKhmerMonthDisplayName } from '@/lib/reports/templates/khm-moeys/months';
import { formatKhmerDate, toKhmerDigits } from '@/lib/reports/templates/khm-moeys/khmer-date';
import {
  captureDashboardImage,
  downloadDashboardJpg,
  downloadDashboardPdf,
  safeDashboardFileName,
} from '@/lib/export/dashboardExport';

function getDefaultReportingMonth(): number {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const availableMonths = new Set<number>(KHMER_MONTHS.map((month) => month.number));
  if (availableMonths.has(previousMonth)) return previousMonth;
  if (availableMonths.has(currentMonth)) return currentMonth;
  return KHMER_MONTHS.at(-1)?.number ?? currentMonth;
}

export default function ReportsDashboardPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = use(props.params);
  const router = useRouter();
  const t = useTranslations('reportsDashboard');
  const { schoolId, currentYear, selectedYear } = useAcademicYear();
  const activeYear = selectedYear ?? currentYear;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  // Pending filter states (controlled by UI dropdowns before clicking "Generate Report")
  const [pendingPeriod, setPendingPeriod] = useState<ReportPeriodType>('month');
  const [pendingMonthNumber, setPendingMonthNumber] = useState<number>(getDefaultReportingMonth);
  const [pendingSemester, setPendingSemester] = useState<'1' | '2'>('1');
  const [pendingGradeFilter, setPendingGradeFilter] = useState('');
  const [pendingClassFilter, setPendingClassFilter] = useState('');

  // Applied filter states (starts as NULL so NO API call happens on initial load)
  const [appliedFilters, setAppliedFilters] = useState<{
    period: ReportPeriodType;
    monthNumber: number;
    semester: '1' | '2';
    gradeFilter: string;
    classFilter: string;
  } | null>(null);

  const [viewMode, setViewMode] = useState<'infographic' | 'dashboard'>('dashboard');
  const [data, setData] = useState<SchoolReportsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'jpg' | 'pdf' | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    if (userData.school?.id) {
      schoolAPI.getProfile(userData.school.id)
        .then((profile) => {
          if (profile) setSchool((previous: any) => ({ ...previous, ...profile }));
        })
        .catch(() => {});
    }
  }, [locale, router]);

  const hasAccess = canViewReportsDashboard(user?.role);
  const canDrillDownByClass = isSchoolWideReportsRole(user?.role);
  const { classes } = useClasses({ academicYearId: activeYear?.id || undefined, limit: 200 });

  const filteredClasses = useMemo(() => {
    if (!pendingGradeFilter) return classes;
    return classes.filter((item) => String(item.grade) === pendingGradeFilter);
  }, [classes, pendingGradeFilter]);

  const handlePendingGradeChange = (newGrade: string) => {
    setPendingGradeFilter(newGrade);
    setPendingClassFilter('');
  };

  const academicStartYear = useMemo(() => {
    const parsed = activeYear?.name ? Number.parseInt(activeYear.name.split('-')[0], 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }, [activeYear?.name]);

  // Check if pending filters differ from currently loaded applied filters
  const isFilterDirty = useMemo(() => {
    if (!appliedFilters) return true;
    return (
      pendingPeriod !== appliedFilters.period ||
      pendingMonthNumber !== appliedFilters.monthNumber ||
      pendingSemester !== appliedFilters.semester ||
      pendingGradeFilter !== appliedFilters.gradeFilter ||
      pendingClassFilter !== appliedFilters.classFilter
    );
  }, [appliedFilters, pendingPeriod, pendingMonthNumber, pendingSemester, pendingGradeFilter, pendingClassFilter]);

  // API Fetch trigger - ONLY runs when appliedFilters is set by clicking "Generate Report"
  useEffect(() => {
    if (!schoolId || !activeYear?.id || !isClient || !user || !hasAccess || !appliedFilters) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const calendarYear = appliedFilters.monthNumber >= 11 ? academicStartYear : academicStartYear + 1;

    getSchoolReportsDashboard({
      schoolId,
      yearId: activeYear.id,
      period: appliedFilters.period,
      semester: appliedFilters.semester,
      monthNumber: appliedFilters.period === 'month' ? appliedFilters.monthNumber : undefined,
      year: appliedFilters.period === 'month' ? calendarYear : undefined,
      grade: appliedFilters.gradeFilter ? Number(appliedFilters.gradeFilter) : undefined,
      classId: appliedFilters.classFilter || undefined,
    })
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || 'Failed to load');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [academicStartYear, activeYear?.id, appliedFilters, hasAccess, isClient, schoolId, user]);

  const handleGenerateReport = () => {
    setAppliedFilters({
      period: pendingPeriod,
      monthNumber: pendingMonthNumber,
      semester: pendingSemester,
      gradeFilter: pendingGradeFilter,
      classFilter: pendingClassFilter,
    });
  };

  const handleResetFilters = () => {
    const defaultMonth = getDefaultReportingMonth();
    setPendingPeriod('month');
    setPendingMonthNumber(defaultMonth);
    setPendingSemester('1');
    setPendingGradeFilter('');
    setPendingClassFilter('');
  };

  const scopeClassName = useMemo(
    () => (appliedFilters?.classFilter ? classes.find((item) => item.id === appliedFilters.classFilter)?.name || '' : ''),
    [appliedFilters?.classFilter, classes],
  );

  const displaySchoolNameKhmer = useMemo(() => {
    if (school?.nameKh) return school.nameKh;
    if (school?.nameKhmer) return school.nameKhmer;
    if (school?.khmerName) return school.khmerName;
    if (school?.name_km) return school.name_km;
    if (school?.name) {
      if (school.name.includes('Svaythom') || school.name.includes('ស្វាយធំ')) return 'វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ';
      if (school.name.startsWith('វិទ្យាល័យ') || school.name.startsWith('សាលា')) return school.name;
      return `វិទ្យាល័យ ${school.name}`;
    }
    return 'សាលារៀន';
  }, [school]);

  const formattedPeriodSubtitle = useMemo(() => {
    const p = appliedFilters?.period || pendingPeriod;
    const m = appliedFilters?.monthNumber || pendingMonthNumber;
    const s = appliedFilters?.semester || pendingSemester;

    if (p === 'month') {
      const selectedMonth = KHMER_MONTHS.find((item) => item.number === m);
      return `របាយការណ៍ប្រចាំខែ៖ ${selectedMonth?.label || ''}`;
    }
    if (p === 'semester') return `របាយការណ៍ប្រចាំឆមាសទី${s === '1' ? '១' : '២'}`;
    return 'របាយការណ៍ប្រចាំឆ្នាំ';
  }, [appliedFilters, pendingMonthNumber, pendingPeriod, pendingSemester]);

  const periodDisplayLabel = useMemo(() => {
    const p = appliedFilters?.period || pendingPeriod;
    const m = appliedFilters?.monthNumber || pendingMonthNumber;
    const s = appliedFilters?.semester || pendingSemester;

    if (locale === 'km') return formattedPeriodSubtitle;
    if (p === 'month') {
      const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2026, m - 1, 1));
      return `${t('periodMonth')}: ${monthName}`;
    }
    if (p === 'semester') return s === '1' ? t('semester1') : t('semester2');
    return t('periodYear');
  }, [appliedFilters, formattedPeriodSubtitle, locale, pendingMonthNumber, pendingPeriod, pendingSemester, t]);

  const generatedAtLabel = useMemo(() => {
    if (!data?.generatedAt) return '';
    const generatedAt = new Date(data.generatedAt);
    if (locale === 'km') return formatKhmerDate(generatedAt);
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt);
  }, [data?.generatedAt, locale]);

  const handleExport = async (kind: 'jpg' | 'pdf') => {
    if (!exportRef.current || !data) return;
    setExporting(kind);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const { dataUrl, width, height } = await captureDashboardImage(exportRef.current);
      const fileName = safeDashboardFileName(school?.name || 'stunity', data.period.khmerLabel || data.period.label);
      if (kind === 'jpg') downloadDashboardJpg(dataUrl, fileName);
      else await downloadDashboardPdf(dataUrl, fileName, width, height);
    } catch (exportError) {
      console.error('Failed to export dashboard', exportError);
    } finally {
      setExporting(null);
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-500 dark:bg-gray-950">
      <UnifiedNavigation user={user} school={school} />
      <div className="relative min-h-screen lg:ml-64">
        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          {!user ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !hasAccess ? (
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">{t('accessDenied')}</h1>
            </section>
          ) : (
            <>
              {/* UNIFIED SINGLE HEADER & FILTER CARD (MATCHING STUDENTS PAGE FLAT BORDER STANDARD) */}
              <section className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                
                {/* BREADCRUMB NAV */}
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-gray-500">
                  <Home className="h-3.5 w-3.5" />
                  <span>{locale === 'km' ? 'ទំព័រដើម' : 'Home'}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{locale === 'km' ? 'វិភាគ និងរបាយការណ៍' : 'Analytics & Reports'}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-600 dark:text-gray-300">
                    {locale === 'km' ? 'របាយការណ៍សាលារៀន' : 'School Dashboard'}
                  </span>
                </div>

                {/* MAIN TITLE & EXPORT BUTTONS ROW */}
                <div className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                      <BarChart3 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <School className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          {school?.name || (locale === 'km' ? 'សាលារៀន' : 'School')}
                        </span>
                        {activeYear?.name && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            <CalendarDays className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            {activeYear.name}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700 dark:border-violet-800/40 dark:bg-violet-950/40 dark:text-violet-300">
                          {periodDisplayLabel}
                        </span>
                      </div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[1.7rem]">
                        {t('title')}
                      </h1>
                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm dark:text-gray-400">
                        {t('description')}
                      </p>
                    </div>
                  </div>

                  {/* EXPORT BUTTONS */}
                  <div className="flex shrink-0 items-center gap-2 sm:pl-[3.4rem] xl:pl-0">
                    <button
                      type="button"
                      onClick={() => handleExport('jpg')}
                      disabled={!data || exporting !== null}
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-200 dark:hover:bg-gray-700"
                    >
                      {exporting === 'jpg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4 text-slate-500" />}
                      {t('exportJpg')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('pdf')}
                      disabled={!data || exporting !== null}
                      className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4 text-white" />}
                      {t('exportPdf')}
                    </button>
                  </div>
                </div>

                {/* DIVIDER BETWEEN HEADER & FILTERS */}
                <div className="my-4 border-t border-slate-200 dark:border-gray-800" />

                {/* EMBEDDED FILTER SECTION (WITHIN THE SAME FLAT CARD) */}
                <div>
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                        <Filter className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black text-slate-950 dark:text-white">
                            {locale === 'km' ? 'តម្រងរបាយការណ៍សាលារៀន' : 'School Report Parameters'}
                          </h3>
                          {isFilterDirty && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {locale === 'km' ? 'មិនទាន់បង្កើត' : 'Unapplied Changes'}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
                          {locale === 'km' ? 'សូមជ្រើសរើសលក្ខខណ្ឌ រួចចុចប៊ូតុង "បង្កើតរបាយការណ៍"' : 'Configure parameters below and click Generate Report'}
                        </p>
                      </div>
                    </div>

                    {/* GENERATE & RESET BUTTONS */}
                    <div className="flex items-center gap-2">
                      {isFilterDirty && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>{locale === 'km' ? 'កំណត់ឡើងវិញ' : 'Reset'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="relative inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        )}
                        <span>{locale === 'km' ? 'បង្កើតរបាយការណ៍' : 'Generate Report'}</span>
                        {isFilterDirty && !loading && (
                          <span className="absolute -right-1 -top-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* FLAT BORDER 5-COLUMN FILTER FIELDS GRID */}
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
                    
                    {/* Field 1: Period Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">
                        {locale === 'km' ? '១. ប្រភេទរបាយការណ៍' : '1. Period Type'}
                      </label>
                      <div className="grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                        {(['month', 'semester', 'year'] as ReportPeriodType[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPendingPeriod(item)}
                            className={`rounded-lg py-1.5 text-center text-[11px] font-bold transition-all ${
                              pendingPeriod === item
                                ? 'bg-white text-blue-700 shadow-xs dark:bg-gray-900 dark:text-blue-400'
                                : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                            }`}
                          >
                            {item === 'month' ? (locale === 'km' ? 'ខែ' : 'Month') : item === 'semester' ? (locale === 'km' ? 'ឆមាស' : 'Sem') : (locale === 'km' ? 'ឆ្នាំ' : 'Year')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Field 2: Month / Semester Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">
                        {pendingPeriod === 'month' ? (locale === 'km' ? '២. ជ្រើសរើសខែ' : '2. Select Month') : pendingPeriod === 'semester' ? (locale === 'km' ? '២. ជ្រើសរើសឆមាស' : '2. Select Semester') : (locale === 'km' ? '២. ពេលវេលា' : '2. Timeframe')}
                      </label>
                      {pendingPeriod === 'month' ? (
                        <div className="relative">
                          <select
                            value={pendingMonthNumber}
                            onChange={(event) => setPendingMonthNumber(Number(event.target.value))}
                            className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200"
                          >
                            {KHMER_MONTHS.map((month) => (
                              <option key={month.number} value={month.number}>
                                {getKhmerMonthDisplayName(month.number, month.label)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      ) : pendingPeriod === 'semester' ? (
                        <div className="relative">
                          <select
                            value={pendingSemester}
                            onChange={(event) => setPendingSemester(event.target.value as '1' | '2')}
                            className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200"
                          >
                            <option value="1">{t('semester1')}</option>
                            <option value="2">{t('semester2')}</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      ) : (
                        <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          {locale === 'km' ? 'ពេញមួយឆ្នាំសិក្សា' : 'Full Academic Year'}
                        </div>
                      )}
                    </div>

                    {/* Field 3: Grade Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">
                        {locale === 'km' ? '៣. កម្រិតថ្នាក់' : '3. Grade Level'}
                      </label>
                      {canDrillDownByClass ? (
                        <div className="relative">
                          <select
                            value={pendingGradeFilter}
                            onChange={(event) => handlePendingGradeChange(event.target.value)}
                            className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200"
                          >
                            <option value="">{locale === 'km' ? 'គ្រប់កម្រិត (៧-១២)' : 'All Grades (7-12)'}</option>
                            <option value="7">{locale === 'km' ? 'កម្រិតថ្នាក់ទី ៧' : 'Grade 7'}</option>
                            <option value="8">{locale === 'km' ? 'កម្រិតថ្នាក់ទី ៨' : 'Grade 8'}</option>
                            <option value="9">{locale === 'km' ? 'កម្រិតថ្នាក់ទី ៩' : 'Grade 9'}</option>
                            <option value="10">{locale === 'km' ? 'កម្រិតថ្នាក់ទី ១០' : 'Grade 10'}</option>
                            <option value="11">{locale === 'km' ? 'កម្រិតថ្នាក់ទី ១១' : 'Grade 11'}</option>
                            <option value="12">{locale === 'km' ? 'កម្រិតថ្នាក់ទី ១២' : 'Grade 12'}</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      ) : (
                        <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          {locale === 'km' ? 'គ្រប់កម្រិត' : 'All Grades'}
                        </div>
                      )}
                    </div>

                    {/* Field 4: Class Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">
                        {locale === 'km' ? '៤. ថ្នាក់រៀន' : '4. Specific Class'}
                      </label>
                      {canDrillDownByClass ? (
                        <div className="relative">
                          <select
                            value={pendingClassFilter}
                            onChange={(event) => setPendingClassFilter(event.target.value)}
                            className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200"
                          >
                            <option value="">{locale === 'km' ? 'គ្រប់ថ្នាក់' : 'All Classes'}</option>
                            {filteredClasses.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      ) : (
                        <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                          {locale === 'km' ? 'គ្រប់ថ្នាក់' : 'All Classes'}
                        </div>
                      )}
                    </div>

                    {/* Field 5: View Mode Toggle */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">
                        {locale === 'km' ? '៥. ទម្រង់បង្ហាញ' : '5. Display Mode'}
                      </label>
                      <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-gray-700 dark:bg-gray-800">
                        <button
                          type="button"
                          onClick={() => setViewMode('infographic')}
                          aria-pressed={viewMode === 'infographic'}
                          className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                            viewMode === 'infographic'
                              ? 'bg-white text-purple-700 shadow-xs dark:bg-gray-900 dark:text-purple-400'
                              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Poster</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('dashboard')}
                          aria-pressed={viewMode === 'dashboard'}
                          className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                            viewMode === 'dashboard'
                              ? 'bg-white text-blue-700 shadow-xs dark:bg-gray-900 dark:text-blue-400'
                              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span>Grid</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

              </section>

              {/* MAIN CONTENT AREA */}
              <BlurLoader isLoading={loading} showSpinner={false}>
                {error ? (
                  <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    <p className="font-bold">{error}</p>
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {locale === 'km' ? 'ព្យាយាមឡើងវិញ' : 'Try Again'}
                    </button>
                  </section>
                ) : data ? (
                  <div ref={exportRef} className="space-y-5">
                    {exporting && (
                      <header className="rounded-2xl border-2 border-amber-300 bg-white px-8 py-7 text-slate-950">
                        <div className="flex items-start justify-between gap-8 border-b border-slate-200 pb-5">
                          <div className="space-y-1 text-sm font-bold text-blue-950">
                            <p>{school?.officeName || 'ក្រសួងអប់រំ យុវជន និងកីឡា'}</p>
                            <p>{school?.province ? `ខេត្ត៖ ${school.province}` : ''}</p>
                            <p>{displaySchoolNameKhmer}</p>
                          </div>
                          <div className="text-center text-sm font-bold">
                            <p>ព្រះរាជាណាចក្រកម្ពុជា</p>
                            <p className="mt-1">ជាតិ សាសនា ព្រះមហាក្សត្រ</p>
                          </div>
                        </div>
                        <div className="py-5 text-center">
                          <h2 className="text-2xl font-black">របាយការណ៍ស្ថានភាពសាលារៀន</h2>
                          <p className="mt-2 text-sm font-semibold text-slate-600">ឆ្នាំសិក្សា៖ {toKhmerDigits(activeYear?.name || '')} · {formattedPeriodSubtitle}{scopeClassName ? ` · ថ្នាក់ ${scopeClassName}` : ''}</p>
                        </div>
                        <div className="flex justify-center gap-3 text-[10px] font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5"><Hash className="h-3 w-3" />{data.period.label}-{schoolId?.slice(-6).toUpperCase()}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5"><CalendarDays className="h-3 w-3" />{formatKhmerDate(new Date())}</span>
                        </div>
                      </header>
                    )}

                    {viewMode === 'infographic' ? (
                      <PortraitInfographicSheet
                        data={data}
                        locale={locale}
                        schoolName={school?.name || displaySchoolNameKhmer}
                        className={scopeClassName}
                        gradeFilter={appliedFilters?.gradeFilter}
                        generatedAtLabel={generatedAtLabel}
                        onSelectClass={(clsId) => {
                          setPendingClassFilter(clsId);
                          setAppliedFilters((prev) => prev ? { ...prev, classFilter: clsId } : null);
                        }}
                        onSelectStudent={(studentId) => router.push(`/${locale}/students/${studentId}`)}
                      />
                    ) : (
                      <CleanReportsDashboard
                        data={data}
                        locale={locale}
                        schoolName={school?.name || displaySchoolNameKhmer}
                        className={scopeClassName}
                        generatedAtLabel={generatedAtLabel}
                        onSelectClass={(clsId) => {
                          setPendingClassFilter(clsId);
                          setAppliedFilters((prev) => prev ? { ...prev, classFilter: clsId } : null);
                        }}
                        onSelectStudent={(studentId) => router.push(`/${locale}/students/${studentId}`)}
                      />
                    )}
                  </div>
                ) : (
                  /* INITIAL BLANK STATE HERO CARD (MATCHING STUDENTS PAGE FLAT BORDER STANDARD) */
                  <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900 sm:p-14">
                    <div className="relative mx-auto max-w-md">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-md">
                        <Sparkles className="h-8 w-8 text-amber-400" />
                      </div>
                      <h3 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                        {locale === 'km' ? 'សូមជ្រើសរើសតម្រងដើម្បីបង្កើតរបាយការណ៍' : 'Configure Parameters & Generate Report'}
                      </h3>
                      <p className="mt-2 text-xs leading-5 font-medium text-slate-500 dark:text-gray-400">
                        {locale === 'km'
                          ? 'សូមជ្រើសរើសរយៈពេល (ប្រចាំខែ/ឆមាស/ឆ្នាំ) កម្រិតថ្នាក់ (៧-១២) ឬ ថ្នាក់រៀនជាក់លាក់ក្នុងប្រអប់ខាងលើ រួចចុចប៊ូតុង "បង្កើតរបាយការណ៍"'
                          : 'Select period, grade level, or class in the filter card above and click Generate Report to fetch insights.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateReport}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        <Play className="h-3.5 w-3.5 fill-white text-white" />
                        <span>{locale === 'km' ? 'បង្កើតរបាយការណ៍ឥឡូវនេះ' : 'Generate Report Now'}</span>
                      </button>
                    </div>
                  </section>
                )}
              </BlurLoader>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
