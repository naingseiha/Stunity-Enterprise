'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  FileDown,
  Hash,
  ImageIcon,
  Loader2,
  School,
  ScrollText,
  ShieldAlert,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import BlurLoader from '@/components/BlurLoader';
import CleanReportsDashboard from '@/components/reports/dashboard/CleanReportsDashboard';
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
  const [period, setPeriod] = useState<ReportPeriodType>('month');
  const [monthNumber, setMonthNumber] = useState<number>(getDefaultReportingMonth);
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [classFilter, setClassFilter] = useState('');
  const [data, setData] = useState<SchoolReportsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
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

  const academicStartYear = useMemo(() => {
    const parsed = activeYear?.name ? Number.parseInt(activeYear.name.split('-')[0], 10) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }, [activeYear?.name]);

  const scopeClassName = useMemo(
    () => (classFilter ? classes.find((item) => item.id === classFilter)?.name || '' : ''),
    [classFilter, classes],
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
    if (period === 'month') {
      const selectedMonth = KHMER_MONTHS.find((item) => item.number === monthNumber);
      return `របាយការណ៍ប្រចាំខែ៖ ${selectedMonth?.label || ''}`;
    }
    if (period === 'semester') return `របាយការណ៍ប្រចាំឆមាសទី${semester === '1' ? '១' : '២'}`;
    return 'របាយការណ៍ប្រចាំឆ្នាំ';
  }, [monthNumber, period, semester]);

  const periodDisplayLabel = useMemo(() => {
    if (locale === 'km') return formattedPeriodSubtitle;
    if (period === 'month') {
      const monthName = new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(2026, monthNumber - 1, 1));
      return `${t('periodMonth')}: ${monthName}`;
    }
    if (period === 'semester') return semester === '1' ? t('semester1') : t('semester2');
    return t('periodYear');
  }, [formattedPeriodSubtitle, locale, monthNumber, period, semester, t]);

  const generatedAtLabel = useMemo(() => {
    if (!data?.generatedAt) return '';
    const generatedAt = new Date(data.generatedAt);
    if (locale === 'km') return formatKhmerDate(generatedAt);
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(generatedAt);
  }, [data?.generatedAt, locale]);

  useEffect(() => {
    if (!schoolId || !activeYear?.id || !isClient || !user || !hasAccess) {
      if (user && !hasAccess) setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    const calendarYear = monthNumber >= 11 ? academicStartYear : academicStartYear + 1;

    getSchoolReportsDashboard({
      schoolId,
      yearId: activeYear.id,
      period,
      semester,
      monthNumber: period === 'month' ? monthNumber : undefined,
      year: period === 'month' ? calendarYear : undefined,
      classId: classFilter || undefined,
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
  }, [activeYear?.id, academicStartYear, classFilter, hasAccess, isClient, monthNumber, period, schoolId, semester, user]);

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
    <div className="min-h-screen bg-gray-50 transition-colors duration-500 dark:bg-gray-950">
      <UnifiedNavigation user={user} school={school} />
      <div className="relative min-h-screen overflow-hidden lg:ml-64">
        <div className="pointer-events-none absolute left-[-8%] top-[-6%] h-[34rem] w-[34rem] rounded-full bg-blue-500/[0.06] blur-[110px] dark:bg-blue-600/[0.07]" />
        <div className="pointer-events-none absolute right-[-8%] top-[28rem] h-[30rem] w-[30rem] rounded-full bg-purple-500/[0.06] blur-[110px] dark:bg-purple-600/[0.07]" />
        <main className="relative z-10 mx-auto max-w-[1440px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
          {!user ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : !hasAccess ? (
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">{t('accessDenied')}</h1>
            </section>
          ) : (
            <>
              <section className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white/90 px-5 py-5 shadow-[0_8px_32px_-14px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/90 dark:shadow-black/30 sm:px-6 sm:py-6">
                <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.11),transparent_58%),linear-gradient(120deg,transparent,rgba(139,92,246,0.04))] lg:block" />

                <div className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <BarChart3 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          <School className="h-3.5 w-3.5" />
                          {school?.name || (locale === 'km' ? 'សាលារៀន' : 'School')}
                        </span>
                        {activeYear?.name && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {activeYear.name}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                          {periodDisplayLabel}
                        </span>
                      </div>
                      <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl dark:text-white">{t('title')}</h1>
                      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm dark:text-slate-400">{t('description')}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-[3.4rem] xl:pl-0">
                    <button
                      type="button"
                      onClick={() => handleExport('jpg')}
                      disabled={!data || exporting !== null}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {exporting === 'jpg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      {t('exportJpg')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('pdf')}
                      disabled={!data || exporting !== null}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      {t('exportPdf')}
                    </button>
                  </div>
                </div>

                <div className="relative mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
                        <CalendarDays className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{t('filterTitle')}</p>
                        <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">{t('filterDescription')}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                        {(['month', 'semester', 'year'] as ReportPeriodType[]).map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPeriod(item)}
                            aria-pressed={period === item}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${period === item ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-700 dark:text-blue-300' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                          >
                            {item === 'month' ? t('periodMonth') : item === 'semester' ? t('periodSemester') : t('periodYear')}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {period === 'month' && (
                          <label className="relative">
                            <span className="sr-only">{locale === 'km' ? 'ជ្រើសរើសខែ' : 'Select month'}</span>
                            <select value={monthNumber} onChange={(event) => setMonthNumber(Number(event.target.value))} className="h-9 appearance-none rounded-lg border border-slate-200 bg-white py-0 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              {KHMER_MONTHS.map((month) => <option key={month.number} value={month.number}>{getKhmerMonthDisplayName(month.number, month.label)}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                          </label>
                        )}
                        {period === 'semester' && (
                          <select value={semester} onChange={(event) => setSemester(event.target.value as '1' | '2')} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            <option value="1">{t('semester1')}</option>
                            <option value="2">{t('semester2')}</option>
                          </select>
                        )}
                        {canDrillDownByClass && (
                          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="h-9 max-w-44 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            <option value="">{t('classFilterAll')}</option>
                            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={() => router.push(`/${locale}/students`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                          <ScrollText className="h-3.5 w-3.5" />
                          <span>{t('transcripts')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <BlurLoader isLoading={loading} showSpinner={false}>
                {error ? (
                  <section className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</section>
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
                    <CleanReportsDashboard
                      data={data}
                      locale={locale}
                      schoolName={school?.name || displaySchoolNameKhmer}
                      className={scopeClassName}
                      generatedAtLabel={generatedAtLabel}
                      onSelectClass={setClassFilter}
                      onSelectStudent={(studentId) => router.push(`/${locale}/students/${studentId}`)}
                    />
                  </div>
                ) : (
                  <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    {locale === 'km' ? 'មិនទាន់មានទិន្នន័យសម្រាប់រយៈពេលនេះទេ។' : 'No data is available for this period.'}
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
