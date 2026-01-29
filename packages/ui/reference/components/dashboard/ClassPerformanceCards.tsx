"use client";

import { useRouter } from "next/navigation";
import { Users, TrendingUp, Award, BookOpen, UserCheck } from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  section: string;
  grade: string;
  track: string | null;
  studentCount: number;
  maleCount: number;
  femaleCount: number;
  averageScore: number;
  passPercentage: number;
  malePassPercentage: number;
  femalePassPercentage: number;
  passedCount: number;
  failedCount: number;
  teacherName: string;
}

interface ClassPerformanceCardsProps {
  classes: ClassData[];
}

export default function ClassPerformanceCards({
  classes,
}: ClassPerformanceCardsProps) {
  const router = useRouter();

  const getScoreColor = (score: number) => {
    if (score >= 80)
      return "text-green-600 bg-gradient-to-br from-green-50 to-emerald-50 border-green-300";
    if (score >= 70)
      return "text-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300";
    if (score >= 60)
      return "text-yellow-600 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300";
    if (score >= 50)
      return "text-orange-600 bg-gradient-to-br from-orange-50 to-red-50 border-orange-300";
    return "text-red-600 bg-gradient-to-br from-red-50 to-rose-50 border-red-300";
  };

  const getGradientClass = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 70) return "from-blue-500 to-indigo-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    if (score >= 50) return "from-orange-500 to-red-500";
    return "from-red-500 to-rose-500";
  };

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Users className="w-12 h-12 text-gray-400" />
        </div>
        <p className="font-khmer-body text-gray-500 font-medium text-lg">
          មិនមានថ្នាក់រៀនសម្រាប់កម្រិតនេះ
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-khmer-title text-2xl text-gray-900 font-bold">
            ថ្នាក់រៀនទាំងអស់
          </h3>
          <p className="font-khmer-body text-sm text-gray-500 font-medium">
            {classes.length} ថ្នាក់
          </p>
        </div>
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classData) => (
          <button
            key={classData.id}
            onClick={() => router.push(`/grade-entry?classId=${classData.id}`)}
            className="group relative overflow-hidden bg-white rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-indigo-200 transform hover:-translate-y-1"
          >
            {/* Header with gradient */}
            <div
              className={`bg-gradient-to-r ${getGradientClass(
                classData.passPercentage
              )} p-6 relative overflow-hidden`}
            >
              {/* Decorative circles */}
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/20 rounded-full blur-xl"></div>
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-lg"></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-white/30 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/40">
                    <span className="font-khmer-title text-white text-base font-bold">
                      {classData.name}
                    </span>
                  </div>
                  <div className="bg-white/30 backdrop-blur-md rounded-xl p-2 border border-white/40">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-white/30 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/40">
                    <span className="font-khmer-body text-white text-xs font-bold">
                      {classData.studentCount} សិស្ស
                    </span>
                  </div>
                  {classData.section && (
                    <div className="bg-white/30 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/40">
                      <span className="font-khmer-body text-white text-xs font-semibold">
                        ផ្នែក: {classData.section}
                      </span>
                    </div>
                  )}
                </div>

                {classData.teacherName && (
                  <div className="mt-2 bg-white/25 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/30">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-white" />
                      <span className="font-khmer-body text-white text-xs font-semibold">
                        {classData.teacherName}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 bg-gradient-to-br from-gray-50 to-white">
              {/* Average Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="font-khmer-body text-sm font-bold text-gray-800">
                    មធ្យមភាគ
                  </span>
                </div>
                <div
                  className={`px-4 py-2 rounded-xl border-2 font-black text-lg ${getScoreColor(
                    classData.averageScore
                  )}`}
                >
                  {classData.averageScore.toFixed(1)}
                </div>
              </div>

              {/* Pass Rate */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-khmer-body text-sm font-bold text-gray-800">
                      អត្រាជាប់
                    </span>
                  </div>
                  <span className="font-khmer-body text-sm font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg">
                    {classData.passedCount}/{classData.studentCount}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${getGradientClass(
                      classData.passPercentage
                    )} rounded-full transition-all duration-700`}
                    style={{ width: `${classData.passPercentage}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-end mt-2">
                  <span className="font-black text-sm text-gray-700">
                    {classData.passPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Gender Breakdown */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                    <p className="font-khmer-body text-xs text-blue-600 font-bold mb-1">
                      ប្រុស
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-blue-700">
                        {classData.maleCount}
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        ({classData.malePassPercentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
                    <p className="font-khmer-body text-xs text-pink-600 font-bold mb-1">
                      ស្រី
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-pink-700">
                        {classData.femaleCount}
                      </span>
                      <span className="text-xs font-bold text-pink-600">
                        ({classData.femalePassPercentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
