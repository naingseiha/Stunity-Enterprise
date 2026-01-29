"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  RefreshCw,
  Loader2,
  Award,
  Clock,
} from "lucide-react";
import { GradesResponse, getMyGrades } from "@/lib/api/student-portal";
import { Subject } from "@/lib/api/subjects";

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

const getLetterGrade = (percentage: number): { grade: string; color: string } => {
  if (percentage >= 80) return { grade: "A", color: "text-green-600" };
  if (percentage >= 70) return { grade: "B", color: "text-blue-600" };
  if (percentage >= 60) return { grade: "C", color: "text-yellow-600" };
  if (percentage >= 50) return { grade: "D", color: "text-orange-600" };
  if (percentage >= 40) return { grade: "E", color: "text-amber-600" };
  return { grade: "F", color: "text-red-600" };
};

interface StudentGradesTabProps {
  initialGradesData: GradesResponse | null;
  allSubjects: Subject[];
  currentYear: number;
  currentMonth: string;
}

export default function StudentGradesTab({
  initialGradesData,
  allSubjects,
  currentYear,
  currentMonth,
}: StudentGradesTabProps) {
  const [gradesData, setGradesData] = useState<GradesResponse | null>(initialGradesData);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dataLoading, setDataLoading] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  const loadGrades = async () => {
    try {
      setDataLoading(true);
      setGradesData(null); // Clear old data to show loading
      const data = await getMyGrades({
        year: selectedYear,
        month: selectedMonth,
      });
      setGradesData(data);
    } catch (error) {
      console.error("Error loading grades:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Removed auto-load on filter change - user must click load button

  // Scroll listener for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderSticky(window.scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ពិន្ទុ</h1>
        <button
          onClick={loadGrades}
          disabled={dataLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw
            className={`w-5 h-5 text-gray-600 ${dataLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ឆ្នាំសិក្សា</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:outline-none text-sm"
            >
              <option value={2024}>2024-2025</option>
              <option value={2025}>2025-2026</option>
              <option value={2026}>2026-2027</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ខែ</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:border-indigo-600 focus:outline-none text-sm"
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Load Button - Always show when not loading */}
      {!dataLoading && (
        <button
          onClick={loadGrades}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg p-5 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <BookOpen className="w-6 h-6" />
          <span className="font-bold text-lg">
            {gradesData ? "ផ្ទុកទិន្នន័យឡើងវិញ" : "ផ្ទុកទិន្នន័យពិន្ទុ"}
          </span>
        </button>
      )}

      {/* Loading State */}
      {dataLoading && (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">កំពុងផ្ទុកទិន្នន័យ...</p>
        </div>
      )}

      {allSubjects.length > 0 && gradesData && !dataLoading ? (
        <div className="space-y-4 relative">

          {/* Summary Card - Sticky Header */}
          {gradesData?.statistics && (
            <>
              {isHeaderSticky && <div className="h-[200px]"></div>}

              <div
                className={`${
                  isHeaderSticky
                    ? "fixed -top-4 left-0 right-0 z-50 bg-gradient-to-br from-gray-50 to-gray-100 pt-9 pb-4 shadow-lg animate-in slide-in-from-top duration-300"
                    : ""
                } transition-all`}
              >
                <div className={`${isHeaderSticky ? "max-w-md mx-auto px-5" : ""}`}>
                  <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl shadow-xl p-6 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-lg">សង្ខេបពិន្ទុ</h1>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-3 text-center">
                          <p className="text-xs text-indigo-100 mb-1">មធ្យមភាគ</p>
                          <p className="text-2xl font-bold">
                            {gradesData.statistics.averageScore?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        {gradesData.statistics.classRank && (
                          <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-3 text-center">
                            <p className="text-xs text-indigo-100 mb-1">លំដាប់ថ្នាក់</p>
                            <p className="text-2xl font-bold">#{gradesData.statistics.classRank}</p>
                          </div>
                        )}
                        <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-3 text-center">
                          <p className="text-xs text-indigo-100 mb-1">សរុប</p>
                          <p className="text-2xl font-bold">
                            {gradesData.statistics.totalScore?.toFixed(1) || "0"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Grades List */}
          <div className="space-y-3">
            {allSubjects.map((subject) => {
              // Find if there's a grade for this subject
              const grade = gradesData?.grades.find((g) => g.subject.id === subject.id);

              const percentage = grade
                ? grade.percentage || (grade.score / grade.maxScore) * 100
                : 0;
              const isPass = percentage >= 50;
              const hasScore = !!grade;
              const letterGrade = hasScore ? getLetterGrade(percentage) : null;

              return (
                <div
                  key={subject.id}
                  className={`bg-white rounded-2xl shadow-md border-2 overflow-hidden hover:shadow-lg transition-all ${
                    hasScore ? "border-gray-100" : "border-dashed border-gray-300"
                  }`}
                >
                  {/* Top Section - Subject and Score */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h1 className="font-bold text-gray-900 text-base leading-tight">
                            {subject.nameKh}
                          </h1>
                          {letterGrade && (
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                                letterGrade.grade === "A"
                                  ? "bg-green-100 text-green-700"
                                  : letterGrade.grade === "B"
                                  ? "bg-blue-100 text-blue-700"
                                  : letterGrade.grade === "C"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : letterGrade.grade === "D"
                                  ? "bg-orange-100 text-orange-700"
                                  : letterGrade.grade === "E"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {letterGrade.grade}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {subject.code} • មេគុណពិន្ទុ: {subject.coefficient}
                        </p>
                      </div>
                      <div className="text-right">
                        {hasScore ? (
                          <div
                            className={`inline-flex items-baseline gap-1 px-3 py-1 rounded-xl ${
                              isPass ? "bg-green-50" : "bg-red-50"
                            }`}
                          >
                            <span
                              className={`text-2xl font-bold ${
                                isPass ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {grade!.score?.toFixed(1) || "0"}
                            </span>
                            <span className="text-sm text-gray-600 font-medium">
                              /{grade!.maxScore}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-100">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500 font-medium">
                              /{subject.maxScore}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar or Waiting Status */}
                    {hasScore ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 font-medium">ភាគរយសម្រេច</span>
                          <span
                            className={`font-bold ${
                              isPass ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full rounded-full transition-all ${
                              isPass
                                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                : "bg-gradient-to-r from-red-500 to-rose-500"
                            }`}
                            style={{
                              width: `${Math.min(percentage, 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        <span>កំពុងរង់ចាំការបញ្ចូលពិន្ទុ...</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Section - Status Badge */}
                  <div
                    className={`px-4 py-2 ${
                      hasScore
                        ? isPass
                          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-100"
                          : "bg-gradient-to-r from-red-50 to-rose-50 border-t border-red-100"
                        : "bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {hasScore ? (
                        <>
                          <span
                            className={`text-xs font-bold ${
                              isPass ? "text-green-700" : "text-red-700"
                            }`}
                          >
                            {isPass ? "✓ ជាប់" : "✗ ធ្លាក់"}
                          </span>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>ខែ: {grade!.month}</span>
                            <span>ឆ្នាំ: {grade!.year}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-gray-500">
                            ⏳ មិនទាន់មានពិន្ទុ
                          </span>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>ខែ: {selectedMonth}</span>
                            <span>ឆ្នាំ: {selectedYear}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : gradesData ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl shadow-sm p-8 text-center border-2 border-dashed border-gray-300">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">មិនទាន់មានទិន្នន័យពិន្ទុ</p>
          <p className="text-sm text-gray-500 mt-2">
            សម្រាប់ {selectedMonth} {selectedYear}
          </p>
        </div>
      ) : null}
    </div>
  );
}
