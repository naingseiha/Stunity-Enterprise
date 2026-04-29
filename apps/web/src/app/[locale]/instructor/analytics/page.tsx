'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, DollarSign, GraduationCap, Star, TrendingUp } from 'lucide-react';
import { TokenManager } from '@/lib/api/auth';
import { LEARN_SERVICE_URL } from '@/lib/api/config';
import { FeedInlineLoader } from '@/components/feed/FeedZoomLoader';

import { useTranslations } from 'next-intl';
interface PerformancePoint {
  name: string;
  students: number;
  revenue: number;
}

interface CoursePerformance {
  id: string;
  title: string;
  students: number;
  revenue: number;
  rating: number;
}

interface AnalyticsPayload {
  stats: {
    totalRevenue: number;
    totalStudents: number;
    activeCourses: number;
    averageRating: number;
  };
  performance: PerformancePoint[];
  courses: CoursePerformance[];
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: any;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-800/40 p-5 backdrop-blur-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-sky-500/10 p-3 text-sky-400">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  );
}

export default function InstructorAnalyticsPage() {
    const autoT = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = TokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(`${LEARN_SERVICE_URL}/courses/stats/instructor`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading instructor analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxStudents = useMemo(() => {
    const points = analytics?.performance || [];
    return points.reduce((max, point) => Math.max(max, point.students), 0);
  }, [analytics]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-500"><AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_a3d7e5ba" /></p>
          <h1 className="mt-3 text-3xl font-black text-white"><AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_56ae2d82" /></h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            <AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_a0950914" />
          </p>
        </div>
        <a
          href={`/${locale}/instructor/courses`}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
        >
          <BarChart3 className="h-4 w-4" />
          <AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_0531664c" />
        </a>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <FeedInlineLoader size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label={autoT("auto.web.locale_instructor_analytics_page.k_8d30030a")}
              value={`$${Number(analytics?.stats.totalRevenue || 0).toLocaleString()}`}
              helper="Total earned from course enrollments"
              icon={DollarSign}
            />
            <MetricCard
              label={autoT("auto.web.locale_instructor_analytics_page.k_112753e7")}
              value={Number(analytics?.stats.totalStudents || 0).toLocaleString()}
              helper="Combined enrollments across your portfolio"
              icon={GraduationCap}
            />
            <MetricCard
              label={autoT("auto.web.locale_instructor_analytics_page.k_6bae9f4f")}
              value={Number(analytics?.stats.activeCourses || 0).toLocaleString()}
              helper="Published courses currently in circulation"
              icon={TrendingUp}
            />
            <MetricCard
              label={autoT("auto.web.locale_instructor_analytics_page.k_8d1d2b71")}
              value={Number(analytics?.stats.averageRating || 0).toFixed(1)}
              helper="Average rating across your instructor catalog"
              icon={Star}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white"><AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_732d0b67" /></h2>
                <p className="text-sm text-slate-400"><AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_87dc9d69" /></p>
              </div>

              {(analytics?.performance || []).length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-800/20 px-6 py-16 text-center">
                  <TrendingUp className="mx-auto h-10 w-10 text-slate-600" />
                  <p className="mt-4 text-sm text-slate-400"><AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_814ab9b7" /></p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(analytics?.performance || []).map((point) => {
                    const width = maxStudents > 0 ? Math.max((point.students / maxStudents) * 100, 6) : 6;
                    return (
                      <div key={point.name}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-200">{point.name}</span>
                          <span className="text-slate-400">
                            {point.students.toLocaleString()} <AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_ed6956c0" />{point.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-800">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white"><AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_70467215" /></h2>
                <p className="text-sm text-slate-400"><AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_39898ee8" /></p>
              </div>

              <div className="space-y-3">
                {(analytics?.courses || []).length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-800/20 px-6 py-14 text-center text-sm text-slate-400">
                    <AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_cdefc09c" />
                  </div>
                ) : (
                  (analytics?.courses || []).map((course, index) => (
                    <div key={course.id} className="rounded-3xl border border-slate-800 bg-slate-800/30 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-black tracking-[0.2em] text-slate-500">#{index + 1}</span>
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-sky-400">
                          ${Number(course.revenue || 0).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="truncate text-base font-bold text-white">{course.title}</h3>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                        <span>{Number(course.students || 0).toLocaleString()} <AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_28f91943" /></span>
                        <span>{Number(course.rating || 0).toFixed(1)} <AutoI18nText i18nKey="auto.web.locale_instructor_analytics_page.k_5c51ff7d" /></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
