"use client";

import { TrendingUp, Users, Award, BarChart3, CheckCircle2 } from "lucide-react";

interface GradeStatsCardsProps {
  stats: {
    totalStudents: number;
    totalClasses: number;
    averageScore: number;
    passPercentage: number;
    passCount: number;
    failCount: number;
    gradeDistribution: {
      A: number;
      B: number;
      C: number;
      D: number;
      E: number;
    };
    subjectCompletionPercentage: number;
  };
}

export default function GradeStatsCards({ stats }: GradeStatsCardsProps) {
  const gradeLetters = [
    { letter: "A", percentage: stats.gradeDistribution.A, color: "bg-green-500" },
    { letter: "B", percentage: stats.gradeDistribution.B, color: "bg-blue-500" },
    { letter: "C", percentage: stats.gradeDistribution.C, color: "bg-yellow-500" },
    { letter: "D", percentage: stats.gradeDistribution.D, color: "bg-orange-500" },
    { letter: "E", percentage: stats.gradeDistribution.E, color: "bg-red-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Stats - 2 Column Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pass Percentage */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-500 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-khmer-body text-xs font-bold text-green-700">
              អត្រាជាប់
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-3xl text-green-700">
              {stats.passPercentage.toFixed(1)}
            </span>
            <span className="font-black text-lg text-green-600">%</span>
          </div>
          <p className="font-khmer-body text-xs text-green-600 mt-1">
            {stats.passCount} / {stats.totalStudents}
          </p>
        </div>

        {/* Average Score */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-500 rounded-xl">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-khmer-body text-xs font-bold text-blue-700">
              មធ្យមភាគ
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-black text-3xl text-blue-700">
              {stats.averageScore.toFixed(1)}
            </span>
            <span className="font-black text-lg text-blue-600">/100</span>
          </div>
          <p className="font-khmer-body text-xs text-blue-600 mt-1">
            {stats.totalClasses} ថ្នាក់រៀន
          </p>
        </div>
      </div>

      {/* Grade Distribution Card */}
      <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500 rounded-xl">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-khmer-title text-sm font-bold text-gray-800">
              ការចែកចាយពិន្ទុ
            </span>
          </div>
          <span className="font-khmer-body text-xs text-gray-500">
            {stats.totalStudents} សិស្ស
          </span>
        </div>

        <div className="space-y-3">
          {gradeLetters.map((grade) => (
            <div key={grade.letter}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`${grade.color} w-8 h-8 rounded-lg flex items-center justify-center`}
                  >
                    <span className="font-black text-white text-sm">
                      {grade.letter}
                    </span>
                  </div>
                  <span className="font-khmer-body text-xs font-semibold text-gray-700">
                    និទ្ទេស {grade.letter}
                  </span>
                </div>
                <span className="font-black text-sm text-gray-700">
                  {grade.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`${grade.color} h-full rounded-full transition-all duration-700`}
                  style={{ width: `${grade.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Completion Card */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 shadow-md border border-purple-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-purple-500 rounded-xl">
            <Award className="w-4 h-4 text-white" />
          </div>
          <span className="font-khmer-title text-sm font-bold text-gray-800">
            វឌ្ឍនភាពការបញ្ចូលពិន្ទុ
          </span>
        </div>

        <div className="relative">
          <div className="h-4 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000"
              style={{ width: `${stats.subjectCompletionPercentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-khmer-body text-xs text-purple-700 font-medium">
              បានបញ្ចូល
            </span>
            <span className="font-black text-lg text-purple-700">
              {stats.subjectCompletionPercentage.toFixed(1)}%
            </span>
          </div>
        </div>

        <p className="font-khmer-body text-xs text-purple-600 mt-3 text-center">
          សរុបមុខវិជ្ជាទាំងអស់ត្រូវបានបញ្ចូលពិន្ទុ
        </p>
      </div>
    </div>
  );
}
