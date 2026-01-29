"use client";

import { useState, useEffect } from "react";
import { studentsApi } from "@/lib/api/students";
import { classesApi, Class } from "@/lib/api/classes";
import StudentDetailView from "./StudentDetailView";
import StudentEditForm from "./StudentEditForm";
import {
  X,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Save,
  ArrowLeftRight,
  AlertTriangle,
  Check,
  School,
  UserX,
  ChevronRight,
  Info,
  UserPlus,
} from "lucide-react";

interface StudentModalProps {
  student: any | null;
  mode: "view" | "edit" | "create";
  onClose: () => void;
  onUpdate: () => void;
}

export default function StudentModal({
  student: initialStudent,
  mode: initialMode,
  onClose,
  onUpdate,
}: StudentModalProps) {
  const [mode, setMode] = useState<"view" | "edit" | "create">(initialMode);
  const [student, setStudent] = useState(initialStudent);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangeClassModal, setShowChangeClassModal] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [changingClass, setChangingClass] = useState(false);

  // ✅ Load full student data when modal opens (skip for create mode)
  useEffect(() => {
    if (initialMode !== "create" && initialStudent?.id) {
      loadFullStudentData();
    }
    loadClasses();
  }, [initialStudent?.id, initialMode]);

  const loadFullStudentData = async () => {
    try {
      setLoading(true);
      const fullData = await studentsApi.getById(initialStudent.id);
      setStudent(fullData);
      setSelectedClassId(fullData.classId || "");
    } catch (error) {
      console.error("Failed to load student:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const allClasses = await classesApi.getAll();
      setClasses(allClasses);
    } catch (error) {
      console.error("Failed to load classes:", error);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleSave = async (updatedData: Partial<any>) => {
    try {
      setSaving(true);

      if (mode === "create") {
        // Create new student
        await studentsApi.create(updatedData as any);
        onUpdate();

        // ✅ Toast notification
        const toast = document.createElement("div");
        toast.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[100] animate-in slide-in-from-top-2 duration-300";
        toast.innerHTML = `
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="font-bold">បន្ថែមសិស្សបានជោគជ័យ!</span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);

        handleClose();
      } else {
        // Update existing student
        await studentsApi.update(student.id, updatedData as any);
        await loadFullStudentData();
        onUpdate();
        setMode("view");

        // ✅ Toast notification
        const toast = document.createElement("div");
        toast.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[100] animate-in slide-in-from-top-2 duration-300";
        toast.innerHTML = `
          <div class="flex items-center gap-3">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="font-bold">រក្សាទុកទិន្នន័យបានជោគជ័យ! </span>
          </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    } catch (error: any) {
      console.error("Failed to save student:", error);
      alert(`❌ កំហុស: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await studentsApi.delete(student.id);
      onUpdate();

      // ✅ Success toast
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[100]";
      toast.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="font-bold">លុបសិស្សបានជោគជ័យ!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);

      handleClose();
    } catch (error: any) {
      console.error("Failed to delete student:", error);
      alert(`❌ កំហុស: ${error.message}`);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangeClass = async () => {
    if (!selectedClassId) {
      alert("❌ សូមជ្រើសរើសថ្នាក់!");
      return;
    }

    if (selectedClassId === student.classId) {
      alert("ℹ️ សិស្សនេះស្ថិតនៅក្នុងថ្នាក់នេះរួចហើយ");
      return;
    }

    try {
      setChangingClass(true);
      await studentsApi.update(student.id, { classId: selectedClassId } as any);
      await loadFullStudentData();
      onUpdate();
      setShowChangeClassModal(false);

      // ✅ Success toast
      const toast = document.createElement("div");
      toast.className =
        "fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[100] animate-in slide-in-from-top-2 duration-300";
      toast.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span class="font-bold">ផ្លាស់ប្តូរថ្នាក់បានជោគជ័យ!</span>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error: any) {
      console.error("Failed to change class:", error);
      alert(`❌ កំហុស: ${error.message}`);
    } finally {
      setChangingClass(false);
    }
  };

  const getCurrentClassName = () => {
    if (!student.classId) return "មិនមានថ្នាក់";
    return student.class?.name || "Unknown";
  };

  const getNewClassName = () => {
    if (!selectedClassId) return "-";
    const selectedClass = classes.find((c) => c.id === selectedClassId);
    return selectedClass?.name || "-";
  };

  return (
    <>
      {/* ✅ Simple Clean Modal */}
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ✅ Simple Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  mode === "create"
                    ? "bg-green-100"
                    : mode === "edit"
                      ? "bg-blue-100"
                      : "bg-gray-100"
                }`}
              >
                {mode === "view" ? (
                  <Eye className={`w-6 h-6 text-gray-600`} />
                ) : mode === "create" ? (
                  <UserPlus className="w-6 h-6 text-green-600" />
                ) : (
                  <Edit className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div>
                <h4 className="text-2xl font-koulen text-gray-900">
                  {mode === "view"
                    ? "ព័ត៌មានសិស្ស"
                    : mode === "create"
                      ? "បន្ថែមសិស្សថ្មី"
                      : "កែសម្រួលសិស្ស"}
                </h4>
                <p className="text-sm text-gray-500 font-medium">
                  {mode === "view"
                    ? "Student Details"
                    : mode === "create"
                      ? "Add New Student"
                      : "Edit Student Information"}
                </p>
              </div>
            </div>

            {/* ✅ Header Actions */}
            <div className="flex items-center gap-2">
              {mode === "view" && (
                <>
                  <button
                    onClick={() => setShowChangeClassModal(true)}
                    className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold rounded-lg transition-all flex items-center gap-2"
                    title="ផ្លាស់ប្តូរថ្នាក់"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span className="hidden sm:inline">ផ្លាស់ប្តូរថ្នាក់</span>
                  </button>

                  <button
                    onClick={() => setMode("edit")}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">កែសម្រួល</span>
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-semibold rounded-lg transition-all flex items-center gap-2"
                    title="លុបសិស្ស"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">លុប</span>
                  </button>
                </>
              )}

              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* ✅ Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && mode !== "create" ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <p className="text-gray-600 font-medium">
                  កំពុងផ្ទុកទិន្នន័យ...
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {mode === "view" ? (
                  <StudentDetailView student={student} />
                ) : (
                  <StudentEditForm
                    student={mode === "create" ? null : student}
                    onSave={handleSave}
                    onCancel={
                      mode === "create" ? handleClose : () => setMode("view")
                    }
                    isSaving={saving}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Simple Change Class Modal */}
      {showChangeClassModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowChangeClassModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <ArrowLeftRight className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-xl font-koulen text-gray-900">
                    ផ្លាស់ប្តូរថ្នាក់
                  </h4>
                  <p className="text-sm text-gray-500">Transfer to New Class</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">
                    {student.gender === "male" ? "👨‍🎓" : "👩‍🎓"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {student.khmerName ||
                        `${student.firstName} ${student.lastName}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      ID: {student.studentId}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ថ្នាក់បច្ចុប្បន្ន • Current Class
                </label>
                <div className="bg-gray-100 rounded-lg p-3 font-semibold text-gray-900">
                  {getCurrentClassName()}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ថ្នាក់ថ្មី • New Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                  disabled={changingClass}
                >
                  <option value="">-- ជ្រើសរើសថ្នាក់ --</option>
                  {classes
                    .filter((c) => c.id !== student.classId)
                    .map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls._count?.students || 0} សិស្ស)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowChangeClassModal(false);
                    setSelectedClassId(student.classId || "");
                  }}
                  disabled={changingClass}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all disabled:opacity-50"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleChangeClass}
                  disabled={
                    changingClass ||
                    !selectedClassId ||
                    selectedClassId === student.classId
                  }
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {changingClass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      កំពុងផ្លាស់ប្តូរ...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      បញ្ជាក់ការផ្លាស់ប្តូរ
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Simple Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h4 className="text-xl font-koulen text-gray-900">
                    លុបសិស្ស
                  </h4>
                  <p className="text-sm text-gray-500">Delete Student</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                <p className="font-bold text-red-900 mb-2">
                  សកម្មភាពនេះមិនអាចត្រលប់វិញបានទេ!
                </p>
                <p className="text-sm text-red-800">
                  តើអ្នកប្រាកដថាចង់លុបសិស្ស{" "}
                  <span className="font-semibold">
                    {student.khmerName ||
                      `${student.firstName} ${student.lastName}`}
                  </span>{" "}
                  មែនទេ?
                </p>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                    {student.gender === "male" ? "👨‍🎓" : "👩‍🎓"}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {student.khmerName ||
                        `${student.firstName} ${student.lastName}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      ID: {student.studentId || "N/A"} • {getCurrentClassName()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-semibold transition-all disabled:opacity-50"
                >
                  បោះបង់
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      កំពុងលុប...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      បញ្ជាក់ការលុប
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
