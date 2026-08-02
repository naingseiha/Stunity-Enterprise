"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import PageSkeleton from "@/components/layout/PageSkeleton";
import { TokenManager } from "@/lib/api/auth";

export type HubTone = "blue" | "emerald" | "violet" | "amber" | "cyan" | "rose";

export type HubTool = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: HubTone;
  badge?: string;
  roles?: string[];
};

export type HubSection = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "violet" | "amber";
  tools: HubTool[];
};

type WorkspaceHubPageProps = {
  locale: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  sections: HubSection[];
  primaryAction?: {
    label: string;
    href: string;
  };
};

const toolStyles: Record<HubTone, { icon: string; hover: string }> = {
  blue: {
    icon: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
    hover: "hover:border-blue-200 dark:hover:border-blue-700/60",
  },
  emerald: {
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    hover: "hover:border-emerald-200 dark:hover:border-emerald-700/60",
  },
  violet: {
    icon: "border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
    hover: "hover:border-violet-200 dark:hover:border-violet-700/60",
  },
  amber: {
    icon: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    hover: "hover:border-amber-200 dark:hover:border-amber-700/60",
  },
  cyan: {
    icon: "border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300",
    hover: "hover:border-cyan-200 dark:hover:border-cyan-700/60",
  },
  rose: {
    icon: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
    hover: "hover:border-rose-200 dark:hover:border-rose-700/60",
  },
};

const sectionStyles: Record<
  HubSection["tone"],
  { icon: string; rule: string; count: string }
> = {
  blue: {
    icon: "bg-blue-600 text-white",
    rule: "bg-blue-600",
    count: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  },
  emerald: {
    icon: "bg-emerald-600 text-white",
    rule: "bg-emerald-600",
    count:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  violet: {
    icon: "bg-violet-600 text-white",
    rule: "bg-violet-600",
    count:
      "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  },
  amber: {
    icon: "bg-amber-500 text-white",
    rule: "bg-amber-500",
    count:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
};

export default function WorkspaceHubPage({
  locale,
  eyebrow,
  title,
  description,
  icon: PageIcon,
  sections,
  primaryAction,
}: WorkspaceHubPageProps) {
  const router = useRouter();
  const t = useTranslations("workspaceHubs.common");
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

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          tools: section.tools.filter(
            (tool) =>
              !tool.roles ||
              tool.roles.includes(user?.role) ||
              Boolean(user?.isSuperAdmin),
          ),
        }))
        .filter((section) => section.tools.length > 0),
    [sections, user?.isSuperAdmin, user?.role],
  );

  const toolCount = useMemo(
    () =>
      visibleSections.reduce((sum, section) => sum + section.tools.length, 0),
    [visibleSections],
  );

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  if (loading) {
    return <PageSkeleton user={user} school={school} type="dashboard" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-500 dark:bg-gray-950 dark:text-white">
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <main className="min-h-[calc(100vh-3.5rem)] lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <nav
                  className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-gray-500"
                  aria-label="Breadcrumb"
                >
                  <Link
                    href={`/${locale}/dashboard`}
                    className="transition-colors hover:text-blue-600"
                  >
                    {t("dashboard")}
                  </Link>
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  <span className="text-slate-600 dark:text-gray-300">
                    {title}
                  </span>
                </nav>

                <div className="flex items-start gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    <PageIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[1.7rem]">
                        {title}
                      </h1>
                      <span className="hidden h-4 w-px bg-slate-200 dark:bg-gray-700 sm:block" />
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {eyebrow}
                      </p>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-gray-400">
                      {description}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {school?.name || eyebrow}
                      </span>
                      <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {t("roleAccess")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:items-center xl:w-auto">
                <div className="flex min-w-0 items-center gap-3 sm:pr-1">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                      <FolderKanban className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-lg font-black leading-none tracking-tight text-slate-950 dark:text-white">
                        {toolCount}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-[9px] font-bold text-slate-500 dark:text-gray-400">
                        {t("tools")}
                      </p>
                    </div>
                  </div>
                  <span className="h-8 w-px bg-slate-200 dark:bg-gray-700" />
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <LayoutGrid className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-lg font-black leading-none tracking-tight text-slate-950 dark:text-white">
                        {visibleSections.length}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-[9px] font-bold text-slate-500 dark:text-gray-400">
                        {t("groups")}
                      </p>
                    </div>
                  </div>
                </div>

                {primaryAction ? (
                  <Link
                    href={primaryAction.href}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[11px] font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    {primaryAction.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          <section aria-labelledby="workspace-tools-heading">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2
                  id="workspace-tools-heading"
                  className="text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl"
                >
                  {t("allTools")}
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                  {t("chooseTool")}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {t("roleAccess")}
              </span>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-3">
              {visibleSections.map((section) => {
                const SectionIcon = section.icon;
                const sectionTone = sectionStyles[section.tone];

                return (
                  <article
                    key={section.key}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className={`h-1 ${sectionTone.rule}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3.5">
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${sectionTone.icon}`}
                          >
                            <SectionIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <h3 className="text-base font-black tracking-tight text-slate-950 dark:text-white">
                              {section.title}
                            </h3>
                            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-400">
                              {section.description}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black tabular-nums ${sectionTone.count}`}
                        >
                          {section.tools.length}
                        </span>
                      </div>

                      <div className="mt-5 space-y-2.5">
                        {section.tools.map((tool) => {
                          const ToolIcon = tool.icon;
                          const tone = toolStyles[tool.tone];

                          return (
                            <Link
                              key={tool.key}
                              href={tool.href}
                              className={`group flex min-h-[6.5rem] items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors hover:bg-white dark:border-gray-800 dark:bg-gray-950/35 dark:hover:bg-gray-800/70 ${tone.hover}`}
                            >
                              <span
                                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${tone.icon}`}
                              >
                                <ToolIcon className="h-[18px] w-[18px]" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-start gap-2">
                                  <span className="line-clamp-1 flex-1 text-[13px] font-black leading-5 text-slate-900 dark:text-white">
                                    {tool.title}
                                  </span>
                                  {tool.badge ? (
                                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                      {tool.badge}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-1 line-clamp-2 text-[10px] font-medium leading-[1.1rem] text-slate-500 dark:text-slate-400">
                                  {tool.description}
                                </span>
                              </span>
                              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
                            </Link>
                          );
                        })}
                      </div>
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
