"use client";

import { useState, useEffect } from "react";
import {
  ChildWithStats,
  getChildGrades,
  getChildAttendance,
  getChildMonthlySummaries,
  getChildPerformance,
  type ChildGradesResponse,
  type ChildAttendanceResponse,
  type ChildMonthlySummariesResponse,
  type ChildPerformanceResponse,
} from "@/lib/api/parent-portal";
import {
  BookOpen,
  Calendar,
  TrendingUp,
  BarChart3,
  Loader2,
  ChevronDown,
} from "lucide-react";

interface ParentChildrenTabProps {
  children: ChildWithStats[];
  onRefresh: () => Promise<void>;
}

type SubTab = "grades" | "attendance" | "summaries" | "performance";

export default function ParentChildrenTab({
  children,
  onRefresh,
}: ParentChildrenTabProps) {
  const [selectedChildId, setSelectedChildId] = useState<string>(
    children[0]?.id || ""
  );
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("grades");
  const [loading, setLoading] = useState(false);

  // Data states
  const [gradesData, setGradesData] = useState<ChildGradesResponse | null>(
    null
  );
  const [attendanceData, setAttendanceData] =
    useState<ChildAttendanceResponse | null>(null);
  const [summariesData, setSummariesData] =
    useState<ChildMonthlySummariesResponse | null>(null);
  const [performanceData, setPerformanceData] =
    useState<ChildPerformanceResponse | null>(null);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  // Reset data when child changes
  useEffect(() => {
    setGradesData(null);
    setAttendanceData(null);
    setSummariesData(null);
    setPerformanceData(null);
  }, [selectedChildId]);

  const loadGrades = async () => {
    if (!selectedChildId) return;
    try {
      setLoading(true);
      const year = new Date().getFullYear();
      const data = await getChildGrades(selectedChildId, { year });
      setGradesData(data);
    } catch (error) {
      console.error("Error loading grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!selectedChildId) return;
    try {
      setLoading(true);
      const now = new Date();
      const data = await getChildAttendance(selectedChildId, {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      setAttendanceData(data);
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaries = async () => {
    if (!selectedChildId) return;
    try {
      setLoading(true);
      const year = new Date().getFullYear();
      const data = await getChildMonthlySummaries(selectedChildId, { year });
      setSummariesData(data);
    } catch (error) {
      console.error("Error loading summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformance = async () => {
    if (!selectedChildId) return;
    try {
      setLoading(true);
      const year = new Date().getFullYear();
      const data = await getChildPerformance(selectedChildId, { year });
      setPerformanceData(data);
    } catch (error) {
      console.error("Error loading performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadData = () => {
    switch (activeSubTab) {
      case "grades":
        loadGrades();
        break;
      case "attendance":
        loadAttendance();
        break;
      case "summaries":
        loadSummaries();
        break;
      case "performance":
        loadPerformance();
        break;
    }
  };

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <p className="text-gray-600">មិនមានកូនបានភ្ជាប់គណនី</p>
        <p className="text-sm text-gray-500 mt-1">
          No children linked to this account
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Child Selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ជ្រើសរើសកូន • Select Child
        </label>
        <div className="relative">
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white font-medium text-gray-800"
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.khmerName} - {child.class?.name || "មិនមានថ្នាក់"}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveSubTab("grades")}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${
              activeSubTab === "grades"
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">ពិន្ទុ</span>
          </button>

          <button
            onClick={() => setActiveSubTab("attendance")}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${
              activeSubTab === "attendance"
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Calendar className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">វត្តមាន</span>
          </button>

          <button
            onClick={() => setActiveSubTab("summaries")}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${
              activeSubTab === "summaries"
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <TrendingUp className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">ប្រចាំខែ</span>
          </button>

          <button
            onClick={() => setActiveSubTab("performance")}
            className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all ${
              activeSubTab === "performance"
                ? "bg-indigo-50 text-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">ការវិភាគ</span>
          </button>
        </div>
      </div>

      {/* Load Data Button */}
      <button
        onClick={handleLoadData}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            កំពុងផ្ទុក...
          </>
        ) : (
          "ផ្ទុកទិន្នន័យ"
        )}
      </button>

      {/* Content Area */}
      <div className="bg-white rounded-2xl p-5 shadow-sm min-h-[300px]">
        {activeSubTab === "grades" && gradesData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                ពិន្ទុសិស្ស
              </h3>
              <div className="text-right">
                <p className="text-sm text-gray-600">មធ្យម</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {gradesData.statistics.averageScore.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Subject Grades */}
            {gradesData.grades.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                មិនទាន់មានពិន្ទុ
              </p>
            ) : (
              <div className="space-y-3">
                {gradesData.grades.map((grade) => (
                  <div
                    key={grade.id}
                    className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {grade.subject.nameKh}
                        </p>
                        <p className="text-xs text-gray-500">
                          {grade.subject.code} • {grade.month} {grade.year}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">
                          {grade.score}/{grade.maxScore}
                        </p>
                        <p className="text-xs text-gray-600">
                          {grade.percentage.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${grade.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "attendance" && attendanceData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">វត្តមាន</p>
                <p className="text-2xl font-bold text-green-600">
                  {attendanceData.statistics.presentCount}
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">អវត្តមាន</p>
                <p className="text-2xl font-bold text-red-600">
                  {attendanceData.statistics.absentCount}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">អត្រា</p>
                <p className="text-2xl font-bold text-blue-600">
                  {attendanceData.statistics.attendanceRate.toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Attendance Records */}
            {attendanceData.attendance.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                មិនទាន់មានកំណត់ត្រា
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {attendanceData.attendance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {new Date(record.date).toLocaleDateString("km-KH", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.session === "MORNING" ? "ព្រឹក" : "រសៀល"}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        record.status === "PRESENT"
                          ? "bg-green-100 text-green-700"
                          : record.status === "ABSENT"
                          ? "bg-red-100 text-red-700"
                          : record.status === "PERMISSION"
                          ? "bg-yellow-100 text-yellow-700"
                          : record.status === "LATE"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {record.status === "PRESENT"
                        ? "វត្តមាន"
                        : record.status === "ABSENT"
                        ? "អវត្តមាន"
                        : record.status === "PERMISSION"
                        ? "សុំច្បាប់"
                        : record.status === "LATE"
                        ? "យឺត"
                        : "មានលើកលែង"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "summaries" && summariesData && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              សង្ខេបប្រចាំខែ
            </h3>
            {summariesData.summaries.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                មិនទាន់មានទិន្នន័យ
              </p>
            ) : (
              <div className="space-y-3">
                {summariesData.summaries.map((summary, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {summary.month}
                        </p>
                        <p className="text-xs text-gray-500">
                          {summary.subjectCount}/{summary.totalSubjects} មុខវិជ្ជា
                          {summary.isComplete && " • បានបញ្ចប់"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">
                          {summary.averageScore !== null
                            ? summary.averageScore.toFixed(1)
                            : "-"}
                        </p>
                        <p className="text-xs text-gray-600">មធ្យម</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "performance" && performanceData && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              ការវិភាគការអនុវត្ត
            </h3>
            {performanceData.subjectPerformance.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                មិនទាន់មានទិន្នន័យ
              </p>
            ) : (
              <div className="space-y-3">
                {performanceData.subjectPerformance.map((perf, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {perf.subject.nameKh}
                        </p>
                        <p className="text-xs text-gray-500">
                          {perf.subject.code}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          perf.performanceLevel === "Above Average"
                            ? "bg-green-100 text-green-700"
                            : perf.performanceLevel === "Average"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {perf.performanceLevel === "Above Average"
                          ? "លើមធ្យម"
                          : perf.performanceLevel === "Average"
                          ? "មធ្យម"
                          : "ក្រោមមធ្យម"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-600">ពិន្ទុសិស្ស</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {perf.percentageScore.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">មធ្យមថ្នាក់</p>
                        <p className="text-lg font-bold text-gray-700">
                          {perf.classAverage.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      ភាពខុសគ្នា:{" "}
                      <span
                        className={
                          perf.difference >= 0
                            ? "text-green-600 font-semibold"
                            : "text-red-600 font-semibold"
                        }
                      >
                        {perf.difference > 0 ? "+" : ""}
                        {perf.difference.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!gradesData &&
          !attendanceData &&
          !summariesData &&
          !performanceData && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                {activeSubTab === "grades" && (
                  <BookOpen className="w-8 h-8 text-indigo-600" />
                )}
                {activeSubTab === "attendance" && (
                  <Calendar className="w-8 h-8 text-indigo-600" />
                )}
                {activeSubTab === "summaries" && (
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                )}
                {activeSubTab === "performance" && (
                  <BarChart3 className="w-8 h-8 text-indigo-600" />
                )}
              </div>
              <p className="text-gray-600 font-medium">ចុចប៊ូតុងខាងលើ</p>
              <p className="text-sm text-gray-500 mt-1">
                Click the button above to load data
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
