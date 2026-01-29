"use client";

import { type MonthlyStatisticsData } from "@/lib/api/reports";
import {
  Users,
  UserCheck,
  TrendingUp,
  Award,
  BarChart3,
  PieChart,
  BookOpen,
  Target,
} from "lucide-react";

interface MonthlyStatisticsDashboardProps {
  data: MonthlyStatisticsData;
}

export default function MonthlyStatisticsDashboard({
  data,
}: MonthlyStatisticsDashboardProps) {
  const { statistics, subjects } = data;

  // ✅ Calculate pass rate
  const passRate =
    statistics.totalStudents > 0
      ? ((statistics.totalPassed / statistics.totalStudents) * 100).toFixed(1)
      : "0.0";

  const femalePassRate =
    statistics.femaleStudents > 0
      ? ((statistics.femalePassed / statistics.femaleStudents) * 100).toFixed(1)
      : "0.0";

  const malePassRate =
    statistics.maleStudents > 0
      ? ((statistics.malePassed / statistics.maleStudents) * 100).toFixed(1)
      : "0.0";

  // ✅ Grade level colors
  const gradeColors: {
    [key: string]: { bg: string; text: string; border: string };
  } = {
    A: {
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-500",
    },
    B: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-500" },
    C: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-500",
    },
    D: {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-500",
    },
    E: { bg: "bg-red-100", text: "text-red-700", border: "border-red-500" },
    F: { bg: "bg-red-200", text: "text-red-800", border: "border-red-600" },
  };

  // ✅ Calculate max for bar chart scaling
  const maxGradeCount = Math.max(
    ...Object.values(statistics.gradeDistribution).map((g) => g.total)
  );

  return (
    <div className="space-y-6">
      {/* ✅ Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-3xl font-black">📊 ស្ថិតិថ្នាក់</h3>
            <p className="text-white/90 text-lg font-semibold">
              {data.className} • {data.month} {data.year}
            </p>
          </div>
        </div>
        <div className="text-sm text-white/80">
          គ្រូបន្ទុក: {data.teacherName || "មិនមាន"}
        </div>
      </div>

      {/* ✅ Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-600 p-3 rounded-lg shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 font-bold uppercase">
                សិស្សសរុប
              </div>
              <div className="text-xs text-blue-500">Total Students</div>
            </div>
          </div>
          <div className="text-4xl font-black text-blue-900 mb-2">
            {statistics.totalStudents}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full font-bold">
              👩 ស្រី ៖ {statistics.femaleStudents}
            </span>
            <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-full font-bold">
              👨 ប្រុស ៖ {statistics.maleStudents}
            </span>
          </div>
        </div>

        {/* Passed Students */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-600 p-3 rounded-lg shadow-md">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-green-600 font-bold uppercase">
                ជាប់សរុប
              </div>
              <div className="text-xs text-green-500">Passed</div>
            </div>
          </div>
          <div className="text-4xl font-black text-green-900 mb-2">
            {statistics.totalPassed}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full font-bold">
              👩 ស្រី ៖​ {statistics.femalePassed}
            </span>
            <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-full font-bold">
              👨 ប្រុស ៖ {statistics.malePassed}
            </span>
          </div>
        </div>

        {/* Pass Rate */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-600 p-3 rounded-lg shadow-md">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-purple-600 font-bold uppercase">
                អត្រាជាប់
              </div>
              <div className="text-xs text-purple-500">Pass Rate</div>
            </div>
          </div>
          <div className="text-4xl font-black text-purple-900 mb-2">
            {passRate}%
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full font-bold">
              👩 ស្រី ៖ {femalePassRate}%
            </span>
            <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-full font-bold">
              👨 ប្រុស ៖​ {malePassRate}%
            </span>
          </div>
        </div>

        {/* Failed Students */}
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border-2 border-red-200 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-600 p-3 rounded-lg shadow-md">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-red-600 font-bold uppercase">
                ធ្លាក់សរុប
              </div>
              <div className="text-xs text-red-500">Failed</div>
            </div>
          </div>
          <div className="text-4xl font-black text-red-900 mb-2">
            {statistics.totalFailed}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full font-bold">
              👩 ស្រី ៖ {statistics.femaleFailed}
            </span>
            <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-full font-bold">
              👨 ប្រុស ៖​ {statistics.maleFailed}
            </span>
          </div>
        </div>
      </div>

      {/* ✅ Overall Grade Distribution */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">និទ្ទេសរួម</h3>
            <p className="text-sm text-gray-600 font-semibold">
              Overall Grade Distribution
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {(["A", "B", "C", "D", "E", "F"] as const).map((grade) => {
            const gradeData = statistics.gradeDistribution[grade];
            const percentage =
              statistics.totalStudents > 0
                ? ((gradeData.total / statistics.totalStudents) * 100).toFixed(
                    1
                  )
                : "0.0";
            const barWidth =
              maxGradeCount > 0 ? (gradeData.total / maxGradeCount) * 100 : 0;

            return (
              <div key={grade} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 ${gradeColors[grade].bg} rounded-lg flex items-center justify-center border-2 ${gradeColors[grade].border} shadow-sm group-hover:scale-110 transition-transform`}
                    >
                      <span
                        className={`text-xl font-black ${gradeColors[grade].text}`}
                      >
                        {grade}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">
                        និទ្ទេស {grade}
                      </div>
                      <div className="text-xs text-gray-600">
                        {grade === "A" && "ល្អប្រសើរ (80-100%)"}
                        {grade === "B" && "ល្អណាស់ (70-79%)"}
                        {grade === "C" && "ល្អ (60-69%)"}
                        {grade === "D" && "ល្អបង្គួរ (50-59%)"}
                        {grade === "E" && "មធ្យម (40-49%)"}
                        {grade === "F" && "ខ្សោយ (<40%)"}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900">
                      {gradeData.total}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold">
                      {percentage}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-10 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${gradeColors[
                      grade
                    ].bg.replace(
                      "100",
                      "500"
                    )} transition-all duration-500 ease-out`}
                    style={{ width: `${barWidth}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-4">
                    <div className="flex items-center gap-4 relative z-10">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-bold text-pink-700 shadow-sm">
                        👩 ស្រី ៖ {gradeData.female}
                      </span>
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-bold text-sky-700 shadow-sm">
                        👨 ប្រុស ៖ {gradeData.male}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ Subject-wise Statistics */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-3 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">
              និទ្ទេសតាមមុខវិជ្ជា
            </h3>
            <p className="text-sm text-gray-600 font-semibold">
              Grade Distribution by Subject
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {subjects.map((subject) => {
            const subjectStats = statistics.subjectStatistics[subject.id];
            if (!subjectStats) return null;

            return (
              <div
                key={subject.id}
                className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                {/* Subject Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-gray-200">
                  <div>
                    <h4 className="text-xl font-black text-gray-900">
                      {subject.nameKh}
                    </h4>
                    <p className="text-sm text-gray-600 font-semibold">
                      {subject.nameEn} • {subject.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 font-semibold">
                      មធ្យមភាគ
                    </div>
                    <div className="text-2xl font-black text-blue-600">
                      {subjectStats.averageScore.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-1 text-xs">
                      <span className="text-pink-700 font-bold">
                        👩 ស្រី ៖ {subjectStats.femaleAverageScore.toFixed(1)}
                      </span>
                      <span className="text-sky-700 font-bold">
                        👨 ប្រុស ៖ {subjectStats.maleAverageScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grade Distribution Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {(["A", "B", "C", "D", "E", "F"] as const).map((grade) => {
                    const gradeData = subjectStats.gradeDistribution[grade];
                    const total = gradeData.total;
                    const female = gradeData.female;
                    const male = gradeData.male;

                    return (
                      <div
                        key={grade}
                        className={`${gradeColors[grade].bg} rounded-lg p-4 border-2 ${gradeColors[grade].border} hover:scale-105 transition-transform`}
                      >
                        <div className="text-center mb-2">
                          <div
                            className={`text-3xl font-black ${gradeColors[grade].text}`}
                          >
                            {grade}
                          </div>
                        </div>
                        <div className="text-center mb-3">
                          <div className="text-2xl font-black text-gray-900">
                            {total}
                          </div>
                          <div className="text-xs text-gray-600 font-semibold">
                            នាក់
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-pink-700 font-bold">
                              👩 ស្រី
                            </span>
                            <span className="font-black text-pink-700">
                              {female}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-sky-700 font-bold">
                              👨 ប្រុស
                            </span>
                            <span className="font-black text-sky-700">
                              {male}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subject Summary */}
                <div className="mt-4 pt-4 border-t-2 border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">សិស្សដែលបានពិន្ទុ:</span>{" "}
                    <span className="font-black text-gray-900">
                      {subjectStats.totalScored}/{statistics.totalStudents}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-pink-700 font-bold">
                      👩 {subjectStats.femaleScored} នាក់
                    </span>
                    <span className="text-sky-700 font-bold">
                      👨 {subjectStats.maleScored} នាក់
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
