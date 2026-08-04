"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Brain,
  CalendarRange,
  LineChart,
  ChevronRight,
  FileBarChart,
  GraduationCap,
  Home,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import PageSkeleton from "@/components/layout/PageSkeleton";
import { TokenManager } from "@/lib/api/auth";
import { canViewReportsDashboard } from "@/lib/permissions/reports";

type ReportTool = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";
  requiresReportsAccess?: boolean;
  roles?: string[];
};

type ReportSection = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "violet";
  tools: ReportTool[];
};

const toneStyles: Record<
  ReportTool["tone"],
  { icon: string; iconHover: string; borderHover: string; glow: string; badge: string; badgeHover: string }
> = {
  blue: {
    icon: "bg-blue-100/50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20",
    iconHover: "group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:shadow-lg group-hover:shadow-blue-500/30",
    borderHover: "hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:shadow-blue-500/10",
    glow: "group-hover:bg-blue-400/20",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    badgeHover: "group-hover:bg-blue-200 dark:group-hover:bg-blue-500/25",
  },
  violet: {
    icon: "bg-violet-100/50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20",
    iconHover: "group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 group-hover:shadow-lg group-hover:shadow-violet-500/30",
    borderHover: "hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-xl hover:shadow-violet-500/10",
    glow: "group-hover:bg-violet-400/20",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    badgeHover: "group-hover:bg-violet-200 dark:group-hover:bg-violet-500/25",
  },
  emerald: {
    icon: "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20",
    iconHover: "group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 group-hover:shadow-lg group-hover:shadow-emerald-500/30",
    borderHover: "hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xl hover:shadow-emerald-500/10",
    glow: "group-hover:bg-emerald-400/20",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    badgeHover: "group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/25",
  },
  amber: {
    icon: "bg-amber-100/50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20",
    iconHover: "group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 group-hover:shadow-lg group-hover:shadow-amber-500/30",
    borderHover: "hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xl hover:shadow-amber-500/10",
    glow: "group-hover:bg-amber-400/20",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    badgeHover: "group-hover:bg-amber-200 dark:group-hover:bg-amber-500/25",
  },
  rose: {
    icon: "bg-rose-100/50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20",
    iconHover: "group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 group-hover:shadow-lg group-hover:shadow-rose-500/30",
    borderHover: "hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xl hover:shadow-rose-500/10",
    glow: "group-hover:bg-rose-400/20",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    badgeHover: "group-hover:bg-rose-200 dark:group-hover:bg-rose-500/25",
  },
  cyan: {
    icon: "bg-cyan-100/50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/20",
    iconHover: "group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-600 group-hover:shadow-lg group-hover:shadow-cyan-500/30",
    borderHover: "hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-xl hover:shadow-cyan-500/10",
    glow: "group-hover:bg-cyan-400/20",
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    badgeHover: "group-hover:bg-cyan-200 dark:group-hover:bg-cyan-500/25",
  },
};

const sectionStyles: Record<
  ReportSection["tone"],
  { icon: string; rule: string; count: string; bgGlow: string }
> = {
  blue: {
    icon: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30",
    rule: "bg-gradient-to-r from-blue-500 to-indigo-600",
    count: "bg-blue-100/80 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
    bgGlow: "bg-blue-500/5",
  },
  emerald: {
    icon: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30",
    rule: "bg-gradient-to-r from-emerald-500 to-teal-600",
    count: "bg-emerald-100/80 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    bgGlow: "bg-emerald-500/5",
  },
  violet: {
    icon: "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30",
    rule: "bg-gradient-to-r from-violet-500 to-purple-600",
    count: "bg-violet-100/80 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
    bgGlow: "bg-violet-500/5",
  },
};

export default function ReportsHubPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  const router = useRouter();
  const t = useTranslations("reportsHub");
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
        key: "performance",
        title: t("performance"),
        description: t("performanceDescription"),
        icon: LineChart,
        tone: "blue",
        tools: [
          {
            key: "dashboard",
            title: t("reportsDashboard"),
            description: t("reportsDashboardDescription"),
            href: `/${locale}/reports/dashboard`,
            icon: LayoutDashboard,
            tone: "blue",
            requiresReportsAccess: true,
          },
          {
            key: "grade-analytics",
            title: t("gradeAnalytics"),
            description: t("gradeAnalyticsDescription"),
            href: `/${locale}/grades/analytics`,
            icon: BarChart3,
            tone: "violet",
          },
          {
            key: "year-comparison",
            title: t("yearComparison"),
            description: t("yearComparisonDescription"),
            href: `/${locale}/reports/year-comparison`,
            icon: CalendarRange,
            tone: "emerald",
          },
          {
            key: "quiz-analytics",
            title: t("quizAnalytics"),
            description: t("quizAnalyticsDescription"),
            href: `/${locale}/teacher/quizzes/analytics`,
            icon: Brain,
            tone: "cyan",
            roles: ["TEACHER", "ADMIN", "STAFF", "SCHOOL_ADMIN", "SUPER_ADMIN"],
          },
        ],
      },
      {
        key: "records",
        title: t("records"),
        description: t("recordsDescription"),
        icon: GraduationCap,
        tone: "emerald",
        tools: [
          {
            key: "report-cards",
            title: t("reportCards"),
            description: t("reportCardsDescription"),
            href: `/${locale}/grades/reports`,
            icon: FileBarChart,
            tone: "blue",
          },
          {
            key: "monthly-report",
            title: t("monthlyReport"),
            description: t("monthlyReportDescription"),
            href: `/${locale}/grades/monthly-report`,
            icon: CalendarRange,
            tone: "amber",
          },
          {
            key: "attendance-reports",
            title: t("attendanceReports"),
            description: t("attendanceReportsDescription"),
            href: `/${locale}/attendance/reports`,
            icon: UserCheck,
            tone: "cyan",
          },
        ],
      },
      {
        key: "creative",
        title: t("creative"),
        description: t("creativeDescription"),
        icon: Sparkles,
        tone: "violet",
        tools: [
          {
            key: "poster-studio",
            title: t("posterStudio"),
            description: t("posterStudioDescription"),
            href: `/${locale}/reports/poster-studio`,
            icon: Award,
            tone: "rose",
            requiresReportsAccess: true,
          },
          {
            key: "certificate-studio",
            title: t("certificateStudio"),
            description: t("certificateStudioDescription"),
            href: `/${locale}/reports/certificate-studio`,
            icon: GraduationCap,
            tone: "amber",
            requiresReportsAccess: true,
          },
        ],
      },
    ];

    return allSections
      .map((section) => ({
        ...section,
        tools: section.tools.filter(
          (tool) =>
            (!tool.requiresReportsAccess || hasReportsAccess) &&
            (!tool.roles ||
              tool.roles.includes(user?.role) ||
              Boolean(user?.isSuperAdmin)),
        ),
      }))
      .filter((section) => section.tools.length > 0);
  }, [hasReportsAccess, locale, t, user?.isSuperAdmin, user?.role]);

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="dashboard" />;
  }

  const tools = sections.flatMap((section) => section.tools);
  const toolCount = tools.length;
  const featuredTool = tools.find((tool) => tool.key === "dashboard");
  const featuredHref = featuredTool?.href ?? `/${locale}/reports/dashboard`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-500 dark:bg-gray-950 dark:text-white">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="min-h-[calc(100vh-3.5rem)] lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          {/* HERO SECTION - STUDENT PAGE STANDARD */}
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="relative flex flex-col gap-5 p-6 sm:p-8 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-gray-500">
                  <Home className="h-3.5 w-3.5" />
                  <span>{locale === 'km' ? "ទំព័រដើម" : "Home"}</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-slate-600 dark:text-gray-300">
                    {t("title")}
                  </span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    <FileBarChart className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                        {t("title")}
                      </h1>
                      <span className="hidden h-5 w-px bg-slate-200 dark:bg-gray-700 sm:block" />
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {t("eyebrow")}
                      </p>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {school?.name || t("eyebrow")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t("authorizedAccess")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid w-full shrink-0 gap-3 sm:grid-cols-[1.15fr_1fr] xl:w-auto xl:min-w-[550px]">
                <div className="flex flex-col justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600 dark:border-blue-500/20 dark:bg-gray-900 dark:text-blue-400">
                        <LayoutDashboard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                            {toolCount}
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-gray-400">
                            {t("availableTools")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-gray-400">
                          {t("categories")}: {sections.length}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={featuredHref}
                      className="group inline-flex shrink-0 whitespace-nowrap h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      {t("openDashboard")}
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-gray-800">
                    <div className="h-full w-full rounded-full bg-blue-600 transition-all duration-700 dark:bg-blue-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 px-2 py-4 dark:divide-gray-700 dark:border-gray-800 dark:bg-gray-800/50">
                  {[
                    { value: toolCount, label: t("availableTools") },
                    { value: sections.length, label: t("categories") },
                  ].map((metric) => (
                    <div key={metric.label} className="flex min-w-0 flex-col items-center justify-center px-2 text-center">
                      <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                        {metric.value}
                      </p>
                      <p className="mt-1 w-full text-[11px] font-bold leading-snug text-slate-500 dark:text-gray-400">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* MAIN SECTIONS GRID */}
          <section aria-labelledby="reports-tools-heading" className="relative z-10">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="reports-tools-heading"
                  className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl"
                >
                  {t("allReports")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                  {t("toolsDescription")}
                </p>
              </div>
            </div>

            <div className="grid items-start gap-8 xl:grid-cols-3">
              {sections.map((section) => {
                const SectionIcon = section.icon;
                const sectionTone = sectionStyles[section.tone];
                return (
                  <article
                    key={section.key}
                    className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-gray-800/80 bg-slate-100/50 dark:bg-gray-900/50 p-5 space-y-4 shadow-sm"
                  >
                    {/* Section Header */}
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-gray-800/80">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${sectionTone.icon} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                          <SectionIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                            {section.title}
                          </h3>
                          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {section.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-gray-800 flex-shrink-0">
                        {section.tools.length} {locale === 'km' ? 'របាយការណ៍' : 'Reports'}
                      </span>
                    </div>

                    {/* Section Tools Container — Discover Page Menu Card Design */}
                    <div className="bg-white dark:bg-[#1c1c1e] rounded-2xl overflow-hidden border border-slate-200/70 dark:border-gray-800/70 shadow-sm divide-y divide-slate-100 dark:divide-gray-800/60">
                      {section.tools.map((tool) => {
                        const ToolIcon = tool.icon;
                        const toolGradients: Record<string, string> = {
                          blue: "bg-gradient-to-br from-blue-500 to-indigo-600",
                          violet: "bg-gradient-to-br from-violet-500 to-purple-600",
                          emerald: "bg-gradient-to-br from-emerald-500 to-teal-600",
                          amber: "bg-gradient-to-br from-amber-500 to-orange-500",
                          rose: "bg-gradient-to-br from-rose-500 to-pink-600",
                          cyan: "bg-gradient-to-br from-sky-500 to-cyan-600",
                        };
                        const iconBg = toolGradients[tool.tone] || toolGradients.blue;

                        return (
                          <Link
                            key={tool.key}
                            href={tool.href}
                            className="group flex items-center gap-3.5 p-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-all duration-150"
                          >
                            <div className={`w-[48px] h-[48px] rounded-[14px] ${iconBg} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                              <ToolIcon className="w-5.5 h-5.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[12.5px] font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {tool.title}
                                </span>
                                {tool.key === "dashboard" && (
                                  <span className="px-1.5 py-0.5 text-[8.5px] font-black uppercase rounded flex-shrink-0 bg-blue-100 text-blue-600">
                                    {locale === 'km' ? 'បានណែនាំ' : 'FEATURED'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {tool.description}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="flex-shrink-0 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-black text-[11px] group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:text-white transition-all duration-200 shadow-sm"
                            >
                              {locale === 'km' ? 'បើក' : 'OPEN'}
                            </button>
                          </Link>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
