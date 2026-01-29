"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, UserCheck, Loader2 } from "lucide-react";
import { teachersApi } from "@/lib/api/teachers";
import { subjectsApi } from "@/lib/api/subjects";
import { classesApi } from "@/lib/api/classes";
import TeacherBasicInfoForm from "./forms/TeacherBasicInfoForm";
import TeacherHomeroomClassSelector from "./forms/TeacherHomeroomClassSelector";
import TeacherSubjectsSelector from "./forms/TeacherSubjectsSelector";
import TeacherClassesSelector from "./forms/TeacherClassesSelector";

interface Teacher {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  khmerName?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  subject?: string;
  subjectIds?: string[];
  employeeId?: string;
  teacherId?: string;
  gender?: string;
  position?: string;
  role?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  homeroomClassId?: string;
  teachingClassIds?: string[];
  classes?: any[];
  classIds?: string[];
  teachingClasses?: any[];
  subjects?: any[];
}

interface TeacherEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher;
  subjects: any[];
  onSuccess: () => void;
}

export default function TeacherEditModal({
  isOpen,
  onClose,
  teacher,
  subjects: initialSubjects,
  onSuccess,
}: TeacherEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    khmerName: "",
    email: "",
    phone: "",
    gender: "MALE",
    role: "TEACHER",
    employeeId: "",
    position: "",
    address: "",
    dateOfBirth: "",
    hireDate: "",
    selectedSubjects: [] as string[],
    homeroomClassId: "",
    selectedTeachingClasses: [] as string[],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);

  const gradeOptions = [
    { value: "all", label: "ទាំងអស់ • All Grades" },
    { value: "7", label: "កម្រិតទី៧ • Grade 7" },
    { value: "8", label: "កម្រិតទី៨ • Grade 8" },
    { value: "9", label: "កម្រិតទី៩ • Grade 9" },
    { value: "10", label: "កម្រិតទី១០ • Grade 10" },
    {
      value: "11-science",
      label: "កម្រិតទី១១ - វិទ្យាសាស្ត្រ • Grade 11 Science",
    },
    { value: "11-social", label: "កម្រិតទី១១ - សង្គម • Grade 11 Social" },
    {
      value: "12-science",
      label: "កម្រិតទី១២ - វិទ្យាសាស្ត្រ • Grade 12 Science",
    },
    { value: "12-social", label: "កម្រិតទី១២ - សង្គម • Grade 12 Social" },
  ];

  useEffect(() => {
    if (isOpen && teacher) {
      loadInitialData();
    }
  }, [isOpen, teacher]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📥 Loading teacher data for edit:");
      console.log("Teacher ID:", teacher.id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      const [fetchedSubjects, fetchedClasses] = await Promise.all([
        subjectsApi.getAll(),
        classesApi.getAll(),
      ]);

      console.log("✅ Loaded subjects:", fetchedSubjects.length);
      console.log("✅ Loaded classes:", fetchedClasses.length);

      setAllSubjects(fetchedSubjects);
      setAllClasses(fetchedClasses);

      const subjectIds =
        teacher.subjectIds || teacher.subjects?.map((s) => s.id) || [];

      const teachingClassIds = Array.from(
        new Set(
          teacher.teachingClassIds ||
            teacher.classIds ||
            teacher.classes?.map((c) => c.id) ||
            teacher.teachingClasses
              ?.map((tc) => tc.id || tc.class?.id || tc.classId)
              .filter(Boolean) ||
            []
        )
      );

      console.log("📋 Extracted data:");
      console.log("  - Subject IDs:", subjectIds);
      console.log("  - Teaching class IDs (UNIQUE):", teachingClassIds);
      console.log("  - Homeroom class ID:", teacher.homeroomClassId);

      setFormData({
        firstName: teacher.firstName || "",
        lastName: teacher.lastName || "",
        khmerName: teacher.khmerName || "",
        email: teacher.email || "",
        phone: teacher.phone || teacher.phoneNumber || "",
        gender: teacher.gender || "MALE",
        role: teacher.role || "TEACHER",
        employeeId: teacher.employeeId || teacher.teacherId || "",
        position: teacher.position || "",
        address: teacher.address || "",
        dateOfBirth: teacher.dateOfBirth || "",
        hireDate: teacher.hireDate || "",
        selectedSubjects: subjectIds,
        homeroomClassId: teacher.homeroomClassId || "",
        selectedTeachingClasses: teachingClassIds,
      });

      console.log("✅ Form populated successfully");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } catch (error) {
      console.error("❌ Error loading teacher data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setFormErrors({});
      setInitialLoading(true);
    }
  }, [isOpen]);

  const uniqueTeachingClasses = useMemo(() => {
    const uniqueIds = Array.from(new Set(formData.selectedTeachingClasses));
    return uniqueIds
      .map((classId) => allClasses.find((c) => c.id === classId))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
  }, [formData.selectedTeachingClasses, allClasses]);

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    if (field === "role" && value === "TEACHER") {
      setFormData((prev) => ({ ...prev, homeroomClassId: "" }));
    }

    if (field === "role" && value === "INSTRUCTOR") {
      const currentHomeroom = formData.homeroomClassId;
      if (
        currentHomeroom &&
        !formData.selectedTeachingClasses.includes(currentHomeroom)
      ) {
        setFormData((prev) => ({
          ...prev,
          selectedTeachingClasses: [
            ...prev.selectedTeachingClasses,
            currentHomeroom,
          ],
        }));
      }
    }
  };

  const toggleSubject = (subjectId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter((id) => id !== subjectId)
        : [...prev.selectedSubjects, subjectId],
    }));
  };

  const toggleTeachingClass = (classId: string) => {
    if (classId === formData.homeroomClassId) {
      return;
    }

    setFormData((prev) => {
      const currentClasses = prev.selectedTeachingClasses;
      const newClasses = currentClasses.includes(classId)
        ? currentClasses.filter((id) => id !== classId)
        : [...currentClasses, classId];

      return {
        ...prev,
        selectedTeachingClasses: Array.from(new Set(newClasses)),
      };
    });
  };

  const handleHomeroomChange = (classId: string) => {
    setFormData((prev) => {
      const newTeachingClasses = [...prev.selectedTeachingClasses];

      if (classId && !newTeachingClasses.includes(classId)) {
        newTeachingClasses.push(classId);
      }

      const uniqueClasses = Array.from(new Set(newTeachingClasses));

      return {
        ...prev,
        homeroomClassId: classId,
        selectedTeachingClasses: uniqueClasses,
      };
    });

    if (formErrors.homeroomClass) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.homeroomClass;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (formData.role === "INSTRUCTOR" && !formData.homeroomClassId) {
      errors.homeroomClass = "គ្រូប្រចាំថ្នាក់ត្រូវតែជ្រើសរើសថ្នាក់ប្រចាំ! ";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const uniqueTeachingClassIds = Array.from(
        new Set(formData.selectedTeachingClasses)
      );

      const teacherData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        khmerName: formData.khmerName,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        role: formData.role,
        employeeId: formData.employeeId,
        position: formData.position,
        address: formData.address,
        dateOfBirth: formData.dateOfBirth,
        hireDate: formData.hireDate,
        subjectIds: formData.selectedSubjects,
        homeroomClassId:
          formData.role === "INSTRUCTOR" ? formData.homeroomClassId : null,
        teachingClassIds: uniqueTeachingClassIds,
      };

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📤 Updating teacher:");
      console.log("Teacher ID:", teacher.id);
      console.log("Data:", JSON.stringify(teacherData, null, 2));
      console.log("Unique Teaching Classes:", uniqueTeachingClassIds);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      await teachersApi.update(teacher.id, teacherData);

      console.log("✅ Teacher updated successfully");

      // ✅ Close modal immediately then trigger success callback
      onClose();
      onSuccess();
    } catch (error: any) {
      console.error("❌ Error updating teacher:", error);
      alert(`❌ បរាជ័យក្នុងការកែប្រែគ្រូបង្រៀន: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 shadow-lg">
          <h2 className="text-xl font-koulen text-white flex items-center gap-3">
            <UserCheck className="w-6 h-6" />
            កែប្រែគ្រូបង្រៀន • Edit Teacher
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {initialLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
            <p className="text-gray-600 font-semibold text-lg">
              កំពុងទាញយកទិន្នន័យ...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Loading teacher information
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <TeacherBasicInfoForm
              formData={formData}
              formErrors={formErrors}
              onChange={handleFieldChange}
            />

            {formData.role === "INSTRUCTOR" && (
              <TeacherHomeroomClassSelector
                selectedClassId={formData.homeroomClassId}
                onSelect={handleHomeroomChange}
                error={formErrors.homeroomClass}
                gradeOptions={gradeOptions}
              />
            )}

            <TeacherSubjectsSelector
              selectedSubjects={formData.selectedSubjects}
              onToggle={toggleSubject}
              gradeOptions={gradeOptions}
              preloadedSubjects={allSubjects}
            />

            <TeacherClassesSelector
              selectedClasses={formData.selectedTeachingClasses}
              homeroomClassId={formData.homeroomClassId}
              onToggle={toggleTeachingClass}
              gradeOptions={gradeOptions}
              preloadedClasses={allClasses}
            />

            {/* Summary Info */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
              <h4 className="font-bold text-blue-900 mb-2">
                📊 សង្ខេប Summary:
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-gray-600 text-xs">តួនាទី • Role: </p>
                  <p className="font-black text-gray-900">
                    {formData.role === "INSTRUCTOR"
                      ? "គ្រូប្រចាំថ្នាក់"
                      : "គ្រូបង្រៀន"}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <p className="text-gray-600 text-xs">មុខវិជ្ជា • Subjects:</p>
                  <p className="font-black text-purple-900">
                    {formData.selectedSubjects.length} មុខវិជ្ជា
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-gray-600 text-xs">
                    ថ្នាក់បង្រៀន • Classes:
                  </p>
                  <p className="font-black text-green-900">
                    {uniqueTeachingClasses.length} ថ្នាក់
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-amber-200">
                  <p className="text-gray-600 text-xs">
                    ថ្នាក់ប្រចាំ • Homeroom:
                  </p>
                  <p className="font-black text-amber-900">
                    {formData.homeroomClassId ? "✓ មាន" : "✗ គ្មាន"}
                  </p>
                </div>
              </div>

              {uniqueTeachingClasses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-gray-600 mb-2">
                    ថ្នាក់ដែលបានជ្រើសរើស:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uniqueTeachingClasses.map((classData) => (
                      <span
                        key={classData.id}
                        className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold"
                      >
                        {classData.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                បោះបង់ Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    កំពុងរក្សាទុក...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    រក្សាទុក Update
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
