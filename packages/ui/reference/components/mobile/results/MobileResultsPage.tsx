// 📂 src/components/mobile/results/MobileResultsPage.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  Trophy,
  Users,
  Award,
  TrendingUp,
  ArrowLeft,
  ArrowUpDown,
  SortAsc,
  User,
  Medal,
  Star,
  Sparkles,
  BarChart3,
  Target,
  Calendar,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { Class } from "@/lib/api/classes";
import { reportsApi, MonthlyReportData } from "@/lib/api/reports";
import { useData } from "@/context/DataContext";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
} from "@/utils/academicYear";
import ResultsPageSkeleton from "./ResultsPageSkeleton";
import StudentResultCard from "./StudentResultCard";

const GRADES = ["7", "8", "9", "10", "11", "12"];

const MONTHS = [
  { value: "មករា", label: "មករា", number: 1 },
  { value: "កុម្ភៈ", label: "កុម្ភៈ", number: 2 },
  { value: "មីនា", label: "មីនា", number: 3 },
  { value: "មេសា", label: "មេសា", number: 4 },
  { value: "ឧសភា", label: "ឧសភា", number: 5 },
  { value: "មិថុនា", label: "មិថុនា", number: 6 },
  { value: "កក្កដា", label: "កក្កដា", number: 7 },
  { value: "សីហា", label: "សីហា", number: 8 },
  { value: "កញ្ញា", label: "កញ្ញា", number: 9 },
  { value: "តុលា", label: "តុលា", number: 10 },
  { value: "វិច្ឆិកា", label: "វិច្ឆិកា", number: 11 },
  { value: "ធ្នូ", label: "ធ្នូ", number: 12 },
];

const getCurrentKhmerMonth = () => {
  const monthNumber = new Date().getMonth() + 1;
  const month = MONTHS.find((m) => m.number === monthNumber);
  return month?.value || "មករា";
};

type ViewMode = "byClass" | "byGrade";
type SortBy = "rank" | "name" | "average" | "total";

export default function MobileResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { classes, isLoadingClasses, refreshClasses } = useData();
  const [selectedGrade, setSelectedGrade] = useState<string | null>(
    searchParams?.get("grade") || null
  );
  const [viewMode, setViewMode] = useState<ViewMode>("byClass");
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [reportData, setReportData] = useState<MonthlyReportData | null>(null);
  const [gradeWideData, setGradeWideData] = useState<MonthlyReportData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("rank");

  // ✅ Month and Year Selectors
  const [selectedMonth, setSelectedMonth] = useState(getCurrentKhmerMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());

  // ✅ OPTIMIZATION: Cache loaded reports to avoid reloading
  const [reportCache, setReportCache] = useState<
    Map<string, MonthlyReportData>
  >(new Map());
  const [gradeCache, setGradeCache] = useState<Map<string, MonthlyReportData>>(
    new Map()
  );

  // ✅ OPTIMIZATION: Progressive rendering state
  const [visibleStudents, setVisibleStudents] = useState(15);
  const BATCH_SIZE = 15;

  // ✅ Proactively refresh classes if empty
  useEffect(() => {
    if (classes.length === 0 && !isLoadingClasses) {
      console.log("📚 [Mobile Results] Classes array is empty, fetching classes...");
      refreshClasses();
    }
  }, [classes.length, isLoadingClasses, refreshClasses]);

  // ✅ Clear cache and reload when month/year changes
  useEffect(() => {
    if (selectedGrade && selectedClass) {
      // Reload current class data with new month/year
      handleClassSelect(selectedClass);
    } else if (selectedGrade && viewMode === "byGrade") {
      // Reload grade-wide data with new month/year
      handleViewModeChange("byGrade");
    }
    // Clear caches for old month/year
    setReportCache(new Map());
    setGradeCache(new Map());
  }, [selectedMonth, selectedYear]);

  // Filter classes by selected grade
  const filteredClasses = useMemo(() => {
    if (!selectedGrade) return [];
    return classes
      .filter((c) => c.grade === selectedGrade)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, selectedGrade]);

  // Count students by grade
  const gradeStudentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    GRADES.forEach((grade) => {
      const gradeClasses = classes.filter((c) => c.grade === grade);
      const totalStudents = gradeClasses.reduce(
        (sum, c) => sum + (c._count?.students || 0),
        0
      );
      counts[grade] = totalStudents;
    });
    return counts;
  }, [classes]);

  const handleGradeSelect = (grade: string) => {
    setSelectedGrade(grade);
    setViewMode("byClass");
    setSelectedClass(null);
    setReportData(null);
    setGradeWideData(null);

    // ✅ OPTIMIZATION: Preload grade-wide data in background
    const cacheKey = `${grade}:${selectedMonth}:${selectedYear}`;
    if (!gradeCache.has(cacheKey)) {
      reportsApi
        .getGradeWideReport(grade, selectedMonth, selectedYear)
        .then((data) => {
          setGradeCache((prev) => new Map(prev).set(cacheKey, data));
        })
        .catch((error) => console.error("Background preload error:", error));
    }
  };

  const handleViewModeChange = async (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "byGrade" && selectedGrade) {
      const cacheKey = `${selectedGrade}:${selectedMonth}:${selectedYear}`;

      // ✅ OPTIMIZATION: Check cache first
      const cachedData = gradeCache.get(cacheKey);
      if (cachedData) {
        setGradeWideData(cachedData);
        setIsLoading(false);
        return;
      }

      // Load grade-wide data if not cached
      setIsLoading(true);
      try {
        const data = await reportsApi.getGradeWideReport(
          selectedGrade,
          selectedMonth,
          selectedYear
        );
        setGradeWideData(data);
        setGradeCache((prev) => new Map(prev).set(cacheKey, data));
      } catch (error) {
        console.error("Error loading grade-wide report:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClassSelect = async (classData: Class) => {
    setSelectedClass(classData);
    const cacheKey = `${classData.id}:${selectedMonth}:${selectedYear}`;

    // ✅ OPTIMIZATION: Check cache first, show immediately
    const cachedData = reportCache.get(cacheKey);
    if (cachedData) {
      setReportData(cachedData);
      setIsLoading(false);
      return;
    }

    // Load data if not cached
    setIsLoading(true);
    try {
      const data = await reportsApi.getMonthlyReport(
        classData.id,
        selectedMonth,
        selectedYear
      );
      setReportData(data);
      setReportCache((prev) => new Map(prev).set(cacheKey, data));
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (selectedClass) {
      // ✅ OPTIMIZATION: Keep data cached, just go back
      setSelectedClass(null);
      // Don't clear reportData - keep it for when user comes back
    } else if (selectedGrade) {
      setSelectedGrade(null);
      // Don't clear gradeWideData - keep it cached
    } else {
      router.back();
    }
  };

  // Sort students
  const sortedStudents = useMemo(() => {
    const students =
      viewMode === "byGrade"
        ? gradeWideData?.students || []
        : reportData?.students || [];

    if (students.length === 0) return [];

    const studentsCopy = [...students];

    switch (sortBy) {
      case "rank":
        return studentsCopy.sort((a, b) => a.rank - b.rank);
      case "name":
        return studentsCopy.sort((a, b) =>
          a.studentName.localeCompare(b.studentName)
        );
      case "average":
        return studentsCopy.sort(
          (a, b) => parseFloat(b.average) - parseFloat(a.average)
        );
      case "total":
        return studentsCopy.sort(
          (a, b) => parseFloat(b.totalScore) - parseFloat(a.totalScore)
        );
      default:
        return studentsCopy;
    }
  }, [reportData, gradeWideData, viewMode, sortBy]);

  // ✅ OPTIMIZATION: Reset visible students when list changes
  useEffect(() => {
    setVisibleStudents(BATCH_SIZE);
  }, [sortedStudents]);

  // ✅ OPTIMIZATION: Load more students
  const loadMoreStudents = () => {
    setVisibleStudents((prev) =>
      Math.min(prev + BATCH_SIZE, sortedStudents.length)
    );
  };

  // Render Grade Selector (Level 1)
  if (!selectedGrade) {
    return (
      <MobileLayout title="លទ្ធផល • Results">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 pb-24">
          {/* Header */}
          <div className="bg-white px-5 pt-6 pb-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="font-koulen text-xl text-gray-900 leading-tight">
                  លទ្ធផលប្រលង
                </h1>
                <p className="font-battambang text-xs text-gray-500 mt-0.5">
                  ជ្រើសរើសកម្រិតសិក្សា
                </p>
              </div>
            </div>

            {/* Month & Year Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                <label className="block font-battambang text-xs text-gray-600 font-semibold mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  ខែ
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-battambang font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all"
                  style={{ fontSize: "16px" }}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                <label className="block font-battambang text-xs text-gray-600 font-semibold mb-2">
                  ឆ្នាំ
                </label>
                <select
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full h-10 px-3 text-sm font-battambang font-semibold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all"
                  style={{ fontSize: "16px" }}
                >
                  {getAcademicYearOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Grade Grid with improved design */}
          <div className="px-5 pt-6">
            <div className="grid grid-cols-2 gap-4">
              {GRADES.map((grade, index) => {
                const studentCount = gradeStudentCounts[grade] || 0;
                const gradients = [
                  "from-blue-500 to-indigo-600",
                  "from-purple-500 to-pink-600",
                  "from-orange-500 to-red-600",
                  "from-teal-500 to-cyan-600",
                  "from-green-500 to-emerald-600",
                  "from-violet-500 to-purple-600",
                ];
                const gradient = gradients[index % gradients.length];

                return (
                  <button
                    key={grade}
                    onClick={() => handleGradeSelect(grade)}
                    disabled={studentCount === 0}
                    className={`bg-white rounded-3xl shadow-lg border-2 overflow-hidden active:scale-95 transition-all duration-300 ${
                      studentCount === 0
                        ? "opacity-50 cursor-not-allowed border-gray-200"
                        : "border-transparent hover:shadow-xl"
                    }`}
                  >
                    {/* Gradient Header */}
                    <div
                      className={`bg-gradient-to-br ${gradient} p-4 relative overflow-hidden`}
                    >
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full"></div>
                      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/10 rounded-full"></div>
                      <div className="relative z-10">
                        <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2 border border-white/30">
                          <span className="text-white font-koulen text-3xl">
                            {grade}
                          </span>
                        </div>
                        <h1 className="font-koulen text-white text-lg">
                          ថ្នាក់ទី{grade}
                        </h1>
                      </div>
                    </div>

                    {/* Student Count */}
                    <div className="p-4 bg-gradient-to-b from-white to-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 bg-gradient-to-br ${gradient} rounded-xl`}
                          >
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-koulen text-2xl text-gray-900 leading-none">
                              {studentCount}
                            </p>
                            <p className="font-battambang text-[10px] text-gray-500">
                              សិស្ស
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Render View Mode Selector (Level 2)
  if (selectedGrade && !selectedClass && viewMode === "byClass") {
    return (
      <MobileLayout title={`លទ្ធផល • ថ្នាក់ទី${selectedGrade}`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 pb-24">
          {/* Header - Now scrolls with content */}
          <div className="bg-white px-5 pt-6 pb-5 shadow-sm">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 mb-4 text-gray-600 active:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-battambang text-sm font-semibold">
                ត្រលប់ក្រោយ
              </span>
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-koulen text-2xl">
                  {selectedGrade}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="font-koulen text-lg text-gray-900 leading-tight">
                  ថ្នាក់ទី{selectedGrade}
                </h1>
                <p className="font-battambang text-xs text-gray-500">
                  {filteredClasses.length} ថ្នាក់ •{" "}
                  {gradeStudentCounts[selectedGrade] || 0} សិស្ស
                </p>
                <p className="font-battambang text-[10px] text-gray-400 mt-0.5">
                  {selectedMonth} {selectedYear}-{selectedYear + 1}
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
              <button
                onClick={() => handleViewModeChange("byClass")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-battambang text-xs font-bold transition-all ${
                  viewMode === "byClass"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <Users className="w-4 h-4" />
                តាមថ្នាក់
              </button>
              <button
                onClick={() => handleViewModeChange("byGrade")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-battambang text-xs font-bold transition-all ${
                  viewMode === "byGrade"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                តាមកម្រិត
              </button>
            </div>
          </div>

          {/* Class List with improved design */}
          <div className="px-5 pt-4 space-y-3">
            {filteredClasses.map((classData, index) => {
              const gradients = [
                "from-blue-500 to-indigo-600",
                "from-purple-500 to-pink-600",
                "from-orange-500 to-red-600",
                "from-teal-500 to-cyan-600",
                "from-green-500 to-emerald-600",
              ];
              const gradient = gradients[index % gradients.length];

              return (
                <button
                  key={classData.id}
                  onClick={() => handleClassSelect(classData)}
                  className="w-full bg-white rounded-3xl shadow-lg border-2 border-transparent hover:shadow-xl active:scale-98 transition-all duration-300 overflow-hidden"
                >
                  <div className="flex items-center p-4 gap-4">
                    {/* Class Icon */}
                    <div
                      className={`relative w-16 h-16 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                      <div className="absolute inset-0 bg-white/20 rounded-2xl"></div>
                      <Users className="w-8 h-8 text-white relative z-10" />
                    </div>

                    {/* Class Info */}
                    <div className="flex-1 text-left min-w-0">
                      <h1 className="font-battambang text-base font-bold text-gray-900 mb-1 truncate">
                        {classData.name}
                      </h1>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`p-1 bg-gradient-to-br ${gradient} rounded-lg`}
                          >
                            <Users className="w-3 h-3 text-white" />
                          </div>
                          <span className="font-battambang text-xs font-semibold text-gray-700">
                            {classData._count?.students || 0} សិស្ស
                          </span>
                        </div>
                        {classData.track && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-koulen">
                            {classData.track === "science"
                              ? "វិទ្យាសាស្ត្រ"
                              : "សង្គម"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Render Grade-Wide Results (Level 2 - By Grade View)
  if (selectedGrade && viewMode === "byGrade") {
    return (
      <MobileLayout title={`លទ្ធផល • ថ្នាក់ទី${selectedGrade} (រួម)`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 pb-24">
          {/* Header - Now scrolls with content */}
          <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 mb-4 text-gray-600 active:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-battambang text-sm font-semibold">
                ត្រលប់ក្រោយ
              </span>
            </button>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-koulen text-lg text-gray-900 leading-tight">
                    ថ្នាក់ទី{selectedGrade} • ចំណាត់ថ្នាក់រួម
                  </h1>
                  <p className="font-battambang text-xs text-gray-500">
                    {selectedMonth} {selectedYear}-{selectedYear + 1}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-koulen text-2xl text-purple-600">
                  {sortedStudents.length}
                </p>
                <p className="font-battambang text-[10px] text-gray-500">
                  សិស្ស
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-3">
              <button
                onClick={() => setViewMode("byClass")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-battambang text-xs font-bold transition-all ${
                  viewMode === "byClass"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <Users className="w-4 h-4" />
                តាមថ្នាក់
              </button>
              <button
                onClick={() => handleViewModeChange("byGrade")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-battambang text-xs font-bold transition-all ${
                  viewMode === "byGrade"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                តាមកម្រិត
              </button>
            </div>

            {/* Sort Options */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setSortBy("rank")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "rank"
                    ? "bg-purple-100 text-purple-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                ចំណាត់ថ្នាក់
              </button>
              <button
                onClick={() => setSortBy("average")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "average"
                    ? "bg-indigo-100 text-indigo-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                មធ្យមភាគ
              </button>
              <button
                onClick={() => setSortBy("total")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "total"
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                ពិន្ទុសរុប
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "name"
                    ? "bg-green-100 text-green-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <SortAsc className="w-3.5 h-3.5" />
                ឈ្មោះ
              </button>
            </div>
          </div>

          {/* Student Results List */}
          {isLoading ? (
            <ResultsPageSkeleton count={5} />
          ) : (
            <>
              <div className="px-5 pt-4 space-y-3">
                {sortedStudents
                  .slice(0, visibleStudents)
                  .map((student, index) => (
                    <StudentResultCard
                      key={`${student.studentId}-${index}`}
                      student={student}
                      index={index}
                    />
                  ))}
              </div>

              {/* ✅ OPTIMIZATION: Load More Button for Grade-Wide View */}
              {visibleStudents < sortedStudents.length && (
                <div className="px-5 pt-4 pb-6">
                  <button
                    onClick={loadMoreStudents}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl font-battambang text-sm font-bold shadow-lg active:scale-95 transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 rotate-[-90deg]" />
                    បង្ហាញបន្ថែម ({sortedStudents.length - visibleStudents}{" "}
                    នាក់)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </MobileLayout>
    );
  }

  // Render Class Results (Level 3 - By Class View)
  if (selectedClass && reportData) {
    return (
      <MobileLayout title={`លទ្ធផល • ${selectedClass.name}`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40 pb-24">
          {/* Header - Now scrolls with content */}
          <div className="bg-white px-5 pt-6 pb-4 shadow-sm">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 mb-4 text-gray-600 active:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-battambang text-sm font-semibold">
                ត្រលប់ក្រោយ
              </span>
            </button>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-koulen text-lg text-gray-900 leading-tight">
                    {selectedClass.name}
                  </h1>
                  <p className="font-battambang text-xs text-gray-500">
                    {selectedMonth} {selectedYear}-{selectedYear + 1}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-koulen text-2xl text-blue-600">
                  {sortedStudents.length}
                </p>
                <p className="font-battambang text-[10px] text-gray-500">
                  សិស្ស
                </p>
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setSortBy("rank")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "rank"
                    ? "bg-indigo-100 text-indigo-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                ចំណាត់ថ្នាក់
              </button>
              <button
                onClick={() => setSortBy("average")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "average"
                    ? "bg-purple-100 text-purple-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                មធ្យមភាគ
              </button>
              <button
                onClick={() => setSortBy("total")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "total"
                    ? "bg-blue-100 text-blue-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                ពិន្ទុសរុប
              </button>
              <button
                onClick={() => setSortBy("name")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-battambang text-xs font-bold whitespace-nowrap transition-all ${
                  sortBy === "name"
                    ? "bg-green-100 text-green-700 shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <SortAsc className="w-3.5 h-3.5" />
                ឈ្មោះ
              </button>
            </div>
          </div>

          {/* Student Results List */}
          {isLoading ? (
            <ResultsPageSkeleton count={5} />
          ) : (
            <>
              <div className="px-5 pt-4 space-y-3">
                {sortedStudents
                  .slice(0, visibleStudents)
                  .map((student, index) => (
                    <StudentResultCard
                      key={`${student.studentId}-${index}`}
                      student={student}
                      index={index}
                    />
                  ))}
              </div>

              {/* ✅ OPTIMIZATION: Load More Button for Class View */}
              {visibleStudents < sortedStudents.length && (
                <div className="px-5 pt-4 pb-6">
                  <button
                    onClick={loadMoreStudents}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-battambang text-sm font-bold shadow-lg active:scale-95 transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 rotate-[-90deg]" />
                    បង្ហាញបន្ថែម ({sortedStudents.length - visibleStudents}{" "}
                    នាក់)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </MobileLayout>
    );
  }

  // Loading state
  return (
    <MobileLayout title="លទ្ធផល • Results">
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-purple-500/30 animate-pulse">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <p className="font-battambang text-gray-600 font-semibold">
            កំពុងផ្ទុក...
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
