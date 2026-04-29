'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { use, useEffect, useMemo, useState } from 'react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useAttendanceSummary, type AttendanceSummaryRange } from '@/hooks/useAttendanceSummary';
import { TokenManager } from '@/lib/api/auth';
import AnimatedContent from '@/components/AnimatedContent';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  LogIn,
  LogOut,
  ShieldAlert,
  TrendingUp,
  Users,
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
      'border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/90 to-teal-50/80 shadow-emerald-500/10',
    sky: 'border-sky-100/80 bg-gradient-to-br from-white via-sky-50/90 to-cyan-50/80 shadow-sky-500/10',
    amber:
      'border-amber-100/80 bg-gradient-to-br from-white via-amber-50/90 to-orange-50/80 shadow-amber-500/10',
    violet:
      'border-violet-100/80 bg-gradient-to-br from-white via-violet-50/90 to-indigo-50/80 shadow-violet-500/10',
  };

  return (
    <div
      className={`rounded-[1.45rem] border p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-white/80 transition-all duration-300 hover:shadow-[0_25px_60px_-12px_rgba(15,23,42,0.16)] ${tones[tone]}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function formatDateLabel(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeLabel(value?: string | null) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(log: CheckInLog) {
  const first = log.teacher?.firstName?.charAt(0) || '';
  const last = log.teacher?.lastName?.charAt(0) || '';
  const initials = `${first}${last}`.trim();
  return initials || 'ST';
}

export default function AttendanceDashboardPage(props: { params: Promise<{ locale: string }> }) {
    const autoT = useTranslations();
  const params = use(props.params);
  const { locale } = params;
  const t = useTranslations('attendance');
  const { schoolId } = useAcademicYear();
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [dateRange, setDateRange] = useState<AttendanceSummaryRange>('month');
  const dateRangeOptions: Array<{ id: AttendanceSummaryRange; label: string; shortLabel: string }> = [
    { id: 'day', label: t('today'), shortLabel: 'Day' },
    { id: 'week', label: t('thisWeek'), shortLabel: 'Week' },
    { id: 'month', label: t('thisMonth'), shortLabel: 'Month' },
    { id: 'semester', label: t('semester'), shortLabel: 'Term' },
  ];

  useEffect(() => {
    const userData = TokenManager.getUserData();
    if (userData) {
      setUser(userData.user);
      setSchool(userData.school);
    }
  }, []);

  const { data, isLoading, isValidating, error, mutate } = useAttendanceSummary(schoolId, dateRange);

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

  const combinedPresent = (stats.totals.present || 0) + (stats.teacherTotals?.present || 0);
  const readyScore = Math.round(((stats.attendanceRate || 0) + (stats.teacherAttendanceRate || 0)) / 2);
  const totalCheckIns = recentCheckIns.length;
  const rangeLabel = dateRangeOptions.find((item) => item.id === dateRange)?.label || t('thisMonth');

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

  const handleLogout = async () => {
    await TokenManager.logout();
    window.location.href = `/${locale}/auth/login`;
  };

  if (isLoading && !data) {
    return (
      <>
        <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)] px-6 lg:ml-64">
          <div className="rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 px-10 py-12 text-center shadow-[0_32px_100px_-42px_rgba(15,23,42,0.34)] ring-1 ring-slate-200/70 backdrop-blur-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            <p className="mt-4 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_6c8a0d3d" /></p>
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
                eyebrow="Attendance Ops"
                title={autoT("auto.web.locale_attendance_dashboard_page.k_d1373727")}
                description="Monitor school-wide attendance in one clearer dashboard."
                icon={BarChart3}
                backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(240,249,255,0.97)_56%,rgba(236,253,245,0.9))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(30,41,59,0.96)_48%,rgba(15,23,42,0.92))]"
                glowClassName="bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_58%)] dark:opacity-50"
                eyebrowClassName="text-sky-600"
                actions={
                  <div className="flex flex-wrap gap-2 rounded-[1rem] border border-white/70 bg-white dark:bg-gray-900/70 p-1.5 shadow-sm backdrop-blur-sm">
                    {dateRangeOptions.map((range) => (
                      <button
                        key={range.id}
                        onClick={() => setDateRange(range.id)}
                        className={`inline-flex items-center gap-2 rounded-[0.85rem] px-4 py-2 text-sm font-semibold transition ${
                          dateRange === range.id
                            ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10'
                            : 'text-slate-500 hover:text-slate-800 dark:text-gray-100'
                        }`}
                      >
                        <CalendarDays className={`h-4 w-4 ${dateRange === range.id ? 'text-white' : 'text-sky-500'}`} />
                        {range.label}
                      </button>
                    ))}
                  </div>
                }
              />

              <div className="overflow-hidden rounded-[1.9rem] border border-sky-200/70 bg-[linear-gradient(145deg,rgba(12,74,110,0.98),rgba(2,132,199,0.94)_52%,rgba(15,118,110,0.9))] p-5 text-white shadow-[0_20px_50px_-12px_rgba(12,74,110,0.3)] ring-1 ring-white/10 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-sky-100/80"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_6fb018fe" /></p>
                    <div className="mt-2.5 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{readyScore}%</span>
                      <span className="pb-1.5 text-sm font-bold uppercase tracking-[0.26em] text-sky-100/75"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_a53699a5" /></span>
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] bg-white dark:bg-none dark:bg-gray-900/10 p-3.5 ring-1 ring-white/10 backdrop-blur">
                    <BarChart3 className="h-6 w-6 text-sky-100" />
                  </div>
                </div>
                <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white dark:bg-none dark:bg-gray-900/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-200 via-cyan-200 to-sky-200"
                    style={{ width: `${readyScore}%` }}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {[
                    { label: 'Range', value: dateRangeOptions.find((item) => item.id === dateRange)?.shortLabel || 'Month' },
                    { label: 'At Risk', value: atRiskClasses.length },
                    { label: 'Check-ins', value: totalCheckIns },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white dark:bg-gray-900/5 px-2 py-3 text-center backdrop-blur-sm">
                      <p className="text-[17px] font-black tracking-tighter text-white sm:text-lg">{item.value}</p>
                      <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-sky-100/70">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white dark:bg-gray-900/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-sky-50/90">
                  {rangeLabel} <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_33869f7c" />
                </div>
              </div>
            </div>
          </AnimatedContent>

          <AnimatedContent delay={0.05}>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={autoT("auto.web.locale_attendance_dashboard_page.k_38f95710")} value={`${stats.attendanceRate || 0}%`} helper="Average learner attendance" tone="emerald" />
              <MetricCard label={autoT("auto.web.locale_attendance_dashboard_page.k_2859a7c2")} value={`${stats.teacherAttendanceRate || 0}%`} helper="Teacher check-in coverage" tone="sky" />
              <MetricCard label={autoT("auto.web.locale_attendance_dashboard_page.k_6369ac90")} value={combinedPresent} helper="Combined active attendance" tone="violet" />
              <MetricCard label={autoT("auto.web.locale_attendance_dashboard_page.k_c71d8f00")} value={stats.classCount || topClasses.length || atRiskClasses.length} helper="Classes in the current view" tone="amber" />
            </div>
          </AnimatedContent>

          {error ? (
            <AnimatedContent delay={0.08}>
              <div className="mt-5 flex items-start gap-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900 shadow-sm">
                <div className="rounded-xl bg-rose-100 p-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.18em]"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_60a29c9b" /></p>
                  <p className="mt-1 text-sm font-medium">{error.message}</p>
                </div>
                <button
                  onClick={() => void mutate()}
                  className="inline-flex items-center gap-2 rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_e682f3c3" />
                </button>
              </div>
            </AnimatedContent>
          ) : null}

          <AnimatedContent delay={0.1}>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-gray-900/90 shadow-[0_12px_45px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_ba83559f" /></p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_ed38d440" /></h2>
                    <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_291673b6" /></p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5 text-sky-500" />
                    <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_d97be827" />
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
                  {sessionCards.map((session) => (
                    <div key={session.session} className="rounded-[1.25rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{session.session}</p>
                          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{session.rate}%</p>
                        </div>
                        <div className={`rounded-[1rem] px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] ${session.rate >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {session.rate >= 90 ? 'Healthy' : 'Watch'}
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
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_a7aa91b5" /></p>
                          <p className="mt-2 font-bold text-slate-950">{session.data.present}</p>
                        </div>
                        <div className="rounded-[0.95rem] bg-white dark:bg-none dark:bg-gray-900 px-3 py-3 ring-1 ring-slate-200/70">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_859646a0" /></p>
                          <p className="mt-2 font-bold text-slate-950">{session.data.late}</p>
                        </div>
                        <div className="rounded-[0.95rem] bg-white dark:bg-none dark:bg-gray-900 px-3 py-3 ring-1 ring-slate-200/70">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_32e850b0" /></p>
                          <p className="mt-2 font-bold text-slate-950">{session.data.absent}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-[1.75rem] border border-white/75 bg-white dark:bg-none dark:bg-gray-900/90 shadow-[0_12px_45px_-16px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70 backdrop-blur-xl">
                <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-gray-800/80 px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_945d3f1f" /></p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_c0566164" /></h2>
                  <p className="text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_09ad3de5" /></p>
                </div>

                <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-gray-100">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_fc3c8660" />
                    </div>
                    <div className="space-y-3">
                      {topClasses.length > 0 ? topClasses.map((item) => (
                        <div key={item.id} className="rounded-[1rem] border border-slate-200 dark:border-gray-800/70 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-950">{item.name}</p>
                              <p className="mt-1 text-xs font-medium text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_d26f2389" /></p>
                            </div>
                            <span className="text-sm font-black text-emerald-600">{Math.round(item.rate || 0)}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${item.rate || 0}%` }} />
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[1rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-4 py-6 text-center text-sm font-medium text-slate-500">
                          <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_af428a0e" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-gray-100">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_32a2ee90" />
                    </div>
                    <div className="space-y-3">
                      {atRiskClasses.length > 0 ? atRiskClasses.map((item) => (
                        <div key={item.id} className="rounded-[1rem] border border-amber-100 bg-amber-50/70 px-4 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-slate-950">{item.name}</p>
                              <p className="mt-1 text-xs font-medium text-amber-700"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_0a214e59" /></p>
                            </div>
                            <span className="text-sm font-black text-amber-700">{Math.round(item.rate || 0)}%</span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100/80">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${item.rate || 0}%` }} />
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[1rem] border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-6 text-center text-sm font-medium text-emerald-700">
                          <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_3a02a544" />
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
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_91092d12" /></p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_8b520227" /></h2>
                  <p className="mt-2 text-sm font-medium text-slate-500"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_2b1c5cb8" /></p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-none dark:bg-gray-800/50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {isValidating ? 'Refreshing' : 'Synced'}
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6 sm:py-6">
                {recentCheckIns.length > 0 ? (
                  <div className="space-y-3">
                    {recentCheckIns.map((log, index) => (
                      <div key={log.id || index} className="rounded-[1.15rem] border border-slate-200 dark:border-gray-800/80 bg-slate-50 dark:bg-gray-800/50 px-4 py-4 transition hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 sm:px-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-sm">
                              {getInitials(log)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-950">
                                {`${log.teacher?.firstName || ''} ${log.teacher?.lastName || ''}`.trim() || 'Staff member'}
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-400">
                                {log.teacher?.user?.displayName || 'Academic staff'}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                            <div className="rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-3 ring-1 ring-slate-200/70">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_632037a2" /></p>
                              <p className="mt-2 text-sm font-bold text-slate-950">{formatDateLabel(log.date)}</p>
                            </div>
                            <div className="rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-3 ring-1 ring-slate-200/70">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_736e60dc" /></p>
                              <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-950">
                                <LogIn className="h-4 w-4 text-sky-500" />
                                {formatTimeLabel(log.timeIn)}
                              </p>
                            </div>
                            <div className="rounded-[0.95rem] bg-white dark:bg-gray-900 px-4 py-3 ring-1 ring-slate-200/70">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_b4162666" /></p>
                              <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-950">
                                <LogOut className="h-4 w-4 text-amber-500" />
                                {formatTimeLabel(log.timeOut)}
                              </p>
                            </div>
                          </div>

                          <div className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] ${log.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {log.status || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.2rem] border border-dashed border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50 px-6 py-16 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1rem] bg-white dark:bg-gray-900 shadow-sm ring-1 ring-slate-200/80">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="mt-5 text-lg font-black tracking-tight text-slate-950"><AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_1a51529a" /></h3>
                    <p className="mt-2 max-w-md text-sm font-medium text-slate-500 mx-auto">
                      <AutoI18nText i18nKey="auto.web.locale_attendance_dashboard_page.k_365a86a1" />
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
