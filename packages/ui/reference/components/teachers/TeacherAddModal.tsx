"use client";

import React, { useState } from "react";
import { X, UserCheck, Loader2 } from "lucide-react";
import { teachersApi } from "@/lib/api/teachers";
import TeacherBasicInfoForm from "./forms/TeacherBasicInfoForm";
import TeacherHomeroomClassSelector from "./forms/TeacherHomeroomClassSelector";
import TeacherSubjectsSelector from "./forms/TeacherSubjectsSelector";
import TeacherClassesSelector from "./forms/TeacherClassesSelector";

interface TeacherAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: any[];
  onSuccess: () => void;
}

export default function TeacherAddModal({
  isOpen,
  onClose,
  subjects: initialSubjects,
  onSuccess,
}: TeacherAddModalProps) {
  const [loading, setLoading] = useState(false);

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
    hireDate: new Date().toISOString().split("T")[0],
    selectedSubjects: [] as string[],
    homeroomClassId: "",
    selectedTeachingClasses: [] as string[],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Grade options
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

  if (!isOpen) return null;

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear homeroom if switching to TEACHER
    if (field === "role" && value === "TEACHER") {
      setFormData((prev) => ({ ...prev, homeroomClassId: "" }));
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
    setFormData((prev) => ({
      ...prev,
      selectedTeachingClasses: prev.selectedTeachingClasses.includes(classId)
        ? prev.selectedTeachingClasses.filter((id) => id !== classId)
        : [...prev.selectedTeachingClasses, classId],
    }));
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
      const teacherData = {
        ...formData,
        subjectIds: formData.selectedSubjects,
        homeroomClassId: formData.homeroomClassId || null,
        teachingClassIds: formData.selectedTeachingClasses,
      };

      await teachersApi.create(teacherData);
      alert("✅ បានបន្ថែមគ្រូបង្រៀនដោយជោគជ័យ!\nTeacher added successfully!");
      onSuccess();
      onClose();

      // Reset form
      setFormData({
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
        hireDate: new Date().toISOString().split("T")[0],
        selectedSubjects: [],
        homeroomClassId: "",
        selectedTeachingClasses: [],
      });
    } catch (error: any) {
      alert(
        `❌ បរាជ័យក្នុងការបន្ថែមគ្រូបង្រៀន!\nError: ${
          error.message || "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 shadow-lg">
          <h2 className="text-xl font-koulen text-white flex items-center gap-3">
            <UserCheck className="w-6 h-6" />
            បន្ថែមគ្រូបង្រៀនថ្មី • Add New Teacher
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <TeacherBasicInfoForm
            formData={formData}
            formErrors={formErrors}
            onChange={handleFieldChange}
          />

          {/* Homeroom Class (only for INSTRUCTOR) */}
          {formData.role === "INSTRUCTOR" && (
            <TeacherHomeroomClassSelector
              selectedClassId={formData.homeroomClassId}
              onSelect={(classId) =>
                handleFieldChange("homeroomClassId", classId)
              }
              error={formErrors.homeroomClass}
              gradeOptions={gradeOptions}
            />
          )}

          {/* Teaching Subjects */}
          <TeacherSubjectsSelector
            selectedSubjects={formData.selectedSubjects}
            onToggle={toggleSubject}
            gradeOptions={gradeOptions}
          />

          {/* Teaching Classes */}
          <TeacherClassesSelector
            selectedClasses={formData.selectedTeachingClasses}
            homeroomClassId={formData.homeroomClassId}
            onToggle={toggleTeachingClass}
            gradeOptions={gradeOptions}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-colors disabled:opacity-50"
            >
              បោះបង់ Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  កំពុងរក្សាទុក...
                </>
              ) : (
                <span>បន្ថែម Create</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
