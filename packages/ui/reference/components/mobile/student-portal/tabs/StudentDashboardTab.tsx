"use client";

import {
  User,
  BookOpen,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  RefreshCw,
  LogOut,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  StudentProfile,
  GradesResponse,
  AttendanceResponse,
} from "@/lib/api/student-portal";

const ROLE_LABELS = {
  GENERAL: "សិស្សទូទៅ",
  CLASS_LEADER: "ប្រធានថ្នាក់",
  VICE_LEADER_1: "អនុប្រធានទី១",
  VICE_LEADER_2: "អនុប្រធានទី២",
};

interface StudentDashboardTabProps {
  profile: StudentProfile | null;
  gradesData: GradesResponse | null;
  attendanceData: AttendanceResponse | null;
  studentName: string;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function StudentDashboardTab({
  profile,
  gradesData,
  attendanceData,
  studentName,
  onLogout,
  onRefresh,
  isRefreshing,
}: StudentDashboardTabProps) {
  const student = profile?.student;
  const roleLabel = student?.studentRole
    ? ROLE_LABELS[student.studentRole as keyof typeof ROLE_LABELS] ||
      "សិស្សទូទៅ"
    : "សិស្សទូទៅ";

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl shadow-2xl p-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-3">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-2xl">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-indigo-100 text-sm mb-1">សួស្តី,</p>
              <h1 className="text-xl font-bold text-white leading-tight">
                {studentName}
              </h1>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-white text-sm font-medium">
                {student?.class?.name || "N/A"}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="text-white text-sm font-medium">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div>
        <h1 className="text-base font-bold text-gray-900 mb-3 px-1">
          ស្ថិតិទូទៅ
        </h1>

        {/* Info Banner - Show when no grades are available */}
        {gradesData && gradesData.grades && gradesData.grades.length === 0 && (
          <>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm p-4 border-2 border-blue-200 mb-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-xl shrink-0">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-sm font-bold text-blue-900 mb-1">
                    កំពុងរង់ចាំការបញ្ចូលពិន្ទុ
                  </h1>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    គ្រូមិនទាន់បញ្ចូលពិន្ទុសម្រាប់ខែនេះទេ។
                    សូមត្រឡប់មកមើលនៅពេលក្រោយ។
                  </p>
                </div>
              </div>
            </div>

            {/* Score Import Progress Indicator */}
            <div className="bg-white rounded-2xl shadow-sm p-4 border-2 border-gray-200 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-100 p-2 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">
                    ស្ថានភាពការបញ្ចូលពិន្ទុ
                  </h4>
                  <p className="text-xs text-gray-600">Score Import Status</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    ចំនួនមុខវិជ្ជាដែលបានបញ្ចូល
                  </span>
                  <span className="font-bold text-indigo-600">0 មុខវិជ្ជា</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: "0%" }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-center pt-1">
                  សូមរង់ចាំគ្រូបញ្ចូលពិន្ទុ...
                </p>
              </div>
            </div>
          </>
        )}

        {/* Show progress when some but not all grades are imported */}
        {gradesData &&
          gradesData.grades &&
          gradesData.grades.length > 0 &&
          gradesData.statistics.totalGrades > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-sm p-4 border-2 border-green-200 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h1 className="text-sm font-bold text-green-900">
                    ការបញ្ចូលពិន្ទុបច្ចុប្បន្ន
                  </h1>
                  <p className="text-xs text-green-700">
                    Current Import Progress
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-700">
                    ចំនួនមុខវិជ្ជាដែលបានបញ្ចូល
                  </span>
                  <span className="font-bold text-green-600">
                    {gradesData.grades.length} មុខវិជ្ជា
                  </span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (gradesData.grades.length /
                          Math.max(gradesData.grades.length, 1)) *
                          100
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-green-700 text-center pt-1">
                  ✓ ពិន្ទុកំពុងត្រូវបានបញ្ចូល
                </p>
              </div>
            </div>
          )}

        {/* Stats Grid - Always show with indicators */}
        <div className="grid grid-cols-2 gap-3">
          {/* Average Score Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-4 relative overflow-hidden">
            {gradesData &&
              gradesData.grades &&
              gradesData.grades.length === 0 && (
                <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="bg-white bg-opacity-90 rounded-lg px-3 py-1.5">
                    <p className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      កំពុងរង់ចាំ
                    </p>
                  </div>
                </div>
              )}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-indigo-100 font-medium">មធ្យម</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {gradesData?.statistics?.averageScore?.toFixed(1) || "0.0"}
            </p>
            <p className="text-xs text-indigo-100 mt-1">មធ្យមភាគបច្ចុប្បន្ន</p>
          </div>

          {/* Attendance Rate Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-4 relative overflow-hidden">
            {attendanceData?.statistics?.totalDays === 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-white bg-opacity-90 rounded-lg px-3 py-1.5">
                  <p className="text-xs font-bold text-green-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    កំពុងរង់ចាំ
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-green-100 font-medium">
                វត្តមាន
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {attendanceData?.statistics?.attendanceRate !== undefined
                ? `${attendanceData.statistics.attendanceRate.toFixed(0)}%`
                : "0%"}
            </p>
            <p className="text-xs text-green-100 mt-1">អត្រាមករៀន</p>
          </div>

          {/* Total Subjects Card */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg p-4 relative overflow-hidden">
            {gradesData &&
              gradesData.grades &&
              gradesData.grades.length === 0 && (
                <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="bg-white bg-opacity-90 rounded-lg px-3 py-1.5">
                    <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      កំពុងរង់ចាំ
                    </p>
                  </div>
                </div>
              )}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-blue-100 font-medium">
                មុខវិជ្ជា
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {gradesData?.grades?.length || "0"}
            </p>
            <p className="text-xs text-blue-100 mt-1">មុខវិជ្ជាបញ្ចូលរួច</p>
          </div>

          {/* Total Days Card */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg p-4 relative overflow-hidden">
            {attendanceData?.statistics?.totalDays === 0 && (
              <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-white bg-opacity-90 rounded-lg px-3 py-1.5">
                  <p className="text-xs font-bold text-orange-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    កំពុងរង់ចាំ
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-white bg-opacity-20 p-2 rounded-xl">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-orange-100 font-medium">
                អវត្តមាន
              </span>
            </div>
            <p className="text-3xl font-bold text-white">
              {attendanceData?.statistics?.totalPresent || "0"}
            </p>
            <p className="text-xs text-orange-100 mt-1">អត្រាឈប់</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h1 className="text-base font-bold text-gray-900 mb-3 px-1">
          សកម្មភាព
        </h1>
        <div className="space-y-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4 flex items-center gap-4 hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <div className="bg-indigo-100 p-3 rounded-xl">
              <RefreshCw
                className={`w-6 h-6 text-indigo-600 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-900">បន្ទាន់សម័យទិន្នន័យ</p>
              <p className="text-sm text-gray-600">Refresh Data</p>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="w-full bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4 flex items-center gap-4 hover:border-red-300 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="bg-red-100 p-3 rounded-xl">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-900">ចាកចេញ</p>
              <p className="text-sm text-gray-600">Logout</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
