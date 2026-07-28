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
  Download,
  Image as ImageIcon,
  FileDown,
  TrendingUp,
  Award,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import CompactHeroCard from '@/components/layout/CompactHeroCard';
import AnimatedContent from '@/components/AnimatedContent';
import BlurLoader from '@/components/BlurLoader';
import StatCard from '@/components/dashboard/StatCard';
import { TokenManager } from '@/lib/api/auth';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useClasses } from '@/hooks/useClasses';
import { getSchoolReportsDashboard, SchoolReportsDashboardResponse, ReportPeriodType } from '@/lib/api/reports';
import { canViewReportsDashboard, isSchoolWideReportsRole } from '@/lib/permissions/reports';
import { KHMER_MONTHS, getKhmerMonthDisplayName } from '@/lib/reports/templates/khm-moeys/months';
import { formatKhmerDate } from '@/lib/reports/templates/khm-moeys/khmer-date';
import {
  captureDashboardImage,
  downloadDashboardJpg,
  downloadDashboardPdf,
  safeDashboardFileName,
} from '@/lib/export/dashboardExport';

const PASS_COLOR = '#10b981';
const FAIL_COLOR = '#ef4444';
const BAR_COLORS = ['#0891b2', '#6366f1', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#22c55e', '#f97316'];

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
    setSchool(userData.school);
  }, [locale, router]);

  const hasAccess = canViewReportsDashboard(user?.role);
  const canDrillDownByClass = isSchoolWideReportsRole(user?.role);

  const { classes } = useClasses({ academicYearId: activeYear?.id || undefined, limit: 200 });

  const academicStartYear = useMemo(() => {
    const parsed = activeYear?.name ? parseInt(activeYear.name.split('-')[0], 10) : NaN;
    return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
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

  const passRatePieData = data
    ? [
        { name: t('passingLabel'), value: data.passRate.passing },
        { name: t('failingLabel'), value: data.passRate.failing },
      ]
    : [];

  const showClassRanking = (data?.averageScoreByClass.length || 0) > 1;
  const showTopBottom = Boolean(data?.scope.schoolWide) && (data?.topPerformingClasses.length || 0) > 0;

  const handleExport = async (kind: 'jpg' | 'pdf') => {
    if (!exportRef.current || !data) return;
    setExporting(kind);
    try {
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
    <>
      <UnifiedNavigation user={user} school={school} />
      <div className="lg:ml-64 min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.12),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.08),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_52%,#f8fafc_100%)]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!hasAccess ? (
            <AnimatedContent>
              <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white px-6 py-16 text-center shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-rose-50 text-rose-600 shadow-inner">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950">{t('accessDenied')}</h3>
              </section>
            </AnimatedContent>
          ) : (
            <>
              <AnimatedContent>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
                  <CompactHeroCard
                    eyebrow={t('eyebrow')}
                    title={t('title')}
                    description={t('description')}
                    icon={BarChart3}
                    backgroundClassName="bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(236,254,255,0.97)_56%,rgba(240,253,250,0.92))] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.99),rgba(19,58,58,0.5)_48%,rgba(15,23,42,0.92))]"
                    glowClassName="bg-[radial-gradient(circle_at_top,rgba(8,145,178,0.18),transparent_58%)] dark:opacity-50"
                    eyebrowClassName="text-cyan-700/80"
                    iconShellClassName="bg-cyan-950 text-white"
                    actions={
                      <>
                        <button
                          onClick={() => handleExport('jpg')}
                          disabled={!data || exporting !== null}
                          className="inline-flex items-center gap-2 rounded-full bg-cyan-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {exporting === 'jpg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                          {t('exportJpg')}
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          disabled={!data || exporting !== null}
                          className="inline-flex items-center gap-2 rounded-full border border-cyan-950 px-4 py-2.5 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                          {t('exportPdf')}
                        </button>
                      </>
                    }
                  />

                  <div className="overflow-hidden rounded-[1.9rem] border border-cyan-200/70 bg-[linear-gradient(145deg,rgba(8,51,68,0.98),rgba(8,145,178,0.9)_52%,rgba(20,184,166,0.85))] p-6 text-white shadow-[0_36px_100px_-46px_rgba(8,51,68,0.5)] ring-1 ring-white/10">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100/80">{t('passRateTitle')}</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-5xl font-black tracking-tight">{data?.passRate.passRatePercent ?? 0}%</span>
                      <span className="pb-2 text-sm font-bold uppercase tracking-[0.26em] text-cyan-100/75">{scaleLabel}</span>
                    </div>
                    <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200"
                        style={{ width: `${Math.min(100, data?.passRate.passRatePercent ?? 0)}%` }}
                      />
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                        <p className="text-lg font-black tracking-tight">{data?.passRate.passing ?? 0}</p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/80">{t('passingLabel')}</p>
                      </div>
                      <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                        <p className="text-lg font-black tracking-tight">{data?.passRate.failing ?? 0}</p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-100/80">{t('failingLabel')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedContent>

              <AnimatedContent delay={0.04}>
                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/75 bg-white shadow-[0_30px_85px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70">
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-4 sm:px-6">
                    {(['month', 'semester', 'year'] as ReportPeriodType[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                          period === p ? 'bg-cyan-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p === 'month' ? t('periodMonth') : p === 'semester' ? t('periodSemester') : t('periodYear')}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-3">
                    {period === 'month' && (
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{t('periodMonth')}</span>
                        <select
                          value={monthNumber}
                          onChange={(e) => setMonthNumber(Number(e.target.value))}
                          className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                        >
                          {KHMER_MONTHS.map((m) => (
                            <option key={m.number} value={m.number}>
                              {getKhmerMonthDisplayName(m.number, m.label)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {period === 'semester' && (
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{t('periodSemester')}</span>
                        <select
                          value={semester}
                          onChange={(e) => setSemester(e.target.value as '1' | '2')}
                          className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                        >
                          <option value="1">{t('semester1')}</option>
                          <option value="2">{t('semester2')}</option>
                        </select>
                      </label>
                    )}

                    {canDrillDownByClass && (
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{t('classFilterLabel')}</span>
                        <select
                          value={classFilter}
                          onChange={(e) => setClassFilter(e.target.value)}
                          className="h-12 w-full rounded-[0.95rem] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                        >
                          <option value="">{t('classFilterAll')}</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </section>
              </AnimatedContent>

              <BlurLoader isLoading={loading} showSpinner={false}>
                {error ? (
                  <AnimatedContent delay={0.06}>
                    <section className="mt-5 rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-10 text-center text-rose-700">
                      {error}
                    </section>
                  </AnimatedContent>
                ) : (
                  <div ref={exportRef} className="bg-white">
                    <AnimatedContent delay={0.06}>
                      <div className="mt-5 flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-slate-50/60 px-5 py-4">
                        <div>
                          <p className="text-lg font-black tracking-tight text-slate-950">{school?.name || ''}</p>
                          <p className="text-sm font-medium text-slate-500">{data?.period.khmerLabel || data?.period.label}</p>
                        </div>
                        <p className="text-xs font-medium text-slate-400">{formatKhmerDate(new Date())}</p>
                      </div>
                    </AnimatedContent>

                    <AnimatedContent delay={0.08}>
                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard title={t('overviewStudents')} value={data?.overview.totalStudents ?? 0} icon={Users} iconColor="blue" />
                        <StatCard title={t('overviewTeachers')} value={data?.overview.totalTeachers ?? 0} icon={GraduationCap} iconColor="purple" />
                        <StatCard title={t('overviewClasses')} value={data?.overview.totalClasses ?? 0} icon={School} iconColor="amber" />
                        <StatCard title={t('overviewAttendance')} value={`${data?.overview.attendanceRate ?? 0}%`} icon={TrendingUp} iconColor="green" />
                      </div>
                    </AnimatedContent>

                    <AnimatedContent delay={0.1}>
                      <div className="mt-5 grid gap-5 lg:grid-cols-2">
                        <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70">
                          <h3 className="text-xl font-black tracking-tight text-slate-950">{t('averageByGrade')}</h3>
                          <div className="mt-4 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data?.averageScoreByGradeLevel || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="grade" stroke="#64748b" fontSize={12} />
                                <YAxis domain={[0, data?.scale.maxAverage || 100]} stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="average" radius={[8, 8, 0, 0]} fill="#0891b2" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>

                        <section className="overflow-hidden rounded-[1.55rem] border border-white/75 bg-white p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70">
                          <h3 className="text-xl font-black tracking-tight text-slate-950">{t('averageBySubject')}</h3>
                          <div className="mt-4 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={data?.averageScoreBySubject || []} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                                <YAxis type="category" dataKey="subjectKh" stroke="#64748b" fontSize={11} width={90} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="average" radius={[0, 8, 8, 0]}>
                                  {(data?.averageScoreBySubject || []).map((_, index) => (
                                    <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </section>
                      </div>
                    </AnimatedContent>

                    <AnimatedContent delay={0.12}>
                      <section className="mt-5 overflow-hidden rounded-[1.55rem] border border-white/75 bg-white p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70">
                        <h3 className="text-xl font-black tracking-tight text-slate-950">{t('trendTitle')}</h3>
                        <div className="mt-4 h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data?.trend || []}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="khmerLabel" stroke="#64748b" fontSize={12} />
                              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
                              <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0' }} />
                              <Legend />
                              <Line type="monotone" dataKey="average" name={t('trendAverage')} stroke="#0891b2" strokeWidth={3} dot={{ r: 4 }} />
                              <Line type="monotone" dataKey="attendanceRate" name={t('trendAttendance')} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                    </AnimatedContent>

                    {showTopBottom && (
                      <AnimatedContent delay={0.14}>
                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                          <section className="overflow-hidden rounded-[1.55rem] border border-emerald-200 bg-emerald-50/50 p-6">
                            <h3 className="flex items-center gap-2 text-lg font-black tracking-tight text-emerald-800">
                              <Award className="h-5 w-5" /> {t('topPerforming')}
                            </h3>
                            <ul className="mt-4 space-y-2">
                              {data?.topPerformingClasses.map((c) => (
                                <li key={c.classId} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                                  <span className="font-semibold text-slate-800">{c.className}</span>
                                  <span className="font-black text-emerald-600">{c.average}</span>
                                </li>
                              ))}
                            </ul>
                          </section>

                          <section className="overflow-hidden rounded-[1.55rem] border border-rose-200 bg-rose-50/50 p-6">
                            <h3 className="text-lg font-black tracking-tight text-rose-800">{t('bottomPerforming')}</h3>
                            <ul className="mt-4 space-y-2">
                              {data?.bottomPerformingClasses.map((c) => (
                                <li key={c.classId} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                                  <span className="font-semibold text-slate-800">{c.className}</span>
                                  <span className="font-black text-rose-600">{c.average}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        </div>
                      </AnimatedContent>
                    )}

                    {showClassRanking && (
                      <AnimatedContent delay={0.16}>
                        <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-white/75 bg-white shadow-[0_26px_75px_-42px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/70">
                          <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                            <h3 className="text-xl font-black tracking-tight text-slate-950">{t('averageByClass')}</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                              <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('rank')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('classFilterLabel')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('studentsCount')}</th>
                                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{t('averageByClass')}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {data?.averageScoreByClass.map((c) => (
                                  <tr key={c.classId} className="hover:bg-slate-50">
                                    <td className="px-5 py-3 font-bold text-slate-500">{c.rank}</td>
                                    <td className="px-5 py-3 font-semibold text-slate-800">{c.className}</td>
                                    <td className="px-5 py-3 text-slate-600">{c.studentCount}</td>
                                    <td className="px-5 py-3 font-black text-slate-950">{c.average}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      </AnimatedContent>
                    )}

                    {!loading && data && data.overview.totalStudents === 0 && (
                      <AnimatedContent delay={0.06}>
                        <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                          {t('noData')}
                        </section>
                      </AnimatedContent>
                    )}
                  </div>
                )}
              </BlurLoader>
            </>
          )}
        </main>
      </div>
    </>
  );
}
