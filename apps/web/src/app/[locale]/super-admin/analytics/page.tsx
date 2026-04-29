'use client';

import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getSuperAdminAnalytics, SuperAdminAnalytics } from '@/lib/api/super-admin';
import AnimatedContent from '@/components/AnimatedContent';
import {
  TrendingUp,
  Home,
  ChevronRight,
  School,
  Users,
  BarChart3,
  Loader2,
} from 'lucide-react';

export default function SuperAdminAnalyticsPage() {
    const autoT = useTranslations();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [analytics, setAnalytics] = useState<SuperAdminAnalytics | null>(null);
  const t = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    getSuperAdminAnalytics(months)
      .then((res) => { setAnalytics(res.data); setError(null); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [months]);

  if (loading && !analytics) {
    return (
      <div className="flex justify-center min-h-[400px] items-center">
        <Loader2 className="w-12 h-12 text-stunity-primary-500 animate-spin" />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> <AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_2f5e2340" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-medium"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_fc28329d" /></span>
        </nav>
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">{error}</div>
      </div>
    );
  }

  const { schoolsPerMonth, usersPerMonth, topSchools, summary } = analytics || {
    schoolsPerMonth: [], usersPerMonth: [], topSchools: [], summary: { totalSchools: 0, totalUsers: 0, activeSchools: 0 },
  };
  const maxSchools = Math.max(1, ...schoolsPerMonth.map((d) => d.count));
  const maxUsers = Math.max(1, ...usersPerMonth.map((d) => d.count));

  return (
    <div className="space-y-6">
      <AnimatedContent animation="fade" delay={0}>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={`/${locale}/super-admin`} className="hover:text-stunity-primary-600 flex items-center gap-1">
            <Home className="h-4 w-4" /> <AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_2f5e2340" />
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-medium"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_66a9b3a1" /></span>
        </nav>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={50}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-stunity-primary-100 rounded-xl">
              <TrendingUp className="h-8 w-8 text-stunity-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_66a9b3a1" /></h1>
              <p className="text-gray-600 mt-1"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_2eb56527" /></p>
            </div>
          </div>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-stunity-primary-500"
          >
            <option value={6}>{autoT("auto.web.super_admin_analytics_page.k_5e433de3")}</option>
            <option value={12}>{autoT("auto.web.super_admin_analytics_page.k_c2438c1c")}</option>
            <option value={24}>{autoT("auto.web.super_admin_analytics_page.k_b5906701")}</option>
          </select>
        </div>
      </AnimatedContent>

      <AnimatedContent animation="slide-up" delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <School className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_5f831aed" /></p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalSchools}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_a811b350" /></p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm text-gray-500"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_e6820b00" /></p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.activeSchools}</p>
              </div>
            </div>
          </div>
        </div>
      </AnimatedContent>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedContent animation="slide-up" delay={150}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_19dc9317" /></h3>
            </div>
            <div className="p-6">
              {schoolsPerMonth.length === 0 ? (
                <p className="text-gray-500 text-center py-8"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_b99f77d9" /></p>
              ) : (
                <div className="space-y-3">
                  {schoolsPerMonth.map((d) => (
                    <div key={d.month} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-20">{d.month}</span>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-stunity-primary-500 rounded"
                          style={{ width: `${(d.count / maxSchools) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AnimatedContent>

        <AnimatedContent animation="slide-up" delay={200}>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_a328f90b" /></h3>
            </div>
            <div className="p-6">
              {usersPerMonth.length === 0 ? (
                <p className="text-gray-500 text-center py-8"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_b99f77d9" /></p>
              ) : (
                <div className="space-y-3">
                  {usersPerMonth.map((d) => (
                    <div key={d.month} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-20">{d.month}</span>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded"
                          style={{ width: `${(d.count / maxUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-8">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AnimatedContent>
      </div>

      <AnimatedContent animation="slide-up" delay={250}>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_fbae730b" /></h3>
          </div>
          {topSchools.length === 0 ? (
            <div className="p-8 text-center text-gray-500"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_b51e6ad1" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_8ae0487c" /></th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_0fc10dc5" /></th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_b2dd0511" /></th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase"><AutoI18nText i18nKey="auto.web.super_admin_analytics_page.k_d8e8f49c" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topSchools.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <Link href={`/${locale}/super-admin/schools/${s.id}`} className="text-stunity-primary-600 hover:underline font-medium">
                          {s.name}
                        </Link>
                        <span className="text-gray-400 ml-1 text-sm">({s.slug})</span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{s.currentStudents}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{s.currentTeachers}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                          {s.subscriptionTier?.replace(/_/g, ' ') || '–'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AnimatedContent>
    </div>
  );
}
