"use client";

import React from "react";
import { Trophy, Award, Medal, Star, Users } from "lucide-react";

interface StudentData {
  studentId: string;
  studentName: string;
  className?: string;
  gender: string;
  totalScore: string;
  average: string;
  gradeLevel: string;
  rank: number;
  absent: number;
  permission: number;
}

interface StudentResultCardProps {
  student: StudentData;
  index: number;
}

const getGradeColor = (gradeLevel: string) => {
  const colors: Record<string, string> = {
    A: "from-green-500 to-emerald-500",
    B: "from-blue-500 to-indigo-500",
    C: "from-yellow-500 to-orange-500",
    D: "from-orange-500 to-red-500",
    E: "from-red-500 to-rose-500",
    F: "from-gray-500 to-gray-600",
  };
  return colors[gradeLevel] || "from-gray-400 to-gray-500";
};

const getRankBadge = (rank: number) => {
  if (rank === 1)
    return {
      icon: <Trophy className="w-5 h-5" />,
      color: "from-yellow-400 to-orange-500",
      text: "text-yellow-900",
      glow: "shadow-yellow-300/50",
      borderColor: "border-l-yellow-400",
    };
  if (rank === 2)
    return {
      icon: <Medal className="w-5 h-5" />,
      color: "from-gray-300 to-gray-400",
      text: "text-gray-900",
      glow: "shadow-gray-300/50",
      borderColor: "border-l-gray-400",
    };
  if (rank === 3)
    return {
      icon: <Award className="w-5 h-5" />,
      color: "from-orange-300 to-orange-400",
      text: "text-orange-900",
      glow: "shadow-orange-300/50",
      borderColor: "border-l-orange-400",
    };
  if (rank === 4)
    return {
      icon: <Star className="w-4 h-4" />,
      color: "from-blue-300 to-blue-400",
      text: "text-blue-900",
      glow: "shadow-blue-300/40",
      borderColor: "border-l-blue-400",
    };
  if (rank === 5)
    return {
      icon: <Star className="w-4 h-4" />,
      color: "from-purple-300 to-purple-400",
      text: "text-purple-900",
      glow: "shadow-purple-300/40",
      borderColor: "border-l-purple-400",
    };
  return {
    icon: <Star className="w-4 h-4" />,
    color: "from-gray-200 to-gray-300",
    text: "text-gray-700",
    glow: "shadow-gray-200/30",
    borderColor: "border-l-gray-200",
  };
};

// ✅ Memoized StudentResultCard - Prevents unnecessary re-renders
const StudentResultCard = React.memo<StudentResultCardProps>(
  ({ student, index }) => {
    const rankBadge = getRankBadge(student.rank);
    const isTop5 = student.rank <= 5;

    return (
      <div
        className={`group relative bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.1),0_12px_32px_rgba(0,0,0,0.12)] border-l-4 ${rankBadge.borderColor} border-y border-r border-gray-100/80 p-4 overflow-hidden transition-all duration-300 active:scale-[0.99]`}
      >
        {/* Subtle Background Glow for Top 5 */}
        {isTop5 && (
          <div
            className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${rankBadge.color} opacity-[0.06] rounded-full blur-2xl`}
          ></div>
        )}

        <div className="relative z-10">
          {/* Top Row: Rank Badge + Name + Grade Badge */}
          <div className="flex items-center gap-3 mb-3">
            {/* Rank Badge - Left Side, Larger & More Prominent */}
            <div
              className={`relative w-[60px] h-12 bg-gradient-to-br ${rankBadge.color} rounded-[14px] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] ${rankBadge.glow} flex-shrink-0 transform transition-transform group-hover:scale-105`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-[14px]"></div>
              {isTop5 ? (
                <div className="flex items-center gap-1.5 relative z-10 px-1">
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {rankBadge.icon}
                  </div>
                  <p
                    className={`font-koulen text-xl ${rankBadge.text} leading-none font-bold`}
                  >
                    {student.rank}
                  </p>
                </div>
              ) : (
                <p
                  className={`font-koulen text-2xl ${rankBadge.text} font-bold relative z-10`}
                >
                  {student.rank}
                </p>
              )}
            </div>

            {/* Name Section - Center, Larger Text */}
            <div className="flex-1 min-w-0">
              <h1 className="font-koulen text-md font-bold text-gray-900 truncate leading-tight mb-0.5">
                {student.studentName}
              </h1>
              {/* Class Badge Under Name */}
              {student.className && (
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/50 text-indigo-700 text-[10px] font-koulen shadow-sm">
                  <Users className="w-2.5 h-2.5 mr-1" />
                  {student.className}
                </div>
              )}
            </div>

            {/* Grade Badge - Right Side, Larger */}
            <div
              className={`relative w-12 h-12 rounded-[14px] bg-gradient-to-br ${getGradeColor(
                student.gradeLevel
              )} flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.2)] flex-shrink-0 transform transition-transform group-hover:scale-105`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent rounded-[14px]"></div>
              <span className="text-white font-koulen text-2xl font-bold relative z-10">
                {student.gradeLevel}
              </span>
            </div>
          </div>

          {/* Stats Grid: 4 Columns - More Spacious */}
          <div className="grid grid-cols-4 gap-2">
            {/* Average Box - Most Important */}
            <div className="relative bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 border-2 border-indigo-200/70 rounded-[12px] p-2 shadow-md overflow-hidden">
              <div className="absolute top-0 right-0 w-10 h-10 bg-indigo-300/30 rounded-full blur-xl"></div>
              <p className="font-battambang text-[9px] text-indigo-600 font-bold mb-1 relative z-10">
                មធ្យម
              </p>
              <p className="font-koulen text-xl text-indigo-700 leading-none relative z-10 font-bold">
                {student.average}
              </p>
            </div>

            {/* Total Score Box */}
            <div className="relative bg-gradient-to-br from-orange-50 via-orange-50/80 to-amber-50 border-2 border-orange-100/60 rounded-[12px] p-2 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-orange-200/30 rounded-full blur-lg"></div>
              <p className="font-battambang text-[9px] text-orange-600 font-bold mb-1 relative z-10">
                សរុប
              </p>
              <p className="font-battambang text-[16px] font-extrabold text-orange-700 leading-none relative z-10">
                {student.totalScore}
              </p>
            </div>

            {/* Absent Box */}
            <div className="relative bg-gradient-to-br from-red-50 via-red-50/80 to-rose-50 border-2 border-red-100/60 rounded-[12px] p-2 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-red-200/30 rounded-full blur-lg"></div>
              <p className="font-battambang text-[9px] text-red-600 font-bold mb-1 relative z-10">
                អត់ច្បាប់
              </p>
              <p className="font-koulen text-lg text-red-700 leading-none relative z-10 font-bold">
                {student.absent}
              </p>
            </div>

            {/* Permission Box */}
            <div className="relative bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50 border-2 border-amber-100/60 rounded-[12px] p-2 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-amber-200/30 rounded-full blur-lg"></div>
              <p className="font-battambang text-[9px] text-amber-600 font-bold mb-1 relative z-10">
                មានច្បាប់
              </p>
              <p className="font-koulen text-lg text-amber-700 leading-none relative z-10 font-bold">
                {student.permission}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
  // ✅ Custom comparison function - only re-render if these props change
  (prevProps, nextProps) => {
    return (
      prevProps.student.studentId === nextProps.student.studentId &&
      prevProps.student.rank === nextProps.student.rank &&
      prevProps.student.average === nextProps.student.average &&
      prevProps.student.totalScore === nextProps.student.totalScore &&
      prevProps.student.absent === nextProps.student.absent &&
      prevProps.student.permission === nextProps.student.permission
    );
  }
);

StudentResultCard.displayName = "StudentResultCard";

export default StudentResultCard;
