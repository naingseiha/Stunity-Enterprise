"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Users, BookOpen, Award, ChevronRight, GraduationCap } from "lucide-react";
import { dashboardApi, GradeLevelStats } from "@/lib/api/dashboard";

interface ModernMobileDashboardProps {
  currentUser: any;
}

export default function ModernMobileDashboard({
  currentUser,
}: ModernMobileDashboardProps) {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState("7");
  const [gradeStats, setGradeStats] = useState<GradeLevelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadGradeStats();
  }, []);

  const loadGradeStats = async () => {
    try {
      setIsLoading(true);
      const data = await dashboardApi.getGradeLevelStats();
      setGradeStats(data);

      // Auto-select first grade with data
      const gradeWithData = data.grades.find(g => g.totalStudents > 0);
      if (gradeWithData) {
        setSelectedGrade(gradeWithData.grade);
      }
    } catch (error) {
      console.error("Error loading grade stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedGradeData = gradeStats?.grades.find(
    (g) => g.grade === selectedGrade
  );

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/students?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-khmer-body text-gray-600">កំពុងផ្ទុក...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-100">
        <div className="mb-5">
          <p className="font-khmer-body text-sm text-gray-500">ស្វាគមន៍</p>
          <h1 className="font-khmer-title text-2xl text-gray-900 font-bold">
            {currentUser?.firstName || "ផ្ទាំងគ្រប់គ្រង"}
          </h1>
          <p className="font-khmer-body text-xs text-gray-600 mt-1">
            {gradeStats?.currentMonth} {gradeStats?.currentYear}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="ស្វែងរកសិស្ស ឬគ្រូ..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-khmer-body focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            style={{ fontSize: "16px" }}
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Grade Tabs */}
      <div className="bg-white px-6 py-4 border-b border-gray-100 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2">
          {gradeStats?.grades.map((grade) => (
            <button
              key={grade.grade}
              onClick={() => setSelectedGrade(grade.grade)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-khmer-body text-sm font-semibold transition-all ${
                selectedGrade === grade.grade
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ថ្នាក់ {grade.grade}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {selectedGradeData && (
        <div className="p-6 space-y-5">
          {/* Stats Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-khmer-title text-base font-bold text-gray-900">
                ស្ថិតិទូទៅ
              </h2>
              <div className="flex items-center gap-1.5 text-gray-700">
                <Users className="w-4 h-4" />
                <span className="font-bold text-sm">{selectedGradeData.totalStudents}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Pass Rate */}
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-khmer-body text-xs text-gray-600 font-medium">អត្រាជាប់</span>
                </div>
                <p className="font-black text-2xl text-emerald-700">{selectedGradeData.passPercentage.toFixed(0)}%</p>
              </div>

              {/* Average */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-khmer-body text-xs text-gray-600 font-medium">មធ្យមភាគ</span>
                </div>
                <p className="font-black text-2xl text-blue-700">{selectedGradeData.averageScore.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-khmer-title text-base font-bold text-gray-900 mb-4">
              ចែកចាយនិទ្ទេស
            </h3>
            <div className="space-y-3">
              {[
                { letter: "A", percent: selectedGradeData.gradeDistribution.A, color: "bg-emerald-500" },
                { letter: "B", percent: selectedGradeData.gradeDistribution.B, color: "bg-blue-500" },
                { letter: "C", percent: selectedGradeData.gradeDistribution.C, color: "bg-amber-500" },
                { letter: "D", percent: selectedGradeData.gradeDistribution.D, color: "bg-orange-500" },
                { letter: "E", percent: selectedGradeData.gradeDistribution.E, color: "bg-rose-500" },
              ].map((grade) => (
                <div key={grade.letter} className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${grade.color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                    {grade.letter}
                  </div>
                  <div className="flex-1">
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${grade.color} transition-all duration-500`}
                        style={{ width: `${grade.percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-sm text-gray-700 w-12 text-right">
                    {grade.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-khmer-title text-base font-bold text-gray-900">
                ថ្នាក់រៀន
              </h3>
              <span className="font-khmer-body text-xs text-gray-600 font-medium">
                {selectedGradeData.totalClasses} ថ្នាក់
              </span>
            </div>

            <div className="space-y-3">
              {selectedGradeData.classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => router.push(`/grade-entry?classId=${cls.id}`)}
                  className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl p-4 transition-all text-left active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-khmer-body font-bold text-gray-900">
                        {cls.name}
                      </h4>
                      <p className="font-khmer-body text-xs text-gray-500 mt-1">
                        គ្រូ: {cls.teacherName}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-4 text-xs mb-3">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">{cls.studentCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <BookOpen className="w-4 h-4" />
                      <span className="font-medium">
                        {cls.completedSubjects}/{cls.totalSubjects}
                      </span>
                    </div>
                    <div className={`ml-auto px-3 py-1 rounded-lg font-semibold ${
                      cls.averageScore >= 80
                        ? "bg-emerald-100 text-emerald-700"
                        : cls.averageScore >= 70
                        ? "bg-blue-100 text-blue-700"
                        : cls.averageScore >= 50
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                    }`}>
                      {cls.averageScore.toFixed(1)}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cls.completionPercentage === 100
                          ? "bg-emerald-500"
                          : cls.completionPercentage >= 75
                          ? "bg-blue-500"
                          : cls.completionPercentage >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                      style={{ width: `${cls.completionPercentage}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
