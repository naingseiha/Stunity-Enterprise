"use client";

import React from "react";
import { Eye, Edit, Trash2, Award, UserCheck } from "lucide-react";

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
  employeeId?: string;
  gender?: string;
  role?: string;
  classes?: any[];
}

interface TeacherTableProps {
  teachers: Teacher[];
  onView: (teacher: Teacher) => void;
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacher: Teacher) => void;
}

export default function TeacherTable({
  teachers,
  onView,
  onEdit,
  onDelete,
}: TeacherTableProps) {
  if (teachers.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="text-center py-16">
          <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-lg mb-2">
            រកមិនឃើញគ្រូបង្រៀន
          </p>
          <p className="text-gray-400 text-sm">
            សូមព្យាយាមស្វែងរកដោយពាក្យគន្លឹះផ្សេង
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                ឈ្មោះ • Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                តួនាទី • Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                អ៊ីមែល • Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                ទូរស័ព្ទ • Phone
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                មុខវិជ្ជា • Subjects
              </th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                ថ្នាក់ • Classes
              </th>
              <th className="px-6 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wider">
                សកម្មភាព • Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teachers.map((teacher, index) => {
              const fullName =
                teacher.firstName && teacher.lastName
                  ? `${teacher.firstName} ${teacher.lastName}`
                  : teacher.name || "Unknown";
              const initials =
                teacher.firstName && teacher.lastName
                  ? `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(
                      0
                    )}`
                  : fullName
                      .split(" ")
                      .map((n) => n.charAt(0))
                      .join("")
                      .substring(0, 2);

              return (
                <tr
                  key={teacher.id}
                  className="hover:bg-blue-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center font-bold text-white text-sm shadow">
                          {initials}
                        </div>
                        {teacher.gender && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-blue-100">
                            <span className="text-[10px]">
                              {teacher.gender === "MALE" ||
                              teacher.gender === "male"
                                ? "👨"
                                : "👩"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-black text-gray-900 flex items-center gap-2">
                          {fullName}
                          {teacher.role === "INSTRUCTOR" && (
                            <Award className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        {teacher.khmerName && (
                          <div className="text-sm text-gray-600 font-semibold">
                            {teacher.khmerName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        teacher.role === "INSTRUCTOR"
                          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {teacher.role === "INSTRUCTOR"
                        ? "គ្រូប្រចាំថ្នាក់"
                        : "គ្រូធម្មតា"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {teacher.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {teacher.phone || teacher.phoneNumber || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div
                      className="max-w-xs truncate font-medium"
                      title={teacher.subject}
                    >
                      {teacher.subject || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-bold">
                      {teacher.classes?.length || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onView(teacher)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="មើលព័ត៌មាន View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(teacher)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="កែប្រែ Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(teacher)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="លុប Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
