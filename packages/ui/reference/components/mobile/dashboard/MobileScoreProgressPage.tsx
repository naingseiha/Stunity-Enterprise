// 📂 src/components/mobile/dashboard/MobileScoreProgressPage.tsx

"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { dashboardApi, ScoreProgressData, ClassProgress, SubjectProgress, ScoreStatus } from "@/lib/api/dashboard";
import { getCurrentAcademicYear, getAcademicYearOptions } from "@/utils/academicYear";

const KHMER_MONTHS = [
  "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
  "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ",
];

const STATUS_CONFIG: Record<ScoreStatus, { icon: any; color: string; bgColor: string; borderColor: string; progressColor: string; label: string }> = {
  COMPLETE: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    progressColor: "bg-gradient-to-r from-green-500 to-emerald-500",
    label: "បញ្ចប់",
  },
  PARTIAL: {
    icon: AlertCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    progressColor: "bg-gradient-to-r from-blue-500 to-indigo-500",
    label: "ផ្នែក",
  },
  STARTED: {
    icon: TrendingUp,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    progressColor: "bg-gradient-to-r from-orange-500 to-amber-500",
    label: "ចាប់ផ្តើម",
  },
  EMPTY: {
    icon: XCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    progressColor: "bg-gray-400",
    label: "ទទេ",
  },
};

export default function MobileScoreProgressPage() {
  const router = useRouter();

  // State management
  const [data, setData] = useState<ScoreProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false); // New: For filter-based loading
  const [showBlur, setShowBlur] = useState(false); // Delayed blur for smooth UX

  // Filters
  const [filterMode, setFilterMode] = useState<"month" | "year">("month"); // New: Toggle between month and academic year view
  const [selectedMonth, setSelectedMonth] = useState(KHMER_MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // UI State
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Delayed blur effect to prevent flickering on fast loads
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (filterLoading) {
      // Only show blur if loading takes more than 150ms
      timer = setTimeout(() => setShowBlur(true), 150);
    } else {
      setShowBlur(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [filterLoading]);

  // Fetch data
  const fetchData = useCallback(async (isRefresh = false, isFilterChange = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (isFilterChange && data) {
      // If we already have data and this is a filter change, use blur loading
      setFilterLoading(true);
    } else {
      // Initial load
      setLoading(true);
    }
    setError(null);

    try {
      const result = await dashboardApi.getScoreProgress({
        month: selectedMonth,
        year: selectedYear,
        grade: selectedGrade === "all" ? undefined : selectedGrade,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "មានបញ្ហាក្នុងការទាញយកទិន្នន័យ");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFilterLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedGrade, data]);

  // Initial load
  useEffect(() => {
    if (!data) {
      fetchData(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter changes
  useEffect(() => {
    if (data) {
      fetchData(false, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, selectedGrade]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Toggle class expansion
  const toggleClass = useCallback((classId: string) => {
    setExpandedClasses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  }, []);

  // Filter classes
  const filteredClasses = useMemo(() => {
    if (!data) return [];

    let classes = data.grades.flatMap(g => g.classes);

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      classes = classes.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.homeroomTeacher?.khmerName?.toLowerCase().includes(query)
      );
    }

    return classes;
  }, [data, debouncedSearchQuery]);

  if (loading && !data) {
    return (
      <MobileLayout title="តារាងពិនិត្យការបញ្ចូលពិន្ទុ">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-battambang font-bold">កំពុងផ្ទុក...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (error) {
    return (
      <MobileLayout title="តារាងពិនិត្យការបញ្ចូលពិន្ទុ">
        <div className="p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 font-battambang">មានបញ្ហា</h3>
            <p className="text-gray-600 mb-6 font-battambang">{error}</p>
            <button
              onClick={() => fetchData()}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-battambang font-bold py-3 px-6 rounded-xl active:scale-95 transition-transform"
            >
              ព្យាយាមម្តងទៀត
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!data) {
    return (
      <MobileLayout title="តារាងពិនិត្យការបញ្ចូលពិន្ទុ">
        <div className="p-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 font-battambang">
              មិនមានទិន្នន័យ
            </h3>
            <p className="text-gray-600 font-battambang">
              រកមិនឃើញទិន្នន័យសម្រាប់ខែ និង ឆ្នាំដែលបានជ្រើសរើស
            </p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="តារាងពិនិត្យការបញ្ចូលពិន្ទុ">
      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="fixed top-16 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            <span className="text-sm font-battambang font-bold text-gray-700">កំពុងផ្ទុក...</span>
          </div>
        </div>
      )}

      {/* Filter Loading Blur Overlay */}
      {showBlur && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 border-2 border-teal-100 animate-in zoom-in-95 duration-200">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
            <span className="text-base font-battambang font-bold text-gray-800">កំពុងផ្ទុកទិន្នន័យ...</span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
            <Users className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-2xl font-black">{data.overall.totalClasses}</p>
            <p className="text-xs font-battambang font-bold opacity-90">ថ្នាក់រៀន</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg">
            <BookOpen className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-2xl font-black">{data.overall.totalSubjects}</p>
            <p className="text-xs font-battambang font-bold opacity-90">មុខវិជ្ជា</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
            <TrendingUp className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-2xl font-black">{data.overall.completionPercentage.toFixed(0)}%</p>
            <p className="text-xs font-battambang font-bold opacity-90">ការបញ្ចូល</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg">
            <Shield className="w-8 h-8 mb-2 opacity-90" />
            <p className="text-2xl font-black">{data.overall.verificationPercentage.toFixed(0)}%</p>
            <p className="text-xs font-battambang font-bold opacity-90">ផ្ទៀងផ្ទាត់</p>
          </div>
        </div>

        {/* Modern Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-4 space-y-4">
          {/* Filter Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode("month")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-battambang font-bold text-sm transition-all ${
                filterMode === "month"
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1.5" />
              តាមខែ
            </button>
            <button
              onClick={() => setFilterMode("year")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-battambang font-bold text-sm transition-all ${
                filterMode === "year"
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1.5" />
              ឆ្នាំសិក្សា
            </button>
          </div>

          {/* Filter Selects */}
          <div className="grid grid-cols-2 gap-2">
            {filterMode === "month" && (
              <div className="col-span-1">
                <label className="block text-xs font-battambang font-bold text-gray-600 mb-1.5">ខែ</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-battambang font-bold text-sm bg-white"
                >
                  {KHMER_MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="col-span-1">
              <label className="block text-xs font-battambang font-bold text-gray-600 mb-1.5">ឆ្នាំសិក្សា</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-battambang font-bold text-sm bg-white"
              >
                {getAcademicYearOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search and Additional Filters */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="ស្វែងរកថ្នាក់រៀន..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-battambang text-sm"
              />
            </div>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-battambang font-bold text-sm bg-white"
            >
              <option value="all">ទាំងអស់</option>
              {[7, 8, 9, 10, 11, 12].map((grade) => (
                <option key={grade} value={grade.toString()}>
                  ថ្នាក់{grade}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-gray-100 border-2 border-gray-200 rounded-xl px-3 py-2.5 active:scale-95 transition-transform disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Classes List */}
        <div className="space-y-3">
          {data.grades.map((grade) => (
            <GradeSection
              key={grade.grade}
              grade={grade}
              expandedClasses={expandedClasses}
              onToggleClass={toggleClass}
              searchQuery={debouncedSearchQuery}
            />
          ))}
        </div>

        {filteredClasses.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-battambang font-bold">
              រកមិនឃើញថ្នាក់រៀនដែលស្វែងរក
            </p>
          </div>
        )}
      </div>

    </MobileLayout>
  );
}

// ==================== Sub-Components ====================

interface GradeSectionProps {
  grade: { grade: string; totalClasses: number; avgCompletion: number; classes: ClassProgress[] };
  expandedClasses: Set<string>;
  onToggleClass: (classId: string) => void;
  searchQuery: string;
}

const GradeSection = memo(({ grade, expandedClasses, onToggleClass, searchQuery }: GradeSectionProps) => {
  const filteredClasses = useMemo(() => {
    if (!searchQuery) return grade.classes;
    const query = searchQuery.toLowerCase();
    return grade.classes.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.homeroomTeacher?.khmerName?.toLowerCase().includes(query)
    );
  }, [grade.classes, searchQuery]);

  if (filteredClasses.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Grade Header */}
      <div className="relative bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 shadow-lg overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full"></div>
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white rounded-full"></div>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/40">
              <span className="text-white font-black text-2xl">{grade.grade}</span>
            </div>
            <div>
              <h3 className="text-white font-battambang font-black text-xl drop-shadow-md">
                ថ្នាក់ទី{grade.grade}
              </h3>
              <p className="text-white/95 text-sm font-battambang font-bold">
                {filteredClasses.length} ថ្នាក់រៀន
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border-2 border-white/30">
              <p className="text-white font-black text-3xl drop-shadow-lg">{grade.avgCompletion.toFixed(0)}%</p>
              <p className="text-white/95 text-xs font-battambang font-bold">ការបញ្ចូល</p>
            </div>
          </div>
        </div>
      </div>

      {/* Classes */}
      {filteredClasses.map((cls) => (
        <ClassCard
          key={cls.id}
          classData={cls}
          isExpanded={expandedClasses.has(cls.id)}
          onToggle={() => onToggleClass(cls.id)}
        />
      ))}
    </div>
  );
});

GradeSection.displayName = "GradeSection";

interface ClassCardProps {
  classData: ClassProgress;
  isExpanded: boolean;
  onToggle: () => void;
}

const ClassCard = memo(({ classData, isExpanded, onToggle }: ClassCardProps) => {
  const completionColor = useMemo(() => {
    const p = classData.completionStats.completionPercentage;
    if (p >= 90) return "text-green-600";
    if (p >= 70) return "text-blue-600";
    if (p >= 50) return "text-yellow-600";
    return "text-red-600";
  }, [classData.completionStats.completionPercentage]);

  const unverifiedCount = useMemo(() => {
    return classData.subjects.filter(
      s => s.scoreStatus.status === "COMPLETE" && !s.verification.isConfirmed
    ).length;
  }, [classData.subjects]);

  return (
    <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden hover:shadow-lg transition-all">
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-battambang font-black text-gray-900 truncate text-base">{classData.name}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-600 font-battambang truncate">
                {classData.studentCount} សិស្ស
                {classData.homeroomTeacher && ` • ${classData.homeroomTeacher.khmerName}`}
              </p>
              {unverifiedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-battambang font-bold">
                  <ShieldAlert className="w-3 h-3" />
                  {unverifiedCount}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Completion Badge */}
            <div className="flex flex-col items-center">
              <div className={`font-black text-xl leading-none ${completionColor}`}>
                {classData.completionStats.completionPercentage.toFixed(0)}%
              </div>
              <span className="text-[9px] text-gray-500 font-battambang font-bold uppercase tracking-wide">បញ្ចូល</span>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            {/* Verification Percentage */}
            <div className="text-right">
              <p className="font-black text-lg text-orange-600 leading-none">
                {classData.completionStats.verificationPercentage.toFixed(0)}%
              </p>
              <p className="text-[10px] text-orange-600 font-battambang font-bold mt-0.5">ផ្ទៀងផ្ទាត់</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t-2 border-gray-100 p-4 bg-gradient-to-b from-gray-50 to-white space-y-3">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border-2 border-blue-100 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600 font-battambang font-bold">ការបញ្ចូល</p>
              </div>
              <p className="text-lg font-black text-blue-600">
                {classData.completionStats.completedSubjects}/{classData.completionStats.totalSubjects}
              </p>
            </div>
            <div className="bg-white border-2 border-orange-100 rounded-xl p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-gray-600 font-battambang font-bold">ផ្ទៀងផ្ទាត់</p>
              </div>
              <p className="text-lg font-black text-orange-600">
                {classData.completionStats.verifiedSubjects}/{classData.completionStats.totalSubjects}
              </p>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-battambang font-bold">
                <span className="text-gray-600">ការបញ្ចូលពិន្ទុ</span>
                <span className={completionColor}>
                  {classData.completionStats.completionPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${classData.completionStats.completionPercentage}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-battambang font-bold">
                <span className="text-gray-600">ការផ្ទៀងផ្ទាត់</span>
                <span className="text-orange-600">
                  {classData.completionStats.verificationPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${classData.completionStats.verificationPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Warning for unverified subjects */}
          {unverifiedCount > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <p className="text-xs font-battambang font-bold text-yellow-800">
                មាន {unverifiedCount} មុខវិជ្ជាត្រូវការផ្ទៀងផ្ទាត់
              </p>
            </div>
          )}

          {/* Subjects Grid */}
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            {classData.subjects.map((subject) => (
              <SubjectItem key={subject.id} subject={subject} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ClassCard.displayName = "ClassCard";

interface SubjectItemProps {
  subject: SubjectProgress;
}

const SubjectItem = memo(({ subject }: SubjectItemProps) => {
  const config = useMemo(() => STATUS_CONFIG[subject.scoreStatus.status], [subject.scoreStatus.status]);
  const needsVerification = subject.scoreStatus.status === "COMPLETE" && !subject.verification.isConfirmed;

  const { borderColor, bgColor } = useMemo(() => {
    if (needsVerification) {
      return {
        borderColor: "border-yellow-300",
        bgColor: "bg-gradient-to-br from-yellow-50 to-amber-50",
      };
    }
    return {
      borderColor: config.borderColor,
      bgColor: config.bgColor,
    };
  }, [needsVerification, config]);

  return (
    <div className={`p-3 rounded-xl border-2 ${borderColor} ${bgColor} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h5 className="font-battambang font-black text-sm text-gray-900 truncate">
            {subject.nameKh}
          </h5>
          <p className="text-xs text-gray-500 font-mono">{subject.code}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {subject.verification.isConfirmed ? (
            <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-lg font-battambang font-bold shadow-sm">
              <Shield className="w-3 h-3" />
              <span>ផ្ទៀងផ្ទាត់</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-battambang font-bold shadow-sm ${
              needsVerification
                ? "text-yellow-700 bg-yellow-100 animate-pulse"
                : "text-gray-600 bg-gray-100"
            }`}>
              <ShieldAlert className="w-3 h-3" />
              <span>មិនទាន់</span>
            </div>
          )}
          <span className={`text-xs font-black px-2 py-1 rounded-lg shadow-sm ${
            needsVerification
              ? "text-yellow-700 bg-yellow-100"
              : `${config.color} ${config.bgColor}`
          }`}>
            {subject.scoreStatus.percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full ${config.progressColor} transition-all`}
          style={{ width: `${subject.scoreStatus.percentage}%` }}
        />
      </div>

      {/* Warning Message for Unverified Complete Subjects */}
      {needsVerification && (
        <div className="flex items-start gap-2 bg-yellow-100 border-l-4 border-yellow-500 p-2 rounded-r-lg">
          <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-battambang font-bold text-yellow-800 leading-tight">
              ពិន្ទុបានបញ្ចូលរួចរាល់ តែមិនទាន់ផ្ទៀងផ្ទាត់ទេ
            </p>
            <p className="text-xs font-battambang text-yellow-700 mt-0.5 leading-tight">
              សូមទាក់ទងគ្រូបង្រៀនដើម្បីផ្ទៀងផ្ទាត់ពិន្ទុ
            </p>
          </div>
        </div>
      )}

      {/* Info for Partial/Started */}
      {(subject.scoreStatus.status === "PARTIAL" || subject.scoreStatus.status === "STARTED") && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-blue-50 border-l-4 border-blue-400 p-2 rounded-r-lg">
            <p className="text-xs font-battambang font-bold text-blue-800">
              បានបញ្ចូល {subject.scoreStatus.studentsWithScores}/{subject.scoreStatus.totalStudents} សិស្ស
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

SubjectItem.displayName = "SubjectItem";
