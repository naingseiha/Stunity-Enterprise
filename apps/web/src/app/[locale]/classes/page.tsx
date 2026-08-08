"use client";

import { I18nText as AutoI18nText } from "@/components/i18n/I18nText";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  BookMarked,
  ClipboardList,
  Edit2,
  Eye,
  GraduationCap,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  RefreshCw,
  School,
  Search,
  Shuffle,
  Trash2,
  UserRound,
  Users,
  Home,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import AnimatedContent from "@/components/AnimatedContent";
import BlurLoader from "@/components/BlurLoader";
import ClassModal from "@/components/classes/ClassModal";
import { CardSkeleton, TableSkeleton } from "@/components/LoadingSkeleton";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import { useAcademicYear } from "@/contexts/AcademicYearContext";
import { useClasses } from "@/hooks/useClasses";
import { useDebounce } from "@/hooks/useDebounce";
import { TokenManager } from "@/lib/api/auth";
import { deleteClass, type Class } from "@/lib/api/classes";

type MetricTone = "emerald" | "blue" | "amber" | "slate";
type ViewMode = "grid" | "list";

const FALLBACK_GRADES = [7, 8, 9, 10, 11, 12];

const gradeThemes = [
  {
    badge:
      "bg-sky-100 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20",
    avatar: "from-sky-500 to-cyan-500",
    card: "border-sky-200 bg-gradient-to-br from-white via-white to-sky-50 dark:border-gray-800/70 dark:bg-gray-900/80",
  },
  {
    badge:
      "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20",
    avatar: "from-indigo-500 to-violet-500",
    card: "border-indigo-200 bg-gradient-to-br from-white via-white to-indigo-50 dark:border-gray-800/70 dark:bg-gray-900/80",
  },
  {
    badge:
      "bg-violet-100 text-violet-900 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/20",
    avatar: "from-violet-500 to-fuchsia-500",
    card: "border-violet-200 bg-gradient-to-br from-white via-white to-violet-50 dark:border-gray-800/70 dark:bg-gray-900/80",
  },
  {
    badge:
      "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    avatar: "from-emerald-500 to-teal-500",
    card: "border-emerald-200 bg-gradient-to-br from-white via-white to-emerald-50 dark:border-gray-800/70 dark:bg-gray-900/80",
  },
  {
    badge:
      "bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
    avatar: "from-amber-500 to-orange-500",
    card: "border-amber-200 bg-gradient-to-br from-white via-white to-amber-50 dark:border-gray-800/70 dark:bg-gray-900/80",
  },
  {
    badge:
      "bg-rose-100 text-rose-900 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
    avatar: "from-rose-500 to-pink-500",
    card: "border-rose-200 bg-gradient-to-br from-white via-white to-rose-50 dark:border-gray-800/70 dark:bg-gray-900/80",
  },
] as const;

function getGradeTheme(grade: number) {
  return gradeThemes[Math.abs(grade - 1) % gradeThemes.length];
}

function formatTeacherName(classItem: Class, t: any) {
  if (!classItem.homeroomTeacher) return t("unassigned");
  return (
    [
      classItem.homeroomTeacher.firstNameLatin ||
        classItem.homeroomTeacher.englishFirstName ||
        classItem.homeroomTeacher.firstName,
      classItem.homeroomTeacher.lastNameLatin ||
        classItem.homeroomTeacher.englishLastName ||
        classItem.homeroomTeacher.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || t("unassigned")
  );
}

function formatTrackLabel(track?: string | null) {
  if (!track) return "General";

  const normalized = track.toLowerCase();
  if (normalized === "social") return "Social Studies";

  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCapacityState(classItem: Class, t: any) {
  const studentCount = classItem._count?.students || 0;
  const capacity = classItem.capacity || 0;

  if (!capacity) {
    return {
      studentCount,
      capacity,
      percent: studentCount > 0 ? Math.min(studentCount * 8, 60) : 12,
      label: t("capacityOpen"),
      helper:
        studentCount > 0
          ? t("studentsWithoutCap", { count: studentCount })
          : t("addSeatCap"),
      pillClass:
        "bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 ring-1 ring-slate-200 dark:bg-slate-50 dark:bg-gray-800/95 dark:text-slate-300 dark:ring-slate-500/20",
      barClass: "from-slate-500 via-slate-400 to-slate-300",
      isFull: false,
    };
  }

  const percent = Math.round((studentCount / capacity) * 100);

  if (percent >= 100) {
    return {
      studentCount,
      capacity,
      percent: 100,
      label: t("full"),
      helper: t("seatsOccupied", { count: studentCount, capacity }),
      pillClass:
        "bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
      barClass: "from-rose-500 via-pink-500 to-orange-400",
      isFull: true,
    };
  }

  if (percent >= 85) {
    return {
      studentCount,
      capacity,
      percent,
      label: t("nearFull"),
      helper: t("seatsOccupied", { count: studentCount, capacity }),
      pillClass:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
      barClass: "from-amber-500 via-orange-500 to-rose-400",
      isFull: false,
    };
  }

  return {
    studentCount,
    capacity,
    percent,
    label: t("open"),
    helper: t("seatsOccupied", { count: studentCount, capacity }),
    pillClass:
      "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
    barClass: "from-emerald-500 via-teal-500 to-cyan-400",
    isFull: false,
  };
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: MetricTone;
}) {
  const tones = {
    emerald:
      "border-emerald-200/60 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-500 text-white",
    blue: "border-sky-200/60 bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500 text-white",
    amber:
      "border-amber-200/60 bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white",
    slate:
      "border-violet-200/60 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-500 text-white",
  };

  const iconTones = {
    emerald: "text-white bg-white/20 ring-1 ring-white/30",
    blue: "text-white bg-white/20 ring-1 ring-white/30",
    amber: "text-white bg-white/20 ring-1 ring-white/30",
    slate: "text-white bg-white/20 ring-1 ring-white/30",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-5 transition-colors ${tones[tone]}`}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/85">
            {label}
          </p>
          <div className={`rounded-xl p-2.5 ${iconTones[tone]}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-black tracking-tight text-white">
          {value}
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.18),transparent_50%)]" />
      <div className="pointer-events-none absolute -bottom-8 -left-6 h-20 w-32 rounded-full border border-white/25" />
    </div>
  );
}

function ActionIconButton({
  title,
  onClick,
  tone,
  icon: Icon,
}: {
  title: string;
  onClick: () => void;
  tone: "slate" | "blue" | "rose";
  icon: LucideIcon;
}) {
  const toneClasses = {
    slate:
      "border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 text-slate-500 hover:border-slate-300 dark:border-gray-700 hover:text-slate-900 dark:text-white dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-white",
    blue: "border-blue-100 bg-blue-50 text-blue-600 hover:border-blue-200 hover:text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:border-blue-500/30",
    rose: "border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-200 hover:text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:border-rose-500/30",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${toneClasses[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ViewToggleButton({
  active,
  title,
  onClick,
  icon: Icon,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
        active
          ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/20"
          : "text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-200"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function ClassesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = use(props.params);
  const { locale } = params;
  const t = useTranslations("classes");
  const router = useRouter();
  const { currentYear, selectedYear, setSelectedYear } = useAcademicYear();

  const [selectedGrade, setSelectedGrade] = useState<number | undefined>(
    undefined,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const user = TokenManager.getUserData().user;
  const school = TokenManager.getUserData().school;

  const { classes, isLoading, isValidating, error, mutate } = useClasses({
    academicYearId: selectedYear?.id,
  });

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    if (!token) {
      router.replace(`/${locale}/auth/login`);
    }
  }, [locale, router]);

  useEffect(() => {
    if (!currentYear) return;
    if (selectedYear?.id === currentYear.id) return;
    setSelectedYear(currentYear);
  }, [currentYear, selectedYear?.id, setSelectedYear]);

  const filteredClasses = useMemo(() => {
    const query = debouncedSearch.toLowerCase();

    return classes.filter((classItem) => {
      if (selectedGrade !== undefined && classItem.grade !== selectedGrade) {
        return false;
      }

      if (!debouncedSearch.trim()) {
        return true;
      }

      const teacherName = formatTeacherName(classItem, t).toLowerCase();

      return (
        classItem.name.toLowerCase().includes(query) ||
        classItem.section?.toLowerCase().includes(query) ||
        classItem.room?.toLowerCase().includes(query) ||
        classItem.track?.toLowerCase().includes(query) ||
        teacherName.includes(query)
      );
    });
  }, [classes, debouncedSearch, selectedGrade]);

  const availableGrades = useMemo(() => {
    const grades = Array.from(
      new Set(classes.map((classItem) => classItem.grade)),
    ).sort((a, b) => a - b);
    return grades.length > 0 ? grades : FALLBACK_GRADES;
  }, [classes]);

  const visibleCount = filteredClasses.length;
  const totalStudents = useMemo(
    () =>
      filteredClasses.reduce(
        (sum, classItem) => sum + (classItem._count?.students || 0),
        0,
      ),
    [filteredClasses],
  );
  const averageStudents =
    visibleCount > 0 ? Math.round(totalStudents / visibleCount) : 0;
  const gradeLevelCount = useMemo(
    () => new Set(filteredClasses.map((classItem) => classItem.grade)).size,
    [filteredClasses],
  );
  const staffedCount = useMemo(
    () =>
      filteredClasses.filter((classItem) => Boolean(classItem.homeroomTeacher))
        .length,
    [filteredClasses],
  );
  const configuredCount = useMemo(
    () =>
      filteredClasses.filter(
        (classItem) =>
          Boolean(classItem.homeroomTeacher) &&
          Boolean(classItem.room) &&
          Boolean(classItem.capacity),
      ).length,
    [filteredClasses],
  );
  const fullClassesCount = useMemo(
    () =>
      filteredClasses.filter(
        (classItem) => getCapacityState(classItem, t).isFull,
      ).length,
    [filteredClasses],
  );
  const readinessRate =
    visibleCount > 0 ? Math.round((configuredCount / visibleCount) * 100) : 0;
  const hasSearch = Boolean(debouncedSearch.trim());
  const hasActiveFilters = hasSearch || selectedGrade !== undefined;

  const handleLogout = useCallback(async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  }, [locale, router]);

  const handleRefresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  const handleAdd = useCallback(() => {
    if (!selectedYear?.id) return;
    setSelectedClass(null);
    setShowModal(true);
  }, [selectedYear?.id]);

  const handleEdit = useCallback((classItem: Class) => {
    setSelectedClass(classItem);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = window.confirm(t("deleteClassConfirm"));
      if (!confirmed) return;

      try {
        await deleteClass(id);
        await mutate();
      } catch (deleteError: any) {
        window.alert(deleteError.message || t("failedToDelete"));
      }
    },
    [mutate],
  );

  const handleModalClose = useCallback(
    (refresh?: boolean) => {
      setShowModal(false);
      setSelectedClass(null);
      if (refresh) {
        void mutate();
      }
    },
    [mutate],
  );

  const loadingSkeleton =
    viewMode === "grid" ? (
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    ) : (
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-gray-800/70 bg-white dark:bg-gray-900 dark:border-gray-800/70 dark:bg-gray-900/80">
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              <TableSkeleton rows={6} />
            </tbody>
          </table>
        </div>
      </div>
    );

  return (
    <>
      <UnifiedNavigation user={user} school={school} onLogout={handleLogout} />

      <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-500 dark:bg-gray-950 dark:text-white lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="relative flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-gray-500">
                    <Home className="h-3.5 w-3.5" />
                    <span>Home</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-600 dark:text-gray-300">
                      Classes
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <School className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[1.7rem]">
                          {t("classDirectory")}
                        </h1>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-gray-700 sm:block" />
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {t("academicStructure")}
                        </p>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-gray-400">
                        {t("organizeRooms", {
                          year: selectedYear?.name || t("selectedYear"),
                        })}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {selectedYear?.name || t("selectAcademicYear")}
                        </span>
                        <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {t("visibleCount", { count: visibleCount })}
                        </span>
                        {selectedGrade !== undefined ? (
                          <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                            {t("gradeFilter", { grade: selectedGrade })}
                          </span>
                        ) : null}
                        {hasSearch ? (
                          <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {t("searchActive")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full shrink-0 gap-2.5 sm:grid-cols-[1.15fr_1fr] xl:w-[500px]">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/20 dark:bg-gray-900 dark:text-emerald-300">
                          <School className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                              {readinessRate}%
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400">
                              {t("ready")}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">
                            {t("classReadiness")}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_64463585" />
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-700 dark:bg-emerald-400"
                        style={{
                          width: `${Math.max(visibleCount ? readinessRate : 0, visibleCount > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 px-1 py-3 dark:divide-gray-700 dark:border-gray-800 dark:bg-gray-800/50">
                    {[
                      { value: visibleCount, label: t("visible") },
                      { value: staffedCount, label: t("staffed") },
                      { value: fullClassesCount, label: t("full") },
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className="min-w-0 px-2 text-center"
                      >
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

              <div className="relative flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/35 lg:flex-row lg:items-center lg:justify-end sm:px-5">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isValidating}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300 ${isValidating ? "animate-spin" : ""}`}
                  />
                  {t("refresh")}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/classes/placement`)}
                  disabled={!selectedYear?.id}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-xs font-black uppercase tracking-[0.08em] text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  {locale.toLowerCase().startsWith('km') ? 'បែងចែកសិស្ស' : 'Allocate students'}
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!selectedYear?.id}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addClass")}
                </button>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={40}>
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label={t("classes")}
                value={visibleCount}
                icon={School}
                tone="emerald"
              />
              <MetricCard
                label={t("students")}
                value={totalStudents}
                icon={Users}
                tone="blue"
              />
              <MetricCard
                label={t("averageLoad")}
                value={averageStudents}
                icon={ClipboardList}
                tone="amber"
              />
              <MetricCard
                label={t("gradeLevels")}
                value={gradeLevelCount}
                icon={GraduationCap}
                tone="slate"
              />
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={80}>
            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-slate-200 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      {t("operations")}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {t("classWorkspace")}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    {hasActiveFilters ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-2 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                        <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_79e98f08" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                        <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_13c0fab6" />
                      </span>
                    )}
                    {selectedYear?.name ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                        {selectedYear.name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="space-y-3">
                    <label className="relative block">
                      <span className="pointer-events-none absolute left-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={t("searchPlaceholder")}
                        className="h-14 w-full rounded-full border border-slate-200 bg-white pl-14 pr-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGrade(undefined)}
                        className={`inline-flex items-center rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                          selectedGrade === undefined
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
                        }`}
                      >
                        {t("allGrades")}
                      </button>

                      {availableGrades.map((grade) => {
                        const theme = getGradeTheme(grade);
                        const count = classes.filter(
                          (classItem) => classItem.grade === grade,
                        ).length;

                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() =>
                              setSelectedGrade((currentGrade) =>
                                currentGrade === grade ? undefined : grade,
                              )
                            }
                            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                              selectedGrade === grade
                                ? "bg-slate-900 text-white dark:bg-gray-900 dark:text-white"
                                : `${theme.badge} `
                            }`}
                          >
                            <span>{t("gradeFilter", { grade: grade })}</span>
                            {count > 0 ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                  selectedGrade === grade
                                    ? "bg-white dark:bg-gray-900/10 text-white dark:bg-slate-200 dark:text-white"
                                    : "bg-white dark:bg-gray-900/80 text-slate-600 dark:bg-gray-950/70 dark:text-gray-300"
                                }`}
                              >
                                {count}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex h-14 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-gray-800/70 dark:bg-gray-950">
                    <ViewToggleButton
                      active={viewMode === "grid"}
                      title={t("gridView")}
                      onClick={() => setViewMode("grid")}
                      icon={LayoutGrid}
                    />
                    <ViewToggleButton
                      active={viewMode === "list"}
                      title={t("listView")}
                      onClick={() => setViewMode("list")}
                      icon={List}
                    />
                  </div>
                </div>
              </div>

              {error ? (
                <div className="border-b border-slate-200 dark:border-gray-800/70 bg-rose-50/80 px-5 py-4 text-sm font-medium text-rose-700 dark:border-gray-800/70 dark:bg-rose-500/10 dark:text-rose-300 sm:px-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>{error.message || t("unableToLoad")}</p>
                  </div>
                </div>
              ) : null}

              <div className="relative">
                <BlurLoader
                  isLoading={isLoading}
                  blur={false}
                  skeleton={loadingSkeleton}
                >
                  {!selectedYear ? (
                    <div className="px-6 py-20 text-center sm:px-8">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-gray-900 text-slate-400  ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-500 dark:ring-gray-800">
                        <School className="h-7 w-7" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                        {t("selectAcademicYearFirst")}
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-gray-400">
                        <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_c4993cdf" />
                      </p>
                    </div>
                  ) : filteredClasses.length === 0 ? (
                    <div className="px-6 py-20 text-center sm:px-8">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-gray-900 text-slate-400  ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-500 dark:ring-gray-800">
                        <BookMarked className="h-7 w-7" />
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                        {hasActiveFilters
                          ? t("noClassesMatch")
                          : t("noClassesYet")}
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500 dark:text-gray-400">
                        {hasActiveFilters
                          ? t("tryDifferentSearch")
                          : t("createFirstClass", { year: selectedYear.name })}
                      </p>
                      {!hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={handleAdd}
                          className="mt-6 inline-flex items-center gap-2 rounded-[0.95rem] bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white  transition-all "
                        >
                          <Plus className="h-4 w-4" />
                          {t("createClass")}
                        </button>
                      ) : null}
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3 sm:p-8">
                      {filteredClasses.map((classItem) => {
                        const theme = getGradeTheme(classItem.grade);
                        const capacityState = getCapacityState(classItem, t);
                        const teacherName = formatTeacherName(classItem, t);

                        return (
                          <article
                            key={classItem.id}
                            className={`relative overflow-hidden rounded-3xl border p-5 transition-colors duration-300 ${theme.card}`}
                          >
                            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/60 dark:bg-gray-900/40" />
                            <div className="relative z-10">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatar} text-sm font-black text-white `}
                                  >
                                    {classItem.grade}
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                                        {classItem.name}
                                      </h3>
                                      <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}
                                      >
                                        <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_48ca1998" />{" "}
                                        {classItem.grade}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200/70 dark:bg-gray-950/60 dark:ring-gray-800/70">
                                        <UserRound className="h-3.5 w-3.5" />
                                        {teacherName}
                                      </span>
                                      {classItem.room ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200/70 dark:bg-gray-950/60 dark:ring-gray-800/70">
                                          <MapPin className="h-3.5 w-3.5" />
                                          {classItem.room}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <ActionIconButton
                                    title={t("manageClass")}
                                    onClick={() =>
                                      router.push(
                                        `/${locale}/classes/${classItem.id}/manage`,
                                      )
                                    }
                                    tone="blue"
                                    icon={Eye}
                                  />
                                  <ActionIconButton
                                    title={t("editClass")}
                                    onClick={() => handleEdit(classItem)}
                                    tone="slate"
                                    icon={Edit2}
                                  />
                                  <ActionIconButton
                                    title={t("deleteClass")}
                                    onClick={() => handleDelete(classItem.id)}
                                    tone="rose"
                                    icon={Trash2}
                                  />
                                </div>
                              </div>

                              <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3  dark:border-gray-800 dark:bg-gray-800/70">
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                    {t("track")}
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                                    {formatTrackLabel(classItem.track)}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3  dark:border-gray-800 dark:bg-gray-800/70">
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                    {t("section")}
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                                    {classItem.section || "Standard"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4  dark:border-gray-800 dark:bg-gray-800/70">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-gray-500">
                                      {t("capacity")}
                                    </p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                                      {capacityState.studentCount}
                                      {capacityState.capacity
                                        ? ` / ${capacityState.capacity}`
                                        : ""}
                                    </p>
                                  </div>
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${capacityState.pillClass}`}
                                  >
                                    {capacityState.label}
                                  </span>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-gray-900/10">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${capacityState.barClass}`}
                                    style={{
                                      width: `${Math.max(Math.min(capacityState.percent, 100), 8)}%`,
                                    }}
                                  />
                                </div>

                                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-gray-400">
                                  {capacityState.helper}
                                </p>
                              </div>

                              <div className="mt-5 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/${locale}/classes/${classItem.id}/manage`,
                                    )
                                  }
                                  className="inline-flex flex-1 items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-black text-white  transition-all hover:bg-blue-700  "
                                >
                                  <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_7cb452be" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(
                                      `/${locale}/classes/${classItem.id}/roster`,
                                    )
                                  }
                                  className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900  transition-all hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800/70"
                                >
                                  <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_27936d7a" />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 dark:border-gray-800/70 dark:bg-gray-950/40">
                            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {t("class")}
                            </th>
                            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {t("teacher")}
                            </th>
                            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {t("room")}
                            </th>
                            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {t("track")}
                            </th>
                            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {t("capacity")}
                            </th>
                            <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {t("actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-gray-800/70">
                          {filteredClasses.map((classItem) => {
                            const theme = getGradeTheme(classItem.grade);
                            const capacityState = getCapacityState(
                              classItem,
                              t,
                            );

                            return (
                              <tr
                                key={classItem.id}
                                className="transition-colors hover:bg-slate-50 dark:hover:bg-gray-950/30"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.avatar} text-sm font-black text-white `}
                                    >
                                      {classItem.grade}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                                          {classItem.name}
                                        </span>
                                        <span
                                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${theme.badge}`}
                                        >
                                          <AutoI18nText i18nKey="auto.web.app_locale_classes_page.k_48ca1998" />{" "}
                                          {classItem.grade}
                                        </span>
                                      </div>
                                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-gray-400">
                                        {classItem.section
                                          ? `Section ${classItem.section}`
                                          : "Standard section"}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                  {formatTeacherName(classItem, t)}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                  {classItem.room || "Not set"}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                  {formatTrackLabel(classItem.track)}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="max-w-[220px]">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
                                        {capacityState.studentCount}
                                        {capacityState.capacity
                                          ? ` / ${capacityState.capacity}`
                                          : ""}
                                      </span>
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${capacityState.pillClass}`}
                                      >
                                        {capacityState.label}
                                      </span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-gray-900/10">
                                      <div
                                        className={`h-full rounded-full bg-gradient-to-r ${capacityState.barClass}`}
                                        style={{
                                          width: `${Math.max(Math.min(capacityState.percent, 100), 8)}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <ActionIconButton
                                      title={t("manageClass")}
                                      onClick={() =>
                                        router.push(
                                          `/${locale}/classes/${classItem.id}/manage`,
                                        )
                                      }
                                      tone="blue"
                                      icon={Eye}
                                    />
                                    <ActionIconButton
                                      title={t("editClass")}
                                      onClick={() => handleEdit(classItem)}
                                      tone="slate"
                                      icon={Edit2}
                                    />
                                    <ActionIconButton
                                      title={t("deleteClass")}
                                      onClick={() => handleDelete(classItem.id)}
                                      tone="rose"
                                      icon={Trash2}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </BlurLoader>
              </div>
            </section>
          </AnimatedContent>
        </main>
      </div>

      {showModal ? (
        <ClassModal
          classItem={selectedClass}
          defaultAcademicYearId={selectedYear?.id}
          academicYearLabel={selectedYear?.name || null}
          onClose={handleModalClose}
        />
      ) : null}
    </>
  );
}
