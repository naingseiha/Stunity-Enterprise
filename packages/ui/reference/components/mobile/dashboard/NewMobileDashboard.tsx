"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Sparkles } from "lucide-react";
import SearchBar from "./SearchBar";
import GradeSelector from "./GradeSelector";
import GradeStatsCards from "./GradeStatsCards";
import ClassCards from "./ClassCards";
import { dashboardApi, GradeLevelStats } from "@/lib/api/dashboard";

interface NewMobileDashboardProps {
  currentUser: any;
}

export default function NewMobileDashboard({
  currentUser,
}: NewMobileDashboardProps) {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState("7");
  const [gradeStats, setGradeStats] = useState<GradeLevelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGradeStats();
  }, []);

  const loadGradeStats = async () => {
    try {
      setIsLoading(true);
      const data = await dashboardApi.getGradeLevelStats();
      setGradeStats(data);
    } catch (error) {
      console.error("Error loading grade stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedGradeData = gradeStats?.grades.find(
    (g) => g.grade === selectedGrade
  );

  const gradeCounts = gradeStats?.grades.reduce((acc, grade) => {
    acc[grade.grade] = grade.totalStudents;
    return acc;
  }, {} as { [key: string]: number });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-b-[2.5rem] shadow-2xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 p-6 pb-8">
          {/* Welcome Message */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-khmer-body text-white/90 text-xs font-semibold uppercase tracking-wide">
                ផ្ទាំងគ្រប់គ្រង
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="font-khmer-title text-3xl text-white drop-shadow-lg">
                ស្វាគមន៍!
              </h1>
              <Sparkles className="w-6 h-6 text-yellow-300" />
            </div>
            <p className="font-khmer-body text-white/95 text-base font-medium">
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="font-khmer-body text-white/80 text-sm mt-1">
              {gradeStats?.currentMonth} {gradeStats?.currentYear}
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar />
        </div>

        {/* Wave decoration at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-8"
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              opacity=".25"
              fill="currentColor"
              className="text-white"
            ></path>
            <path
              d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
              opacity=".5"
              fill="currentColor"
              className="text-white"
            ></path>
            <path
              d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
              fill="currentColor"
              className="text-white"
            ></path>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6 -mt-4">
        {/* Grade Selector */}
        {!isLoading && (
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
            <GradeSelector
              selectedGrade={selectedGrade}
              onGradeChange={setSelectedGrade}
              gradeCounts={gradeCounts}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-khmer-body text-gray-500 font-medium">
                កំពុងផ្ទុកទិន្នន័យ...
              </p>
            </div>
          </div>
        )}

        {/* Selected Grade Content */}
        {!isLoading && selectedGradeData && (
          <>
            {/* Quick Stats Header */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <h2 className="font-khmer-title text-lg font-bold text-gray-800">
                      ថ្នាក់ទី {selectedGrade}
                    </h2>
                  </div>
                  <p className="font-khmer-body text-sm text-gray-600">
                    {selectedGradeData.totalStudents} សិស្ស ក្នុង{" "}
                    {selectedGradeData.totalClasses} ថ្នាក់
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-purple-200">
                    <p className="font-khmer-body text-xs text-gray-600 font-medium">
                      មធ្យមភាគទូទៅ
                    </p>
                    <p className="font-black text-2xl text-purple-700">
                      {selectedGradeData.averageScore.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grade Statistics Cards */}
            <GradeStatsCards
              stats={{
                totalStudents: selectedGradeData.totalStudents,
                totalClasses: selectedGradeData.totalClasses,
                averageScore: selectedGradeData.averageScore,
                passPercentage: selectedGradeData.passPercentage,
                passCount: selectedGradeData.passCount,
                failCount: selectedGradeData.failCount,
                gradeDistribution: selectedGradeData.gradeDistribution,
                subjectCompletionPercentage:
                  selectedGradeData.subjectCompletionPercentage,
              }}
            />

            {/* Class Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
              <ClassCards
                classes={selectedGradeData.classes}
                selectedGrade={selectedGrade}
              />
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !selectedGradeData && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-12 h-12 text-gray-400" />
            </div>
            <p className="font-khmer-body text-gray-500 font-medium text-lg">
              មិនមានទិន្នន័យ
            </p>
            <p className="font-khmer-body text-gray-400 text-sm mt-2">
              សូមពិនិត្យម្តងទៀតនៅពេលក្រោយ
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
