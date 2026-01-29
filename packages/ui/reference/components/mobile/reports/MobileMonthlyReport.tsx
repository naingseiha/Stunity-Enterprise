// 📂 src/components/mobile/reports/MobileMonthlyReport. tsx

"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  Loader2,
  TrendingUp,
  Award,
  Users,
  BarChart3,
  Filter,
  Download,
  ArrowLeft,
  FileDown,
  Share2,
} from "lucide-react";
import { generateMonthlyReportPDF } from "@/lib/mobilePdfExport";
import type { MonthlyReportData } from "@/lib/api/reports";
import MobileLayout from "@/components/layout/MobileLayout";
import { useData } from "@/context/DataContext";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
} from "@/utils/academicYear";

interface StudentReport {
  studentId: string;
  studentName: string;
  gender: string;
  average: number;
  gradeLevel: string;
  gradeLevelKh: string;
  rank: number;
  totalScore: number;
  totalMaxScore: number;
  percentage: number;
  absent: number;
  permission: number;
}

interface ClassReport {
  classId: string;
  className: string;
  grade: string;
  month: string;
  year: number;
  students: StudentReport[];
  classAverage: number;
  totalStudents: number;
}

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

export default function MobileMonthlyReport() {
  const { classes, isLoadingClasses, refreshClasses } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get params from URL if coming from dashboard
  const classParam = searchParams.get("class");
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  const [selectedClass, setSelectedClass] = useState(classParam || "");
  const [selectedMonth, setSelectedMonth] = useState(
    monthParam || getCurrentKhmerMonth()
  );
  const [selectedYear, setSelectedYear] = useState(
    yearParam ? parseInt(yearParam) : getCurrentAcademicYear()
  );
  const [reportData, setReportData] = useState<ClassReport | null>(null);
  const [reportApiData, setReportApiData] = useState<MonthlyReportData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(!classParam);
  const [exportingPDF, setExportingPDF] = useState(false);

  const getGradeBadge = (gradeLevel: string, gradeLevelKh: string) => {
    const grades: Record<
      string,
      { bg: string; text: string; border: string; icon: string }
    > = {
      A: {
        bg: "bg-gradient-to-r from-green-500 to-emerald-600",
        text: "text-white",
        border: "border-green-400",
        icon: "🏆",
      },
      B: {
        bg: "bg-gradient-to-r from-blue-500 to-cyan-600",
        text: "text-white",
        border: "border-blue-400",
        icon: "⭐",
      },
      C: {
        bg: "bg-gradient-to-r from-yellow-500 to-amber-600",
        text: "text-white",
        border: "border-yellow-400",
        icon: "✨",
      },
      D: {
        bg: "bg-gradient-to-r from-orange-500 to-orange-600",
        text: "text-white",
        border: "border-orange-400",
        icon: "📊",
      },
      E: {
        bg: "bg-gradient-to-r from-red-400 to-rose-500",
        text: "text-white",
        border: "border-red-400",
        icon: "📈",
      },
      F: {
        bg: "bg-gradient-to-r from-gray-500 to-gray-600",
        text: "text-white",
        border: "border-gray-400",
        icon: "📉",
      },
    };
    return grades[gradeLevel] || grades["F"];
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return {
        icon: "🥇",
        bg: "bg-gradient-to-r from-yellow-400 to-amber-500",
        text: "text-yellow-900",
      };
    if (rank === 2)
      return {
        icon: "🥈",
        bg: "bg-gradient-to-r from-gray-300 to-gray-400",
        text: "text-gray-900",
      };
    if (rank === 3)
      return {
        icon: "🥉",
        bg: "bg-gradient-to-r from-orange-400 to-amber-600",
        text: "text-orange-900",
      };
    return {
      icon: `#${rank}`,
      bg: "bg-gradient-to-r from-indigo-100 to-purple-100",
      text: "text-indigo-700",
    };
  };

  const getKhmerGradeLevel = (level: string): string => {
    const levels: Record<string, string> = {
      A: "ល្អប្រសើរ",
      B: "ល្អ",
      C: "ល្អបុរេ",
      D: "មធ្យម",
      E: "ខ្សោយ",
      F: "ខ្សោយបំផុត",
    };
    return levels[level] || "N/A";
  };

  useEffect(() => {
    if (classes.length === 0 && !isLoadingClasses) {
      refreshClasses();
    }
  }, [classes.length, isLoadingClasses, refreshClasses]);

  // Auto-load if coming from dashboard
  useEffect(() => {
    if (classParam && monthParam && yearParam && !reportData) {
      loadReport();
    }
  }, [classParam, monthParam, yearParam]);

  const loadReport = async () => {
    if (!selectedClass) {
      alert("សូមជ្រើសរើសថ្នាក់");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/reports/monthly/${selectedClass}?month=${selectedMonth}&year=${selectedYear}`,
        { credentials: "include" } // ✅ iOS 16 FIX: Required for PWA mode
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: មានបញ្ហា`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load report");
      }

      // Store the full API response for PDF export
      setReportApiData(result.data);

      const students = result.data.students;
      const classAverage =
        students.reduce(
          (sum: number, s: any) => sum + parseFloat(s.average),
          0
        ) / students.length;

      setReportData({
        classId: result.data.classId,
        className: result.data.className,
        grade: result.data.grade,
        month: result.data.month,
        year: result.data.year,
        students: students.map((s: any) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          gender: s.gender,
          average: parseFloat(s.average),
          gradeLevel: s.gradeLevel,
          gradeLevelKh: s.gradeLevelKhmer || getKhmerGradeLevel(s.gradeLevel),
          rank: s.rank,
          totalScore: parseFloat(s.totalScore),
          totalMaxScore: parseFloat(s.totalMaxScore || "0"),
          percentage: (parseFloat(s.average) / 50) * 100,
          absent: s.absent || 0,
          permission: s.permission || 0,
        })),
        classAverage,
        totalStudents: students.length,
      });

      setShowFilters(false);
    } catch (error: any) {
      alert(`មានបញ្ហា: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/reports/mobile");
  };

  const handleExportPDF = async () => {
    if (!reportApiData) {
      alert("មិនមានទិន្នន័យសម្រាប់នាំចេញ");
      return;
    }

    setExportingPDF(true);
    try {
      await generateMonthlyReportPDF({
        reportData: reportApiData,
        schoolName: "វិទ្យាល័យ ហ៊ុន សែនស្វាយធំ",
        province: "មន្ទីរអប់រំយុវជន និងកីឡា ខេត្តសៀមរាប",
        principalName: "នាយកសាលា",
        teacherName: reportApiData.teacherName || undefined,
      });

      // Show success message
      alert("✅ បាននាំចេញរបាយការណ៍ជា PDF ដោយជោគជ័យ!");
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      alert(`❌ មានបញ្ហាក្នុងការនាំចេញ: ${error.message}`);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <MobileLayout title="របាយការណ៍ • Monthly Report">
      {/* Clean Modern Header */}
      <div className="bg-white px-5 pt-6 pb-5 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-koulen text-xl text-gray-900 leading-tight">
              របាយការណ៍ប្រចាំខែ
            </h1>
            <p className="font-battambang text-xs text-gray-500">
              Monthly Report
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col min-h-full bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
        {/* Modern Filters Section */}
        {showFilters && (
          <div className="px-4 pt-4 pb-3 space-y-3">
            {/* Class Selection Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <label className="font-battambang text-sm font-semibold text-gray-700">
                  ថ្នាក់ • Class
                </label>
              </div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={isLoadingClasses}
                className="w-full h-12 px-4 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                style={{ fontSize: "16px" }}
              >
                <option value="">
                  {isLoadingClasses ? "កំពុងផ្ទុក..." : "-- ជ្រើសរើសថ្នាក់ --"}
                </option>
                {!isLoadingClasses &&
                  classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Month & Year Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Filter className="w-4 h-4 text-indigo-600" />
                </div>
                <label className="font-battambang text-sm font-semibold text-gray-700">
                  ខែ និងឆ្នាំ • Month & Year
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full h-12 px-3 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  style={{ fontSize: "16px" }}
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full h-12 px-3 font-battambang bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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

            {/* Generate Report Button */}
            <button
              onClick={loadReport}
              disabled={!selectedClass || loading}
              className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl font-battambang font-semibold text-base flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  កំពុងបង្កើត...
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  បង្កើតរបាយការណ៍
                </>
              )}
            </button>
          </div>
        )}

        {/* Report Content */}
        {reportData ? (
          <div className="w-full">
            {/* Modern Header with Class Info */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"></div>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

              <div className="relative px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={handleBackToDashboard}
                    className="p-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl transition-all active:scale-95 shadow-md"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  <div className="flex-1 text-center px-4">
                    <h1 className="font-koulen text-xl text-white leading-tight drop-shadow-lg">
                      {reportData.className}
                    </h1>
                    <p className="font-battambang text-xs text-purple-100 mt-1">
                      {reportData.month} {reportData.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportPDF}
                      disabled={exportingPDF}
                      className="p-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl transition-all active:scale-95 shadow-md disabled:opacity-50"
                    >
                      {exportingPDF ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <FileDown className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowFilters(true)}
                      className="p-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl transition-all active:scale-95 shadow-md"
                    >
                      <Filter className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Modern Stats Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-battambang text-xs text-purple-100 font-semibold">
                        សិស្សសរុប
                      </span>
                    </div>
                    <div className="font-koulen text-3xl text-white mb-1">
                      {reportData.totalStudents}
                    </div>
                    <div className="font-battambang text-xs text-purple-200">
                      Students
                    </div>
                  </div>

                  <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/30 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-battambang text-xs text-purple-100 font-semibold">
                        មធ្យមភាគថ្នាក់
                      </span>
                    </div>
                    <div className="font-koulen text-3xl text-white mb-1">
                      {reportData.classAverage.toFixed(2)}
                    </div>
                    <div className="font-battambang text-xs text-purple-200">
                      Class Average
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modern Top 3 Students Banner */}
            <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 px-4 py-4 border-b border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-koulen text-base text-gray-900">
                    Top Performers
                  </h3>
                  <p className="font-battambang text-[10px] text-amber-700">
                    សិស្សពូកែបំផុត
                  </p>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {reportData.students.slice(0, 3).map((student) => {
                  const rankBadge = getRankBadge(student.rank);
                  return (
                    <div
                      key={student.studentId}
                      className="flex-shrink-0 w-44 bg-white rounded-2xl p-3 shadow-md border-2 border-amber-200"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-9 h-9 ${rankBadge.bg} rounded-xl flex items-center justify-center font-koulen text-base ${rankBadge.text} shadow-md`}
                        >
                          {rankBadge.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-battambang text-xs font-bold text-gray-900 truncate">
                            {student.studentName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="font-koulen text-xl text-indigo-600">
                          {student.average.toFixed(2)}
                        </span>
                        <span className="font-battambang text-xs text-gray-500">
                          /50
                        </span>
                      </div>
                      <div>
                        {(() => {
                          const badge = getGradeBadge(
                            student.gradeLevel,
                            student.gradeLevelKh
                          );
                          return (
                            <div
                              className={`inline-flex items-center gap-1 ${badge.bg} ${badge.text} px-2.5 py-1 rounded-xl font-battambang text-xs font-bold shadow-sm`}
                            >
                              <span>{badge.icon}</span>
                              <span>{student.gradeLevel}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Student List */}
            <div className="px-4 py-3 pb-20 space-y-2.5">
              {reportData.students.map((student, index) => {
                const gradeBadge = getGradeBadge(
                  student.gradeLevel,
                  student.gradeLevelKh
                );
                const rankBadge = getRankBadge(student.rank);
                const isTopThree = student.rank <= 3;

                return (
                  <div
                    key={student.studentId}
                    className={`bg-white rounded-2xl shadow-sm border-2 transition-all hover:shadow-md ${
                      isTopThree
                        ? "border-amber-300 bg-gradient-to-r from-amber-50/30 to-yellow-50/30"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`w-11 h-11 ${rankBadge.bg} rounded-2xl flex items-center justify-center shadow-md flex-shrink-0`}
                          >
                            <span
                              className={`font-koulen text-base ${rankBadge.text}`}
                            >
                              {rankBadge.icon}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <h4 className="font-battambang text-sm font-bold text-gray-900 truncate">
                                {student.studentName}
                              </h4>
                              {student.gender === "FEMALE" && (
                                <span className="text-pink-500">♀</span>
                              )}
                              {student.gender === "MALE" && (
                                <span className="text-blue-500">♂</span>
                              )}
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-2">
                              <span className="font-battambang text-xs text-gray-600 font-medium">
                                មធ្យមភាគ:
                              </span>
                              <span className="font-koulen text-xl text-indigo-600">
                                {student.average.toFixed(2)}
                              </span>
                              <span className="font-battambang text-xs text-gray-500">
                                /50
                              </span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden shadow-inner">
                              <div
                                className={`h-full ${gradeBadge.bg} transition-all duration-500`}
                                style={{
                                  width: `${Math.min(
                                    (student.average / 50) * 100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div
                          className={`ml-3 px-3.5 py-2.5 ${gradeBadge.bg} rounded-2xl shadow-md flex-shrink-0`}
                        >
                          <div className="text-center">
                            <div
                              className={`text-xl font-bold ${gradeBadge.text} leading-none`}
                            >
                              {gradeBadge.icon}
                            </div>
                            <div
                              className={`font-koulen text-2xl ${gradeBadge.text} leading-none mt-1.5`}
                            >
                              {student.gradeLevel}
                            </div>
                            <div
                              className={`font-battambang text-[10px] ${gradeBadge.text} mt-1 opacity-90`}
                            >
                              {student.gradeLevelKh}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <div className="font-battambang text-xs text-gray-600 mb-1">
                            Score
                          </div>
                          <div className="font-koulen text-base text-gray-900">
                            {student.totalScore.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-center border-l border-r border-gray-200">
                          <div className="font-battambang text-xs text-red-600 mb-1">
                            អវត្តមាន
                          </div>
                          <div className="font-koulen text-base text-red-600">
                            {student.absent + student.permission}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="font-battambang text-xs text-gray-600 mb-1">
                            Rank
                          </div>
                          <div className="font-koulen text-base text-indigo-600">
                            #{student.rank}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xs">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BarChart3 className="w-12 h-12 text-indigo-600" />
              </div>
              <h1 className="font-koulen text-lg text-gray-900 mb-2">
                ជ្រើសរើសថ្នាក់
              </h1>
              <p className="font-battambang text-sm text-gray-600 leading-relaxed mb-1">
                សូមជ្រើសរើសថ្នាក់ ខែ និងឆ្នាំ
              </p>
              <p className="font-battambang text-xs text-gray-500">
                ដើម្បីបង្កើតរបាយការណ៍ប្រចាំខែ
              </p>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
