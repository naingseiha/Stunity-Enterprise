"use client";

import { use, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardCheck,
  GraduationCap,
  School,
  UserRound,
  Users,
} from "lucide-react";
import WorkspaceHubPage, {
  type HubSection,
} from "@/components/hubs/WorkspaceHubPage";

export default function PeopleHubPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(props.params);
  const t = useTranslations("workspaceHubs.people");

  const sections = useMemo<HubSection[]>(
    () => [
      {
        key: "learners",
        title: t("learners"),
        description: t("learnersDescription"),
        icon: GraduationCap,
        tone: "blue",
        tools: [
          {
            key: "students",
            title: t("students"),
            description: t("studentsDescription"),
            href: `/${locale}/students`,
            icon: Users,
            tone: "blue",
          },
          {
            key: "admissions",
            title: t("admissions"),
            description: t("admissionsDescription"),
            href: `/${locale}/admissions`,
            icon: ClipboardCheck,
            tone: "cyan",
          },
        ],
      },
      {
        key: "community",
        title: t("community"),
        description: t("communityDescription"),
        icon: School,
        tone: "emerald",
        tools: [
          {
            key: "parents",
            title: t("parents"),
            description: t("parentsDescription"),
            href: `/${locale}/parents`,
            icon: Users,
            tone: "emerald",
          },
          {
            key: "teachers",
            title: t("teachers"),
            description: t("teachersDescription"),
            href: `/${locale}/teachers`,
            icon: UserRound,
            tone: "violet",
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
      icon={Users}
      sections={sections}
      primaryAction={{ label: t("primaryAction"), href: `/${locale}/students` }}
    />
  );
}
