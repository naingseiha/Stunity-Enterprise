// 📂 src/components/mobile/statistics/MobileStatisticsScreen.tsx

"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Calendar,
  ChevronRight,
  Filter,
  Trophy,
  Target,
  XCircle,
} from "lucide-react";
import MobileLayout from "@/components/layout/MobileLayout";
import { dashboardApi, ComprehensiveStats } from "@/lib/api/dashboard";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
} from "@/utils/academicYear";

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

export default function MobileStatisticsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentKhmerMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentAcademicYear());
  const [stats, setStats] = useState<ComprehensiveStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [showAllClasses, setShowAllClasses] = useState<Record<string, boolean>>(
    {}
  );

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardApi.getComprehensiveStats(
        selectedMonth,
        selectedYear
      );
      setStats(data);
    } catch (err) {
      console.error("Error loading comprehensive stats:", err);
      setError("មានបញ្ហាក្នុងការទាញយកទិន្នន័យ");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "from-green-500 to-emerald-500",
      B: "from-blue-500 to-indigo-500",
      C: "from-yellow-500 to-orange-500",
      D: "from-orange-500 to-red-500",
      E: "from-red-500 to-rose-500",
      F: "from-rose-500 to-pink-500",
    };
    return colors[grade] || "from-gray-400 to-gray-500";
  };

  if (error) {
    return (
      <MobileLayout title="ស្ថិតិ • Statistics">
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="font-koulen text-2xl text-gray-900 mb-2">
              មានបញ្ហា
            </h1>
            <p className="font-battambang text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => loadStats()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-battambang font-semibold py-3 px-6 rounded-2xl hover:shadow-lg transition-all active:scale-95"
            >
              ព្យាយាមម្តងទៀត
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (loading || !stats) {
    return (
      <MobileLayout title="ស្ថិតិ • Statistics">
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="font-battambang text-gray-600">កំពុងផ្ទុក...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Calculate overall statistics
  const totalStudents = stats.grades.reduce(
    (sum, g) => sum + g.totalStudents,
    0
  );
  const totalMale = stats.grades.reduce((sum, g) => sum + g.maleStudents, 0);
  const totalFemale = stats.grades.reduce(
    (sum, g) => sum + g.femaleStudents,
    0
  );
  const totalPassed = stats.grades.reduce((sum, g) => sum + g.passedCount, 0);
  const totalFailed = stats.grades.reduce((sum, g) => sum + g.failedCount, 0);
  const totalWithGrades = totalPassed + totalFailed;
  const overallPassPercentage =
    totalWithGrades > 0 ? (totalPassed / totalWithGrades) * 100 : 0;

  return (
    <MobileLayout title="ស្ថិតិ • Statistics">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 pb-24">
        {/* Header */}
        <div className="bg-white px-5 pt-6 pb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-koulen text-orange-500 text-base leading-tight">
                ស្ថិតិទូទៅ
              </h1>
              <p className="font-battambang text-[10px] text-gray-500">
                Comprehensive Statistics
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

        {/* Overview Cards */}
        <div className="px-5 pt-4 pb-3">
          <div className="bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 rounded-3xl p-5 shadow-lg border border-gray-200 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-koulen text-[10px] text-gray-600 font-semibold">
                    សិស្សសរុប
                  </p>
                </div>
                <p className="font-koulen text-3xl text-gray-900">
                  {totalStudents}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-battambang text-xs text-blue-600">
                    ប: {totalMale}
                  </span>
                  <span className="font-battambang text-xs text-pink-600">
                    ស: {totalFemale}
                  </span>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-koulen text-[10px] text-gray-600 font-semibold">
                    ជាប់
                  </p>
                </div>
                <p className="font-koulen text-3xl text-green-600">
                  {overallPassPercentage.toFixed(1)}%
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-battambang text-xs text-green-600">
                    {totalPassed} នាក់
                  </span>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-koulen text-[10px] text-gray-600 font-semibold">
                    ធ្លាក់
                  </p>
                </div>
                <p className="font-koulen text-3xl text-red-600">
                  {((totalFailed / totalStudents) * 100).toFixed(1)}%
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-battambang text-xs text-red-600">
                    {totalFailed} នាក់
                  </span>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-koulen text-[10px] text-gray-600 font-semibold">
                    ថ្នាក់
                  </p>
                </div>
                <p className="font-koulen text-3xl text-gray-900">
                  {stats.grades.reduce((sum, g) => sum + g.totalClasses, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Classes */}
        {stats.topPerformingClasses.length > 0 && (
          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-orange-500" />
              <h1 className="font-koulen text-lg text-gray-900">
                ថ្នាក់ល្អបំផុត
              </h1>
            </div>
            <div className="space-y-2">
              {stats.topPerformingClasses.slice(0, 5).map((cls, index) => (
                <div
                  key={cls.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${
                        index === 0
                          ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                          : index === 1
                          ? "bg-gradient-to-br from-gray-300 to-gray-400"
                          : index === 2
                          ? "bg-gradient-to-br from-orange-300 to-orange-400"
                          : "bg-gradient-to-br from-blue-500 to-indigo-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-battambang text-sm font-bold text-gray-900">
                        {cls.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-battambang text-xs text-gray-500">
                          {cls.studentCount} សិស្ស
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="font-battambang text-xs text-blue-600">
                          ប: {cls.maleCount}
                        </span>
                        <span className="font-battambang text-xs text-pink-600">
                          ស: {cls.femaleCount}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-koulen text-2xl text-green-600">
                        {cls.passPercentage.toFixed(1)}%
                      </p>
                      <p className="font-battambang text-xs text-gray-500">
                        ជាប់
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade Statistics */}
        <div className="px-5 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h1 className="font-koulen text-lg text-gray-900">
              ស្ថិតិតាមថ្នាក់
            </h1>
          </div>

          <div className="space-y-3">
            {stats.grades.map((grade) => (
              <div
                key={grade.grade}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Grade Header */}
                <button
                  onClick={() =>
                    setExpandedGrade(
                      expandedGrade === grade.grade ? null : grade.grade
                    )
                  }
                  className="w-full p-4 flex items-center justify-between active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-lg">
                        {grade.grade}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-koulen text-base text-gray-900">
                        ថ្នាក់ទី{grade.grade}
                      </p>
                      <p className="font-battambang text-xs text-gray-500">
                        {grade.totalStudents} សិស្ស • {grade.totalClasses}{" "}
                        ថ្នាក់
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-koulen text-xl text-green-600">
                      {grade.passPercentage.toFixed(1)}%
                    </p>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedGrade === grade.grade ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedGrade === grade.grade && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {/* Pass/Fail Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-3 mb-4">
                      <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                        <p className="font-battambang text-xs text-green-700 font-semibold mb-1">
                          ជាប់
                        </p>
                        <p className="font-koulen text-2xl text-green-600">
                          {grade.passedCount}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-battambang text-xs text-green-600">
                            ប: {grade.passedMale} (
                            {grade.malePassPercentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-battambang text-xs text-green-600">
                            ស: {grade.passedFemale} (
                            {grade.femalePassPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                        <p className="font-battambang text-xs text-red-700 font-semibold mb-1">
                          ធ្លាក់
                        </p>
                        <p className="font-koulen text-2xl text-red-600">
                          {grade.failedCount}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-battambang text-xs text-red-600">
                            ប: {grade.failedMale}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-battambang text-xs text-red-600">
                            ស: {grade.failedFemale}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Grade Distribution */}
                    <div className="mb-3">
                      <p className="font-battambang text-xs text-gray-600 font-semibold mb-2">
                        ការចែកចាយពិន្ទុ
                      </p>
                      <div className="space-y-2">
                        {Object.entries(grade.gradeDistribution).map(
                          ([letter, dist]) => (
                            <div
                              key={letter}
                              className="flex items-center gap-2"
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${getGradeColor(
                                  letter
                                )} text-white font-bold text-xs shadow-sm`}
                              >
                                {letter}
                              </div>
                              <div className="flex-1">
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${getGradeColor(
                                      letter
                                    )} transition-all`}
                                    style={{
                                      width: `${
                                        grade.totalStudents > 0
                                          ? (dist.total / grade.totalStudents) *
                                            100
                                          : 0
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="text-right min-w-[80px]">
                                <p className="font-battambang text-xs text-gray-900 font-semibold">
                                  {dist.total} ({dist.male}ប/{dist.female}ស)
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Class Statistics */}
                    {grade.classes.length > 0 && (
                      <div>
                        <p className="font-battambang text-xs text-gray-600 font-semibold mb-2">
                          ថ្នាក់រៀនទាំងអស់ ({grade.classes.length})
                        </p>
                        <div className="space-y-2">
                          {grade.classes
                            .slice(
                              0,
                              showAllClasses[grade.grade] ? undefined : 3
                            )
                            .map((cls) => (
                              <div
                                key={cls.id}
                                className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                              >
                                {/* Class Header - Clickable */}
                                <button
                                  onClick={() =>
                                    setExpandedClass(
                                      expandedClass === cls.id ? null : cls.id
                                    )
                                  }
                                  className="w-full p-3 text-left active:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-battambang text-sm font-bold text-gray-900">
                                      {cls.name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <p className="font-koulen text-lg text-green-600">
                                        {cls.passPercentage.toFixed(1)}%
                                      </p>
                                      <ChevronRight
                                        className={`w-4 h-4 text-gray-400 transition-transform ${
                                          expandedClass === cls.id
                                            ? "rotate-90"
                                            : ""
                                        }`}
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <p className="font-battambang text-gray-500">
                                        សិស្ស
                                      </p>
                                      <p className="font-battambang text-gray-900 font-semibold">
                                        {cls.studentCount}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-battambang text-gray-500">
                                        ប្រុស
                                      </p>
                                      <p className="font-battambang text-blue-600 font-semibold">
                                        {cls.malePassPercentage.toFixed(1)}%
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-battambang text-gray-500">
                                        ស្រី
                                      </p>
                                      <p className="font-battambang text-pink-600 font-semibold">
                                        {cls.femalePassPercentage.toFixed(1)}%
                                      </p>
                                    </div>
                                  </div>
                                </button>

                                {/* Expanded Class Details */}
                                {expandedClass === cls.id && (
                                  <div className="px-3 pb-3 bg-white">
                                    {/* Class-level Grade Distribution */}
                                    <div className="mb-3 pt-3 border-t border-gray-200">
                                      <p className="font-battambang text-xs text-gray-600 font-semibold mb-2">
                                        ការចែកចាយពិន្ទុថ្នាក់
                                      </p>
                                      <div className="space-y-2">
                                        {Object.entries(
                                          cls.gradeDistribution
                                        ).map(
                                          ([letter, dist]) =>
                                            dist.total > 0 && (
                                              <div
                                                key={letter}
                                                className="flex items-center gap-2"
                                              >
                                                <div
                                                  className={`w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br ${getGradeColor(
                                                    letter
                                                  )} text-white font-bold text-xs shadow-sm`}
                                                >
                                                  {letter}
                                                </div>
                                                <div className="flex-1">
                                                  <p className="font-battambang text-xs text-gray-900">
                                                    {dist.total} សិស្ស
                                                  </p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="font-battambang text-xs text-gray-600">
                                                    <span className="text-blue-600">
                                                      ប: {dist.male}
                                                    </span>
                                                    {" / "}
                                                    <span className="text-pink-600">
                                                      ស: {dist.female}
                                                    </span>
                                                  </p>
                                                </div>
                                              </div>
                                            )
                                        )}
                                      </div>
                                    </div>

                                    {/* ✅ NEW: Subject-level Grade Distribution */}
                                    {cls.subjectStats &&
                                      cls.subjectStats.length > 0 && (
                                        <div className="pt-3 border-t border-gray-200">
                                          <p className="font-battambang text-xs text-gray-600 font-semibold mb-2 flex items-center gap-1">
                                            <BarChart3 className="w-3 h-3" />
                                            ការចែកចាយពិន្ទុតាមមុខវិជ្ជា
                                          </p>
                                          <div className="space-y-3">
                                            {cls.subjectStats.map((subject) => (
                                              <div
                                                key={subject.subjectId}
                                                className="bg-gray-50 rounded-lg p-2.5 border border-gray-200"
                                              >
                                                {/* Subject Header */}
                                                <div className="flex items-center justify-between mb-2">
                                                  <div className="flex-1">
                                                    <p className="font-battambang text-xs font-bold text-gray-900">
                                                      {subject.subjectName}
                                                    </p>
                                                    <p className="font-battambang text-[10px] text-gray-500">
                                                      {subject.subjectCode} •
                                                      ពិន្ទុ: {subject.maxScore}{" "}
                                                      • ក្រេដីត:{" "}
                                                      {subject.coefficient}
                                                    </p>
                                                  </div>
                                                  <div className="bg-indigo-100 rounded-lg px-2 py-1">
                                                    <p className="font-battambang text-[10px] text-indigo-700 font-semibold">
                                                      {
                                                        subject.totalStudentsWithGrades
                                                      }{" "}
                                                      សិស្ស
                                                    </p>
                                                  </div>
                                                </div>

                                                {/* Subject Grade Distribution */}
                                                <div className="space-y-1.5">
                                                  {Object.entries(
                                                    subject.gradeDistribution
                                                  ).map(
                                                    ([letter, dist]) =>
                                                      dist.total > 0 && (
                                                        <div
                                                          key={letter}
                                                          className="flex items-center gap-2"
                                                        >
                                                          <div
                                                            className={`w-5 h-5 rounded flex items-center justify-center bg-gradient-to-br ${getGradeColor(
                                                              letter
                                                            )} text-white font-bold text-[10px] shadow-sm`}
                                                          >
                                                            {letter}
                                                          </div>
                                                          <div className="flex-1">
                                                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                              <div
                                                                className={`h-full bg-gradient-to-r ${getGradeColor(
                                                                  letter
                                                                )} transition-all`}
                                                                style={{
                                                                  width: `${
                                                                    subject.totalStudentsWithGrades >
                                                                    0
                                                                      ? (dist.total /
                                                                          subject.totalStudentsWithGrades) *
                                                                        100
                                                                      : 0
                                                                  }%`,
                                                                }}
                                                              />
                                                            </div>
                                                          </div>
                                                          <div className="text-right min-w-[65px]">
                                                            <p className="font-battambang text-[10px] text-gray-700 font-semibold">
                                                              {dist.total} (
                                                              {dist.male}ប/
                                                              {dist.female}ស)
                                                            </p>
                                                          </div>
                                                        </div>
                                                      )
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>

                        {/* Show More Button */}
                        {grade.classes.length > 3 &&
                          !showAllClasses[grade.grade] && (
                            <button
                              onClick={() =>
                                setShowAllClasses((prev) => ({
                                  ...prev,
                                  [grade.grade]: true,
                                }))
                              }
                              className="w-full mt-2 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-battambang text-xs font-semibold active:bg-indigo-100 transition-colors"
                            >
                              បង្ហាញបន្ថែម ({grade.classes.length - 3}{" "}
                              ថ្នាក់ទៀត)
                            </button>
                          )}
                        {showAllClasses[grade.grade] && (
                          <button
                            onClick={() =>
                              setShowAllClasses((prev) => ({
                                ...prev,
                                [grade.grade]: false,
                              }))
                            }
                            className="w-full mt-2 py-2 bg-gray-50 text-gray-600 rounded-xl font-battambang text-xs font-semibold active:bg-gray-100 transition-colors"
                          >
                            បង្ហាញតិច
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
