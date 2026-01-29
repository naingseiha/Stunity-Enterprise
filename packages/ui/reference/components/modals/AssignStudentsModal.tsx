"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useClasses } from "@/hooks/useClasses";
import { useToast } from "@/hooks/useToast";
import { studentsApi } from "@/lib/api/students";
import {
  UserPlus,
  Users,
  X,
  Check,
  Search,
  Loader2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Filter,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import type { Class } from "@/lib/api/classes";

interface Student {
  id: string;
  studentId?: string;
  khmerName?: string;
  englishName?: string;
  firstName: string;
  lastName: string;
  gender: string;
  email?: string;
  classId?: string;
}

interface AssignStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class;
}

export default function AssignStudentsModal({
  isOpen,
  onClose,
  classData,
}: AssignStudentsModalProps) {
  const { assignStudents } = useClasses();
  const { success, error: showError, warning, ToastContainer } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ NEW: Advanced filtering options
  const [filterMode, setFilterMode] = useState<"unassigned" | "all" | "byClass" | "byGrade">("unassigned");
  const [selectedFilterClass, setSelectedFilterClass] = useState<string>("all");
  const [selectedFilterGrade, setSelectedFilterGrade] = useState<string>("all");
  const [allClasses, setAllClasses] = useState<any[]>([]);

  // Fetch students when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      fetchClasses();
      setSelectedStudentIds([]);
      setSearchTerm("");
      setFilterMode("unassigned");
      setSelectedFilterClass("all");
      setSelectedFilterGrade("all");
    }
  }, [isOpen]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // ✅ Load ALL students (set high limit)
      const response = await studentsApi.getAllLightweight(1, 10000); // Load up to 10,000 students
      // Extract data array from response object
      if (response.success && Array.isArray(response.data)) {
        setStudents(response.data);
        console.log(`⚡ Loaded ${response.data.length} students (all)`);
      } else {
        console.error("❌ API returned non-array data:", response);
        setStudents([]);
        showError("មិនអាចផ្ទុកបញ្ជីសិស្ស • Failed to load students");
      }
    } catch (error) {
      console.error("❌ Error fetching students:", error);
      setStudents([]);
      showError("មិនអាចផ្ទុកបញ្ជីសិស្ស • Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Fetch classes for filtering
  const fetchClasses = async () => {
    try {
      const { classesApi } = await import("@/lib/api/classes");
      const response = await classesApi.getAllLightweight();
      if (response.success && Array.isArray(response.data)) {
        setAllClasses(response.data);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  // ✅ IMPROVED: Advanced filtering logic
  const availableStudents = Array.isArray(students)
    ? students.filter((student) => {
        // Exclude students already in this class
        if (student.classId === classData.id) return false;

        // Apply filter mode
        if (filterMode === "unassigned") {
          return !student.classId;
        } else if (filterMode === "all") {
          return true;
        } else if (filterMode === "byClass") {
          if (selectedFilterClass === "all") return true;
          if (selectedFilterClass === "none") return !student.classId;
          return student.classId === selectedFilterClass;
        } else if (filterMode === "byGrade") {
          if (selectedFilterGrade === "all") return true;
          // Get student's grade from their class
          const studentClass = allClasses.find(c => c.id === student.classId);
          return studentClass?.grade === selectedFilterGrade;
        }
        return true;
      })
    : [];

  // Get students already in this class (with safety check)
  const currentStudents = Array.isArray(students)
    ? students.filter((student) => student.classId === classData.id)
    : [];

  // Apply search filter
  const filteredStudents = availableStudents.filter((student) => {
    const fullName = `${student.khmerName || ""} ${student.englishName || ""} ${
      student.firstName
    } ${student.lastName}`.toLowerCase();
    const studentId = (student.studentId || "").toLowerCase();
    const email = (student.email || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    return (
      fullName.includes(search) ||
      studentId.includes(search) ||
      email.includes(search)
    );
  });

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0) {
      warning("សូមជ្រើសរើសសិស្សយ៉ាងហោចណាស់ម្នាក់!");
      return;
    }

    try {
      setIsSubmitting(true);
      await assignStudents(classData.id, selectedStudentIds);
      success(
        `✅ បានបន្ថែមសិស្ស ${selectedStudentIds.length} នាក់ ចូលក្នុងថ្នាក់ ${classData.name} ដោយជោគជ័យ!`
      );
      setSelectedStudentIds([]);
      setSearchTerm("");
      setFilterMode("unassigned");
      onClose();
    } catch (error: any) {
      showError("❌ " + (error.message || "Failed to assign students"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentsToTransfer = selectedStudentIds.filter((id) => {
    const student = students.find((s) => s.id === id);
    return student?.classId && student.classId !== classData.id;
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-koulen text-gray-900">
                បន្ថែមសិស្សចូលថ្នាក់
              </h2>
              <p className="text-sm text-gray-600">
                {classData.name} • Add Students to Class
              </p>
            </div>
          </div>
        }
        size="large"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-gray-600 mt-4 font-medium">
              កំពុងផ្ទុកបញ្ជីសិស្ស...{" "}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Current Class Stats */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                    សិស្សក្នុងថ្នាក់បច្ចុប្បន្ន
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {currentStudents.length}
                    </span>
                  </h4>
                  {currentStudents.length > 0 ? (
                    <p className="text-sm text-gray-700">
                      {currentStudents.slice(0, 3).map((s, i) => (
                        <span key={s.id}>
                          {s.khmerName || `${s.firstName} ${s.lastName}`}
                          {i < Math.min(2, currentStudents.length - 1) && ", "}
                        </span>
                      ))}
                      {currentStudents.length > 3 && (
                        <span className="text-blue-600 font-semibold">
                          {" "}
                          និងសិស្សផ្សេងទៀត {currentStudents.length - 3} នាក់
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      មិនទាន់មានសិស្ស • No students yet
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ NEW: Advanced Filter Options */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-2.5 rounded-xl">
                    <Filter className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">ច្រោះសិស្ស</h3>
                    <p className="text-xs text-gray-600">Filter Students</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Filter Mode Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    របៀបច្រោះ • Filter Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterMode("unassigned");
                        setSelectedStudentIds([]);
                      }}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                        filterMode === "unassigned"
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        <span>គ្មានថ្នាក់</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterMode("all");
                        setSelectedStudentIds([]);
                      }}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                        filterMode === "all"
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>សិស្សទាំងអស់</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterMode("byClass");
                        setSelectedStudentIds([]);
                      }}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                        filterMode === "byClass"
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>តាមថ្នាក់</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFilterMode("byGrade");
                        setSelectedStudentIds([]);
                      }}
                      className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                        filterMode === "byGrade"
                          ? "bg-purple-600 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>តាមថ្នាក់ទី</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* By Class Dropdown */}
                {filterMode === "byClass" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ជ្រើសរើសថ្នាក់ • Select Class
                    </label>
                    <select
                      value={selectedFilterClass}
                      onChange={(e) => {
                        setSelectedFilterClass(e.target.value);
                        setSelectedStudentIds([]);
                      }}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                    >
                      <option value="all">ថ្នាក់ទាំងអស់ • All Classes</option>
                      <option value="none">គ្មានថ្នាក់ • No Class</option>
                      {allClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* By Grade Dropdown */}
                {filterMode === "byGrade" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ជ្រើសរើសថ្នាក់ទី • Select Grade
                    </label>
                    <select
                      value={selectedFilterGrade}
                      onChange={(e) => {
                        setSelectedFilterGrade(e.target.value);
                        setSelectedStudentIds([]);
                      }}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                    >
                      <option value="all">ថ្នាក់ទីទាំងអស់ • All Grades</option>
                      {[7, 8, 9, 10, 11, 12].map((grade) => (
                        <option key={grade} value={grade.toString()}>
                          ថ្នាក់ទី {grade} • Grade {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Results Count */}
                <div className="bg-blue-50 px-4 py-3 rounded-xl border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900">
                    រកឃើញសិស្ស{" "}
                    <span className="text-lg font-bold text-blue-600">
                      {availableStudents.length}
                    </span>{" "}
                    នាក់
                  </p>
                </div>
              </div>
            </div>
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ, លេខសម្គាល់, ឬអ៊ីមែល..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            {/* Selection Bar */}
            {filteredStudents.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <Check className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-bold text-gray-900">
                    បានជ្រើសរើស{" "}
                    <span className="text-purple-600 text-lg">
                      {selectedStudentIds.length}
                    </span>{" "}
                    / {filteredStudents.length} នាក់
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-white text-purple-600 border-2 border-purple-600 rounded-lg font-bold hover:bg-purple-50 transition-all"
                >
                  {selectedStudentIds.length === filteredStudents.length
                    ? "ដកចេញទាំងអស់"
                    : "ជ្រើសរើសទាំងអស់"}
                </button>
              </div>
            )}

            {/* Students List */}
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-[400px] overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-bold text-lg mb-2">
                      {searchTerm ? "រកមិនឃើញសិស្ស" : "មិនមានសិស្ស"}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {searchTerm
                        ? "សូមព្យាយាមស្វែងរកដោយពាក្យគន្លឹះផ្សេង"
                        : filterMode === "unassigned"
                        ? "សិស្សទាំងអស់មានថ្នាក់រួចហើយ"
                        : "សិស្សទាំងអស់នៅក្នុងថ្នាក់នេះរួចហើយ"}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(
                        student.id
                      );
                      const hasClass =
                        student.classId && student.classId !== classData.id;

                      return (
                        <div
                          key={student.id}
                          onClick={() => handleToggleStudent(student.id)}
                          className={`p-4 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Custom Checkbox */}
                            <div
                              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? "bg-gradient-to-br from-purple-600 to-indigo-600 border-purple-600 scale-110 shadow-md"
                                  : "border-gray-300 hover:border-purple-400"
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-4 h-4 text-white font-bold" />
                              )}
                            </div>

                            {/* Avatar */}
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md ${
                                student.gender === "MALE"
                                  ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                                  : "bg-gradient-to-br from-pink-500 to-rose-500"
                              }`}
                            >
                              {(student.khmerName || student.firstName)
                                ?.charAt(0)
                                .toUpperCase()}
                            </div>

                            {/* Student Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate">
                                {student.khmerName ||
                                  `${student.firstName} ${student.lastName}`}
                              </p>
                              {student.englishName && (
                                <p className="text-sm text-gray-600 truncate">
                                  {student.englishName}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {student.studentId && (
                                  <span className="text-xs text-gray-500 font-medium">
                                    ID: {student.studentId}
                                  </span>
                                )}
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    student.gender === "MALE"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-pink-100 text-pink-700"
                                  }`}
                                >
                                  {student.gender === "MALE" ? "ប្រុស" : "ស្រី"}
                                </span>
                                {hasClass && (
                                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    នឹងផ្ទេរ
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Warning */}
            {studentsToTransfer.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-orange-900 mb-1">
                      ⚠️ ការព្រមាន • Warning
                    </p>
                    <p className="text-sm text-orange-800 leading-relaxed">
                      អ្នកកំពុងផ្ទេរសិស្ស{" "}
                      <span className="font-bold">
                        {studentsToTransfer.length} នាក់
                      </span>{" "}
                      ពីថ្នាក់ផ្សេង។ សិស្សទាំងនេះនឹងត្រូវដកចេញពីថ្នាក់ចាស់
                      ហើយបន្ថែមចូលថ្នាក់ថ្មី។
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                <X className="w-5 h-5" />
                <span>បោះបង់</span>
              </Button>
              <Button
                onClick={handleAssign}
                disabled={selectedStudentIds.length === 0 || isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>កំពុងបន្ថែម... </span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>
                      បន្ថែមសិស្ស
                      {selectedStudentIds.length > 0 &&
                        ` (${selectedStudentIds.length})`}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ToastContainer />
    </>
  );
}
