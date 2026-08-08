"use client";

import { use, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Archive,
  BookOpen,
  CalendarDays,
  MapPin,
  School,
  Settings,
  Shield,
  SlidersHorizontal,
  Ticket,
  TrendingUp,
  UserX,
} from "lucide-react";
import WorkspaceHubPage, {
  type HubSection,
} from "@/components/hubs/WorkspaceHubPage";
import { SCHOOL_ATTENDANCE_ADMIN_ROLES } from "@/lib/permissions/schoolAttendance";

export default function SettingsHubPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  const t = useTranslations("workspaceHubs.settings");

  const sections = useMemo<HubSection[]>(
    () => [
      {
        key: "academic-setup",
        title: t("academicSetup"),
        description: t("academicSetupDescription"),
        icon: CalendarDays,
        tone: "blue",
        tools: [
          {
            key: "academic-years",
            title: t("academicYears"),
            description: t("academicYearsDescription"),
            href: `/${locale}/settings/academic-years`,
            icon: CalendarDays,
            tone: "blue",
          },
          {
            key: "subjects",
            title: t("subjects"),
            description: t("subjectsDescription"),
            href: `/${locale}/settings/subjects`,
            icon: BookOpen,
            tone: "violet",
          },
          {
            key: "master-timetable",
            title: t("masterTimetable"),
            description: t("masterTimetableDescription"),
            href: `/${locale}/timetable/master`,
            icon: CalendarDays,
            tone: "cyan",
          },
        ],
      },
      {
        key: "year-end",
        title: t("yearEnd"),
        description: t("yearEndDescription"),
        icon: Archive,
        tone: "amber",
        tools: [
          {
            key: "promotion",
            title: t("promotion"),
            description: t("promotionDescription"),
            href: `/${locale}/settings/promotion`,
            icon: TrendingUp,
            tone: "emerald",
          },
          {
            key: "failed-students",
            title: t("failedStudents"),
            description: t("failedStudentsDescription"),
            href: `/${locale}/settings/failed-students`,
            icon: UserX,
            tone: "rose",
          },
        ],
      },
      {
        key: "administration",
        title: t("administration"),
        description: t("administrationDescription"),
        icon: SlidersHorizontal,
        tone: "violet",
        tools: [
          {
            key: "school-profile",
            title: t("schoolProfile"),
            description: t("schoolProfileDescription"),
            href: `/${locale}/settings/school-profile`,
            icon: School,
            tone: "blue",
          },
          {
            key: "locations",
            title: t("locations"),
            description: t("locationsDescription"),
            href: `/${locale}/settings/locations`,
            icon: MapPin,
            tone: "emerald",
          },
          {
            key: "claim-codes",
            title: t("claimCodes"),
            description: t("claimCodesDescription"),
            href: `/${locale}/admin/claim-codes`,
            icon: Ticket,
            tone: "violet",
            roles: ["ADMIN", "SCHOOL_ADMIN", "SUPER_ADMIN"],
          },
          {
            key: "discipline",
            title: t("discipline"),
            description: t("disciplineDescription"),
            href: `/${locale}/admin/discipline`,
            icon: Shield,
            tone: "amber",
            roles: [...SCHOOL_ATTENDANCE_ADMIN_ROLES],
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
      icon={Settings}
      sections={sections}
      primaryAction={{
        label: t("primaryAction"),
        href: `/${locale}/settings/academic-years`,
      }}
    />
  );
}
