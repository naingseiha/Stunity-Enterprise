"use client";

import { useTranslations } from "next-intl";
import { I18nText as AutoI18nText } from "@/components/i18n/I18nText";
import { useEffect, useState, useMemo, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { TokenManager } from "@/lib/api/auth";
import { subjectAPI, Subject, SubjectStatistics } from "@/lib/api/subjects";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import BlurLoader from "@/components/BlurLoader";
import AnimatedContent from "@/components/AnimatedContent";
import PageSkeleton from "@/components/layout/PageSkeleton";
import {
  useSubjects,
  useSubjectStatistics,
  invalidateSubjectsPersistentCache,
} from "@/hooks/useSubjects";
import { useDebounce } from "@/hooks/useDebounce";
import {
  BookOpen,
  Plus,
  Search,
  Grid3x3,
  List,
  Edit,
  Trash2,
  Clock,
  X,
  CheckCircle,
  XCircle,
  Layers,
  Home,
  ChevronRight,
  RefreshCw,
  GraduationCap,
} from "lucide-react";

type ViewMode = "grid" | "list";

function isKhmerLocale(locale: string) {
  return locale.toLowerCase().startsWith("km");
}

function localLabel(locale: string, en: string, km: string) {
  return isKhmerLocale(locale) ? km : en;
}

function formatSubjectCategory(category: string, locale: string) {
  const normalized = category.toLowerCase();
  const labels: Record<string, { en: string; km: string }> = {
    science: { en: "Science", km: "វិទ្យាសាស្ត្រ" },
    social: { en: "Social", km: "សង្គម" },
    language: { en: "Language", km: "ភាសា" },
    mathematics: { en: "Mathematics", km: "គណិតវិទ្យា" },
    arts: { en: "Arts", km: "សិល្បៈ" },
    sports: { en: "Sports", km: "កីឡា" },
  };

  const match = labels[normalized];
  return match ? localLabel(locale, match.en, match.km) : category;
}

export default function SubjectsManagementPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const autoT = useTranslations();
  const params = use(props.params);
  const router = useRouter();
  const { locale } = params;
  const labels = useMemo(
    () => ({
      home: localLabel(locale, "Home", "ទំព័រដើម"),
      subjects: localLabel(locale, "Subjects", "មុខវិជ្ជា"),
      title: localLabel(locale, "Subjects", "មុខវិជ្ជា"),
      registry: localLabel(locale, "Subjects Registry", "បញ្ជីមុខវិជ្ជា"),
      eyebrow: localLabel(
        locale,
        "Curriculum Settings",
        "ការកំណត់កម្មវិធីសិក្សា",
      ),
      description: localLabel(
        locale,
        "Organize and manage your school's curriculum in one central workspace.",
        "រៀបចំ និងគ្រប់គ្រងមុខវិជ្ជាសិក្សារបស់សាលានៅក្នុងកន្លែងតែមួយ។",
      ),
      registeredSubjects: localLabel(
        locale,
        "registered subjects",
        "មុខវិជ្ជាបានចុះបញ្ជី",
      ),
      totalSubjects: localLabel(locale, "subjects", "មុខវិជ្ជា"),
      active: localLabel(locale, "Active", "កំពុងប្រើ"),
      draft: localLabel(locale, "Draft", "ព្រាង"),
      tracks: localLabel(locale, "Tracks", "ក្រុម"),
      refresh: localLabel(locale, "Refresh", "ធ្វើបច្ចុប្បន្នភាព"),
      newSubject: localLabel(locale, "New Subject", "បន្ថែមមុខវិជ្ជា"),
      visible: localLabel(locale, "Visible", "កំពុងបង្ហាញ"),
      filtered: localLabel(locale, "Filtered", "បានតម្រង"),
      searchPlaceholder: localLabel(
        locale,
        "Search subjects by name, code, or short name",
        "ស្វែងរកតាមឈ្មោះ លេខកូដ ឬឈ្មោះកាត់",
      ),
      searchHelper: localLabel(
        locale,
        "Search by subject name, short name, or code.",
        "ស្វែងរកតាមឈ្មោះមុខវិជ្ជា ឈ្មោះកាត់ ឬលេខកូដ។",
      ),
      allAcademicLevels: localLabel(
        locale,
        "All Academic Levels",
        "កម្រិតសិក្សាទាំងអស់",
      ),
      allDisciplines: localLabel(locale, "All Disciplines", "ផ្នែកទាំងអស់"),
      allStatus: localLabel(locale, "All status", "ស្ថានភាពទាំងអស់"),
      reset: localLabel(locale, "Reset", "សម្អាត"),
      retry: localLabel(locale, "Retry", "សាកល្បងម្តងទៀត"),
      resetFilters: localLabel(locale, "Reset filters", "សម្អាតតម្រង"),
      noSubjectsTitle: localLabel(
        locale,
        "No subjects found",
        "រកមិនឃើញមុខវិជ្ជា",
      ),
      noSubjectsFiltered: localLabel(
        locale,
        "No subjects match the current filters. Reset or broaden your search.",
        "មិនមានមុខវិជ្ជាណាមួយត្រូវនឹងតម្រងបច្ចុប្បន្នទេ។ សូមសម្អាតតម្រង ឬពង្រីកការស្វែងរក។",
      ),
      noSubjectsEmpty: localLabel(
        locale,
        "Your curriculum is empty. Start by adding the first subject.",
        "កម្មវិធីសិក្សានៅទទេ។ សូមចាប់ផ្តើមដោយបន្ថែមមុខវិជ្ជាដំបូង។",
      ),
      addFirstSubject: localLabel(locale, "Add subject", "បន្ថែមមុខវិជ្ជា"),
      no: localLabel(locale, "No.", "ល.រ"),
      academicSubject: localLabel(
        locale,
        "Academic Subject",
        "មុខវិជ្ជាសិក្សា",
      ),
      idCode: localLabel(locale, "ID Code", "លេខកូដ"),
      curriculumLevel: localLabel(locale, "Curriculum Level", "កម្រិតសិក្សា"),
      discipline: localLabel(locale, "Discipline", "ផ្នែក"),
      load: localLabel(locale, "Load", "ម៉ោង"),
      status: localLabel(locale, "Status", "ស្ថានភាព"),
      actions: localLabel(locale, "Actions", "សកម្មភាព"),
      code: localLabel(locale, "Code", "លេខកូដ"),
      grade: localLabel(locale, "Grade", "ថ្នាក់"),
      category: localLabel(locale, "Category", "ផ្នែក"),
      hours: localLabel(locale, "Hours", "ម៉ោង"),
      suspend: localLabel(locale, "Suspend", "ផ្អាក"),
      resume: localLabel(locale, "Resume", "បើកវិញ"),
      clearSearch: localLabel(locale, "Clear search", "សម្អាតការស្វែងរក"),
      gridView: localLabel(locale, "Grid view", "មើលជា Grid"),
      listView: localLabel(locale, "List view", "មើលជាតារាង"),
    }),
    [locale],
  );

  // View & Filters
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterGrade, setFilterGrade] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    nameKh: "",
    nameEn: "",
    nameKhShort: "",
    nameEnShort: "",
    code: "",
    description: "",
    grade: "",
    track: "",
    category: "",
    weeklyHours: "",
    annualHours: "",
    maxScore: "",
    coefficient: "",
    isActive: true,
  });

  // User data
  const [userData, setUserData] = useState<any>(null);

  const subjectsQueryParams = useMemo(
    () => ({
      grade: filterGrade || undefined,
      category: filterCategory || undefined,
      isActive: filterStatus === "all" ? undefined : filterStatus === "active",
      includeTeachers: true,
    }),
    [filterGrade, filterCategory, filterStatus],
  );

  // Use SWR hooks for data fetching
  const {
    subjects,
    isLoading: loading,
    isValidating,
    mutate,
    error,
  } = useSubjects(subjectsQueryParams);

  const { statistics, mutate: mutateStats } = useSubjectStatistics();

  useEffect(() => {
    const token = TokenManager.getAccessToken();
    const user = TokenManager.getUserData();

    if (!token || !user) {
      router.push(`/${locale}/auth/login`);
      return;
    }

    setUserData(user);
  }, [locale, router]);

  // Filter subjects by search (client-side for instant feedback)
  const filteredSubjects = useMemo(() => {
    let filtered = [...subjects];

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.nameKh?.toLowerCase().includes(query) ||
          s.nameEn?.toLowerCase().includes(query) ||
          s.nameKhShort?.toLowerCase().includes(query) ||
          s.nameEnShort?.toLowerCase().includes(query) ||
          s.code.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [subjects, debouncedSearch]);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      nameKh: "",
      nameEn: "",
      nameKhShort: "",
      nameEnShort: "",
      code: "",
      description: "",
      grade: "",
      track: "",
      category: "",
      weeklyHours: "",
      annualHours: "",
      maxScore: "",
      coefficient: "",
      isActive: true,
    });
  }, []);

  const handleCreate = useCallback(() => {
    resetForm();
    setShowCreateModal(true);
  }, [resetForm]);

  const handleEdit = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      nameKh: subject.nameKh || "",
      nameEn: subject.nameEn || "",
      nameKhShort: subject.nameKhShort || "",
      nameEnShort: subject.nameEnShort || "",
      code: subject.code,
      description: subject.description || "",
      grade: subject.grade,
      track: subject.track || "",
      category: subject.category,
      weeklyHours: subject.weeklyHours.toString(),
      annualHours: subject.annualHours.toString(),
      maxScore: subject.maxScore.toString(),
      coefficient: subject.coefficient.toString(),
      isActive: subject.isActive,
    });
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  }, []);

  const handleSubmitCreate = async () => {
    try {
      if (
        !formData.name ||
        !formData.code ||
        !formData.grade ||
        !formData.category
      ) {
        return;
      }

      await subjectAPI.createSubject({
        name: formData.name,
        nameKh: formData.nameKh,
        nameEn: formData.nameEn,
        nameKhShort: formData.nameKhShort || undefined,
        nameEnShort: formData.nameEnShort || undefined,
        code: formData.code,
        description: formData.description,
        grade: formData.grade,
        track: formData.track || undefined,
        category: formData.category,
        weeklyHours: parseFloat(formData.weeklyHours) || 0,
        annualHours: parseFloat(formData.annualHours) || 0,
        maxScore: parseFloat(formData.maxScore) || 100,
        coefficient: parseFloat(formData.coefficient) || 1,
        isActive: formData.isActive,
      });

      setShowCreateModal(false);
      resetForm();
      invalidateSubjectsPersistentCache(subjectsQueryParams);
      await mutate();
      await mutateStats();
    } catch (err: any) {
      console.error("Failed to create subject:", err.message);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedSubject) return;

    try {
      await subjectAPI.updateSubject(selectedSubject.id, {
        name: formData.name,
        nameKh: formData.nameKh,
        nameEn: formData.nameEn,
        nameKhShort: formData.nameKhShort || null,
        nameEnShort: formData.nameEnShort || null,
        code: formData.code,
        description: formData.description,
        grade: formData.grade,
        track: formData.track || undefined,
        category: formData.category,
        weeklyHours: parseFloat(formData.weeklyHours),
        annualHours: parseFloat(formData.annualHours),
        maxScore: parseFloat(formData.maxScore),
        coefficient: parseFloat(formData.coefficient),
        isActive: formData.isActive,
      });

      setShowEditModal(false);
      setSelectedSubject(null);
      resetForm();
      invalidateSubjectsPersistentCache(subjectsQueryParams);
      await mutate();
      await mutateStats();
    } catch (err: any) {
      console.error("Failed to update subject:", err.message);
    }
  };

  const handleSubmitDelete = async () => {
    if (!selectedSubject) return;

    try {
      await subjectAPI.deleteSubject(selectedSubject.id);
      setShowDeleteModal(false);
      setSelectedSubject(null);
      invalidateSubjectsPersistentCache(subjectsQueryParams);
      await mutate();
      await mutateStats();
    } catch (err: any) {
      console.error("Failed to delete subject:", err.message);
    }
  };

  const handleToggleStatus = async (subject: Subject) => {
    try {
      await subjectAPI.toggleStatus(subject.id);
      invalidateSubjectsPersistentCache(subjectsQueryParams);
      await mutate();
      await mutateStats();
    } catch (err: any) {
      console.error("Failed to toggle status:", err.message);
    }
  };

  const getUniqueGrades = useCallback(() => {
    const grades = [...new Set(subjects.map((s) => s.grade))];
    return grades.sort();
  }, [subjects]);

  const getUniqueCategories = useCallback(() => {
    const categories = [...new Set(subjects.map((s) => s.category))];
    return categories.sort();
  }, [subjects]);

  const getCategoryCount = useCallback(
    (category: string) => {
      return (
        statistics?.byCategory.find((c) => c.category === category)?._count || 0
      );
    },
    [statistics],
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    Boolean(filterGrade) ||
    Boolean(filterCategory) ||
    filterStatus !== "all";

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setFilterGrade("");
    setFilterCategory("");
    setFilterStatus("all");
  }, []);

  const handleLogout = useCallback(async () => {
    await TokenManager.logout();
    router.push(`/${locale}/auth/login`);
  }, [locale, router]);

  if (loading && subjects.length === 0) {
    return (
      <PageSkeleton
        user={userData?.user}
        school={userData?.school}
        type="cards"
      />
    );
  }

  return (
    <>
      <UnifiedNavigation
        user={userData?.user}
        school={userData?.school}
        onLogout={handleLogout}
      />

      <div className="relative min-h-screen overflow-hidden bg-slate-50 transition-colors duration-500 dark:bg-gray-950 lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 pb-12 pt-4 sm:px-6 lg:px-8">
          <AnimatedContent animation="fade" delay={0}>
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="relative flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-gray-500">
                    <Home className="h-3.5 w-3.5" />
                    <span>{labels.home}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-slate-600 dark:text-gray-300">
                      {labels.subjects}
                    </span>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[1.7rem]">
                          {labels.title}
                        </h1>
                        <span className="hidden h-4 w-px bg-slate-200 dark:bg-gray-700 sm:block" />
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                          {labels.eyebrow}
                        </p>
                      </div>
                      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-gray-400">
                        {labels.description}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
                          {statistics?.total || 0} {labels.registeredSubjects}
                        </span>
                        <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {statistics?.active || 0} {labels.active}
                        </span>
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {statistics?.byCategory.length || 0} {labels.tracks}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full shrink-0 gap-2.5 sm:grid-cols-[1fr_auto_auto] xl:w-auto">
                  <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 px-1 py-3 dark:divide-gray-700 dark:border-gray-800 dark:bg-gray-800/50 sm:w-[270px]">
                    {[
                      {
                        value: statistics?.total || 0,
                        label: labels.totalSubjects,
                      },
                      {
                        value: statistics?.active || 0,
                        label: labels.active,
                      },
                      {
                        value: statistics?.inactive || 0,
                        label: labels.draft,
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
                  <button
                    onClick={() => {
                      mutate();
                      mutateStats();
                    }}
                    disabled={isValidating}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300 ${isValidating ? "animate-spin" : ""}`}
                    />
                    {labels.refresh}
                  </button>
                  <button
                    onClick={handleCreate}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:from-orange-700 hover:to-amber-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {labels.newSubject}
                  </button>
                </div>
              </div>
            </section>
          </AnimatedContent>

          <AnimatedContent animation="slide-up" delay={100}>
            <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-slate-200 px-6 py-6 dark:border-gray-800/70 sm:px-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 dark:text-gray-500">
                      {labels.eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {labels.registry}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {filteredSubjects.length} / {statistics?.total || 0}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 ring-1 ring-slate-200/70 dark:bg-gray-800/80 dark:ring-gray-700/70">
                      {searchQuery.trim()
                        ? searchQuery.trim()
                        : labels.searchPlaceholder}
                    </span>
                    {hasActiveFilters ? (
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-2 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                        {labels.filtered}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px_220px_180px_auto_auto]">
                  <div className="space-y-2">
                    <label className="relative block">
                      <span className="pointer-events-none absolute left-4 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400">
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={labels.searchPlaceholder}
                        className="h-14 w-full rounded-full border border-slate-200 bg-white pl-14 pr-12 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-orange-500/40 dark:focus:ring-orange-500/10"
                      />
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          aria-label={labels.clearSearch}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </label>
                    <p className="pl-4 text-xs font-medium text-slate-400 dark:text-gray-500">
                      {labels.searchHelper}
                    </p>
                  </div>

                  <select
                    value={filterGrade}
                    onChange={(event) => setFilterGrade(event.target.value)}
                    className="h-14 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:focus:border-orange-500/40 dark:focus:ring-orange-500/10"
                  >
                    <option value="">{labels.allAcademicLevels}</option>
                    {getUniqueGrades().map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterCategory}
                    onChange={(event) => setFilterCategory(event.target.value)}
                    className="h-14 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:focus:border-orange-500/40 dark:focus:ring-orange-500/10"
                  >
                    <option value="">{labels.allDisciplines}</option>
                    {getUniqueCategories().map((category) => (
                      <option key={category} value={category}>
                        {formatSubjectCategory(category, locale)} (
                        {getCategoryCount(category)})
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(event) =>
                      setFilterStatus(
                        event.target.value as "all" | "active" | "inactive",
                      )
                    }
                    className="h-14 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:focus:border-orange-500/40 dark:focus:ring-orange-500/10"
                  >
                    <option value="all">{labels.allStatus}</option>
                    <option value="active">{labels.active}</option>
                    <option value="inactive">{labels.draft}</option>
                  </select>

                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-800/70 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <X className="h-4 w-4" />
                      {labels.reset}
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex h-14 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-gray-800/70 dark:bg-gray-950">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      title={labels.gridView}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                        viewMode === "grid"
                          ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/20"
                          : "text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-200"
                      }`}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      title={labels.listView}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                        viewMode === "list"
                          ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/20"
                          : "text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-200"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="border-b border-slate-200 bg-rose-50/80 px-6 py-4 text-sm font-semibold text-rose-700 dark:border-gray-800/70 dark:bg-rose-500/10 dark:text-rose-300 sm:px-8">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <p>{typeof error === "string" ? error : error.message}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => mutate()}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-white px-3 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-500/20 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {labels.retry}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="relative">
                <BlurLoader isLoading={loading} showSpinner={false}>
                  {filteredSubjects.length === 0 ? (
                    <div className="px-6 py-20 text-center sm:px-8">
                      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                        {hasActiveFilters ? (
                          <XCircle className="h-8 w-8" />
                        ) : (
                          <BookOpen className="h-8 w-8" />
                        )}
                      </div>
                      <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
                        {labels.noSubjectsTitle}
                      </h3>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-gray-400">
                        {hasActiveFilters
                          ? labels.noSubjectsFiltered
                          : labels.noSubjectsEmpty}
                      </p>
                      <button
                        type="button"
                        onClick={hasActiveFilters ? resetFilters : handleCreate}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                      >
                        {hasActiveFilters ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {hasActiveFilters
                          ? labels.resetFilters
                          : labels.addFirstSubject}
                      </button>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3 sm:p-8">
                      {filteredSubjects.map((subject) => (
                        <article
                          key={subject.id}
                          className={`rounded-3xl border bg-white p-5 transition-colors dark:bg-gray-900/90 ${
                            subject.isActive
                              ? "border-slate-200 dark:border-gray-800/70"
                              : "border-slate-200 opacity-70 grayscale dark:border-gray-800"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                                <BookOpen className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-black tracking-tight text-slate-900 dark:text-white">
                                  {subject.nameKh || subject.name}
                                </h3>
                                <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-gray-400">
                                  {subject.nameEn || subject.name}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                subject.isActive
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                              }`}
                            >
                              {subject.isActive ? labels.active : labels.draft}
                            </span>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-950/60">
                              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                                {labels.code}
                              </p>
                              <p className="mt-1 font-mono text-sm font-black text-slate-900 dark:text-white">
                                {subject.code}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-950/60">
                              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                                {labels.grade}
                              </p>
                              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                {subject.grade}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-950/60">
                              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                                {labels.category}
                              </p>
                              <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
                                {formatSubjectCategory(
                                  subject.category,
                                  locale,
                                )}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-950/60">
                              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                                {labels.hours}
                              </p>
                              <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                {subject.weeklyHours}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-gray-800 dark:bg-gray-950/70">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(subject)}
                              className="flex-1 rounded-xl bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:text-orange-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-orange-300"
                            >
                              {subject.isActive
                                ? labels.suspend
                                : labels.resume}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(subject)}
                              className="rounded-xl bg-white p-2.5 text-indigo-600 transition-colors hover:bg-indigo-50 dark:bg-gray-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(subject)}
                              className="rounded-xl bg-white p-2.5 text-rose-600 transition-colors hover:bg-rose-50 dark:bg-gray-900 dark:text-rose-300 dark:hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 dark:border-gray-800/70 dark:bg-gray-950/40">
                            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.no}
                            </th>
                            <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.academicSubject}
                            </th>
                            <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.idCode}
                            </th>
                            <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.curriculumLevel}
                            </th>
                            <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.discipline}
                            </th>
                            <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.load}
                            </th>
                            <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.status}
                            </th>
                            <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 dark:text-gray-500">
                              {labels.actions}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/80 dark:divide-gray-800/70">
                          {filteredSubjects.map((subject, index) => (
                            <tr
                              key={subject.id}
                              className="group transition-colors hover:bg-slate-50 dark:hover:bg-gray-950/30"
                            >
                              <td className="px-6 py-4 align-top">
                                <span className="inline-flex min-w-10 justify-center rounded-full bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-bold text-slate-500 ring-1 ring-slate-200/70 dark:bg-gray-800/70 dark:text-gray-300 dark:ring-gray-700/70">
                                  {index + 1}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                                    <BookOpen className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                      {subject.nameKh || subject.name}
                                    </p>
                                    <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-gray-400">
                                      {subject.nameEn || subject.name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className="inline-flex rounded-full bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-600 ring-1 ring-slate-200/70 dark:bg-gray-800/70 dark:text-gray-300 dark:ring-gray-700/70">
                                  {subject.code}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className="inline-flex rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/20">
                                  {subject.grade}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className="inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20">
                                  {formatSubjectCategory(
                                    subject.category,
                                    locale,
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-300">
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  {subject.weeklyHours}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                    subject.isActive
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
                                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      subject.isActive
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                  {subject.isActive
                                    ? labels.active
                                    : labels.draft}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right align-top">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(subject)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-orange-50 hover:text-orange-600 dark:text-gray-400 dark:hover:bg-orange-500/10 dark:hover:text-orange-300"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(subject)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(subject)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </BlurLoader>
              </div>
            </section>
          </AnimatedContent>

          {/* Create Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500 rounded-2xl ">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_21500224" />
                      </h2>
                      <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_224f21db" />
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-3 text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 rounded-2xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
                  {/* Names Section */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_c7b798c8" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_6e077fbb" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_be278f15",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_4afbe73c" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameKh}
                          onChange={(e) =>
                            setFormData({ ...formData, nameKh: e.target.value })
                          }
                          placeholder="គណិតវិទ្យា"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_97694b59" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameEn}
                          onChange={(e) =>
                            setFormData({ ...formData, nameEn: e.target.value })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_a7ae52e2",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_a4e8c701" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_7c2fb91a" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameKhShort}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nameKhShort: e.target.value,
                            })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_3f8aae12",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_9e1dab44" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameEnShort}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nameEnShort: e.target.value,
                            })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_5c7019bb",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Basic Info */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_cc523f33" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_efe42741" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              code: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_4b3b269a",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black font-mono transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_7d56a945" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <select
                          value={formData.grade}
                          onChange={(e) =>
                            setFormData({ ...formData, grade: e.target.value })
                          }
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                        >
                          <option value="">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_bc5e7018",
                            )}
                          </option>
                          <option value="Grade 7">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_165a0048",
                            )}
                          </option>
                          <option value="Grade 8">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_3c0f12a9",
                            )}
                          </option>
                          <option value="Grade 9">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_d7dda8f5",
                            )}
                          </option>
                          <option value="Grade 10">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_87faedb4",
                            )}
                          </option>
                          <option value="Grade 11">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_a02cd013",
                            )}
                          </option>
                          <option value="Grade 12">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_2976911b",
                            )}
                          </option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_667eb6bc" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                        >
                          <option value="">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_9d1e7806",
                            )}
                          </option>
                          <option value="Core">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_8a8c0140",
                            )}
                          </option>
                          <option value="Science">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_3b2e7973",
                            )}
                          </option>
                          <option value="Language">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_47174324",
                            )}
                          </option>
                          <option value="Social Studies">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_eab7c40a",
                            )}
                          </option>
                          <option value="Arts">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_5f1918c3",
                            )}
                          </option>
                          <option value="Physical Education">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_65980465",
                            )}
                          </option>
                          <option value="Technology">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_045d2af2",
                            )}
                          </option>
                          <option value="Elective">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_a4e342c8",
                            )}
                          </option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_08c65852" />
                        </label>
                        <input
                          type="text"
                          value={formData.track}
                          onChange={(e) =>
                            setFormData({ ...formData, track: e.target.value })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_24bd26a1",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_75ac96bd" />
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder={autoT(
                          "auto.web.locale_settings_subjects_page.k_433f4099",
                        )}
                        rows={4}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400 resize-none"
                      />
                    </div>
                  </section>

                  {/* Academic Details */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_9a334ac5" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_dd9afd1a" />
                        </label>
                        <input
                          type="number"
                          value={formData.weeklyHours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              weeklyHours: e.target.value,
                            })
                          }
                          placeholder="3"
                          min="0"
                          step="0.5"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_c8e6aadd" />
                        </label>
                        <input
                          type="number"
                          value={formData.annualHours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              annualHours: e.target.value,
                            })
                          }
                          placeholder="120"
                          min="0"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_e4c93ca1" />
                        </label>
                        <input
                          type="number"
                          value={formData.maxScore}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxScore: e.target.value,
                            })
                          }
                          placeholder="100"
                          min="0"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_8ba6baf4" />
                        </label>
                        <input
                          type="number"
                          value={formData.coefficient}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              coefficient: e.target.value,
                            })
                          }
                          placeholder="1.0"
                          min="0"
                          step="0.1"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Status Toggle */}
                  <div className="p-6 bg-gray-50 dark:bg-gray-900/80 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl transition-all ${
                          formData.isActive
                            ? "bg-emerald-500"
                            : "bg-gray-200 dark:bg-gray-800"
                        }`}
                      >
                        <CheckCircle
                          className={`w-5 h-5 ${formData.isActive ? "text-white" : "text-gray-400"}`}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_3beb78f5" />
                        </h4>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_f4d59230" />
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          isActive: !formData.isActive,
                        })
                      }
                      className={`relative w-14 h-8 rounded-full transition-all duration-300 ${formData.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"}`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white dark:bg-gray-900 rounded-full  transform transition-transform duration-300 ${formData.isActive ? "translate-x-6" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 bg-gray-50 dark:bg-none dark:bg-gray-800/50 dark:bg-none dark:bg-gray-900/50">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-8 py-4 bg-white dark:bg-none dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-none dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_9745beba" />
                  </button>
                  <button
                    onClick={handleSubmitCreate}
                    className="rounded-2xl bg-gradient-to-r from-orange-500 to-yellow-500 px-10 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors"
                  >
                    <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_6b8eb2ed" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {showEditModal && selectedSubject && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-none dark:bg-gray-800/50 dark:bg-none dark:bg-gray-900/50">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500 rounded-2xl ">
                      <Edit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_f53b9e36" />
                      </h2>
                      <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_2020adf9" />
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-3 text-gray-400 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-gray-100 dark:bg-none dark:bg-gray-800 dark:hover:bg-gray-800 rounded-2xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
                  {/* Names Section */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_c7b798c8" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_6e077fbb" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_be278f15",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_4afbe73c" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameKh}
                          onChange={(e) =>
                            setFormData({ ...formData, nameKh: e.target.value })
                          }
                          placeholder="គណិតវិទ្យា"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_97694b59" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameEn}
                          onChange={(e) =>
                            setFormData({ ...formData, nameEn: e.target.value })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_a7ae52e2",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_a4e8c701" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_7c2fb91a" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameKhShort}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nameKhShort: e.target.value,
                            })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_3f8aae12",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_9e1dab44" />
                        </label>
                        <input
                          type="text"
                          value={formData.nameEnShort}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nameEnShort: e.target.value,
                            })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_5c7019bb",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Basic Info */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_cc523f33" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_efe42741" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              code: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_4b3b269a",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black font-mono transition-all placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_7d56a945" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <select
                          value={formData.grade}
                          onChange={(e) =>
                            setFormData({ ...formData, grade: e.target.value })
                          }
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                        >
                          <option value="">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_bc5e7018",
                            )}
                          </option>
                          <option value="Grade 7">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_165a0048",
                            )}
                          </option>
                          <option value="Grade 8">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_3c0f12a9",
                            )}
                          </option>
                          <option value="Grade 9">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_d7dda8f5",
                            )}
                          </option>
                          <option value="Grade 10">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_87faedb4",
                            )}
                          </option>
                          <option value="Grade 11">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_a02cd013",
                            )}
                          </option>
                          <option value="Grade 12">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_2976911b",
                            )}
                          </option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_667eb6bc" />{" "}
                          <span className="text-orange-500">*</span>
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                            })
                          }
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all appearance-none"
                        >
                          <option value="">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_9d1e7806",
                            )}
                          </option>
                          <option value="Core">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_8a8c0140",
                            )}
                          </option>
                          <option value="Science">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_3b2e7973",
                            )}
                          </option>
                          <option value="Language">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_47174324",
                            )}
                          </option>
                          <option value="Social Studies">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_eab7c40a",
                            )}
                          </option>
                          <option value="Arts">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_5f1918c3",
                            )}
                          </option>
                          <option value="Physical Education">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_65980465",
                            )}
                          </option>
                          <option value="Technology">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_045d2af2",
                            )}
                          </option>
                          <option value="Elective">
                            {autoT(
                              "auto.web.locale_settings_subjects_page.k_a4e342c8",
                            )}
                          </option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_08c65852" />
                        </label>
                        <input
                          type="text"
                          value={formData.track}
                          onChange={(e) =>
                            setFormData({ ...formData, track: e.target.value })
                          }
                          placeholder={autoT(
                            "auto.web.locale_settings_subjects_page.k_24bd26a1",
                          )}
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_75ac96bd" />
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder={autoT(
                          "auto.web.locale_settings_subjects_page.k_433f4099",
                        )}
                        rows={4}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-bold transition-all placeholder:text-gray-400 resize-none"
                      />
                    </div>
                  </section>

                  {/* Academic Details */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                      <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase tracking-widest text-xs">
                        <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_9a334ac5" />
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_dd9afd1a" />
                        </label>
                        <input
                          type="number"
                          value={formData.weeklyHours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              weeklyHours: e.target.value,
                            })
                          }
                          placeholder="3"
                          min="0"
                          step="0.5"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_c8e6aadd" />
                        </label>
                        <input
                          type="number"
                          value={formData.annualHours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              annualHours: e.target.value,
                            })
                          }
                          placeholder="120"
                          min="0"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_e4c93ca1" />
                        </label>
                        <input
                          type="number"
                          value={formData.maxScore}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxScore: e.target.value,
                            })
                          }
                          placeholder="100"
                          min="0"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_8ba6baf4" />
                        </label>
                        <input
                          type="number"
                          value={formData.coefficient}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              coefficient: e.target.value,
                            })
                          }
                          placeholder="1.0"
                          min="0"
                          step="0.1"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-none dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 dark:text-white font-black transition-all"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Status Toggle */}
                  <div className="p-6 bg-gray-50 dark:bg-none dark:bg-gray-900/80 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl transition-all ${
                          formData.isActive
                            ? "bg-emerald-500"
                            : "bg-gray-200 dark:bg-gray-800"
                        }`}
                      >
                        <CheckCircle
                          className={`w-5 h-5 ${formData.isActive ? "text-white" : "text-gray-400"}`}
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_3beb78f5" />
                        </h4>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                          <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_f4d59230" />
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setFormData({
                          ...formData,
                          isActive: !formData.isActive,
                        })
                      }
                      className={`relative w-14 h-8 rounded-full transition-all duration-300 ${formData.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"}`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white dark:bg-gray-900 rounded-full  transform transition-transform duration-300 ${formData.isActive ? "translate-x-6" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 bg-gray-50 dark:bg-gray-800/50 dark:bg-gray-900/50">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-all active:scale-95"
                  >
                    <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_14a7e87c" />
                  </button>
                  <button
                    onClick={handleSubmitEdit}
                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-10 py-4 text-xs font-black uppercase tracking-widest text-white transition-colors"
                  >
                    <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_c63bd490" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && selectedSubject && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-300">
              <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                <div className="p-10 text-center">
                  <div className="w-24 h-24 bg-rose-50 dark:bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 relative group">
                    <div className="absolute inset-0 bg-rose-500 blur-2xl opacity-0 group-hover:opacity-20 transition-opacity" />
                    <Trash2 className="w-10 h-10 text-rose-500 relative transition-transform " />
                  </div>

                  <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                    <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_b739fef9" />
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-10 leading-relaxed">
                    <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_019c63b1" />{" "}
                    <span className="text-gray-900 dark:text-white font-black">
                      {selectedSubject.nameKh || selectedSubject.name}
                    </span>{" "}
                    <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_a2bb2cce" />
                    <br />
                    <br />
                    <span className="text-rose-500 font-bold uppercase tracking-widest text-[10px]">
                      <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_54ba38ef" />
                    </span>
                  </p>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={handleSubmitDelete}
                      className="w-full rounded-2xl bg-rose-500 px-8 py-5 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-rose-600"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_68033f1e" />
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="w-full px-8 py-5 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-sm hover:text-gray-900 dark:text-white dark:hover:text-white transition-all"
                    >
                      <AutoI18nText i18nKey="auto.web.locale_settings_subjects_page.k_fffa7a91" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
