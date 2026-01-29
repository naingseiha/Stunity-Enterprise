"use client";

import { Users, BookOpen, TrendingUp, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClassData {
  id: string;
  name: string;
  section: string;
  studentCount: number;
  totalSubjects: number;
  completedSubjects: number;
  completionPercentage: number;
  averageScore: number;
}

interface ClassCardsProps {
  classes: ClassData[];
  selectedGrade: string;
}

export default function ClassCards({ classes, selectedGrade }: ClassCardsProps) {
  const router = useRouter();

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return "from-green-500 to-emerald-500";
    if (percentage >= 60) return "from-blue-500 to-indigo-500";
    if (percentage >= 40) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-rose-500";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 70) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (score >= 50) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Users className="w-10 h-10 text-gray-400" />
        </div>
        <p className="font-khmer-body text-gray-500 font-medium">
          មិនមានថ្នាក់រៀនសម្រាប់ថ្នាក់ទី {selectedGrade}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-khmer-title text-sm font-bold text-gray-700">
          ថ្នាក់រៀនទាំងអស់
        </h3>
        <span className="font-khmer-body text-xs text-gray-500 font-medium">
          {classes.length} ថ្នាក់
        </span>
      </div>

      {/* Horizontal Scrollable Class Cards */}
      <div className="overflow-x-auto hide-scrollbar -mx-4 px-4">
        <div className="flex gap-4 pb-2">
          {classes.map((classData) => (
            <button
              key={classData.id}
              onClick={() => router.push(`/classes/${classData.id}`)}
              className="flex-shrink-0 w-72 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 group"
            >
              {/* Header with gradient */}
              <div
                className={`bg-gradient-to-r ${getCompletionColor(
                  classData.completionPercentage
                )} p-4 relative overflow-hidden`}
              >
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full"></div>
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="bg-white/25 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/30">
                      <span className="font-khmer-title text-white text-sm font-bold">
                        {classData.name}
                      </span>
                    </div>
                    <div className="bg-white/25 backdrop-blur-sm rounded-lg p-1.5 border border-white/30">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-white/25 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
                      <span className="font-khmer-body text-white text-xs font-semibold">
                        {classData.studentCount} សិស្ស
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                {/* Average Score */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-khmer-body text-xs font-semibold text-gray-700">
                      មធ្យមភាគថ្នាក់
                    </span>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-lg border font-black text-sm ${getScoreColor(
                      classData.averageScore
                    )}`}
                  >
                    {classData.averageScore.toFixed(1)}
                  </div>
                </div>

                {/* Subject Completion */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="font-khmer-body text-xs font-semibold text-gray-700">
                        បញ្ចូលពិន្ទុ
                      </span>
                    </div>
                    <span className="font-khmer-body text-xs font-bold text-gray-600">
                      {classData.completedSubjects}/{classData.totalSubjects}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getCompletionColor(
                        classData.completionPercentage
                      )} rounded-full transition-all duration-700`}
                      style={{ width: `${classData.completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-end mt-1">
                    <span className="font-black text-xs text-gray-600">
                      {classData.completionPercentage}%
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                {classData.completionPercentage === 100 && (
                  <div className="flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded-lg py-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-khmer-body text-xs font-bold text-green-700">
                      បានបញ្ចូលពិន្ទុគ្រប់មុខវិជ្ជា
                    </span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
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
    </div>
  );
}
