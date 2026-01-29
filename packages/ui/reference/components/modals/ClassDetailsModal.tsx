"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useClasses } from "@/hooks/useClasses";
import { classesApi } from "@/lib/api/classes";
import {
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  X,
  Loader2,
  Trash2,
  UserMinus,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";
import type { Class } from "@/lib/api/classes";

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class;
}

interface StudentInClass {
  id: string;
  studentId?: string;
  khmerName?: string;
  englishName?: string;
  firstName: string;
  lastName: string;
  gender: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

export default function ClassDetailsModal({
  isOpen,
  onClose,
  classData,
}: ClassDetailsModalProps) {
  const { removeStudent, refresh } = useClasses();
  const [classDetails, setClassDetails] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(
    null
  );

  // Fetch detailed class data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClassDetails();
    }
  }, [isOpen, classData.id]);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const details = await classesApi.getById(classData.id);
      setClassDetails(details);
      console.log("✅ Class details loaded:", details);
    } catch (error) {
      console.error("❌ Error fetching class details:", error);
      alert("Failed to load class details");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (student: StudentInClass) => {
    if (
      !confirm(
        `តើអ្នកចង់ដកសិស្ស "${
          student.khmerName || `${student.firstName} ${student.lastName}`
        }" ចេញពីថ្នាក់ "${
          classData.name
        }" មែនទេ?\n\nAre you sure you want to remove "${student.firstName} ${
          student.lastName
        }" from "${classData.name}"?`
      )
    ) {
      return;
    }

    try {
      setRemovingStudentId(student.id);
      await removeStudent(classData.id, student.id);
      alert("✅ សិស្សត្រូវបានដកចេញដោយជោគជ័យ!\nStudent removed successfully!");

      // Refresh class details
      await fetchClassDetails();
      await refresh(); // Refresh main classes list
    } catch (error: any) {
      alert("❌ " + (error.message || "Failed to remove student"));
    } finally {
      setRemovingStudentId(null);
    }
  };

  const students = (classDetails?.students || []) as StudentInClass[];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ព័ត៌មានលម្អិតថ្នាក់ • Class Details`}
      size="large"
    >
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">កំពុងផ្ទុកព័ត៌មាន...</p>
            </div>
          </div>
        ) : classDetails ? (
          <>
            {/* Class Header Card */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <GraduationCap className="w-8 h-8" />
                    <h1 className="text-2xl font-koulen">
                      {classDetails.name}
                    </h1>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm opacity-80">ថ្នាក់ទី • Grade</p>
                      <p className="text-lg font-semibold">
                        {classDetails.grade}
                      </p>
                    </div>
                    {classDetails.section && (
                      <div>
                        <p className="text-sm opacity-80">ផ្នែក • Section</p>
                        <p className="text-lg font-semibold">
                          {classDetails.section}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm opacity-80">
                        ឆ្នាំសិក្សា • Academic Year
                      </p>
                      <p className="text-lg font-semibold">
                        {classDetails.academicYear}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-80">សមត្ថភាព • Capacity</p>
                      <p className="text-lg font-semibold">
                        {classDetails._count?.students || 0}
                        {classDetails.capacity && ` / ${classDetails.capacity}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Teacher Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 mb-2">
                <UserCheck className="w-5 h-5" />
                <h1 className="font-semibold">
                  គ្រូប្រចាំថ្នាក់ • Class Teacher
                </h1>
              </div>
              {classDetails.teacher ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                    {classDetails.teacher.firstName?.charAt(0)}
                    {classDetails.teacher.lastName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {classDetails.teacher.khmerName ||
                        `${classDetails.teacher.firstName} ${classDetails.teacher.lastName}`}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {classDetails.teacher.email}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-green-700">
                  មិនទាន់កំណត់គ្រូប្រចាំថ្នាក់ • Not assigned yet
                </p>
              )}
            </div>

            {/* Students Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h1 className="font-semibold text-gray-900">
                    សិស្សក្នុងថ្នាក់ • Students in Class
                  </h1>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {students.length} នាក់
                  </span>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">
                    មិនទាន់មានសិស្សក្នុងថ្នាក់នេះ • No students in this class
                    yet
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {students.map((student, index) => (
                    <div
                      key={student.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Number */}
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                          {(student.khmerName || student.firstName)?.charAt(0)}
                          {student.lastName?.charAt(0)}
                        </div>

                        {/* Student Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {student.khmerName ||
                                  `${student.firstName} ${student.lastName}`}
                              </p>
                              {student.englishName && (
                                <p className="text-xs text-gray-500">
                                  {student.englishName}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                {student.studentId && (
                                  <span className="font-mono">
                                    ID: {student.studentId}
                                  </span>
                                )}
                                <span className="capitalize">
                                  {student.gender === "MALE" ? "ប្រុស" : "ស្រី"}
                                </span>
                                {student.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {student.email}
                                  </span>
                                )}
                                {student.phoneNumber && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {student.phoneNumber}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => handleRemoveStudent(student)}
                              disabled={removingStudentId === student.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {removingStudentId === student.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>កំពុងដកចេញ...</span>
                                </>
                              ) : (
                                <>
                                  <UserMinus className="w-3 h-3" />
                                  <span>ដកចេញ • Remove</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 mb-1">សរុប • Total</p>
                <p className="text-2xl font-koulen text-blue-700">
                  {students.length}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 mb-1">ប្រុស • Boys</p>
                <p className="text-2xl font-koulen text-green-700">
                  {students.filter((s) => s.gender === "MALE").length}
                </p>
              </div>
              <div className="bg-pink-50 rounded-lg p-4 text-center">
                <p className="text-sm text-pink-600 mb-1">ស្រី • Girls</p>
                <p className="text-2xl font-koulen text-pink-700">
                  {students.filter((s) => s.gender === "FEMALE").length}
                </p>
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>ចំណាំ • Note:</strong>{" "}
                    ការដកសិស្សចេញពីថ្នាក់នឹងធ្វើឱ្យសិស្សនោះក្លាយជាគ្មានថ្នាក់។
                    អ្នកអាចបន្ថែមសិស្សទៅថ្នាក់ផ្សេងវិញបាន។
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Removing a student from this class will make them
                    unassigned. You can reassign them to another class later.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load class details</p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            <X className="w-5 h-5" />
            <span>បិទ • Close</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
