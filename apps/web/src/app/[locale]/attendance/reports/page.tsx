'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { TokenManager } from '@/lib/api/auth';
import BlurLoader from '@/components/BlurLoader';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  User,
  Users,
  Percent,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface MonthlyStudentData {
  studentId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  attendance: {
    [date: string]: {
      morning?: { id: string; status: string; remarks: string | null };
      afternoon?: { id: string; status: string; remarks: string | null };
    };
  };
  totals: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    permission: number;
  };
}

interface MonthlyData {
  classId: string;
  month: number;
  year: number;
  students: MonthlyStudentData[];
}

function MetricCard({
  label,
  value,
  helper,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'sky' | 'emerald' | 'rose' | 'amber' | 'violet';
  icon: LucideIcon;
}) {
  const tones = {
    sky: {
      surface:
        'from-blue-500 via-cyan-500 to-sky-500 shadow-blue-200/70 dark:shadow-blue-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    emerald: {
      surface:
        'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-200/70 dark:shadow-emerald-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    rose: {
      surface:
        'from-fuchsia-500 via-rose-500 to-orange-500 shadow-fuchsia-200/70 dark:shadow-rose-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    amber: {
      surface:
        'from-amber-400 via-orange-500 to-rose-500 shadow-amber-200/70 dark:shadow-orange-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
    violet: {
      surface:
        'from-violet-500 via-purple-500 to-fuchsia-500 shadow-violet-200/70 dark:shadow-violet-950/40',
      icon: 'bg-white/20 dark:bg-gray-900/20 text-white ring-1 ring-white/20',
      glow: 'from-white/30 via-white/10 to-transparent',
    },
  };
  const classes = tones[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-gradient-to-br ${classes.surface} p-5 text-white shadow-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl dark:border-white/5`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${classes.glow}`} />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/75">{label}</p>
          <p className="mt-3 text-3xl font-black leading-none tracking-tight text-white">{value}</p>
          <div className="mt-3 inline-flex max-w-full rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-md">
            <span className="truncate">{helper}</span>
          </div>
        </div>
        <div className={`shrink-0 rounded-[1rem] p-3.5 shadow-lg backdrop-blur-md ring-1 ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function getStatusLabel(status: string | undefined) {
  if (!status) return '';
  switch (status) {
    case 'PRESENT':
      return 'P';
    case 'ABSENT':
      return 'A';
    case 'LATE':
      return 'L';
    case 'EXCUSED':
      return 'E';
    case 'PERMISSION':
      return 'S';
    default:
      return '';
  }
}

function getStatusTone(status: string | undefined) {
  switch (status) {
    case 'PRESENT':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'ABSENT':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'LATE':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'EXCUSED':
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    case 'PERMISSION':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    default:
      return 'border-transparent bg-transparent text-transparent';
  }
}

export default function AttendanceReportsPage() {
    const autoT = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const { allYears, selectedYear: contextSelectedYear } = useAcademicYear();
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsClient(true);
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
      return;
    }
    router.push(`/${locale}/auth/login`);
  }, [locale, router]);

  useEffect(() => {
    if (selectedAcademicYear && allYears.some((year) => year.id === selectedAcademicYear)) {
      return;
    }

    const preferredYearId =
      contextSelectedYear?.id || allYears.find((year) => year.isCurrent)?.id || allYears[0]?.id || '';

    if (preferredYearId) {
      setSelectedAcademicYear(preferredYearId);
    }
  }, [allYears, contextSelectedYear, selectedAcademicYear]);

  const { classes } = useClasses({
    academicYearId: selectedAcademicYear || undefined,
    limit: 100,
  });

  useEffect(() => {
    if (!classes.length) {
      setSelectedClass('');
      return;
    }

    if (!selectedClass || !classes.some((cls) => cls.id === selectedClass)) {
      setSelectedClass(classes[0].id);
    }
  }, [classes, selectedClass]);

  const loadMonthlyAttendance = useCallback(async () => {
    if (!selectedClass) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008'}/attendance/class/${selectedClass}/month/${selectedMonth}/year/${selectedYear}`,
        {
          headers: {
            Authorization: `Bearer ${TokenManager.getAccessToken()}`,
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        setMonthlyData(result.data);
      } else {
        setMonthlyData(null);
        setError(result.message || 'Failed to load attendance data');
      }
    } catch (err: any) {
      setMonthlyData(null);
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedClass && selectedMonth && selectedYear) {
      loadMonthlyAttendance();
    }
  }, [loadMonthlyAttendance, selectedClass, selectedMonth, selectedYear]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((current) => current - 1);
    } else {
      setSelectedMonth((current) => current - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((current) => current + 1);
    } else {
      setSelectedMonth((current) => current + 1);
    }
  };

  const statistics = useMemo(() => {
    if (!monthlyData?.students?.length) {
      return {
        totalStudents: 0,
        avgAttendance: 0,
        totalPresent: 0,
        totalAbsent: 0,
        totalLate: 0,
        totalLogged: 0,
      };
    }

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalSessions = 0;

    monthlyData.students.forEach((student) => {
      totalPresent += student.totals.present;
      totalAbsent += student.totals.absent;
      totalLate += student.totals.late;
      totalSessions +=
        student.totals.present +
        student.totals.absent +
        student.totals.late +
        student.totals.excused +
        student.totals.permission;
    });

    const avgAttendance = totalSessions > 0 ? Math.round(((totalPresent + totalLate) / totalSessions) * 100) : 0;

    return {
      totalStudents: monthlyData.students.length,
      avgAttendance,
      totalPresent,
      totalAbsent,
      totalLate,
      totalLogged: totalSessions,
    };
  }, [monthlyData]);

  const daysInMonth = useMemo(() => new Date(selectedYear, selectedMonth, 0).getDate(), [selectedMonth, selectedYear]);
  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long' });
  const selectedClassData = classes.find((item) => item.id === selectedClass);
  const readyRate = monthlyData?.students?.length ? Math.min(100, statistics.avgAttendance) : 0;

  if (!isClient || !user || !school) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#ecfeff_48%,#f8fafc_100%)] px-6 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1120_52%,#020617_100%)]">
        <div className="rounded-2xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_ad70e413" /></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ecfeff_48%,#f8fafc_100%)] transition-colors duration-500 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1120_52%,#020617_100%)]">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8 dark:text-white">
          <AnimatedContent>
            <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                eyebrow={autoT('auto.web.locale_attendance_reports_page.k_reporting_eyebrow')}
                title={autoT("auto.web.locale_attendance_reports_page.k_3fcbad14")}
                description={autoT('auto.web.locale_attendance_reports_page.k_hero_description')}
                icon={ClipboardCheck}
                chipsPosition="below"
                backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(236,253,245,0.96)_48%,rgba(224,242,254,0.9))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.14),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-teal-700 dark:text-teal-300"
                iconShellClassName="bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                actions={
                  <button
                    type="button"
                    onClick={loadMonthlyAttendance}
                    disabled={loading || !selectedClass}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:text-slate-950 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200 dark:hover:text-white"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_85576fcf" />
                  </button>
                }
              />

              <div className="h-full rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-sm dark:border-gray-800 dark:bg-gray-900/95 dark:text-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_127b124c" />
                    </p>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <span className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                        {readyRate}%
                      </span>
                      <span className="pb-1 text-xs font-black uppercase tracking-[0.22em] text-teal-600 dark:text-teal-400">
                        <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_5ee0d9da" />
                      </span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/15">
                    <ClipboardCheck className="h-6 w-6 text-teal-600 dark:text-teal-300" />
                  </div>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400"
                    style={{ width: `${readyRate}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="break-words whitespace-normal text-sm font-black leading-tight text-slate-900 dark:text-gray-100">
                      {selectedClassData?.name || '--'}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_pulse_label_class" />
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/70">
                    <p className="break-words whitespace-normal text-sm font-black leading-tight text-slate-900 dark:text-gray-100">
                      {monthName.slice(0, 3)}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_pulse_label_month" />
                    </p>
                  </div>
                  <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/70 col-span-2">
                    <p className="break-words whitespace-normal text-sm font-black leading-tight text-slate-900 dark:text-gray-100">
                      {statistics.totalLogged}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">
                      <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_pulse_label_logged" />
                    </p>
                  </div>
                </div>

                <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-200">
                  {monthName} {selectedYear}
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.04}>
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
              <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_26c18e73" /></p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_ec6d0d81" /></h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_3a199a50" /></p>
                </div>
              </div>

              <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_728e6b2c" /></span>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="h-12 w-full rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  >
                    <option value="">{autoT("auto.web.locale_attendance_reports_page.k_dae04eb6")}</option>
                    {allYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} {year.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_d44d2fc3" /></span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={!selectedAcademicYear || classes.length === 0}
                    className="h-12 w-full rounded-full border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 text-sm font-medium text-slate-700 dark:text-gray-200 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 disabled:opacity-60"
                  >
                    <option value="">{autoT("auto.web.locale_attendance_reports_page.k_d6ae109c")}</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-800/40">
                  <p className="px-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                    <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_291d6536" />
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousMonth}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-950 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                      {monthName} {selectedYear}
                    </div>
                    <button
                      type="button"
                      onClick={goToNextMonth}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-slate-950 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <BlurLoader isLoading={loading} showSpinner={false}>
            {error ? (
              <AnimatedContent delay={0.06}>
                <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                  <div className="rounded-xl bg-rose-100 p-2">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_f04f2117" /></p>
                    <p className="mt-1 text-sm font-medium">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadMonthlyAttendance}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_a98a1060" />
                  </button>
                </div>
              </AnimatedContent>
            ) : !selectedClass ? (
              <AnimatedContent delay={0.06}>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-800/50">
                    <Calendar className="h-8 w-8 text-slate-300 dark:text-gray-600" />
                  </div>
                  <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_c90a49f3" /></h2>
                  <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_ef068978" /></p>
                </div>
              </AnimatedContent>
            ) : (
              <>
                <AnimatedContent delay={0.08}>
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <MetricCard
                      label={autoT('auto.web.locale_attendance_reports_page.k_f967cbed')}
                      value={statistics.totalStudents}
                      helper={autoT('auto.web.locale_attendance_reports_page.k_metric_students_helper')}
                      tone="sky"
                      icon={Users}
                    />
                    <MetricCard
                      label={autoT('auto.web.locale_attendance_reports_page.k_db1d7702')}
                      value={`${statistics.avgAttendance}%`}
                      helper={autoT('auto.web.locale_attendance_reports_page.k_metric_avg_helper')}
                      tone="violet"
                      icon={Percent}
                    />
                    <MetricCard
                      label={autoT('auto.web.locale_attendance_reports_page.k_48d468aa')}
                      value={statistics.totalPresent}
                      helper={autoT('auto.web.locale_attendance_reports_page.k_metric_present_helper')}
                      tone="emerald"
                      icon={CheckCircle}
                    />
                    <MetricCard
                      label={autoT('auto.web.locale_attendance_reports_page.k_da54e06f')}
                      value={statistics.totalAbsent}
                      helper={autoT('auto.web.locale_attendance_reports_page.k_metric_absent_helper')}
                      tone="rose"
                      icon={XCircle}
                    />
                    <MetricCard
                      label={autoT('auto.web.locale_attendance_reports_page.k_f2a2b828')}
                      value={statistics.totalLate}
                      helper={autoT('auto.web.locale_attendance_reports_page.k_metric_late_helper')}
                      tone="amber"
                      icon={Clock}
                    />
                  </div>
                </AnimatedContent>

                <AnimatedContent delay={0.1}>
                  <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/95">
                    <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 dark:text-gray-500">
                          <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_8d43139c" />
                        </p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                          {selectedClassData?.name || 'Attendance report'}
                        </h2>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                          <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_e503e193" /> {monthName} {selectedYear}.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                        {[
                          ['P = Present', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
                          ['A = Absent', 'border-rose-200 bg-rose-50 text-rose-700'],
                          ['L = Late', 'border-amber-200 bg-amber-50 text-amber-700'],
                          ['E = Excused', 'border-indigo-200 bg-indigo-50 text-indigo-700'],
                          ['S = Permission', 'border-violet-200 bg-violet-50 text-violet-700'],
                        ].map(([label, tone]) => (
                          <span key={label} className={`inline-flex rounded-full border px-3 py-1.5 ${tone}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1200px] text-left">
                        <thead className="bg-slate-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="sticky left-0 z-20 min-w-[260px] border-r border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-gray-800/50 px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 backdrop-blur">
                              <AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_06d361e1" />
                            </th>
                            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
                              <th key={day} className="px-2 py-4 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                {day}
                              </th>
                            ))}
                            <th className="bg-teal-50/60 px-5 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-teal-600"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_1544f5b9" /></th>
                            <th className="bg-teal-50/60 px-5 py-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-teal-600"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_a6649200" /></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-gray-800/70 bg-white dark:bg-gray-900/70">
                          {monthlyData?.students?.map((student) => {
                            const totalSessions =
                              student.totals.present +
                              student.totals.absent +
                              student.totals.late +
                              student.totals.excused +
                              student.totals.permission;
                            const attendanceRate =
                              totalSessions > 0
                                ? Math.round(((student.totals.present + student.totals.late) / totalSessions) * 100)
                                : 0;

                            return (
                              <tr key={student.studentId} className="transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                                <td className="sticky left-0 z-10 border-r border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900/95 px-5 py-4 backdrop-blur">
                                  <div className="flex items-center gap-4">
                                    <div className="relative">
                                      {student.photo ? (
                                        <img
                                          src={student.photo}
                                          alt=""
                                          className="h-11 w-11 rounded-[0.95rem] object-cover ring-1 ring-slate-200/80"
                                        />
                                      ) : (
                                        <div className="flex h-11 w-11 items-center justify-center rounded-[0.95rem] bg-slate-100 dark:bg-gray-800 ring-1 ring-slate-200/80">
                                          <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                      )}
                                      <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-950">{student.firstName} {student.lastName}</p>
                                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{student.studentNumber}</p>
                                    </div>
                                  </div>
                                </td>
                                {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
                                  const dateKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                  const dayAttendance = student.attendance[dateKey];
                                  const morningStatus = dayAttendance?.morning?.status;
                                  const afternoonStatus = dayAttendance?.afternoon?.status;

                                  return (
                                    <td key={day} className="px-1 py-3">
                                      <div className="flex flex-col gap-1.5">
                                        <div className={`flex h-6 items-center justify-center rounded-[0.65rem] border text-[10px] font-black ${getStatusTone(morningStatus)}`}>
                                          {getStatusLabel(morningStatus) || <span className="opacity-0">-</span>}
                                        </div>
                                        <div className={`flex h-6 items-center justify-center rounded-[0.65rem] border text-[10px] font-black ${getStatusTone(afternoonStatus)}`}>
                                          {getStatusLabel(afternoonStatus) || <span className="opacity-0">-</span>}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                <td className="bg-teal-50/40 px-5 py-4 text-center">
                                  <div className="space-y-1 text-[11px] font-black uppercase tracking-[0.16em]">
                                    <div className="text-emerald-600"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_2fdc209d" /> {student.totals.present}</div>
                                    <div className="text-rose-600"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_1fedafe1" /> {student.totals.absent}</div>
                                  </div>
                                </td>
                                <td className="bg-teal-50/40 px-5 py-4 text-center">
                                  <span className={`text-sm font-black ${attendanceRate >= 80 ? 'text-emerald-600' : attendanceRate >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                                    {attendanceRate}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {(!monthlyData?.students || monthlyData.students.length === 0) && (
                      <div className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-800/50">
                          <Calendar className="h-8 w-8 text-slate-300 dark:text-gray-600" />
                        </div>
                        <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950 dark:text-white"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_83c716fa" /></h3>
                        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400"><AutoI18nText i18nKey="auto.web.locale_attendance_reports_page.k_77fac3d9" /></p>
                      </div>
                    )}
                  </section>
                </AnimatedContent>
              </>
            )}
          </BlurLoader>
        </main>
      </div>
    </div>
  );
}
