"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import StudentListTab from "@/components/classes/StudentListTab";
import AssignStudentsModal from "@/components/modals/AssignStudentsModal";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/hooks/useToast";
import {
  X,
  Users,
  BookOpen,
  Calendar,
  GraduationCap,
  User,
  Loader2,
  RefreshCw,
  GitBranch,
  Award,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { Class } from "@/lib/api/classes";

interface ClassViewModalProps {
  isOpen: boolean;
  classData: Class | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function ClassViewModal({
  isOpen,
  classData,
  onClose,
  onRefresh,
}: ClassViewModalProps) {
  const { removeStudent, refresh: refreshClasses } = useClasses();
  const { success, error: showError, warning, ToastContainer } = useToast();

  const [activeTab, setActiveTab] = useState<"info" | "students">("students"); // ✅ Default to students tab
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localClassData, setLocalClassData] = useState<Class | null>(classData);

  // Update local data when classData changes
  useEffect(() => {
    setLocalClassData(classData);
  }, [classData]);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("students"); // ✅ Default to students tab to show list
    }
  }, [isOpen]);

  if (!localClassData) return null;

  // Handle remove student
  const handleRemoveStudent = async (studentId: string) => {
    try {
      await removeStudent(localClassData.id, studentId);
      success("✅ បានដកសិស្សចេញពីថ្នាក់ដោយជោគជ័យ!");

      // Refresh class data
      await handleRefresh();
    } catch (error: any) {
      showError("❌ " + (error.message || "Failed to remove student"));
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshClasses();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error("Error refreshing:", error);
      showError("មិនអាចផ្ទុកទិន្នន័យឡើងវិញ");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle import students (placeholder)
  const handleImportStudents = () => {
    warning("មុខងារនេះនឹងត្រូវ implement ជាមួយ CSV/Excel import");
  };

  // Close assign modal and refresh
  const handleAssignModalClose = async () => {
    setShowAssignModal(false);
    await handleRefresh();
  };

  // Get track badge with modern design
  const getTrackBadge = () => {
    const gradeNum = parseInt(localClassData.grade);
    if (gradeNum !== 11 && gradeNum !== 12) return null;

    if (!localClassData.track) {
      return (
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 mb-1">
                ត្រូវកំណត់ផ្លូវសិក្សា
              </p>
              <p className="text-sm text-gray-600">
                ថ្នាក់ទី១១ និងទី១២ ត្រូវជ្រើសរើស វិទ្យាសាស្ត្រ ឬ សង្គម
              </p>
            </div>
            <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-700">
                ⚠ Required
              </p>
            </div>
          </div>
        </div>
      );
    }

    const trackConfig = {
      science: {
        icon: "🧪",
        emoji: "🔬",
        label: "វិទ្យាសាស្ត្រ",
        labelEn: "Science Track",
        gradient: "from-blue-500 to-cyan-500",
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-900",
        badgeBg: "bg-blue-500",
      },
      social: {
        icon: "📚",
        emoji: "🌍",
        label: "សង្គមវិទ្យា",
        labelEn: "Social Studies Track",
        gradient: "from-green-500 to-emerald-500",
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-900",
        badgeBg: "bg-green-500",
      },
    };

    const config =
      trackConfig[localClassData.track as keyof typeof trackConfig];
    if (!config) return null;

    return (
      <div
        className={`bg-white ${config.border} border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`bg-gradient-to-br ${config.gradient} p-4 rounded-xl shadow-md text-white`}
          >
            <span className="text-3xl">{config.icon}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
              ផ្លូវសិក្សា • Academic Track
            </p>
            <p className={`font-bold text-xl ${config.text} flex items-center gap-2`}>
              <span>{config.emoji}</span>
              <span>{config.label}</span>
            </p>
            <p className="text-sm text-gray-600 mt-0.5">{config.labelEn}</p>
          </div>
          <div className={`${config.badgeBg} text-white px-4 py-2 rounded-xl shadow-sm`}>
            <p className="text-xs font-semibold">✓ Active</p>
          </div>
        </div>
      </div>
    );
  };

  const students = localClassData.students || [];
  const studentCount = localClassData._count?.students || students.length;
  const capacityPercentage = localClassData.capacity
    ? Math.round((studentCount / localClassData.capacity) * 100)
    : 0;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-3.5 rounded-2xl shadow-lg ring-4 ring-purple-100">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-koulen text-gray-900 mb-0.5">
                  {localClassData.name}
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  ព័ត៌មានលម្អិតថ្នាក់ • Class Details
                </p>
              </div>
            </div>
            {/* Quick Stats Badge */}
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
                <p className="text-xs text-purple-600 font-semibold mb-0.5">
                  សិស្សសរុប
                </p>
                <p className="text-2xl font-koulen text-purple-700">
                  {studentCount}
                </p>
              </div>
            </div>
          </div>
        }
        size="large"
      >
        <div className="space-y-6">
          {/* Modern Tabs with Pills */}
          <div className="bg-gray-50 p-1.5 rounded-xl inline-flex gap-1">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === "info"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>ព័ត៌មានទូទៅ</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 relative ${
                activeTab === "students"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>បញ្ជីសិស្ស</span>
                <span className="ml-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {studentCount}
                </span>
              </div>
            </button>
          </div>

          {/* Info Tab */}
          {activeTab === "info" && (
            <div className="space-y-6">
              {/* Hero Section - Class Overview */}
              <div className="bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-white bg-opacity-20 backdrop-blur-lg p-4 rounded-xl">
                        <GraduationCap className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm text-white text-opacity-80 mb-1 font-medium">
                          ឈ្មោះថ្នាក់ • Class Name
                        </p>
                        <h2 className="text-3xl font-koulen">{localClassData.name}</h2>
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-20 backdrop-blur-lg px-4 py-3 rounded-xl">
                      <p className="text-xs text-white text-opacity-80 mb-1 text-center">
                        ឆ្នាំសិក្សា
                      </p>
                      <p className="text-xl font-koulen text-center">
                        {localClassData.academicYear}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-xs text-white text-opacity-80 mb-2">
                        ថ្នាក់ទី
                      </p>
                      <p className="text-2xl font-koulen">{localClassData.grade}</p>
                    </div>
                    <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-xs text-white text-opacity-80 mb-2">
                        ផ្នែក
                      </p>
                      <p className="text-2xl font-koulen">
                        {localClassData.section || "គ្មាន"}
                      </p>
                    </div>
                    <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-xs text-white text-opacity-80 mb-2">
                        សិស្ស
                      </p>
                      <p className="text-2xl font-koulen">{studentCount}</p>
                    </div>
                    <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-xs text-white text-opacity-80 mb-2">
                        សមត្ថភាព
                      </p>
                      <p className="text-2xl font-koulen">
                        {localClassData.capacity || "គ្មាន"}
                      </p>
                    </div>
                  </div>

                  {/* Capacity Progress */}
                  {localClassData.capacity && (
                    <div className="mt-6 bg-white bg-opacity-15 backdrop-blur-sm rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">
                          ការបំពេញសមត្ថភាព
                        </span>
                        <span className="text-sm font-bold">
                          {capacityPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-white bg-opacity-20 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            capacityPercentage >= 90
                              ? "bg-yellow-400"
                              : capacityPercentage >= 70
                              ? "bg-green-400"
                              : "bg-blue-400"
                          }`}
                          style={{
                            width: `${Math.min(capacityPercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Track Badge for Grade 11 & 12 - Redesigned */}
              {(parseInt(localClassData.grade) === 11 ||
                parseInt(localClassData.grade) === 12) &&
                getTrackBadge()}

              {/* Teacher Card - Modern Design */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2.5 rounded-xl">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        គ្រូប្រចាំថ្នាក់
                      </h3>
                      <p className="text-xs text-gray-500 font-medium">
                        Class Teacher
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {localClassData.teacher ? (
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {localClassData.teacher.firstName?.charAt(0)}
                        {localClassData.teacher.lastName?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-gray-900 mb-1">
                          {localClassData.teacher.khmerName ||
                            `${localClassData.teacher.firstName} ${localClassData.teacher.lastName}`}
                        </p>
                        {localClassData.teacher.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Award className="w-4 h-4 text-indigo-500" />
                            <span>{localClassData.teacher.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                        <p className="text-xs font-semibold text-green-700">
                          ✓ Assigned
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 py-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                        <AlertCircle className="w-7 h-7 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-600">
                          មិនទាន់កំណត់គ្រូប្រចាំថ្នាក់
                        </p>
                        <p className="text-sm text-gray-500">
                          No class teacher assigned yet
                        </p>
                      </div>
                      <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        <p className="text-xs font-semibold text-amber-700">
                          ⚠ Unassigned
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === "students" && (
            <div>
              <StudentListTab
                students={students}
                classId={localClassData.id}
                loading={isRefreshing}
                onAddStudent={() => setShowAssignModal(true)}
                onImportStudents={handleImportStudents}
                onRemoveStudent={handleRemoveStudent}
              />
            </div>
          )}

          {/* Footer Actions - Modern Design */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{isRefreshing ? "កំពុងផ្ទុក..." : "ផ្ទុកឡើងវិញ"}</span>
            </button>

            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2.5 text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-sm hover:shadow-md transition-all font-semibold"
            >
              <X className="w-4 h-4" />
              <span>បិទ</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Students Modal */}
      {showAssignModal && (
        <AssignStudentsModal
          isOpen={showAssignModal}
          onClose={handleAssignModalClose}
          classData={localClassData}
        />
      )}

      <ToastContainer />
    </>
  );
}
