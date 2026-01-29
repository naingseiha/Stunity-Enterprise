"use client";

import { useState } from "react";
import { ComprehensiveStats } from "@/lib/api/dashboard";
import { BarChart3, Users, Award, TrendingUp } from "lucide-react";
import ClassPerformanceCards from "./ClassPerformanceCards";

interface GradeStatsSectionProps {
  comprehensiveStats: ComprehensiveStats | null;
  isLoading?: boolean;
}

export default function GradeStatsSection({
  comprehensiveStats,
  isLoading,
}: GradeStatsSectionProps) {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  if (isLoading || !comprehensiveStats) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="flex gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl w-32"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl"></div>
      </div>
    );
  }

  const grades = ["7", "8", "9", "10", "11", "12"];
  const gradeColors: Record<string, string> = {
    "7": "from-pink-500 to-rose-500",
    "8": "from-purple-500 to-violet-500",
    "9": "from-blue-500 to-indigo-500",
    "10": "from-cyan-500 to-teal-500",
    "11": "from-green-500 to-emerald-500",
    "12": "from-orange-500 to-amber-500",
  };

  const selectedGradeData = comprehensiveStats.grades.find(
    (g) => g.grade === selectedGrade
  );

  // Calculate totals
  const totalStats = comprehensiveStats.grades.reduce(
    (acc, grade) => ({
      students: acc.students + grade.totalStudents,
      classes: acc.classes + grade.totalClasses,
      passCount: acc.passCount + grade.passedCount,
      failCount: acc.failCount + grade.failedCount,
    }),
    { students: 0, classes: 0, passCount: 0, failCount: 0 }
  );

  const overallPassRate =
    totalStats.passCount + totalStats.failCount > 0
      ? (
          (totalStats.passCount /
            (totalStats.passCount + totalStats.failCount)) *
          100
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Redesigned Summary Section */}
      <div className="bg-white rounded-3xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-khmer-title text-2xl text-gray-900 font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-indigo-600" />
              ស្ថិតិតាមកម្រិតថ្នាក់
            </h3>
            <p className="font-khmer-body text-sm text-gray-500 font-medium mt-1">
              {comprehensiveStats.month} {comprehensiveStats.year}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full border-2 border-indigo-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-khmer-body text-xs font-bold text-indigo-700">
              ទិន្នន័យផ្ទាល់
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Students Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full blur-2xl group-hover:bg-blue-300/50 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-md">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="font-khmer-body text-xs font-bold text-blue-700 mb-1">
                សិស្សានុសិស្ស
              </p>
              <p className="text-3xl font-moul text-blue-700 mb-1">
                {totalStats.students}
              </p>
              <p className="font-khmer-body text-[10px] text-blue-600">
                សិស្សទាំងអស់
              </p>
            </div>
          </div>

          {/* Total Classes Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full blur-2xl group-hover:bg-purple-300/50 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-md">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <p className="font-khmer-body text-xs font-bold text-purple-700 mb-1">
                ថ្នាក់រៀន
              </p>
              <p className="text-3xl font-moul text-purple-700 mb-1">
                {totalStats.classes}
              </p>
              <p className="font-khmer-body text-[10px] text-purple-600">
                ថ្នាក់សកម្ម
              </p>
            </div>
          </div>

          {/* Pass Rate Card - Highlighted */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200 hover:border-green-300 transition-all duration-300 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-200/40 rounded-full blur-2xl group-hover:bg-green-300/60 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span className="font-khmer-body text-[9px] font-bold text-green-700">
                    ជាប់
                  </span>
                </div>
              </div>
              <p className="font-khmer-body text-xs font-bold text-green-700 mb-1">
                អត្រាជាប់
              </p>
              <p className="text-3xl font-moul text-green-700 mb-1">
                {overallPassRate}%
              </p>
              <p className="font-khmer-body text-[10px] text-green-600">
                {totalStats.passCount}/{totalStats.passCount + totalStats.failCount} សិស្ស
              </p>
            </div>
          </div>

          {/* Grade Levels Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-100 hover:border-orange-300 transition-all duration-300 hover:shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/30 rounded-full blur-2xl group-hover:bg-orange-300/50 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-md">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <span className="font-khmer-body text-xs font-bold text-orange-600">
                  7-12
                </span>
              </div>
              <p className="font-khmer-body text-xs font-bold text-orange-700 mb-1">
                កម្រិតថ្នាក់
              </p>
              <p className="text-3xl font-moul text-orange-700 mb-1">
                {comprehensiveStats.grades.length}
              </p>
              <p className="font-khmer-body text-[10px] text-orange-600">
                កម្រិតសរុប
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Selector */}
      <div className="bg-white rounded-3xl shadow-lg p-6">
        <h4 className="font-khmer-title text-lg text-gray-900 mb-4 font-bold">
          ជ្រើសរើសថ្នាក់
        </h4>
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {grades.map((grade) => {
            const gradeData = comprehensiveStats.grades.find(
              (g) => g.grade === grade
            );
            const isSelected = selectedGrade === grade;
            const hasClasses = gradeData && gradeData.totalClasses > 0;
            const colorClass = gradeColors[grade];

            return (
              <button
                key={grade}
                onClick={() => hasClasses && setSelectedGrade(isSelected ? null : grade)}
                disabled={!hasClasses}
                className={`flex-shrink-0 relative group transition-all duration-300 ${
                  isSelected
                    ? "scale-105"
                    : hasClasses
                    ? "scale-100 hover:scale-102"
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div
                  className={`relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ${
                    isSelected ? "shadow-xl ring-4 ring-white" : "shadow-md"
                  }`}
                >
                  <div
                    className={`bg-gradient-to-br ${colorClass} p-5 min-w-[140px]`}
                  >
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/20 rounded-full blur-xl"></div>

                    <div className="relative z-10">
                      <span className="font-khmer-body text-white/90 text-xs font-bold block mb-1">
                        ថ្នាក់ទី
                      </span>
                      <span className="font-moul text-white text-4xl mb-2 block">
                        {grade}
                      </span>
                      {gradeData && (
                        <div className="space-y-1">
                          <div className="bg-white/25 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/30">
                            <span className="font-khmer-body text-white text-xs font-bold block">
                              {gradeData.totalStudents} សិស្ស
                            </span>
                          </div>
                          <div className="bg-white/25 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/30">
                            <span className="font-khmer-body text-white text-xs font-bold block">
                              {gradeData.totalClasses} ថ្នាក់
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white"></div>
                  )}
                </div>

                {isSelected && (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-20 blur-xl -z-10 rounded-2xl`}
                  ></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade Statistics - Only show when a grade is selected */}
      {selectedGrade && selectedGradeData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Students */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border-2 border-blue-100 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 bg-blue-500 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-khmer-body text-xs font-bold text-blue-700">
                សិស្ស
              </span>
            </div>
            <p className="text-4xl font-moul text-blue-700 mb-1">
              {selectedGradeData.totalStudents}
            </p>
            <p className="font-khmer-body text-xs text-blue-600">
              ប្រុស: {selectedGradeData.maleStudents} • ស្រី:{" "}
              {selectedGradeData.femaleStudents}
            </p>
          </div>

          {/* Average Score */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 border-2 border-purple-100 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 bg-purple-500 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-khmer-body text-xs font-bold text-purple-700">
                មធ្យមភាគ
              </span>
            </div>
            <p className="text-4xl font-moul text-purple-700 mb-1">
              {selectedGradeData.averageScore.toFixed(1)}
            </p>
            <p className="font-khmer-body text-xs text-purple-600">
              ប្រុស: {selectedGradeData.maleAverageScore.toFixed(1)} • ស្រី:{" "}
              {selectedGradeData.femaleAverageScore.toFixed(1)}
            </p>
          </div>

          {/* Pass Percentage */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 border-2 border-green-100 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 bg-green-500 rounded-xl">
                <Award className="w-5 h-5 text-white" />
              </div>
              <span className="font-khmer-body text-xs font-bold text-green-700">
                អត្រាជាប់
              </span>
            </div>
            <p className="text-4xl font-moul text-green-700 mb-1">
              {selectedGradeData.passPercentage.toFixed(1)}%
            </p>
            <p className="font-khmer-body text-xs text-green-600">
              {selectedGradeData.passedCount} /{" "}
              {selectedGradeData.passedCount + selectedGradeData.failedCount}
            </p>
          </div>

          {/* Total Classes */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-6 border-2 border-orange-100 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2.5 bg-orange-500 rounded-xl">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-khmer-body text-xs font-bold text-orange-700">
                ថ្នាក់រៀន
              </span>
            </div>
            <p className="text-4xl font-moul text-orange-700 mb-1">
              {selectedGradeData.totalClasses}
            </p>
            <p className="font-khmer-body text-xs text-orange-600">
              ថ្នាក់សកម្ម
            </p>
          </div>
        </div>
      )}

      {/* Class Performance Cards - Only show when a grade is selected */}
      {selectedGrade && selectedGradeData && (
        <ClassPerformanceCards classes={selectedGradeData.classes} />
      )}

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
