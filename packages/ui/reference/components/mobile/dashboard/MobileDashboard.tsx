"use client";

import { useRouter } from "next/navigation";
import { DashboardStats } from "@/lib/api/dashboard";
import CollapsibleSection from "../shared/CollapsibleSection";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  BarChart3,
  CheckCircle2,
  Activity,
  Award,
  TrendingUp,
} from "lucide-react";
import { SimpleBarChart, SimplePieChart } from "@/components/ui/SimpleBarChart";
import { SkeletonChart } from "@/components/ui/LoadingSkeleton";

interface MobileDashboardProps {
  currentUser: any;
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    studentsWithClass: number;
    teachersWithClass: number;
    activeSubjects: number;
  };
  completionRate: {
    students: number;
    teachers: number;
  };
  dashboardStats: DashboardStats | null;
  isLoadingStats: boolean;
}

export default function MobileDashboard({
  currentUser,
  stats,
  completionRate,
  dashboardStats,
  isLoadingStats,
}: MobileDashboardProps) {
  const router = useRouter();

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Welcome Header - Simplified */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-lg p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-khmer-body text-white/80 text-xs font-semibold">
              ផ្ទាំងគ្រប់គ្រង
            </span>
          </div>
          <h1 className="font-khmer-title text-2xl text-white mb-1 drop-shadow-lg">
            ស្វាគមន៍, {currentUser?.firstName}!
          </h1>
          <p className="font-khmer-body text-white/90 text-sm font-medium">
            ទិដ្ឋភាពទូទៅនៃប្រព័ន្ធគ្រប់គ្រងសាលា
          </p>
        </div>
      </div>

      {/* Key Stats - Vertical Cards */}
      <div className="space-y-3">
        {/* Students Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-khmer-body text-xs text-gray-500 font-bold">
                  សិស្ស
                </p>
                <p className="text-2xl font-koulen text-gray-900">
                  {stats.totalStudents}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-khmer-body text-xs text-gray-500 font-medium">
                បានចុះឈ្មោះ
              </p>
              <p className="text-sm font-bold text-blue-600">
                {stats.studentsWithClass}
              </p>
            </div>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-khmer-body text-xs text-gray-500 font-bold">
                  គ្រូបង្រៀន
                </p>
                <p className="text-2xl font-koulen text-gray-900">
                  {stats.totalTeachers}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-khmer-body text-xs text-gray-500 font-medium">
                បានចាត់តាំង
              </p>
              <p className="text-sm font-bold text-green-600">
                {stats.teachersWithClass}
              </p>
            </div>
          </div>
        </div>

        {/* Classes Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-khmer-body text-xs text-gray-500 font-bold">
                  ថ្នាក់រៀន
                </p>
                <p className="text-2xl font-koulen text-gray-900">
                  {stats.totalClasses}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-khmer-body text-xs text-gray-500 font-medium">
                ថ្នាក់សកម្ម
              </p>
              <p className="text-sm font-bold text-purple-600">
                {stats.totalClasses}
              </p>
            </div>
          </div>
        </div>

        {/* Subjects Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-khmer-body text-xs text-gray-500 font-bold">
                  មុខវិជ្ជា
                </p>
                <p className="text-2xl font-koulen text-gray-900">
                  {stats.totalSubjects}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-khmer-body text-xs text-gray-500 font-medium">
                សកម្ម
              </p>
              <p className="text-sm font-bold text-orange-600">
                {stats.activeSubjects}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bars - Collapsible */}
      <CollapsibleSection title="វឌ្ឍនភាពការចុះឈ្មោះ" defaultOpen={true}>
        <div className="space-y-4">
          {/* Student Enrollment Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-khmer-body text-sm text-gray-600 font-medium">
                សិស្សបានចុះឈ្មោះ
              </span>
              <span className="font-bold text-gray-900">
                {stats.studentsWithClass} / {stats.totalStudents}
              </span>
            </div>
            <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${completionRate.students}%` }}
              ></div>
            </div>
            <p className="text-right text-xs font-bold text-blue-600 mt-1">
              {completionRate.students.toFixed(1)}%
            </p>
          </div>

          {/* Teacher Assignment Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-khmer-body text-sm text-gray-600 font-medium">
                គ្រូបានចាត់តាំង
              </span>
              <span className="font-bold text-gray-900">
                {stats.teachersWithClass} / {stats.totalTeachers}
              </span>
            </div>
            <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-700"
                style={{ width: `${completionRate.teachers}%` }}
              ></div>
            </div>
            <p className="text-right text-xs font-bold text-green-600 mt-1">
              {completionRate.teachers.toFixed(1)}%
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Analytics - Collapsible */}
      {dashboardStats && (
        <CollapsibleSection title="ការវិភាគ" defaultOpen={false}>
          {isLoadingStats ? (
            <SkeletonChart />
          ) : (
            <div className="space-y-4">
              {/* Recent Activity */}
              <div>
                <h4 className="font-khmer-body text-sm font-bold text-gray-700 mb-3">
                  សកម្មភាពថ្មីៗ (៧ ថ្ងៃ)
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-khmer-body text-xs font-bold text-gray-900">
                          ពិន្ទុថ្មី
                        </p>
                        <p className="font-khmer-body text-xs text-gray-600">
                          ពិន្ទុបានកត់ត្រា
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-koulen text-blue-600">
                      {dashboardStats.recentActivity.recentGradeEntries}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-khmer-body text-xs font-bold text-gray-900">
                          វត្តមាន
                        </p>
                        <p className="font-khmer-body text-xs text-gray-600">
                          វត្តមានថ្មីបានកត់ត្រា
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-koulen text-green-600">
                      {dashboardStats.recentActivity.recentAttendanceRecords}
                    </span>
                  </div>
                </div>
              </div>

              {/* Charts - Simplified */}
              {dashboardStats.classDistribution && (
                <div>
                  <h4 className="font-khmer-body text-sm font-bold text-gray-700 mb-3">
                    ចំនួនសិស្សក្នុងថ្នាក់
                  </h4>
                  <SimpleBarChart
                    data={dashboardStats.classDistribution.map((item) => ({
                      name: item.name,
                      value: item.studentCount,
                    }))}
                    title=""
                    color="#8b5cf6"
                  />
                </div>
              )}

              {dashboardStats.gradeDistribution && (
                <div>
                  <h4 className="font-khmer-body text-sm font-bold text-gray-700 mb-3">
                    ការចែកចាយពិន្ទុ
                  </h4>
                  <SimpleBarChart
                    data={dashboardStats.gradeDistribution.map((item) => ({
                      name: item.grade,
                      value: item.count,
                    }))}
                    title=""
                    color="#3b82f6"
                  />
                </div>
              )}

              {dashboardStats.topPerformingClasses &&
                dashboardStats.topPerformingClasses.length > 0 && (
                  <div>
                    <h4 className="font-khmer-body text-sm font-bold text-gray-700 mb-3">
                      ថ្នាក់ល្អប្រសើរ
                    </h4>
                    <div className="space-y-2">
                      {dashboardStats.topPerformingClasses
                        .slice(0, 5)
                        .map((classItem, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg">
                                <span className="text-white font-black text-sm">
                                  {index + 1}
                                </span>
                              </div>
                              <span className="font-khmer-body text-sm font-bold text-gray-900">
                                {classItem.className}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-yellow-600" />
                              <span className="text-lg font-black text-yellow-600">
                                {classItem.averageScore.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
