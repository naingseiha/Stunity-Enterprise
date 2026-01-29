import React from "react";
import { GraduationCap, Users, BookOpen } from "lucide-react";

interface ClassStatisticsProps {
  stats: {
    totalClasses: number;
    activeClasses: number;
    totalStudents: number;
    totalCapacity: number;
    withTeachers: number;
    averageSize: number;
  };
}

export default function ClassStatistics({ stats }: ClassStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Total Classes */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">គ្រប់គ្រងសរុប • Total</p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.totalClasses}
            </p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <GraduationCap className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* With Classes */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              មានថ្នាក់ • With Classes
            </p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.activeClasses}
            </p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01. 665 6.479A11.952 11.952 0 0012 20.055a11. 952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* No Classes */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              គ្មានថ្នាក់ • No Classes
            </p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.totalClasses - stats.activeClasses}
            </p>
          </div>
          <div className="p-3 bg-orange-100 rounded-lg">
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Subjects */}
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">មុខវិជ្ជា • Subjects</p>
            <p className="text-3xl font-moul text-gray-900">
              {stats.totalStudents}
            </p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <BookOpen className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
