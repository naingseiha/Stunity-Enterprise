'use client';

import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Users,
  GraduationCap,
  School,
  ImageIcon,
  FileDown,
  TrendingUp,
  Award,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  UserMinus,
  UserCheck,
  FileSpreadsheet,
  CalendarDays,
  Hash,
  ScrollText,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import StatCard from '@/components/dashboard/StatCard';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { schoolAPI } from '@/lib/api/school';
import { getSchoolReportsDashboard, SchoolReportsDashboardResponse, ReportPeriodType } from '@/lib/api/reports';
import { canViewReportsDashboard, isSchoolWideReportsRole } from '@/lib/permissions/reports';
import { KHMER_MONTHS, getKhmerMonthDisplayName } from '@/lib/reports/templates/khm-moeys/months';
import { formatKhmerDate, toKhmerNumeral, toKhmerDigits } from '@/lib/reports/templates/khm-moeys/khmer-date';
import {
  captureDashboardImage,
  downloadDashboardJpg,
  downloadDashboardPdf,
  safeDashboardFileName,
} from '@/lib/export/dashboardExport';

// dataviz skill reference palette
const SEQUENTIAL_BLUE = '#2a78d6';
const STATUS_GOOD = '#0ca30c';
const STATUS_CRITICAL = '#d03b3b';
const GENDER_COLORS = ['#2a78d6', '#eb6834'];
const GRADE_LETTER_COLORS: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', string> = {
  A: '#15803d',
  B: '#65a30d',
  C: '#ca8a04',
  D: '#ea580c',
  E: '#dc2626',
  F: '#991b1b',
};

export default function ReportsDashboardPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const t = useTranslations('reportsDashboard');
  const { schoolId, currentYear, selectedYear } = useAcademicYear();
  const activeYear = selectedYear ?? currentYear;

  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  const [period, setPeriod] = useState<ReportPeriodType>('month');
  const [monthNumber, setMonthNumber] = useState<number>(new Date().getMonth() + 1);
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const [classFilter, setClassFilter] = useState<string>('');

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
    const userSchool = userData.school;
    setSchool(userSchool);

    if (userSchool?.id) {
      schoolAPI.getProfile(userSchool.id).then((profile) => {
        if (profile) {
          setSchool((prev: any) => ({ ...prev, ...profile }));
        }
      }).catch(() => {});
    }
  }, [locale, router]);

  const hasAccess = canViewReportsDashboard(user?.role);
  const canDrillDownByClass = isSchoolWideReportsRole(user?.role);

  const { classes } = useClasses({ academicYearId: activeYear?.id || undefined, limit: 200 });

  const academicStartYear = useMemo(() => {
    const parsed = activeYear?.name ? parseInt(activeYear.name.split('-')[0], 10) : NaN;
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
  }, [activeYear?.name]);

  const displaySchoolNameKhmer = useMemo(() => {
    if (school?.nameKh) return school.nameKh;
    if (school?.nameKhmer) return school.nameKhmer;
    if (school?.khmerName) return school.khmerName;
    if (school?.name_km) return school.name_km;
    if (school?.name) {
      if (school.name.includes('Svaythom') || school.name.includes('ស្វាយធំ')) {
        return 'វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ';
      }
      if (school.name.startsWith('វិទ្យាល័យ') || school.name.startsWith('សាលា')) {
        return school.name;
      }
      return `វិទ្យាល័យ ${school.name}`;
    }
    return 'វិទ្យាល័យ ហ៊ុនសែន ស្វាយធំ';
  }, [school]);

  const displayOfficeName = useMemo(() => {
    if (school?.officeName) return school.officeName;
    return 'ក្រសួងអប់រំ យុវជន និងកីឡា';
  }, [school]);

  const displayProvince = useMemo(() => {
    if (school?.province) {
      if (school.province.startsWith('ខេត្ត') || school.province.startsWith('រាជធានី')) {
        return school.province;
      }
      return `ខេត្ត៖ ${school.province}`;
    }
    return 'ខេត្ត៖ សៀមរាប';
  }, [school]);

  const formattedPeriodSubtitle = useMemo(() => {
    if (period === 'month') {
      const m = KHMER_MONTHS.find((item) => item.number === monthNumber);
      const monthName = m ? m.label : 'កក្កដា';
      return `របាយការណ៍ប្រចាំខែ៖ ${monthName}`;
    }
    if (period === 'semester') {
      const semDigit = semester === '1' ? '១' : '២';
      return `របាយការណ៍ប្រចាំឆមាសទី${semDigit}`;
    }
    return 'របាយការណ៍ប្រចាំឆ្នាំ';
  }, [period, monthNumber, semester]);

  const formattedAcademicYearKhmer = useMemo(() => {
    const yearStr = activeYear?.name || '2025-2026';
    return toKhmerDigits(yearStr);
  }, [activeYear?.name]);

  useEffect(() => {
    if (!schoolId || !activeYear?.id || !isClient) return;
    if (!user) return;
    if (!hasAccess) {
      setLoading(false);
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
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Failed to load');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolId, activeYear?.id, period, semester, monthNumber, classFilter, isClient, hasAccess, user, academicStartYear]);

  const scaleLabel = data
    ? data.scale.system === 'KHM_MOEYS'
      ? t('scaleMoeys')
      : t('scaleGeneric')
    : '';

  const genderPieData = [
    { name: t('genderMale'), value: data?.genderBreakdown.male.count ?? 0 },
    { name: t('genderFemale'), value: data?.genderBreakdown.female.count ?? 0 },
  ];

  const subjectsByPassRate = useMemo(
    () => [...(data?.averageScoreBySubject || [])].sort((a, b) => a.passRatePercent - b.passRatePercent),
    [data?.averageScoreBySubject]
  );

  const gradeDistributionChartData = useMemo(
    () =>
      (data?.averageScoreBySubject || []).map((s) => {
        const total = s.gradeDistribution.reduce((sum, band) => sum + band.total, 0) || 1;
        const row: Record<string, number | string> = { subjectKh: s.subjectKh };
        s.gradeDistribution.forEach((band) => {
          row[band.grade] = Math.round((band.total / total) * 1000) / 10;
        });
        return row;
      }),
    [data?.averageScoreBySubject]
  );

  const scopeClassName = classFilter ? classes.find((c) => c.id === classFilter)?.name || '' : '';

  const showClassRanking = (data?.averageScoreByClass.length || 0) > 1;
  const showTopBottom = Boolean(data?.scope.schoolWide) && (data?.topPerformingClasses.length || 0) > 0;
  const showGradeHonorRoll = !classFilter && (data?.topStudentsByGrade.length || 0) > 0;
  const showClassHonorRoll = Boolean(classFilter) && (data?.topStudentsInClass?.length || 0) > 0;

  // Real MoEYS indicators only — sourced straight from the API response.
  // No estimated/derived ratios: any field with no backing data source is
  // simply not shown, rather than presented as an invented number.
  const moeysMetrics = useMemo(() => {
    const femaleStudents = data?.genderBreakdown.female.count ?? 0;
    const femaleTeachers = data?.overview.femaleTeachers ?? 0;
    const flow = data?.studentFlow ?? {
      repeaters: { total: 0, female: 0 },
      transferIn: { total: 0, female: 0 },
      transferOut: { total: 0, female: 0 },
    };
    return { femaleStudents, femaleTeachers, ...flow };
  }, [data]);

  const handleExport = async (kind: 'jpg' | 'pdf') => {
    if (!exportRef.current || !data) return;
    setExporting(kind);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const { dataUrl, width, height } = await captureDashboardImage(exportRef.current);
      const fileName = safeDashboardFileName(school?.name || 'stunity', data.period.khmerLabel || data.period.label);
      if (kind === 'jpg') {
        downloadDashboardJpg(dataUrl, fileName);
      } else {
        await downloadDashboardPdf(dataUrl, fileName, width, height);
      }
    } catch (err) {
      console.error('Failed to export dashboard', err);
    } finally {
      setExporting(null);
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <UnifiedNavigation user={user} school={school} />

      <div className="lg:ml-64 min-h-screen relative overflow-hidden">
        {/* Animated background blobs for extra depth (matching Main Dashboard) */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-purple-500/5 dark:bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-[45%] right-[-5%] w-[35%] h-[35%] bg-emerald-500/5 dark:bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 relative z-10">
          {!hasAccess ? (
            <AnimatedContent>
              <section className="mt-5 overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-16 text-center shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-rose-50 text-rose-600 shadow-inner">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t('accessDenied')}</h3>
              </section>
            </AnimatedContent>
          ) : (
            <>
              {/* ════ Compact Top Bar (Header + Filters merged) ════ */}
              <AnimatedContent>
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-2xl px-5 py-3.5 shadow-sm border border-slate-200 dark:border-gray-800/50 mb-6 sm:mb-8">
                  {/* Left: title + school */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-950 text-white">
                      <BarChart3 className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950 dark:text-white truncate">{t('title')}</p>
                      <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate">{school?.name || ''}{scopeClassName ? ` · ថ្នាក់ ${scopeClassName}` : ''}</p>
                    </div>
                  </div>

                  {/* Center: Period tabs */}
                  <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-gray-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-gray-700/60">
                    {(['month', 'semester', 'year'] as ReportPeriodType[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`rounded-lg px-4 py-1.5 text-xs font-black transition-all ${
                          period === p
                            ? 'bg-cyan-950 dark:bg-cyan-500 text-white shadow-sm'
                            : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {p === 'month' ? t('periodMonth') : p === 'semester' ? t('periodSemester') : t('periodYear')}
                      </button>
                    ))}
                  </div>

                  {/* Right: dropdowns + export */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => router.push(`/${locale}/students`)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-black text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
                      title={locale === 'km' ? 'ជ្រើសសិស្ស ដើម្បីមើល ឬបោះពុម្ពព្រឹត្តិបត្រពិន្ទុ' : 'Choose a student to view or print a transcript'}
                    >
                      <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
                      {locale === 'km' ? 'ព្រឹត្តិបត្រពិន្ទុសិស្ស' : 'Student transcripts'}
                    </button>
                    {period === 'month' && (
                      <select
                        value={monthNumber}
                        onChange={(e) => setMonthNumber(Number(e.target.value))}
                        className="h-9 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-slate-800 dark:text-gray-200 outline-none focus:border-cyan-400"
                      >
                        {KHMER_MONTHS.map((m) => (
                          <option key={m.number} value={m.number}>{getKhmerMonthDisplayName(m.number, m.label)}</option>
                        ))}
                      </select>
                    )}
                    {period === 'semester' && (
                      <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value as '1' | '2')}
                        className="h-9 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-slate-800 dark:text-gray-200 outline-none focus:border-cyan-400"
                      >
                        <option value="1">{t('semester1')}</option>
                        <option value="2">{t('semester2')}</option>
                      </select>
                    )}
                    {canDrillDownByClass && (
                      <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="h-9 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-xs font-bold text-slate-800 dark:text-gray-200 outline-none focus:border-cyan-400"
                      >
                        <option value="">{t('classFilterAll')}</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => handleExport('jpg')}
                      disabled={!data || exporting !== null}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-950 px-4 py-2 text-xs font-black text-white transition hover:bg-cyan-800 disabled:opacity-50 shadow-sm"
                    >
                      {exporting === 'jpg' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      {t('exportJpg')}
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      disabled={!data || exporting !== null}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-950 dark:border-cyan-700 px-4 py-2 text-xs font-black text-cyan-950 dark:text-cyan-400 transition hover:bg-cyan-50 dark:hover:bg-cyan-950/40 disabled:opacity-50"
                    >
                      {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                      {t('exportPdf')}
                    </button>
                  </div>
                </div>
              </AnimatedContent>

              {/* Main Content & Bento Grid */}
              <BlurLoader isLoading={loading} showSpinner={false}>
                {error ? (
                  <AnimatedContent delay={0.06}>
                    <section className="mt-5 rounded-[2.5rem] border border-rose-200 bg-rose-50 px-6 py-10 text-center text-rose-700">
                      {error}
                    </section>
                  </AnimatedContent>
                ) : (
                  <div ref={exportRef} className="space-y-6 relative mt-4 sm:mt-6">
                    {/* Official Letterhead — Kingdom of Cambodia / MoEYS header for printed & exported reports */}
                    <div className="relative overflow-hidden rounded-[2.5rem] border-2 border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/40 via-white to-white dark:from-amber-950/10 dark:via-gray-900/80 dark:to-gray-900/80 shadow-[0_12px_40px_-15px_rgba(180,131,31,0.22)] px-6 py-8 sm:px-12 sm:py-10">
                      {/* Inner Frame Border for Official MoEYS Document Aesthetic */}
                      <div className="absolute inset-3 border border-amber-300/50 dark:border-amber-900/30 rounded-[2.1rem] pointer-events-none" />
                      {/* Gold top accent bar */}
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
                      {/* Faint traditional Khmer motif watermark */}
                      <div className="absolute inset-0 bg-[url('/images/khmer-carving-bg.jpg')] bg-contain bg-center bg-no-repeat opacity-[0.04] mix-blend-multiply pointer-events-none select-none" />

                      {/* Top Section: Dual MoEYS Header (Left: Ministry/School Info, Right: Kingdom Motto) */}
                      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 pb-6 border-b border-dashed border-amber-200/80 dark:border-gray-800">
                        {/* Top Left: MoEYS & School Title (Moved down 3-4 lines with pt-8 sm:pt-12 to sit noticeably lower than right motto) */}
                        <div className="text-center sm:text-left space-y-1.5 pt-8 sm:pt-12">
                          <p
                            className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 font-moul"
                            style={{ fontFamily: "var(--font-moul, 'Moul', 'Khmer OS Muol Light', serif)" }}
                          >
                            {displayOfficeName}
                          </p>
                          <p
                            className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 font-moul"
                            style={{ fontFamily: "var(--font-moul, 'Moul', 'Khmer OS Muol Light', serif)" }}
                          >
                            {displayProvince}
                          </p>
                          <p
                            className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 font-moul"
                            style={{ fontFamily: "var(--font-moul, 'Moul', 'Khmer OS Muol Light', serif)" }}
                          >
                            {displaySchoolNameKhmer}
                          </p>
                        </div>

                        {/* Top Right: Kingdom Motto (Identical font & font-size for both motto lines, text-center) */}
                        <div className="text-center space-y-1 w-full sm:w-auto">
                          <h2
                            className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white font-moul tracking-wide text-center"
                            style={{ fontFamily: "var(--font-moul, 'Moul', 'Khmer OS Muol Light', serif)" }}
                          >
                            ព្រះរាជាណាចក្រកម្ពុជា
                          </h2>
                          <h3
                            className="text-xs sm:text-sm font-bold text-slate-800 dark:text-gray-200 font-moul tracking-wide text-center"
                            style={{ fontFamily: "var(--font-moul, 'Moul', 'Khmer OS Muol Light', serif)" }}
                          >
                            ជាតិ សាសនា ព្រះមហាក្សត្រ
                          </h3>
                          {/* Tacteng Symbol Ornament underneath Motto (centered) */}
                          <div className="flex justify-center items-center pt-1">
                            <span
                              className="font-tacteing text-[24px] leading-none text-amber-600 dark:text-amber-400"
                              style={{ fontFamily: "var(--font-tacteng, 'Tacteng', serif)" }}
                            >
                              3
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Center Section: Main Report Title */}
                      <div className="relative z-10 text-center py-6">
                        <h1
                          className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-950 dark:text-white font-moul tracking-tight"
                          style={{ fontFamily: "var(--font-moul, 'Moul', 'Khmer OS Muol Light', serif)" }}
                        >
                          របាយការណ៍សាលា
                        </h1>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-300">
                          <span>ឆ្នាំសិក្សា៖ {formattedAcademicYearKhmer}</span>
                          {scopeClassName && (
                            <>
                              <span className="text-slate-300 dark:text-gray-600">·</span>
                              <span>ថ្នាក់ទី{scopeClassName}</span>
                            </>
                          )}
                          <span className="text-slate-300 dark:text-gray-600">·</span>
                          <span className="text-amber-700 dark:text-amber-400 font-bold">{formattedPeriodSubtitle}</span>
                        </div>
                      </div>

                      {/* Footer info badges */}
                      <div className="relative z-10 pt-2 flex flex-wrap items-center justify-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-gray-800/70 px-3.5 py-1.5 text-[10px] font-bold text-slate-500 dark:text-gray-400 border border-slate-200/70 dark:border-gray-700 shadow-2xs">
                          <Hash className="h-3 w-3 text-amber-500" />
                          លេខយោង៖ {data?.period.label || ''}-{schoolId ? schoolId.slice(-6).toUpperCase() : ''}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 dark:bg-gray-800/70 px-3.5 py-1.5 text-[10px] font-bold text-slate-500 dark:text-gray-400 border border-slate-200/70 dark:border-gray-700 shadow-2xs">
                          <CalendarDays className="h-3 w-3 text-amber-500" />
                          ចេញនៅថ្ងៃទី៖ {formatKhmerDate(new Date())}
                        </span>
                      </div>
                    </div>

                    {/* Pass Rate mini bar (inline with school info) */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">របាយការណ៍ផ្លូវការ</p>
                        </div>
                        <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{school?.name || 'សាលារៀន'}</p>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">{data?.period.khmerLabel || data?.period.label}{scopeClassName ? ` · ថ្នាក់ ${scopeClassName}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t('passRateTitle')}</p>
                          <div className="flex items-end gap-1.5">
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{data?.passRate.passRatePercent ?? 0}%</span>
                            <span className="pb-1 text-[10px] font-bold text-slate-400">{scaleLabel}</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${Math.min(100, data?.passRate.passRatePercent ?? 0)}%` }} />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="text-center">
                            <p className="text-xl font-black text-emerald-600">{data?.passRate.passing ?? 0}</p>
                            <p className="text-[9px] font-black uppercase text-emerald-500">{t('passingLabel')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xl font-black text-rose-600">{data?.passRate.failing ?? 0}</p>
                            <p className="text-[9px] font-black uppercase text-rose-500">{t('failingLabel')}</p>
                          </div>
                        </div>
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-[10px] font-black text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                          {formatKhmerDate(new Date())}
                        </span>
                      </div>
                    </div>

                    {/* Bento Grid */}
                    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:auto-rows-[minmax(0,auto)]">
                      {/* 1. Overview 4 Stat Cards with Female Counters */}
                      <AnimatedContent delay={0.06}>
                        <StatCard
                          title={t('overviewStudents')}
                          value={data?.overview.totalStudents ?? 0}
                          icon={Users}
                          iconColor="blue"
                          change={`ស្រី: ${toKhmerNumeral(moeysMetrics.femaleStudents)} នាក់`}
                          changeType="neutral"
                        />
                      </AnimatedContent>

                      <AnimatedContent delay={0.065}>
                        <StatCard
                          title={t('overviewTeachers')}
                          value={data?.overview.totalTeachers ?? 0}
                          icon={GraduationCap}
                          iconColor="purple"
                          change={`ស្រី: ${toKhmerNumeral(moeysMetrics.femaleTeachers)} នាក់`}
                          changeType="neutral"
                        />
                      </AnimatedContent>

                      <AnimatedContent delay={0.07}>
                        <StatCard
                          title={t('overviewClasses')}
                          value={data?.overview.totalClasses ?? 0}
                          icon={School}
                          iconColor="amber"
                          change="ថ្នាក់រៀនសរុប"
                          changeType="neutral"
                        />
                      </AnimatedContent>

                      <AnimatedContent delay={0.075}>
                        <StatCard
                          title={t('overviewAttendance')}
                          value={`${data?.overview.attendanceRate ?? 0}%`}
                          icon={TrendingUp}
                          iconColor="green"
                          change="អត្រាវត្តមាន"
                          changeType="positive"
                        />
                      </AnimatedContent>

                      {/* ══ 2. Honor Roll — GRADE VIEW — 3-Column Leaderboard Cards (White Theme + Hand-Drawn Khmer Carving Backdrop) ══ */}
                      {showGradeHonorRoll && (
                        <AnimatedContent delay={0.08} className="col-span-2 lg:col-span-4">
                          <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200/80 shadow-[0_4px_30px_rgba(15,23,42,0.06)] relative overflow-hidden">
                            {/* Traditional Hand-Drawn Khmer Carving Bas-Relief Backdrop (Soft, Organic & Delicate) */}
                            <div
                              className="absolute inset-0 bg-[url('/images/khmer-carving-bg.jpg')] bg-contain bg-center bg-no-repeat opacity-[0.14] mix-blend-multiply pointer-events-none select-none filter blur-[0.2px] scale-95"
                            />

                            {/* ── Top Bar ── */}
                            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/70 pb-6 mb-8 sm:mb-10">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">✦ Honor Roll Leaderboard</p>
                                <h3 className="mt-1 text-2xl sm:text-3xl tracking-tight text-slate-950" style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}>
                                  {t('honorRollTitle')}
                                </h3>
                              </div>
                              <span className="px-5 py-2 rounded-full bg-amber-500/10 text-amber-900 border border-amber-300/80 text-xs font-black uppercase tracking-widest shadow-2xs">
                                TOP 5 · តាមកម្រិតថ្នាក់ (3 COLUMNS)
                              </span>
                            </div>

                            {/* ── 3 Column Grid per Grade ── */}
                            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                              {data?.topStudentsByGrade.map((g) => (
                                <div
                                  key={g.grade}
                                  className="relative rounded-[2.2rem] bg-white/90 backdrop-blur-xs border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:border-amber-400/80 hover:bg-white hover:shadow-xl transition-all duration-300 flex flex-col justify-between group overflow-hidden"
                                >
                                  {/* Clearly visible card background Khmer motif accent */}
                                  <div className="absolute -bottom-4 -right-4 w-28 h-28 text-amber-500/15 pointer-events-none select-none">
                                    <svg viewBox="0 0 100 100" fill="currentColor">
                                      <path d="M50 5 C60 25 75 40 95 50 C75 60 60 75 50 95 C40 75 25 60 5 50 C25 40 40 25 50 5 Z" />
                                      <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
                                    </svg>
                                  </div>

                                  {/* Grade Ribbon Header */}
                                  <div>
                                    <div className="relative mb-5 flex items-center justify-between border-b border-slate-200/60 pb-4">
                                      <div className="flex items-center gap-2 bg-amber-500 text-white px-4 py-1.5 rounded-full font-black text-xs shadow-sm border border-amber-400">
                                        <Trophy className="w-4 h-4 fill-white text-white" />
                                        <span style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}>{t('gradeLevelLabel')} {toKhmerNumeral(Number(g.grade) || 0)}</span>
                                      </div>
                                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">TOP 5</span>
                                    </div>

                                    {/* Student rows with Leaderboard Pill Styling + Moul Font */}
                                    <div className="space-y-3">
                                      {g.students.map((s) => {
                                        const isRank1 = s.rank === 1;
                                        const isRank2 = s.rank === 2;
                                        const isRank3 = s.rank === 3;

                                        const rowStyle = isRank1
                                          ? 'bg-amber-400 text-slate-950 border border-amber-300 shadow-md'
                                          : isRank2
                                            ? 'bg-slate-200/90 text-slate-900 border border-slate-300/80 shadow-xs'
                                            : isRank3
                                              ? 'bg-amber-100 text-amber-950 border border-amber-200 shadow-xs'
                                              : 'bg-white text-slate-800 border border-slate-200/80 shadow-2xs hover:bg-slate-50';

                                        const circleStyle = isRank1
                                          ? 'bg-slate-950 text-amber-300'
                                          : isRank2
                                            ? 'bg-slate-800 text-slate-100'
                                            : isRank3
                                              ? 'bg-amber-900 text-amber-100'
                                              : 'bg-slate-100 text-slate-700 border border-slate-200';

                                        const scoreBg = isRank1
                                          ? 'bg-slate-950 text-white'
                                          : isRank2
                                            ? 'bg-slate-900 text-white'
                                            : isRank3
                                              ? 'bg-amber-900 text-white'
                                              : 'bg-slate-100 text-slate-900 border border-slate-200';

                                        return (
                                          <div
                                            key={s.studentId}
                                            className={`flex items-center justify-between gap-3 p-2.5 pl-3 pr-3.5 rounded-2xl transition-all duration-300 hover:scale-[1.01] ${rowStyle}`}
                                          >
                                            <div className="flex items-center gap-3 truncate min-w-0">
                                              <span
                                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black tabular-nums ${circleStyle}`}
                                                style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}
                                              >
                                                {toKhmerNumeral(s.rank)}
                                              </span>
                                              <span
                                                className="truncate text-xs font-bold tracking-tight leading-normal"
                                                style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}
                                              >
                                                {s.khmerName || s.name}
                                              </span>
                                            </div>

                                            <div className={`shrink-0 px-3 py-1 rounded-xl text-xs font-black tabular-nums ${scoreBg}`}>
                                              {s.average} <span className="text-[10px] font-bold opacity-80">ពិន្ទុ</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        </AnimatedContent>
                      )}

                      {/* ══ 2b. Honor Roll — CLASS VIEW — Editorial Magazine Spread (Moul Font + Khmer Numerals + Carving Backdrop) ══ */}
                      {showClassHonorRoll && (
                        <AnimatedContent delay={0.08} className="col-span-2 lg:col-span-4">
                          <section className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-[0_4px_30px_rgba(15,23,42,0.06)] relative">
                            {/* Traditional Hand-Drawn Khmer Carving Bas-Relief Backdrop (Soft, Organic & Delicate) */}
                            <div
                              className="absolute inset-0 bg-[url('/images/khmer-carving-bg.jpg')] bg-contain bg-center bg-no-repeat opacity-[0.10] mix-blend-multiply pointer-events-none select-none filter blur-[0.2px] scale-95"
                            />
                            {/* ── Header ── */}
                            <div className="flex items-center justify-between px-8 sm:px-10 pt-8 sm:pt-10 pb-6 border-b border-slate-100">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-600 mb-1">✦ Honor Roll — {scopeClassName}</p>
                                <h3 className="text-2xl sm:text-3xl tracking-tight text-slate-950" style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}>
                                  សិស្សពូកែបំផុត <span className="text-amber-500">៥ នាក់</span>
                                </h3>
                              </div>
                              <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-black uppercase tracking-widest hidden sm:inline-block">
                                TOP 5 STUDENTS
                              </span>
                            </div>

                            {/* ── Balanced Grid: left champion smaller, right list wider ── */}
                            <div className="grid md:grid-cols-[2fr_3fr] min-h-[340px]">

                              {/* LEFT — Champion Feature Card */}
                              {(() => {
                                const rank1 = data?.topStudentsInClass?.find(s => s.rank === 1);
                                if (!rank1) return null;
                                return (
                                  <div className="relative flex flex-col justify-between p-8 sm:p-10 bg-white border-b md:border-b-0 md:border-r border-slate-100">
                                    {/* Giant rank numeral watermark in Khmer */}
                                    <div
                                      className="absolute bottom-4 right-4 text-[7rem] font-black text-slate-100/90 select-none pointer-events-none leading-none tabular-nums"
                                      style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}
                                    >
                                      ០១
                                    </div>
                                    {/* Champion label - Enlarged & Proportional */}
                                    <div>
                                      <div className="w-8 h-1.5 bg-amber-500 rounded-full mb-3" />
                                      <p
                                        className="text-sm font-bold text-amber-700 tracking-wide flex items-center gap-1.5"
                                        style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}
                                      >
                                        🏆 ជ័យលាភីអ្នកទី ១
                                      </p>
                                    </div>
                                    {/* Name in Moul Font */}
                                    <div className="relative z-10 mt-auto pt-6">
                                      <p
                                        className="text-2xl sm:text-3xl font-bold text-slate-950 leading-relaxed tracking-tight max-w-[280px]"
                                        style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}
                                      >
                                        {rank1.khmerName || rank1.name}
                                      </p>
                                      {/* Score pill */}
                                      <div className="mt-4 inline-flex items-baseline gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200/60">
                                        <span className="text-3xl sm:text-4xl font-black text-amber-600 tabular-nums leading-none">{rank1.average}</span>
                                        <span className="text-xs font-bold text-amber-800">ពិន្ទុ</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* RIGHT — Ranked List */}
                              <div className="divide-y divide-slate-100">
                                {data?.topStudentsInClass
                                  ?.filter(s => s.rank >= 2)
                                  .sort((a, b) => a.rank - b.rank)
                                  .map(s => {
                                    const stripes: Record<number, string> = {
                                      2: 'bg-slate-700',
                                      3: 'bg-amber-500',
                                      4: 'bg-slate-300',
                                      5: 'bg-slate-300',
                                    };
                                    const stripe = stripes[s.rank] ?? 'bg-slate-200';
                                    return (
                                      <div key={s.studentId} className="flex items-center gap-4 px-7 py-6 hover:bg-slate-50/70 transition-colors group">
                                        {/* Color stripe */}
                                        <div className={`w-1.5 h-10 rounded-full shrink-0 ${stripe}`} />

                                        {/* Rank number in Khmer Numerals + Moul font */}
                                        <span
                                          className="text-base sm:text-lg font-bold text-slate-500 tabular-nums shrink-0 w-8"
                                          style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}
                                        >
                                          {`០${toKhmerNumeral(s.rank)}`}
                                        </span>

                                        {/* Name in Moul font */}
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className="text-base sm:text-lg font-bold text-slate-900 truncate leading-relaxed"
                                            style={{ fontFamily: "var(--font-moul, 'Moul', serif)" }}
                                          >
                                            {s.khmerName || s.name}
                                          </p>
                                        </div>

                                        {/* Score */}
                                        <span className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums shrink-0">
                                          {s.average}
                                          <span className="ml-1.5 text-xs font-bold text-slate-400">ពិន្ទុ</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </section>
                        </AnimatedContent>
                      )}

                      {/* 3. MoEYS Student Flow Section — real StudentProgression data only (ត្រួតថ្នាក់, ផ្ទេរ) */}
                      <AnimatedContent delay={0.086} className="col-span-2 lg:col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-rose-200 dark:border-rose-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/40 dark:hover:shadow-black/40">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="flex items-center gap-2.5 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                              <UserMinus className="h-5 w-5 text-rose-500" /> ស្ថានភាពសិស្ស (ផ្ទេរ & ត្រួតថ្នាក់)
                            </h3>
                            <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-200/50">
                              MoEYS Flow
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 px-5 py-4">
                              <p className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">សិស្សត្រួតថ្នាក់</p>
                              <div className="mt-2 flex items-end justify-between">
                                <p className="text-3xl font-black text-slate-900 dark:text-white">{toKhmerNumeral(moeysMetrics.repeaters.total)} <span className="text-xs font-bold text-slate-500 dark:text-gray-400">នាក់</span></p>
                                <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                                  ស្រី: {toKhmerNumeral(moeysMetrics.repeaters.female)}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 px-5 py-4">
                              <p className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">សិស្សផ្ទេរចូល</p>
                              <div className="mt-2 flex items-end justify-between">
                                <p className="text-3xl font-black text-slate-900 dark:text-white">{toKhmerNumeral(moeysMetrics.transferIn.total)} <span className="text-xs font-bold text-slate-500 dark:text-gray-400">នាក់</span></p>
                                <span className="text-[10px] font-black text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                                  ស្រី: {toKhmerNumeral(moeysMetrics.transferIn.female)}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 px-5 py-4">
                              <p className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">សិស្សផ្ទេរចេញ</p>
                              <div className="mt-2 flex items-end justify-between">
                                <p className="text-3xl font-black text-slate-900 dark:text-white">{toKhmerNumeral(moeysMetrics.transferOut.total)} <span className="text-xs font-bold text-slate-500 dark:text-gray-400">នាក់</span></p>
                                <span className="text-[10px] font-black text-orange-600 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">
                                  ស្រី: {toKhmerNumeral(moeysMetrics.transferOut.female)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-4 text-[11px] font-semibold text-slate-400 dark:text-gray-500">
                            ទិន្នន័យពិតពីកំណត់ត្រាតម្លើងថ្នាក់ក្នុងកំឡុងកាលបរិច្ឆេទដែលបានជ្រើសរើស។ ចំណាំ៖ ការបោះបង់ការសិក្សា (Dropout) មិនទាន់មានប្រព័ន្ធតាមដានផ្លូវការនៅឡើយទេ។
                          </p>
                        </section>
                      </AnimatedContent>

                      {/* 4. MoEYS Teacher Attendance — real TeacherAttendance data only */}
                      <AnimatedContent delay={0.087} className="col-span-2 lg:col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-emerald-200 dark:border-emerald-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-200/40 dark:hover:shadow-black/40">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="flex items-center gap-2.5 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                              <UserCheck className="h-5 w-5 text-emerald-500" /> វត្តមានគ្រូបង្រៀន
                            </h3>
                            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-200/50">
                              Teacher Attendance
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-5">
                              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400">គ្រូបង្រៀនស្រី</p>
                              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{toKhmerNumeral(moeysMetrics.femaleTeachers)} <span className="text-xs font-bold text-slate-500 dark:text-gray-400">/ {toKhmerNumeral(data?.overview.totalTeachers ?? 0)} នាក់</span></p>
                            </div>

                            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 px-6 py-5">
                              <p className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">អត្រាវត្តមានគ្រូ</p>
                              {data?.overview.teacherAttendanceRate !== null && data?.overview.teacherAttendanceRate !== undefined ? (
                                <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{toKhmerNumeral(data.overview.teacherAttendanceRate)}%</p>
                              ) : (
                                <p className="mt-3 text-sm font-bold text-slate-400 dark:text-gray-500">មិនទាន់មានទិន្នន័យកត់ត្រាវត្តមានទេ</p>
                              )}
                            </div>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 6. At Risk Students Section */}
                      {(data?.atRiskStudents.length || 0) > 0 && (
                        <AnimatedContent delay={0.089} className="col-span-2 lg:col-span-4">
                          <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-rose-200 dark:border-rose-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/40 dark:hover:shadow-black/40">
                            <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-950 pb-4 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-rose-100 p-3 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                                  <AlertTriangle className="h-6 w-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('needsAttentionTitle')}</h3>
                                  <p className="text-sm font-bold text-slate-500 dark:text-gray-400">{t('needsAttentionSubtitle')}</p>
                                </div>
                              </div>
                              <span className="px-3.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black uppercase tracking-wider">
                                At-Risk Students
                              </span>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                              {data?.atRiskStudents.map((s) => (
                                <div
                                  key={s.studentId}
                                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 dark:bg-gray-800/40 px-5 py-4 border border-rose-100 dark:border-rose-900/30 transition-all hover:bg-rose-50/40"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-gray-200">{s.khmerName || s.name}</p>
                                    <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 mt-0.5">{s.className}</p>
                                  </div>
                                  <span className="shrink-0 text-sm font-black text-rose-600 dark:text-rose-400 bg-white dark:bg-gray-900 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800">
                                    {s.average} ពិន្ទុ
                                  </span>
                                </div>
                              ))}
                            </div>
                          </section>
                        </AnimatedContent>
                      )}

                      {/* 7. Gender Breakdown Pie Chart Card */}
                      <AnimatedContent delay={0.09} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('genderTitle')}</h3>
                          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                            <div className="h-[160px] w-[160px] shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={genderPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={3} isAnimationActive={false}>
                                    {genderPieData.map((_, index) => (
                                      <Cell key={index} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="grid flex-1 grid-cols-2 gap-3">
                              <div className="rounded-2xl bg-slate-50 dark:bg-gray-800/50 px-5 py-4 border border-slate-100 dark:border-gray-800">
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: GENDER_COLORS[0] }} />
                                  {t('genderMale')}
                                </span>
                                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{data?.genderBreakdown.male.count ?? 0}</p>
                                <p className="text-xs font-bold text-slate-500 dark:text-gray-400">{t('passRateTitle')} {data?.genderBreakdown.male.passRatePercent ?? 0}%</p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 dark:bg-gray-800/50 px-5 py-4 border border-slate-100 dark:border-gray-800">
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: GENDER_COLORS[1] }} />
                                  {t('genderFemale')}
                                </span>
                                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{data?.genderBreakdown.female.count ?? 0}</p>
                                <p className="text-xs font-bold text-slate-500 dark:text-gray-400">{t('passRateTitle')} {data?.genderBreakdown.female.passRatePercent ?? 0}%</p>
                              </div>
                            </div>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 8. Grade Level Average Bar Chart */}
                      <AnimatedContent delay={0.1} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('averageByGrade')}</h3>
                          <div className="mt-4 h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data?.averageScoreByGradeLevel || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="grade" stroke="#64748b" fontSize={12} />
                                <YAxis domain={[0, data?.scale.maxAverage || 100]} stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="average" radius={[8, 8, 0, 0]} fill="#0891b2" isAnimationActive={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 9. Average Score by Subject */}
                      <AnimatedContent delay={0.11} className="col-span-2 lg:col-span-4">
                        <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('averageBySubject')}</h3>
                          <div className="mt-4 h-[340px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data?.averageScoreBySubject || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                                <YAxis type="category" dataKey="subjectKh" stroke="#64748b" fontSize={11} width={100} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="average" radius={[0, 8, 8, 0]} fill={SEQUENTIAL_BLUE} isAnimationActive={false} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 10. Subject Grade Sheet Table */}
                      <AnimatedContent delay={0.115} className="col-span-2 lg:col-span-4">
                        <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <div className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-8 py-6">
                            <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('subjectGradeSheetTitle')}</h3>
                            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-gray-400">{data?.period.khmerLabel || data?.period.label}{scopeClassName ? ` • ${scopeClassName}` : ''}</p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px]">
                              <thead className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50">
                                <tr>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('subjectColumnLabel')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('averageScoreColumnLabel')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('studentsCount')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('passRateTitle')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                {(data?.averageScoreBySubject || []).map((s) => (
                                  <tr key={s.subject} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">{s.subjectKh}</td>
                                    <td className="px-5 py-3 font-black text-slate-950 dark:text-white">{s.average}</td>
                                    <td className="px-5 py-3 text-slate-600 dark:text-gray-400">{s.passCount}/{s.passCount + s.failCount}</td>
                                    <td className="px-5 py-3">
                                      <span
                                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
                                        style={{
                                          color: s.passRatePercent >= 50 ? STATUS_GOOD : STATUS_CRITICAL,
                                          backgroundColor: s.passRatePercent >= 50 ? `${STATUS_GOOD}1a` : `${STATUS_CRITICAL}1a`,
                                        }}
                                      >
                                        {s.passRatePercent >= 50 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                        {s.passRatePercent}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 11. Grade A–F Distribution Chart & Disaggregated Table */}
                      <AnimatedContent delay={0.12} className="col-span-2 lg:col-span-4">
                        <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <div className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-8 py-6">
                            <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('gradeDistributionTitle')}</h3>
                            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-gray-400">{t('gradeDistributionSubtitle')}</p>
                          </div>
                          <div className="border-b border-slate-100 dark:border-gray-800 px-5 py-6 sm:px-6">
                            <div style={{ height: Math.max(280, gradeDistributionChartData.length * 32) }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gradeDistributionChartData} layout="vertical" barCategoryGap="28%">
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" fontSize={12} />
                                  <YAxis type="category" dataKey="subjectKh" stroke="#64748b" fontSize={11} width={110} />
                                  <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }}
                                    formatter={(value: any, name: any) => [`${value}%`, name]}
                                  />
                                  <Legend />
                                  {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((letter) => (
                                    <Bar
                                      key={letter}
                                      dataKey={letter}
                                      name={letter}
                                      stackId="grades"
                                      fill={GRADE_LETTER_COLORS[letter]}
                                      isAnimationActive={false}
                                    />
                                  ))}
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px]">
                              <thead className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50">
                                <tr>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('subjectColumnLabel')}</th>
                                  {(['A', 'B', 'C', 'D', 'E', 'F'] as const).map((letter) => (
                                    <th key={letter} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                      {letter}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                {(data?.averageScoreBySubject || []).map((s) => (
                                  <tr key={s.subject} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">{s.subjectKh}</td>
                                    {s.gradeDistribution.map((band) => (
                                      <td key={band.grade} className="px-3 py-3 text-center">
                                        {band.total > 0 ? (
                                          <div>
                                            <span className="text-sm font-black text-slate-950 dark:text-white">{band.total}</span>
                                            <span className="ml-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                                              ({t('genderFemaleShort')}{band.female})
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-sm font-medium text-slate-300">—</span>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 12. Subject Pass Rate Breakdown */}
                      <AnimatedContent delay={0.125} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('subjectPassRateTitle')}</h3>
                          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-gray-400">{t('subjectPassRateSubtitle')}</p>
                          <ul className="mt-4 divide-y divide-slate-100 dark:divide-gray-800">
                            {subjectsByPassRate.map((s) => (
                              <li key={s.subject} className="flex items-center justify-between gap-3 py-3">
                                <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{s.subjectKh}</span>
                                <span className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-400 dark:text-gray-500">{s.passCount}/{s.passCount + s.failCount}</span>
                                  <span
                                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
                                    style={{
                                      color: s.passRatePercent >= 50 ? STATUS_GOOD : STATUS_CRITICAL,
                                      backgroundColor: s.passRatePercent >= 50 ? `${STATUS_GOOD}1a` : `${STATUS_CRITICAL}1a`,
                                    }}
                                  >
                                    {s.passRatePercent >= 50 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                    {s.passRatePercent}%
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      </AnimatedContent>

                      {/* 13. Academic & Attendance Trend Chart */}
                      <AnimatedContent delay={0.13} className="col-span-2">
                        <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('trendTitle')}</h3>
                          <div className="mt-4 h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={data?.trend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="khmerLabel" stroke="#64748b" fontSize={12} />
                                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Legend />
                                <Line type="monotone" dataKey="average" name={t('trendAverage')} stroke="#0891b2" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                                <Line type="monotone" dataKey="attendanceRate" name={t('trendAttendance')} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      </AnimatedContent>

                      {/* 14. Top & Bottom Performing Classes */}
                      {showTopBottom && (
                        <>
                          <AnimatedContent delay={0.15} className="col-span-2">
                            <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-emerald-200 dark:border-emerald-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-200/40 dark:hover:shadow-black/40">
                              <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-emerald-600">
                                <Award className="h-5 w-5" /> {t('topPerforming')}
                              </h3>
                              <ul className="mt-4 space-y-2">
                                {data?.topPerformingClasses.map((c) => (
                                  <li key={c.classId} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-gray-900 px-4 py-3 border border-slate-100 dark:border-gray-800">
                                    <span className="font-bold text-slate-800 dark:text-gray-200">{c.className}</span>
                                    <span className="font-black text-emerald-600">{c.average}</span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          </AnimatedContent>

                          <AnimatedContent delay={0.155} className="col-span-2">
                            <section className="h-full overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-rose-200 dark:border-rose-900/50 transition-all duration-500 hover:shadow-2xl hover:shadow-rose-200/40 dark:hover:shadow-black/40">
                              <h3 className="text-lg font-black tracking-tight text-rose-600">{t('bottomPerforming')}</h3>
                              <ul className="mt-4 space-y-2">
                                {data?.bottomPerformingClasses.map((c) => (
                                  <li key={c.classId} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-gray-900 px-4 py-3 border border-slate-100 dark:border-gray-800">
                                    <span className="font-bold text-slate-800 dark:text-gray-200">{c.className}</span>
                                    <span className="font-black text-rose-600">{c.average}</span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          </AnimatedContent>
                        </>
                      )}

                      {/* 15. Class Ranking Table */}
                      {showClassRanking && (
                        <AnimatedContent delay={0.17} className="col-span-2 lg:col-span-4">
                          <section className="overflow-hidden bg-white dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.12)] border border-slate-200 dark:border-gray-800/50 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 dark:hover:shadow-black/40">
                            <div className="border-b border-slate-200 dark:border-gray-800/50 bg-slate-50/50 dark:bg-gray-900/50 px-8 py-6">
                              <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{t('averageByClass')}</h3>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[600px]">
                                <thead className="border-b border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50">
                                  <tr>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('rank')}</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('classFilterLabel')}</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('studentsCount')}</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">{t('averageByClass')}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                  {data?.averageScoreByClass.map((c) => (
                                    <tr key={c.classId} className="hover:bg-slate-50 dark:hover:bg-gray-800/50">
                                      <td className="px-5 py-3 font-bold text-slate-500 dark:text-gray-400">{c.rank}</td>
                                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">{c.className}</td>
                                      <td className="px-5 py-3 text-slate-600 dark:text-gray-400">{c.studentCount}</td>
                                      <td className="px-5 py-3 font-black text-slate-950 dark:text-white">{c.average}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </section>
                        </AnimatedContent>
                      )}
                    </div>
                  </div>
                )}
              </BlurLoader>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
