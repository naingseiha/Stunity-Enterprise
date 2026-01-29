"use client";

import { ParentProfile, ChildWithStats } from "@/lib/api/parent-portal";
import { RefreshCw } from "lucide-react";

interface ParentDashboardTabProps {
  profile: ParentProfile | null;
  children: ChildWithStats[];
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export default function ParentDashboardTab({
  profile,
  children,
  onRefresh,
  isRefreshing,
}: ParentDashboardTabProps) {
  return (
    <div className="space-y-4">
      {/* Welcome Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          ស្វាគមន៍
        </h2>
        <p className="text-lg text-gray-700">
          {profile?.parentInfo.khmerName || "កំពុងផ្ទុក..."}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          កូនចំនួន: {children.length} នាក់
        </p>
      </div>

      {/* Children Cards */}
      {children.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
          <p className="text-gray-600">មិនមានកូនបានភ្ជាប់គណនី</p>
          <p className="text-sm text-gray-500 mt-1">
            No children linked to this account
          </p>
        </div>
      ) : (
        children.map((child) => (
          <div
            key={child.id}
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {child.khmerName}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {child.class?.name || "មិនមានថ្នាក់"}
                </p>
                <p className="text-xs text-gray-500">
                  {child.relationship === "FATHER"
                    ? "ឪពុក"
                    : child.relationship === "MOTHER"
                    ? "ម្តាយ"
                    : child.relationship === "GUARDIAN"
                    ? "អាណាព្យាបាល"
                    : child.relationship}
                  {child.isPrimary && " • ទំនាក់ទំនងចម្បង"}
                </p>
              </div>
              {child.photoUrl && (
                <img
                  src={child.photoUrl}
                  alt={child.khmerName}
                  className="w-16 h-16 rounded-full object-cover ml-3"
                />
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">មធ្យម</p>
                <p className="text-xl font-bold text-blue-600">
                  {child.stats.averageScore !== null
                    ? child.stats.averageScore.toFixed(1)
                    : "-"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Average Score</p>
              </div>

              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-xs text-gray-600 mb-1">វត្តមាន</p>
                <p className="text-xl font-bold text-green-600">
                  {child.stats.attendanceRate !== null
                    ? `${child.stats.attendanceRate.toFixed(0)}%`
                    : "-"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Attendance Rate</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  ពិន្ទុសរុប: {child.stats.totalGrades} មុខវិជ្ជា
                </span>
                <span className="text-gray-600">
                  វត្តមាន: {child.stats.presentDays}/{child.stats.totalDays} ថ្ងៃ
                </span>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <RefreshCw
          className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
        />
        {isRefreshing ? "កំពុងផ្ទុក..." : "ធ្វើបច្ចុប្បន្នភាព"}
      </button>
    </div>
  );
}
