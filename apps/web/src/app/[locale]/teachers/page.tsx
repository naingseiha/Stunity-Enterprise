"use client";

import { I18nText as AutoI18nText } from "@/components/i18n/I18nText";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Edit,
  Eye,
  Lock,
  Mail,
  Phone,
  Trash2,
  UserCog,
  CheckSquare,
  Square,
  X,
  LayoutGrid,
  List,
  BarChart3,
  Download,
  Plus,
  ArrowRightLeft,
  RefreshCw,
  Search,
  Ticket,
  FileSpreadsheet,
  Sparkles,
  Home,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import * as XLSX from "xlsx";
import { useCallback } from "react";
import AnimatedContent from "@/components/AnimatedContent";
import DirectoryPagination from "@/components/DirectoryPagination";
import { TableSkeleton } from "@/components/LoadingSkeleton";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import AdminResetPasswordModal from "@/components/AdminResetPasswordModal";
import TeacherModal from "@/components/teachers/TeacherModal";
import BulkImportModal from "@/components/shared/BulkImportModal";
import { TokenManager } from "@/lib/api/auth";
import { claimCodeService } from "@/lib/api/claimCodes";
import { deleteTeacher } from "@/lib/api/teachers";
import { useTeachers, type Teacher } from "@/hooks/useTeachers";
import { useDebounce } from "@/hooks/useDebounce";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

const ITEMS_PER_PAGE = 20;
const TEACHER_SERVICE_URL =
  process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || "http://localhost:3004";

function formatGenderLabel(value?: string | null) {
  switch ((value || "").toUpperCase()) {
    case "MALE":
      return "Male";
    case "FEMALE":
      return "Female";
    default:
      return "Unspecified";
  }
}

function getTeacherDisplayName(teacher: Teacher) {
  // Native name is lastName + firstName
  return (
    [teacher.lastName, teacher.firstName].filter(Boolean).join(" ").trim() ||
    "N/A"
  );
}

function getTeacherInternationalName(teacher: Teacher, nativeName?: string) {
  const english = [teacher.englishLastName, teacher.englishFirstName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!english || english === nativeName) return null;
  return english;
}

type TeacherStatus = {
  label: string;
  helper: string;
  tone: "rose" | "amber" | "orange" | "emerald";
  needsAction: boolean;
  pillClass: string;
};

function getTeacherStatus(teacher: Teacher, t?: any): TeacherStatus {
  // NOTE: The Teacher DB model has NO isActive field — only the User model does.
  // Checking teacher.isActive was always undefined (falsy), which is why ALL teachers
  // were incorrectly shown as "Inactive". The correct logic is below.

  // Draft: no position and no contact info at all
  if (!teacher.position && !teacher.email && !teacher.phoneNumber) {
    return {
      label: t ? t("draft") : "Draft",
      helper: t ? t("missingRoleAndContact") : "Missing role & contact",
      tone: "amber",
      needsAction: true,
      pillClass:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    };
  }

  // Incomplete: has contact info but no position/role
  if (!teacher.position) {
    return {
      label: t ? t("incomplete") : "Incomplete",
      helper: t ? t("missingTeachingRole") : "Missing teaching role",
      tone: "orange",
      needsAction: true,
      pillClass:
        "bg-orange-50 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20",
    };
  }

  // Inactive: has a linked user account but it has been suspended
  if (teacher.hasLoginAccount && teacher.user?.isActive === false) {
    return {
      label: t ? t("inactive") : "Inactive",
      helper: "Login account suspended",
      tone: "rose",
      needsAction: true,
      pillClass:
        "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    };
  }

  // Verified: profile complete and account (if linked) is active
  return {
    label: t ? t("verified") : "Verified",
    helper: t ? t("operationalReady") : "Operational ready",
    tone: "emerald",
    needsAction: false,
    pillClass:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  };
}

function GenderBadge({ gender }: { gender: string }) {
  const isMale = gender.toUpperCase() === "MALE";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isMale
          ? "bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20"
          : "bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-100 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/20"
      }`}
    >
      {isMale ? "M" : "F"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone?: "emerald" | "blue" | "amber" | "slate" | "violet";
}) {
  const toneClasses = {
    emerald: {
      shell:
        "border-emerald-200/60 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-white",
      icon: "bg-white/20 text-white ring-1 ring-white/30",
    },
    blue: {
      shell:
        "border-sky-200/60 bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 text-white",
      icon: "bg-white/20 text-white ring-1 ring-white/30",
    },
    amber: {
      shell:
        "border-amber-200/60 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white",
      icon: "bg-white/20 text-white ring-1 ring-white/30",
    },
    violet: {
      shell:
        "border-violet-200/60 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-500 text-white",
      icon: "bg-white/20 text-white ring-1 ring-white/30",
    },
    slate: {
      shell:
        "border-indigo-200/60 bg-gradient-to-br from-indigo-400 via-blue-500 to-cyan-500 text-white",
      icon: "bg-white/20 text-white ring-1 ring-white/30",
    },
  };

  const styles = toneClasses[tone];

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-5 ${styles.shell}`}
    >
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/85">
            {label}
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-white">
            {value}
          </p>
          <p className="mt-2 text-sm font-medium text-white/90">{helper}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-20 w-32 rounded-full border border-white/25" />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  title,
  onClick,
  tone = "neutral",
  disabled = false,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  tone?: "neutral" | "blue" | "amber" | "rose" | "emerald";
  disabled?: boolean;
}) {
  const toneClasses = {
    neutral:
      "text-slate-500 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800",
    blue: "text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10",
    emerald:
      "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:text-gray-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-500/10",
    amber:
      "text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-gray-400 dark:hover:text-amber-300 dark:hover:bg-amber-500/10",
    rose: "text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-400 dark:hover:text-rose-300 dark:hover:bg-rose-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white transition-colors duration-200 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses[tone]}`}
    >
      <Icon className="h-[1.1rem] w-[1.1rem]" />
    </button>
  );
}

export default function TeachersPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const autoT = useTranslations();
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const t = useTranslations("teachers");

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [page, setPage] = useState(1);
  const [isCompactView, setIsCompactView] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const { selectedYear } = useAcademicYear();

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;
  const schoolId = school?.id;

  const {
    teachers,
    pagination,
    isLoading,
    isValidating,
    error,
    mutate,
    isEmpty,
  } = useTeachers({
    page,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch,
  });

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const totalCount = pagination.total || 0;
  const visibleCount = teachers.length;
  const reachableCount = useMemo(
    () =>
      teachers.filter((teacher) =>
        Boolean(teacher.email || teacher.phoneNumber),
      ).length,
    [teachers],
  );
  const withRoleCount = useMemo(
    () => teachers.filter((teacher) => Boolean(teacher.position)).length,
    [teachers],
  );
  const readyCount = useMemo(
    () =>
      teachers.filter((teacher) => !getTeacherStatus(teacher, t).needsAction)
        .length,
    [teachers],
  );
  const needsAttentionCount = useMemo(
    () =>
      teachers.filter((teacher) => getTeacherStatus(teacher, t).needsAction)
        .length,
    [teachers],
  );

  const placementData = useMemo(
    () => [
      { name: t("ready2"), value: readyCount, color: "#10B981" },
      { name: t("action"), value: needsAttentionCount, color: "#F59E0B" },
    ],
    [readyCount, needsAttentionCount],
  );

  const genderData = useMemo(() => {
    const counts = teachers.reduce((acc: any, teacher) => {
      const gender = (teacher.gender || "UNKNOWN").toUpperCase();
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({
      name:
        name === "MALE"
          ? t("male")
          : name === "FEMALE"
            ? t("female")
            : t("unspecified"),
      value,
      color:
        name === "MALE" ? "#3B82F6" : name === "FEMALE" ? "#D946EF" : "#64748B",
    }));
  }, [teachers]);

  const handleExport = useCallback(() => {
    const exportData = teachers.map((teacher) => ({
      "Teacher ID": teacher.teacherId,
      "Last Name": teacher.lastName || "-",
      "First Name": teacher.firstName || "-",
      "International Full Name": getTeacherInternationalName(teacher),
      Gender: teacher.gender,
      Position: teacher.position || "N/A",
      Department: teacher.department || "N/A",
      Email: teacher.email || "N/A",
      Phone: teacher.phoneNumber || "N/A",
      Status: getTeacherStatus(teacher, t).label,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers");
    XLSX.writeFile(
      wb,
      `Teachers_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  }, [teachers]);

  const toggleTeacherSelection = (id: string) => {
    const newSelection = new Set(selectedTeachers);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTeachers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTeachers.size === teachers.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(teachers.map((t) => t.id)));
    }
  };

  const facultyReadinessRate =
    visibleCount > 0 ? Math.round((readyCount / visibleCount) * 100) : 0;
  const hasSearch = Boolean(debouncedSearch.trim());

  const handleLogout = async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  };

  const handleGenerateCode = async (teacher: Teacher) => {
    if (!schoolId) return;

    try {
      setIsGenerating(teacher.id);
      const codes = await claimCodeService.generate(schoolId, {
        type: "TEACHER",
        count: 1,
        teacherIds: [teacher.id],
        expiresInDays: 30,
      });

      if (codes && codes.length > 0) {
        await navigator.clipboard.writeText(codes[0]);
        alert(
          t("claimCodeGenerated", {
            name: `${teacher.lastName} ${teacher.firstName}`,
            code: codes[0],
          }),
        );
      }
    } catch (error: any) {
      alert(error.message || t("failedToGenerateClaim"));
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      await deleteTeacher(id);
      mutate();
    } catch (error: any) {
      alert(error.message || t("failedToDelete"));
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowModal(true);
  };

  const handleAdd = () => {
    setSelectedTeacher(null);
    setShowModal(true);
  };

  const handleModalClose = (refresh?: boolean) => {
    setShowModal(false);
    setSelectedTeacher(null);
    if (refresh) {
      mutate();
    }
  };

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_210px,#f8fafc_100%)] transition-colors duration-500 dark:bg-[linear-gradient(180deg,#0f172a_0%,#111827_220px,#111827_100%)] lg:ml-64">
        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="relative flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-gray-500">
                    <Home className="h-3.5 w-3.5" />
                    <span>Home</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-600 dark:text-gray-300">
                      Teachers
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[1.7rem]">
                          {t("title")}
                        </h1>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-gray-700 sm:block" />
                        <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                          {t("facultyOperations")}
                        </p>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-gray-400">
                        {t("description")}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {selectedYear?.name || t("noAcademicYear")}
                        </span>
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {t("facultyRecords", { count: totalCount })}
                        </span>
                        <span className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                          {t("needAttention", { count: needsAttentionCount })}
                        </span>
                        {hasSearch ? (
                          <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                            <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_cafbecfe" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full shrink-0 gap-2.5 sm:grid-cols-[1.15fr_1fr] xl:w-[500px]">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 dark:border-blue-500/20 dark:bg-gray-900 dark:text-blue-300">
                          <UserCog className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                              {facultyReadinessRate}%
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400">
                              <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_56303845" />
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">
                            <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_d54229c6" />
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                        <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_8fc908d3" />
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-700 dark:bg-blue-400"
                        style={{
                          width: `${Math.max(visibleCount ? facultyReadinessRate : 0, visibleCount > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 px-1 py-3 dark:divide-gray-700 dark:border-gray-800 dark:bg-gray-800/50">
                    {[
                      {
                        value: visibleCount,
                        label: (
                          <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_74aeb806" />
                        ),
                      },
                      {
                        value: readyCount,
                        label: (
                          <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_c56895dc" />
                        ),
                      },
                      {
                        value: needsAttentionCount,
                        label: (
                          <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_fbd09573" />
                        ),
                      },
                    ].map((metric, index) => (
                      <div key={index} className="min-w-0 px-2 text-center">
                        <p className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                          {metric.value}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] font-bold text-slate-500 dark:text-gray-400">
                          {metric.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/35 lg:flex-row lg:items-center lg:justify-between sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => setIsCompactView(false)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.6rem] transition-colors ${!isCompactView ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" : "text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"}`}
                      title={t("comfortableView")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCompactView(true)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.6rem] transition-colors ${isCompactView ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" : "text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"}`}
                      title={t("compactView")}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${showAnalytics ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_400fbce0" />
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_2db840d9" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBulkImportModal(true)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Bulk Import
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:from-violet-700 hover:to-indigo-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_c2f5dc15" />
                </button>
              </div>
            </section>
          </AnimatedContent>

          {showAnalytics && !isEmpty && (
            <AnimatedContent animation="slide-up" delay={25}>
              <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t("profileReadiness")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        {t("facultyCompleteness")}
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      {visibleCount}{" "}
                      <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_5fd415f5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="h-32 w-32 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={placementData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={55}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {placementData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {placementData.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {item.value}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded dark:bg-gray-800">
                              {Math.round(
                                (item.value / (visibleCount || 1)) * 100,
                              )}
                              %
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {t("genderDiversity")}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                        {t("genderBreakdown")}
                      </p>
                    </div>
                    <UserCog className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={genderData}
                        layout="vertical"
                        margin={{ left: -20, right: 20 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fontSize: 12,
                            fontWeight: 600,
                            fill: "#64748b",
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "transparent" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
                                  {payload[0].value} {t("teachers")}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {genderData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </AnimatedContent>
          )}

          <AnimatedContent animation="slide-up" delay={50}>
            <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={t("facultyTotal")}
                value={String(totalCount)}
                helper={t("directoryTotal")}
                icon={UserCog}
                tone="violet"
              />
              <MetricCard
                label={t("reachable")}
                value={String(reachableCount)}
                helper={t("phoneOrEmail")}
                icon={Mail}
                tone="emerald"
              />
              <MetricCard
                label={t("withRole")}
                value={String(withRoleCount)}
                helper={t("positionRecorded")}
                icon={Briefcase}
                tone="blue"
              />
              <MetricCard
                label={t("readyProfiles")}
                value={String(readyCount)}
                helper={t("operationallyComplete")}
                icon={BookOpen}
                tone="slate"
              />
            </div>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={100}>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-slate-200 dark:border-gray-800/70 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_a614fa86" />
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                      {hasSearch
                        ? t("filteredResults")
                        : t("operationsDirectory")}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/80">
                      {t("visibleCount", { count: visibleCount })}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/80">
                      {hasSearch
                        ? t("searchTerm", { term: debouncedSearch })
                        : t("noKeywordFilter")}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={t("searchPlaceholder")}
                      className="h-14 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-blue-500/40 dark:focus:ring-blue-500/10"
                    />
                  </label>

                  {hasSearch ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-black text-slate-900 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/70"
                    >
                      <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_9884454d" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                {isValidating && !isLoading ? (
                  <div className="absolute right-6 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-900 dark:text-white">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_cb3aa704" />
                  </div>
                ) : null}

                {isLoading ? (
                  <div className="overflow-x-auto px-6 py-4 sm:px-8">
                    <table className="min-w-full">
                      <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                        <TableSkeleton rows={8} />
                      </tbody>
                    </table>
                  </div>
                ) : error ? (
                  <div className="px-6 py-16 text-center sm:px-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                      {t("failedToLoad")}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {error instanceof Error
                        ? error.message
                        : t("failedToLoadHelper")}
                    </p>
                  </div>
                ) : isEmpty ? (
                  <div className="px-6 py-16 text-center sm:px-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20">
                      <UserCog className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                      {hasSearch ? t("noTeachersMatch") : t("noTeachersYet")}
                    </h3>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-gray-400">
                      {hasSearch
                        ? t("noTeachersMatchHelper")
                        : t("noTeachersHelper")}
                    </p>
                    <button
                      type="button"
                      onClick={handleAdd}
                      className="mt-5 inline-flex items-center gap-2 rounded-[0.8rem] bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 px-4 py-2.5 text-sm font-black uppercase tracking-[0.16em] text-white transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_c2f5dc15" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 dark:divide-gray-800">
                        <thead
                          className={`bg-slate-50 dark:bg-none dark:bg-gray-800/50 dark:bg-none dark:bg-gray-950/40 ${isCompactView ? "h-10" : ""}`}
                        >
                          <tr className="border-b border-slate-200 dark:border-gray-800/70 dark:border-gray-800/70">
                            <th
                              className={`w-14 px-6 ${isCompactView ? "py-2" : "py-5"} sm:px-8`}
                            >
                              <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="inline-flex items-center justify-center"
                              >
                                {selectedTeachers.size === teachers.length &&
                                teachers.length > 0 ? (
                                  <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                ) : selectedTeachers.size > 0 ? (
                                  <div className="h-[18px] w-[18px] rounded border-2 border-blue-500 bg-blue-500/10" />
                                ) : (
                                  <Square className="h-[18px] w-[18px] text-slate-300 transition-colors hover:text-slate-500 dark:text-gray-700 dark:text-gray-200 dark:hover:text-gray-500" />
                                )}
                              </button>
                            </th>
                            <th
                              className={`px-6 ${isCompactView ? "py-2" : "py-5"} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_067bbb3c" />
                            </th>
                            <th
                              className={`px-4 ${isCompactView ? "py-2" : "py-5"} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_8fd414ad" />
                            </th>
                            <th
                              className={`px-4 ${isCompactView ? "py-2" : "py-5"} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_a0dc4e69" />
                            </th>
                            <th
                              className={`px-4 ${isCompactView ? "py-2" : "py-5"} text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_4576b0ee" />
                            </th>
                            <th
                              className={`px-6 ${isCompactView ? "py-2" : "py-5"} text-right text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500`}
                            >
                              <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_573a1032" />
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                          {teachers.map((teacher) => {
                            const nativeName = getTeacherDisplayName(teacher);
                            const internationalName =
                              getTeacherInternationalName(teacher, nativeName);
                            const teacherStatus = getTeacherStatus(teacher, t);

                            return (
                              <tr
                                key={teacher.id}
                                className={`group transition-colors ${selectedTeachers.has(teacher.id) ? "bg-blue-50/40 dark:bg-blue-500/5" : "hover:bg-slate-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-950/30"}`}
                              >
                                <td
                                  className={`px-6 ${isCompactView ? "py-2" : "py-4"} align-top sm:px-8`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleTeacherSelection(teacher.id)
                                    }
                                    className={`${isCompactView ? "mt-0" : "mt-2"} inline-flex items-center justify-center`}
                                  >
                                    {selectedTeachers.has(teacher.id) ? (
                                      <CheckSquare className="h-[18px] w-[18px] text-slate-900 dark:text-white" />
                                    ) : (
                                      <Square className="h-[18px] w-[18px] text-slate-300 transition-colors group-hover:text-slate-500 dark:text-gray-700 dark:text-gray-200 dark:group-hover:text-gray-500" />
                                    )}
                                  </button>
                                </td>
                                <td
                                  className={`px-6 ${isCompactView ? "py-2" : "py-4"}`}
                                >
                                  <div className="flex items-start gap-4">
                                    {!isCompactView &&
                                      (teacher.photoUrl ? (
                                        <img
                                          src={`${TEACHER_SERVICE_URL}${teacher.photoUrl}`}
                                          alt={`${teacher.lastName} ${teacher.firstName}`}
                                          className="h-11 w-11 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-gray-800"
                                        />
                                      ) : (
                                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 text-sm font-black text-white">
                                          {teacher.lastName?.[0] || "T"}
                                          {teacher.firstName?.[0] || ""}
                                        </div>
                                      ))}
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p
                                          className={`truncate font-black tracking-tight text-slate-900 dark:text-white ${isCompactView ? "text-xs" : "text-sm"}`}
                                        >
                                          {getTeacherDisplayName(teacher)}
                                        </p>
                                        <GenderBadge gender={teacher.gender} />
                                      </div>
                                      <div className="mt-0.5 flex flex-col gap-0.5">
                                        {(internationalName === "N/A" ||
                                          internationalName !== nativeName) && (
                                          <p className="truncate text-[10px] font-bold text-blue-500/70 dark:text-blue-400/70 uppercase tracking-[0.14em]">
                                            {internationalName}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td
                                  className={`px-4 ${isCompactView ? "py-2" : "py-4"} align-top`}
                                >
                                  <div
                                    className={`inline-flex rounded-[0.65rem] bg-slate-100 dark:bg-gray-800 font-mono font-semibold text-slate-700 dark:text-gray-200 ring-1 ring-slate-200/70 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700/70 ${isCompactView ? "px-2 py-0.5 text-[10px]" : "px-3 py-2 text-xs"}`}
                                  >
                                    {teacher.teacherId}
                                  </div>
                                </td>

                                <td
                                  className={`px-4 ${isCompactView ? "py-2" : "py-4"} align-top`}
                                >
                                  <div className="min-w-0">
                                    <p
                                      className={`font-bold text-slate-800 dark:text-white ${isCompactView ? "text-xs" : "text-sm"}`}
                                    >
                                      {teacher.position || "No Role"}
                                    </p>
                                    {!isCompactView && teacher.department && (
                                      <div className="mt-1.5 inline-flex items-center rounded-md bg-slate-50 dark:bg-gray-800/50 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-100 dark:bg-gray-800/50 dark:text-gray-400 dark:ring-gray-700/50 uppercase tracking-tight">
                                        {teacher.department}
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td
                                  className={`px-4 text-center ${isCompactView ? "py-2" : "py-4"} align-top`}
                                >
                                  <span
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${teacherStatus.pillClass}`}
                                  >
                                    {teacherStatus.label}
                                  </span>
                                </td>

                                <td
                                  className={`px-6 ${isCompactView ? "py-1" : "py-4"} align-top`}
                                >
                                  <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                                    <ActionButton
                                      title={autoT(
                                        "auto.web.app_locale_teachers_page.k_8a5d3a8f",
                                      )}
                                      icon={Eye}
                                      onClick={() =>
                                        router.push(
                                          `/${locale}/teachers/${teacher.id}`,
                                        )
                                      }
                                    />
                                    <ActionButton
                                      title={t("edit")}
                                      icon={Edit}
                                      onClick={() => handleEdit(teacher)}
                                    />
                                    <ActionButton
                                      title={autoT(
                                        "auto.web.app_locale_teachers_page.k_5a3d990d",
                                      )}
                                      icon={Ticket}
                                      onClick={() =>
                                        handleGenerateCode(teacher)
                                      }
                                      disabled={isGenerating === teacher.id}
                                      tone="blue"
                                    />
                                    <ActionButton
                                      title={t("resetPassword")}
                                      icon={Lock}
                                      onClick={() => {
                                        setSelectedTeacher(teacher);
                                        setShowResetModal(true);
                                      }}
                                      tone="amber"
                                    />
                                    <ActionButton
                                      title={t("delete")}
                                      icon={Trash2}
                                      onClick={() => handleDelete(teacher.id)}
                                      tone="rose"
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <DirectoryPagination
                      currentPage={pagination.page}
                      totalPages={pagination.totalPages}
                      onPageChange={setPage}
                      totalItems={pagination.total}
                      itemsPerPage={pagination.limit}
                    />
                  </>
                )}
              </div>
            </section>
          </AnimatedContent>
        </main>

        {selectedTeachers.size > 0 && (
          <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 lg:left-[calc(50%+128px)]">
            <AnimatedContent animation="slide-up" delay={0}>
              <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-slate-700 bg-slate-900 px-6 py-4 text-white dark:bg-slate-950">
                <div className="flex items-center gap-3 border-r border-white/10 pr-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 font-bold text-white">
                    {selectedTeachers.size}
                  </div>
                  <p className="text-sm font-bold">
                    {t("selected", { count: selectedTeachers.size })}
                  </p>
                </div>

                <div className="flex items-center gap-2 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      alert(
                        "Bulk Claim Code generation triggered for " +
                          selectedTeachers.size +
                          " teachers.",
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    <Ticket className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_0398fc5e" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert(
                        "Bulk Password Reset triggered for " +
                          selectedTeachers.size +
                          " teachers.",
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    <Lock className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_cc4b928d" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Are you sure you want to delete ${selectedTeachers.size} teachers?`,
                        )
                      ) {
                        Array.from(selectedTeachers).forEach((id) =>
                          deleteTeacher(id),
                        );
                        setSelectedTeachers(new Set());
                        mutate();
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    <AutoI18nText i18nKey="auto.web.app_locale_teachers_page.k_278b5b71" />
                  </button>
                </div>

                <div className="border-l border-white/10 pl-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTeachers(new Set())}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                    title={t("clearSelection")}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </AnimatedContent>
          </div>
        )}
      </div>

      {showModal ? (
        <TeacherModal teacher={selectedTeacher} onClose={handleModalClose} />
      ) : null}
      {showBulkImportModal && (
        <BulkImportModal
          type="teacher"
          educationModel={school?.educationModel || "DEFAULT"}
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={() => {
            setShowBulkImportModal(false);
            mutate();
          }}
        />
      )}

      {showResetModal && selectedTeacher ? (
        <AdminResetPasswordModal
          user={{
            id: selectedTeacher.user?.id || selectedTeacher.id,
            name: `${selectedTeacher.lastName} ${selectedTeacher.firstName}`,
            email: selectedTeacher.email ?? undefined,
          }}
          onClose={() => {
            setShowResetModal(false);
            setSelectedTeacher(null);
          }}
        />
      ) : null}
    </>
  );
}
