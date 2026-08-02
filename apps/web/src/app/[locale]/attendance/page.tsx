"use client";

import { use, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  FileBarChart,
} from "lucide-react";
import WorkspaceHubPage, {
  type HubSection,
} from "@/components/hubs/WorkspaceHubPage";
import { SCHOOL_ATTENDANCE_ADMIN_ROLES } from "@/lib/permissions/schoolAttendance";

export default function AttendanceHubPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  const t = useTranslations("workspaceHubs.attendance");

  const sections = useMemo<HubSection[]>(
    () => [
      {
        key: "daily",
        title: t("daily"),
        description: t("dailyDescription"),
        icon: CalendarCheck,
        tone: "blue",
        tools: [
          {
            key: "mark",
            title: t("markAttendance"),
            description: t("markAttendanceDescription"),
            href: `/${locale}/attendance/mark`,
            icon: ClipboardCheck,
            tone: "blue",
          },
        ],
      },
      {
        key: "review",
        title: t("review"),
        description: t("reviewDescription"),
        icon: BarChart3,
        tone: "emerald",
        tools: [
          {
            key: "monthly-entry",
            title: t("monthlyEntry"),
            description: t("monthlyEntryDescription"),
            href: `/${locale}/attendance/monthly-entry`,
            icon: CalendarRange,
            tone: "emerald",
          },
          {
            key: "dashboard",
            title: t("dashboard"),
            description: t("dashboardDescription"),
            href: `/${locale}/attendance/dashboard`,
            icon: BarChart3,
            tone: "violet",
            roles: [...SCHOOL_ATTENDANCE_ADMIN_ROLES],
          },
          {
            key: "reports",
            title: t("reports"),
            description: t("reportsDescription"),
            href: `/${locale}/attendance/reports`,
            icon: FileBarChart,
            tone: "cyan",
          },
        ],
      },
    ],
    [locale, t],
  );

  return (
    <WorkspaceHubPage
      locale={locale}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      icon={ClipboardCheck}
      sections={sections}
      primaryAction={{
        label: t("primaryAction"),
        href: `/${locale}/attendance/mark`,
      }}
    />
  );
}
