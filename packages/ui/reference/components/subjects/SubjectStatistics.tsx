import React from "react";
import { BookOpen, CheckCircle, XCircle, TrendingUp } from "lucide-react";

interface SubjectStatisticsProps {
  stats: {
    totalSubjects: number;
    activeSubjects: number;
    inactiveSubjects: number;
    totalHours: number;
  };
}

export default function SubjectStatistics({ stats }: SubjectStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Subjects */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">មុខវិជ្ជាសរុប • Total</p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.totalSubjects}
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Active Subjects */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">សកម្ម • Active</p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.activeSubjects}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Inactive Subjects */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">អសកម្ម • Inactive</p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.inactiveSubjects}
            </p>
          </div>
          <div className="p-3 bg-red-100 rounded-lg">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Total Hours */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">ម៉ោង/សប្តាហ៍ • Hours</p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.totalHours}
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
