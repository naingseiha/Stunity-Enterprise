'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { getAttendanceSummaryDateRange, useAttendanceSummary, type AttendanceSummaryRange } from '@/hooks/useAttendanceSummary';
import { downloadAttendanceAuditCsv } from '@/lib/attendance/auditExport';
import { reportClientOperationalError } from '@/lib/observability/clientError';
import { isSchoolAttendanceAdminRole } from '@/lib/permissions/schoolAttendance';
import { TokenManager } from '@/lib/api/auth';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  School,
  ShieldAlert,
  TrendingUp,
  UserRound,
  Users,
  FileEdit,
  Search,
} from 'lucide-react';

type SessionStat = {
  present: number;
  absent: number;
  late: number;
  total: number;
};

type ClassInsight = {
  id: string;
  name: string;
  rate: number;
};

type CheckInLog = {
  id?: string;
  date?: string;
  status?: string;
  timeIn?: string | null;
  timeOut?: string | null;
  teacher?: {
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    user?: {
      displayName?: string;
    };
  };
};

const SESSION_KEYS = ['MORNING', 'AFTERNOON'] as const;

function MetricCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  tone: 'emerald' | 'sky' | 'amber' | 'violet';
}) {
  const tones = {
    emerald:
      'border-emerald-100/50 bg-gradient-to-br from-white via-white to-emerald-50/30 shadow-emerald-500/5 dark:border-emerald-900/30 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20',
    sky: 'border-sky-100/50 bg-gradient-to-br from-white via-white to-sky-50/30 shadow-sky-500/5 dark:border-sky-900/30 dark:from-gray-900 dark:via-gray-900 dark:to-sky-950/20',
    amber:
      'border-amber-100/50 bg-gradient-to-br from-white via-white to-amber-50/30 shadow-amber-500/5 dark:border-amber-900/30 dark:from-gray-900 dark:via-gray-900 dark:to-amber-950/20',
    violet:
      'border-violet-100/50 bg-gradient-to-br from-white via-white to-violet-50/30 shadow-violet-500/5 dark:border-violet-900/30 dark:from-gray-900 dark:via-gray-900 dark:to-violet-950/20',
  };

  return (
    <div
      className={`rounded-[1.75rem] border p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:shadow-none ${tones[tone]}`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
  );
}

function getInitials(log: CheckInLog) {
  const first = log.teacher?.firstName?.charAt(0) || '';
  const last = log.teacher?.lastName?.charAt(0) || '';
  const initials = `${first}${last}`.trim();
  return initials || 'ST';
}

export default function AttendanceDashboardPage(props: { params: Promise<{ locale: string }> }) {
  const format = useFormatter();
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const t = useTranslations('attendance');
  const td = useTranslations('attendance.adminDashboard');
  const { schoolId, loading: academicContextLoading } = useAcademicYear();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [auditExportBusy, setAuditExportBusy] = useState(false);
  const [auditExportError, setAuditExportError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<AttendanceSummaryRange>('month');

  const recentMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d);
      months.push({ id: `${year}-${month}`, label });
    }
    return months;
  }, [locale]);

  const dateRangeOptions: Array<{ id: AttendanceSummaryRange; label: string; shortLabelKey: 'rangeShortDay' | 'rangeShortWeek' | 'rangeShortMonth' | 'rangeShortTerm' }> = [
    { id: 'day', label: t('today'), shortLabelKey: 'rangeShortDay' },
    { id: 'week', label: t('thisWeek'), shortLabelKey: 'rangeShortWeek' },
    { id: 'month', label: t('thisMonth'), shortLabelKey: 'rangeShortMonth' },
    { id: 'semester', label: t('semester'), shortLabelKey: 'rangeShortTerm' },
  ];

  const formatDateLabel = (value?: string | null) => {
    if (!value) return '--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';
    return format.dateTime(parsed, { dateStyle: 'medium' });
  };

  const formatTimeLabel = (value?: string | null) => {
    if (!value) return '--:--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--:--';
    return format.dateTime(parsed, { timeStyle: 'short' });
  };

  const sessionLabel = useCallback((session: string) => {
    if (session === 'MORNING') return td('sessionMorning');
    if (session === 'AFTERNOON') return td('sessionAfternoon');
    return session;
  }, [td]);

  useEffect(() => {
    const snapshot = TokenManager.getUserData();
    if (!snapshot?.user?.role) {
      router.replace(`/${locale}/auth/login`);
      return;
    }
    if (!isSchoolAttendanceAdminRole(snapshot.user.role)) {
      router.replace(`/${locale}/feed`);
      return;
    }
    setUser(snapshot.user);
    setSchool(snapshot.school ?? null);
    setSessionReady(true);
  }, [locale, router]);

  const [toolbarRefreshing, setToolbarRefreshing] = useState(false);
  const [manualRefreshBanner, setManualRefreshBanner] = useState<string | null>(null);

  useEffect(() => {
    setManualRefreshBanner(null);
    setAuditExportError(null);
  }, [dateRange]);

  const { data, isLoading, isValidating, error, refresh } = useAttendanceSummary(
    sessionReady ? schoolId : null,
    dateRange
  );

  const handleToolbarRefresh = useCallback(async () => {
    setManualRefreshBanner(null);
    setToolbarRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      reportClientOperationalError('attendance-dashboard-refresh', err, { schoolId: schoolId ?? undefined });
      const message = err instanceof Error ? err.message : td('refreshFailed');
      setManualRefreshBanner(message);
    } finally {
      setToolbarRefreshing(false);
    }
  }, [refresh, td, schoolId]);

  const stats = data?.stats || {
    studentCount: 0,
    teacherCount: 0,
    classCount: 0,
    attendanceRate: 0,
    teacherAttendanceRate: 0,
    totals: { present: 0, absent: 0, late: 0 },
    teacherTotals: { present: 0, absent: 0 },
    sessions: {},
  };

  const topClasses = (data?.topClasses || []) as ClassInsight[];
  const atRiskClasses = (data?.atRiskClasses || []) as ClassInsight[];
  const recentCheckIns = (data?.recentCheckIns || []) as CheckInLog[];

  const trendSeries = useMemo(() => {
    const raw = data?.trend || [];
    return [...raw]
      .filter((p) => typeof p.date === 'string' && /^(\d{4}-\d{2}-\d{2})/.test(p.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-21);
  }, [data?.trend]);

  const trendScaleMax = useMemo(() => {
    const totals = trendSeries.map((p) => (Number(p.present) || 0) + (Number(p.absent) || 0) + (Number(p.late) || 0));
    return Math.max(1, ...totals);
  }, [trendSeries]);

  const combinedPresent = (stats.totals.present || 0) + (stats.teacherTotals?.present || 0);
  const readyScore = Math.round(((stats.attendanceRate || 0) + (stats.teacherAttendanceRate || 0)) / 2);
  const totalCheckIns = recentCheckIns.length;
  const rangeLabel = dateRangeOptions.find((item) => item.id === dateRange)?.label || recentMonths.find(m => m.id === dateRange)?.label || t('thisMonth');
  const activeRangeCfg = dateRangeOptions.find((item) => item.id === dateRange);
  const rangeShortLabel = activeRangeCfg ? td(activeRangeCfg.shortLabelKey) : rangeLabel;

  const sessionCards = useMemo(() => {
    return SESSION_KEYS.map((session) => {
      const sessionData = (stats.sessions?.[session] || {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
      }) as SessionStat;
      const rate = sessionData.total > 0
        ? Math.round(((sessionData.present + sessionData.late) / sessionData.total) * 100)
        : 0;

      return {
        session,
        rate,
        data: sessionData,
      };
    });
  }, [stats.sessions]);

  const auditDateRange = useMemo(() => getAttendanceSummaryDateRange(dateRange), [dateRange]);

  const handleAuditExport = useCallback(async () => {
    setAuditExportError(null);
    setAuditExportBusy(true);
    try {
      await downloadAttendanceAuditCsv(auditDateRange.startDate, auditDateRange.endDate);
    } catch (err) {
      reportClientOperationalError('attendance-audit-export', err, auditDateRange);
      setAuditExportError(err instanceof Error ? err.message : td('auditExportFailed'));
    } finally {
      setAuditExportBusy(false);
    }
  }, [auditDateRange, td]);

  const handleLogout = async () => {
    await TokenManager.logout();
    window.location.href = `/${locale}/auth/login`;
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)]">
        <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
      </div>
    );
  }

  if (academicContextLoading) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 lg:ml-64">
          <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">{t('syncing')}</p>
          </div>
        </div>
      </>
    );
  }

  if (!schoolId) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 lg:ml-64">
          <div className="mx-auto max-w-md rounded-[1.75rem] border border-amber-200/80 bg-amber-50/90 px-8 py-10 text-center shadow-lg ring-1 ring-amber-100">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
            <h1 className="mt-4 text-lg font-black tracking-tight text-slate-950">{td('needsSchoolTitle')}</h1>
            <p className="mt-3 text-sm font-medium text-slate-600">{td('needsSchoolDescription')}</p>
            <Link
              href={`/${locale}/dashboard`}
              className="mt-6 inline-flex items-center justify-center rounded-[0.95rem] bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800"
            >
              {td('goToDashboard')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (isLoading && !data) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 lg:ml-64">
          <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            <p className="mt-4 text-sm font-medium text-slate-500">{td('loadingSummary')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_52%,#f8fafc_100%)] lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
              <CompactHeroCard
                eyebrow={td('heroEyebrow')}
                title={td('heroTitle')}
                description={td('heroDescription')}
                icon={BarChart3}
                backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(240,249,255,0.97)_56%,rgba(236,253,245,0.9))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-sky-600"
                actions={
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as AttendanceSummaryRange)}
                        className="appearance-none rounded-[1rem] border border-white/70 bg-white/80 dark:bg-gray-900/80 px-4 py-2 pr-10 text-sm font-bold text-slate-800 shadow-sm outline-none ring-1 ring-slate-200/50 backdrop-blur-md transition hover:bg-white focus:ring-2 focus:ring-sky-500 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus:ring-sky-400"
                      >
                        <optgroup label={t('range')}>
                          {dateRangeOptions.map((range) => (
                            <option key={range.id} value={range.id}>{range.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label={td('recentMonths')}>
                          {recentMonths.map((m) => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                        </optgroup>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-gray-400">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                }
              />

              <div className="relative overflow-hidden rounded-[1.9rem] border border-sky-200/70 bg-[linear-gradient(145deg,rgba(12,74,110,0.98),rgba(2,132,199,0.94)_52%,rgba(15,118,110,0.9))] p-5 text-white shadow-[0_24px_56px_-14px_rgba(12,74,110,0.38)] ring-1 ring-white/15 sm:p-6 xl:sticky xl:top-24 xl:self-start">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%)] opacity-90" aria-hidden />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-100/85">{td('readinessEyebrow')}</p>
                    <div className="mt-2.5 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight tabular-nums">{readyScore}%</span>
                      <span className="pb-1.5 text-sm font-bold uppercase tracking-[0.26em] text-sky-100/80">{td('readinessSplitLabel')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleToolbarRefresh()}
                    disabled={toolbarRefreshing || isValidating || !schoolId}
                    aria-label={td('refreshAriaLabel')}
                    title={td('refreshTitle')}
                    className="rounded-[1.2rem] bg-white/15 p-3.5 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-6 w-6 text-sky-100 ${toolbarRefreshing || isValidating ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-sky-200"
                    style={{ width: `${readyScore}%` }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {[
                    { label: t('range'), value: rangeShortLabel },
                    { label: t('atRisk'), value: atRiskClasses.length },
                    { label: t('checkins'), value: totalCheckIns },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-gray-900/5 px-2 py-3 text-center backdrop-blur-sm">
                      <p className="text-[17px] font-black tracking-tighter text-white sm:text-lg">{item.value}</p>
                      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-sky-100/70">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="relative mt-4 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-sky-50 backdrop-blur-sm">
                  {rangeLabel}
                  <span className="ml-1.5 text-sky-100/80">{td('rangeContextSuffix')}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.45rem] border border-white/70 bg-white/90 p-4 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-gray-900/85">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{td('workflowStripTitle')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/${locale}/attendance/mark`}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <CalendarDays className="h-4 w-4 text-sky-500" />
                  {td('linkMarkAttendance')}
                </Link>
                <Link
                  href={`/${locale}/timetable`}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <Clock3 className="h-4 w-4 text-violet-500" />
                  {td('linkTimetable')}
                </Link>
                <Link
                  href={`/${locale}/attendance/reports`}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  {td('linkReports')}
                </Link>
                <button
                  type="button"
                  disabled={auditExportBusy}
                  title={td('auditExportHint')}
                  onClick={() => void handleAuditExport()}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {auditExportBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <FileDown className="h-4 w-4 text-sky-600" />
                  )}
                  {auditExportBusy ? td('auditExportBusy') : td('auditExportCsv')}
                </button>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">{td('auditExportHint')}</p>
            </div>

            {manualRefreshBanner ? (
              <div className="mt-4 rounded-[1.15rem] border border-rose-200/90 bg-rose-50/95 px-4 py-3 text-sm font-semibold text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                {manualRefreshBanner}
              </div>
            ) : null}

            {auditExportError ? (
              <div className="mt-4 rounded-[1.15rem] border border-amber-200/90 bg-amber-50/95 px-4 py-3 text-sm font-semibold text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-100">
                {auditExportError}
              </div>
            ) : null}
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={td('metricLearnerAttendance')} value={`${stats.attendanceRate || 0}%`} helper={td('metricAvgLearnerAttendance')} tone="emerald" />
              <MetricCard label={td('metricStaffAttendance')} value={`${stats.teacherAttendanceRate || 0}%`} helper={td('metricTeacherCoverage')} tone="sky" />
              <MetricCard label={td('metricCombinedPresentLabel')} value={combinedPresent} helper={td('metricCombinedActive')} tone="violet" />
              <MetricCard label={td('metricActiveClassesLabel')} value={stats.classCount || topClasses.length || atRiskClasses.length} helper={td('metricClassesInView')} tone="amber" />
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.055}>
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-sky-50/60 p-5 shadow-[0_16px_42px_-18px_rgba(15,23,42,0.14)] ring-1 ring-white/80 backdrop-blur-sm dark:border-gray-800 dark:from-gray-900 dark:via-gray-900/95 dark:to-sky-950/40 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{td('rosterEyebrow')}</p>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-gray-50">{td('rosterTitle')}</h2>
                  <p className="mt-1.5 max-w-xl text-sm font-medium text-slate-500 dark:text-gray-400">{td('rosterDescription')}</p>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full border border-sky-200/70 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600 shadow-sm dark:border-sky-900/50 dark:bg-gray-800/70 dark:text-sky-200">
                  <Users className="h-3.5 w-3.5" />
                  {rangeLabel}
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: td('rosterStudents'),
                    value: stats.studentCount ?? 0,
                    icon: School,
                    tint: 'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200',
                  },
                  {
                    label: td('rosterTeachers'),
                    value: stats.teacherCount ?? 0,
                    icon: UserRound,
                    tint: 'border-sky-200/80 bg-sky-50/80 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200',
                  },
                  {
                    label: td('rosterClasses'),
                    value: stats.classCount || topClasses.length || atRiskClasses.length || 0,
                    icon: Users,
                    tint: 'border-violet-200/80 bg-violet-50/80 text-violet-800 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-200',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[1.25rem] border p-5 shadow-inner shadow-white/60 dark:shadow-none ${item.tint}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-current shadow-sm ring-1 ring-white/70 dark:bg-gray-900/60 dark:ring-gray-700/60">
                        <item.icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-80">{item.label}</p>
                        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-slate-950 dark:text-gray-50">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </AnimatedContent>

          {!error ? (
            <AnimatedContent delay={0.065}>
              <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 shadow-[0_12px_45px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{td('trendEyebrow')}</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                      {td('trendTitle')}
                    </h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {td('trendDescription')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-6 rounded-full bg-emerald-500" aria-hidden /> {t('present')}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-6 rounded-full bg-amber-400" aria-hidden /> {td('legendLate')}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-6 rounded-full bg-rose-400" aria-hidden /> {t('absent')}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-6 sm:px-6">
                  {trendSeries.length > 0 ? (
                    <div className="flex min-h-[11rem] min-w-full items-end justify-between gap-1 overflow-x-auto pb-8 sm:min-h-[13rem] sm:gap-1.5">
                      {trendSeries.map((day) => {
                        const pres = Number(day.present) || 0;
                        const abs = Number(day.absent) || 0;
                        const late = Number(day.late) || 0;
                        const total = pres + abs + late;
                        const envelopePct = trendScaleMax > 0 ? Math.round((total / trendScaleMax) * 100) : 0;
                        const pct = (slice: number) => (total > 0 ? (slice / total) * 100 : 0);
                        const short = day.date.slice(5);
                        return (
                          <div
                            key={day.date}
                            className="relative flex min-w-[1.5rem] max-w-[2.25rem] flex-1 flex-col items-center gap-2"
                          >
                            <div className="flex h-44 w-full items-end sm:h-52">
                              <div
                                className="flex w-full flex-col justify-end overflow-hidden rounded-t-lg bg-slate-100/90 shadow-inner shadow-slate-200/70 dark:bg-gray-800/80 dark:shadow-none"
                                style={{ height: total > 0 ? `${envelopePct}%` : '4px' }}
                                title={td('trendTooltip', {
                                  date: day.date,
                                  present: String(pres),
                                  absent: String(abs),
                                  late: String(late),
                                })}
                              >
                                {total === 0 ? (
                                  <div className="h-full w-full bg-slate-200/80 dark:bg-gray-700/80" />
                                ) : (
                                  <>
                                    <div
                                      className="w-full min-h-[2px] shrink-0 bg-gradient-to-r from-rose-500 to-rose-400"
                                      style={{ height: `${pct(abs)}%` }}
                                    />
                                    <div
                                      className="w-full min-h-[2px] shrink-0 bg-amber-400/95"
                                      style={{ height: `${pct(late)}%` }}
                                    />
                                    <div
                                      className="w-full min-h-[2px] shrink-0 bg-gradient-to-r from-teal-500 to-emerald-400"
                                      style={{ height: `${pct(pres)}%` }}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="pointer-events-none absolute -bottom-6 left-1/2 w-12 -translate-x-1/2 text-center text-[10px] font-bold text-slate-400">{short}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-14 text-center text-sm font-medium text-slate-500">
                      {td('trendEmpty')}
                    </div>
                  )}
                </div>
              </section>
            </AnimatedContent>
          ) : null}

          {error ? (
            <AnimatedContent delay={0.08}>
              <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]">{td('loadErrorTitle')}</p>
                  <p className="mt-1 text-sm font-medium">{error.message}</p>
                </div>
                <button
                  onClick={() => void handleToolbarRefresh()}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  {td('retryAction')}
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.1}>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_12px_45px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{td('sessionsEyebrow')}</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{td('sessionsTitle')}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-500">{td('sessionsDescription')}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5 text-sky-500" />
                    {td('liveWindowBadge')}
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
                  {sessionCards.map((session) => (
                    <div key={session.session} className="rounded-[1.25rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{sessionLabel(session.session)}</p>
                          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{session.rate}%</p>
                        </div>
                        <div className={`rounded-[1rem] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] ${session.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {session.rate >= 90 ? t('healthy') : t('watch')}
                        </div>
                      </div>

                      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-200/80">
                        <div
                          className={`h-full rounded-full ${session.rate >= 90 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}
                          style={{ width: `${session.rate}%` }}
                        />
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                        <div className="rounded-[0.95rem] bg-white dark:bg-none dark:bg-gray-900 px-3 py-3 ring-1 ring-slate-200/70">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{td('countPresent')}</p>
                          <p className="mt-2 font-bold text-slate-950">{session.data.present}</p>
                        </div>
                        <div className="rounded-[0.95rem] bg-white dark:bg-none dark:bg-gray-900 px-3 py-3 ring-1 ring-slate-200/70">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{td('countLate')}</p>
                          <p className="mt-2 font-bold text-slate-950">{session.data.late}</p>
                        </div>
                        <div className="rounded-[0.95rem] bg-white dark:bg-none dark:bg-gray-900 px-3 py-3 ring-1 ring-slate-200/70">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{td('countAbsent')}</p>
                          <p className="mt-2 font-bold text-slate-950">{session.data.absent}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 shadow-[0_12px_45px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{td('insightsEyebrow')}</p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">{td('insightsTitle')}</h2>
                  <p className="text-sm font-medium text-slate-500">{td('insightsDescription')}</p>
                </div>

                <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-gray-100">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      {td('topClassesLabel')}
                    </div>
                    <div className="space-y-3">
                      {topClasses.length > 0 ? topClasses.map((item) => (
                        <div key={item.id} className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-950">{item.name}</p>
                              <p className="mt-1 text-xs font-medium text-slate-400">{td('topClassHelper')}</p>
                            </div>
                            <span className="text-sm font-black text-emerald-600">{Math.round(item.rate || 0)}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${item.rate || 0}%` }} />
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[1rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                          {td('topClassesEmpty')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-gray-100">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      {td('atRiskLabel')}
                    </div>
                    <div className="space-y-3">
                      {atRiskClasses.length > 0 ? atRiskClasses.map((item) => (
                        <div key={item.id} className="rounded-[1rem] border border-amber-100 bg-amber-50/70 px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-950">{item.name}</p>
                              <p className="mt-1 text-xs font-medium text-amber-700">{td('atRiskHelper')}</p>
                            </div>
                            <span className="text-sm font-black text-amber-700">{Math.round(item.rate || 0)}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100/80">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${item.rate || 0}%` }} />
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[1rem] border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-6 text-center text-sm font-medium text-emerald-700">
                          {td('allClearAtRisk')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.12}>
            <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 shadow-[0_12px_45px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-xl">
              <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{td('activityEyebrow')}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{td('activityTitle')}</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">{td('activityDescription')}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {isValidating ? td('syncRefreshing') : td('syncSynced')}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder={td('searchPlaceholder')}
                      className="w-full rounded-[1rem] border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:focus:border-sky-500"
                    />
                  </div>
                </div>

                {recentCheckIns.length > 0 ? (
                  <div className="overflow-x-auto rounded-[1.25rem] border border-slate-200 dark:border-gray-800">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:bg-gray-800/80 dark:text-gray-400">
                        <tr>
                          <th className="px-6 py-4">{td('tableColName')}</th>
                          <th className="px-6 py-4">{td('tableColRole')}</th>
                          <th className="px-6 py-4">{td('tableColDate')}</th>
                          <th className="px-6 py-4">{td('tableColTime')}</th>
                          <th className="px-6 py-4 text-right">{td('tableColActions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white dark:divide-gray-800/50 dark:bg-gray-900/30">
                        {recentCheckIns.map((log, index) => (
                          <tr key={log.id || index} className="transition hover:bg-slate-50/80 dark:hover:bg-gray-800/40">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
                                  {getInitials(log)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-gray-100">
                                    {`${log.teacher?.firstName || ''} ${log.teacher?.lastName || ''}`.trim() || td('fallbackStaffMember')}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 dark:text-gray-400">
                              {log.teacher?.user?.displayName || td('fallbackAcademicStaff')}
                            </td>
                            <td className="px-6 py-4 text-slate-600 dark:text-gray-300 font-medium">
                              {formatDateLabel(log.date)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {log.timeIn ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                    <LogIn className="h-3.5 w-3.5" />
                                    {formatTimeLabel(log.timeIn)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-gray-600">--:--</span>
                                )}
                                {log.timeOut ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                    <LogOut className="h-3.5 w-3.5" />
                                    {formatTimeLabel(log.timeOut)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-gray-600">--:--</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                                <FileEdit className="h-3.5 w-3.5" />
                                {td('editRecord')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-16 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-white dark:bg-gray-900 shadow-sm ring-1 ring-slate-200/80">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950 dark:text-white">{td('emptyCheckInsTitle')}</h3>
                    <p className="mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-gray-400 mx-auto">
                      {td('emptyCheckInsDescription')}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>
    </>
  );
}
