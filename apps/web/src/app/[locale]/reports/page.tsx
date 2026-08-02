'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Award,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileBarChart2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';
import PageSkeleton from '@/components/layout/PageSkeleton';
import { TokenManager } from '@/lib/api/auth';
import { canViewReportsDashboard } from '@/lib/permissions/reports';

type ReportTool = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan';
  sectionTitle?: string;
  requiresReportsAccess?: boolean;
};

type ReportSection = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tools: ReportTool[];
};

const toneStyles: Record<ReportTool['tone'], { icon: string; arrow: string; hover: string; glow: string }> = {
  blue: {
    icon: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
    arrow: 'group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500',
    hover: 'hover:border-blue-100 dark:hover:border-blue-900',
    glow: 'group-hover:shadow-blue-100/80 dark:group-hover:shadow-blue-950/20',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900',
    arrow: 'group-hover:bg-violet-600 group-hover:text-white dark:group-hover:bg-violet-500',
    hover: 'hover:border-violet-100 dark:hover:border-violet-900',
    glow: 'group-hover:shadow-violet-100/80 dark:group-hover:shadow-violet-950/20',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
    arrow: 'group-hover:bg-emerald-600 group-hover:text-white dark:group-hover:bg-emerald-500',
    hover: 'hover:border-emerald-100 dark:hover:border-emerald-900',
    glow: 'group-hover:shadow-emerald-100/80 dark:group-hover:shadow-emerald-950/20',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    arrow: 'group-hover:bg-amber-500 group-hover:text-white dark:group-hover:bg-amber-500',
    hover: 'hover:border-amber-100 dark:hover:border-amber-900',
    glow: 'group-hover:shadow-amber-100/80 dark:group-hover:shadow-amber-950/20',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
    arrow: 'group-hover:bg-rose-600 group-hover:text-white dark:group-hover:bg-rose-500',
    hover: 'hover:border-rose-100 dark:hover:border-rose-900',
    glow: 'group-hover:shadow-rose-100/80 dark:group-hover:shadow-rose-950/20',
  },
  cyan: {
    icon: 'bg-cyan-50 text-cyan-600 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900',
    arrow: 'group-hover:bg-cyan-600 group-hover:text-white dark:group-hover:bg-cyan-500',
    hover: 'hover:border-cyan-100 dark:hover:border-cyan-900',
    glow: 'group-hover:shadow-cyan-100/80 dark:group-hover:shadow-cyan-950/20',
  },
};

export default function ReportsHubPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = use(props.params);
  const router = useRouter();
  const t = useTranslations('reportsHub');
  const [user, setUser] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
      return;
    }

    const userData = TokenManager.getUserData();
    setUser(userData.user);
    setSchool(userData.school);
    setLoading(false);
  }, [locale, router]);

  const hasReportsAccess = canViewReportsDashboard(user?.role);

  const sections = useMemo<ReportSection[]>(() => {
    const allSections: ReportSection[] = [
      {
        key: 'performance',
        title: t('performance'),
        description: t('performanceDescription'),
        icon: LineChart,
        tools: [
          {
            key: 'dashboard',
            title: t('reportsDashboard'),
            description: t('reportsDashboardDescription'),
            href: `/${locale}/reports/dashboard`,
            icon: LayoutDashboard,
            tone: 'blue',
            requiresReportsAccess: true,
          },
          {
            key: 'grade-analytics',
            title: t('gradeAnalytics'),
            description: t('gradeAnalyticsDescription'),
            href: `/${locale}/grades/analytics`,
            icon: TrendingUp,
            tone: 'violet',
          },
          {
            key: 'year-comparison',
            title: t('yearComparison'),
            description: t('yearComparisonDescription'),
            href: `/${locale}/reports/year-comparison`,
            icon: FileBarChart2,
            tone: 'emerald',
          },
        ],
      },
      {
        key: 'records',
        title: t('records'),
        description: t('recordsDescription'),
        icon: GraduationCap,
        tools: [
          {
            key: 'report-cards',
            title: t('reportCards'),
            description: t('reportCardsDescription'),
            href: `/${locale}/grades/reports`,
            icon: FileText,
            tone: 'blue',
          },
          {
            key: 'monthly-report',
            title: t('monthlyReport'),
            description: t('monthlyReportDescription'),
            href: `/${locale}/grades/monthly-report`,
            icon: CalendarDays,
            tone: 'amber',
          },
          {
            key: 'attendance-reports',
            title: t('attendanceReports'),
            description: t('attendanceReportsDescription'),
            href: `/${locale}/attendance/reports`,
            icon: ClipboardCheck,
            tone: 'cyan',
          },
        ],
      },
      {
        key: 'creative',
        title: t('creative'),
        description: t('creativeDescription'),
        icon: Sparkles,
        tools: [
          {
            key: 'poster-studio',
            title: t('posterStudio'),
            description: t('posterStudioDescription'),
            href: `/${locale}/reports/poster-studio`,
            icon: Award,
            tone: 'rose',
            requiresReportsAccess: true,
          },
          {
            key: 'certificate-studio',
            title: t('certificateStudio'),
            description: t('certificateStudioDescription'),
            href: `/${locale}/reports/certificate-studio`,
            icon: ScrollText,
            tone: 'amber',
            requiresReportsAccess: true,
          },
        ],
      },
    ];

    return allSections
      .map((section) => ({
        ...section,
        tools: section.tools.filter((tool) => !tool.requiresReportsAccess || hasReportsAccess),
      }))
      .filter((section) => section.tools.length > 0);
  }, [hasReportsAccess, locale, t]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="dashboard" />;
  }

  const tools = sections.flatMap((section) => section.tools.map((tool) => ({ ...tool, sectionTitle: section.title })));
  const toolCount = tools.length;
  const featuredTool = tools.find((tool) => tool.key === 'dashboard');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="min-h-[calc(100vh-4rem)] lg:ml-64">
        <div className="mx-auto max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <nav className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400" aria-label="Breadcrumb">
                  <Link href={`/${locale}/dashboard`} className="transition-colors hover:text-blue-600">
                    {t('backToDashboard')}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-slate-600 dark:text-slate-300">{t('title')}</span>
                </nav>
                <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  {t('mainFeatures')}
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 sm:text-[15px]">
                  {t('description')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/${locale}/reports`}
                  className="inline-flex h-11 items-center rounded-xl px-1 text-lg font-black text-blue-600 transition hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  {t('viewPortfolio')}
                </Link>
                <Link
                  href={`/${locale}/reports/dashboard`}
                  className="hidden h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white shadow-sm transition hover:bg-blue-600 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100 sm:inline-flex"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t('openDashboard')}
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <section aria-label={t('mainFeatures')} className="grid gap-4 md:grid-cols-2 xl:gap-5">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const tone = toneStyles[tool.tone];
                return (
                  <Link
                    key={tool.key}
                    href={tool.href}
                    className={`group flex min-h-32 items-center gap-4 rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.32)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_-30px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900 ${tone.hover} ${tone.glow}`}
                  >
                    <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-[1.1rem] ring-1 ${tone.icon}`}>
                      <Icon className="h-7 w-7" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-white">
                          {tool.title}
                        </h2>
                        {tool.key === 'dashboard' ? (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900">
                            {t('recommended')}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">
                        {tool.description}
                      </p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        {tool.sectionTitle}
                      </p>
                    </div>
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-slate-400 transition-all dark:bg-slate-800 dark:text-slate-500 ${tone.arrow}`}>
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </section>

            <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
              <section className="overflow-hidden rounded-[1.55rem] bg-slate-950 p-5 text-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.75)] dark:bg-blue-600">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 dark:text-blue-50/80">
                      {t('recommended')}
                    </p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight">
                      {t('featuredTitle')}
                    </h2>
                  </div>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <LayoutDashboard className="h-6 w-6" />
                  </span>
                </div>
                <p className="mt-5 text-sm font-medium leading-6 text-slate-300 dark:text-blue-100/85">
                  {t('featuredDescription')}
                </p>
                <Link
                  href={featuredTool?.href ?? `/${locale}/reports/dashboard`}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-slate-950 transition hover:bg-blue-50"
                >
                  {t('openDashboard')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>

              <section className="rounded-[1.45rem] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.32)] dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t('availableTools')}</p>
                    <p className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{toolCount}</p>
                  </div>
                  <p className="text-right text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                    {school?.name || t('eyebrow')}
                  </p>
                </div>
                <div className="mt-5 space-y-3">
                  {sections.map((section) => {
                    const SectionIcon = section.icon;
                    return (
                      <div key={section.key} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                            <SectionIcon className="h-4 w-4" />
                          </span>
                          <span className="truncate text-xs font-black text-slate-700 dark:text-slate-200">{section.title}</span>
                        </span>
                        <span className="text-xs font-black text-slate-400">{section.tools.length}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
