"use client";

import React from "react";
import {
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Users,
  Sparkles,
} from "lucide-react";

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
  subjects?: any[];
  teachingClasses?: any[]; // Frontend field name
  teacherClasses?: any[]; // Backend field name
}

interface TeacherCardProps {
  teacher: Teacher;
  onEdit: (teacher: any) => void;
  onView: (teacher: any) => void;
  onDelete: (teacherId: string) => void;
  viewMode: "grid" | "list";
}

export default function TeacherCard({
  teacher,
  onEdit,
  onView,
  onDelete,
  viewMode,
}: TeacherCardProps) {
  if (!teacher) {
    return null;
  }

  const firstName = teacher.firstName || "";
  const lastName = teacher.lastName || "";
  const khmerName = teacher.khmerName || "";
  const email = teacher.email || "";
  const phone = teacher.phone || teacher.phoneNumber || "";
  const role = teacher.role || "TEACHER";
  const gender = teacher.gender || "MALE";

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (khmerName) {
      return khmerName.substring(0, 2);
    }
    return "T";
  };

  const getGradientColors = () => {
    if (role === "INSTRUCTOR") {
      return "from-amber-500 to-orange-600";
    }
    return gender === "FEMALE"
      ? "from-pink-500 to-rose-600"
      : "from-blue-500 to-indigo-600";
  };

  const getRoleBadgeColors = () => {
    return role === "INSTRUCTOR"
      ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-200"
      : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200";
  };

  // Properly extract counts
  const subjectsCount = teacher.subjects?.length || 0;

  // Handle different data structures for teaching classes
  // Backend returns 'teacherClasses' as array of class objects
  const teachingClasses = (teacher.teachingClasses || teacher.teacherClasses || teacher.classes || [])
    .map((item: any) => item.class || item)
    .filter(Boolean);
  const classesCount = teachingClasses.length;

  if (viewMode === "list") {
    return (
      <div className="group bg-white hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 rounded-xl shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-300 transition-all duration-300 p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-14 h-14 bg-gradient-to-br ${getGradientColors()} rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform`}>
              {getInitials()}
            </div>
            {role === "INSTRUCTOR" && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <Sparkles className="w-3 h-3 text-yellow-900" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-base truncate">
                {firstName} {lastName}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold khmer-text ${getRoleBadgeColors()}`}>
                {role === "INSTRUCTOR" ? "គ្រូប្រចាំ" : "គ្រូ"}
              </span>
            </div>
            {khmerName && (
              <p className="text-sm text-gray-600 mb-1 truncate khmer-text">{khmerName}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {email && (
                <div className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <div className="text-center px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-500 mb-0.5">Subjects</p>
              <p className="text-lg font-black text-blue-600">{subjectsCount}</p>
            </div>
            <div className="text-center px-3 py-2 bg-green-50 rounded-lg border border-green-100">
              <p className="text-xs text-gray-500 mb-0.5">Classes</p>
              <p className="text-lg font-black text-green-600">{classesCount}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => onView(teacher)}
              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:scale-110 transition-all"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(teacher)}
              className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:scale-110 transition-all"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(teacher.id)}
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:scale-110 transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="group bg-white hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-indigo-50/30 rounded-2xl shadow-sm hover:shadow-xl border border-gray-200 hover:border-blue-300 transition-all duration-300 p-5 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getGradientColors()}`}></div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative flex-shrink-0">
          <div className={`w-14 h-14 bg-gradient-to-br ${getGradientColors()} rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform`}>
            {getInitials()}
          </div>
          {role === "INSTRUCTOR" && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-md animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-yellow-900" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base mb-1 truncate">
            {firstName} {lastName}
          </h3>
          {khmerName && (
            <p className="text-sm text-gray-600 mb-1.5 truncate khmer-text">{khmerName}</p>
          )}
          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold khmer-text ${getRoleBadgeColors()} shadow-sm`}>
            {role === "INSTRUCTOR" ? "គ្រូប្រចាំថ្នាក់" : "គ្រូបង្រៀន"}
          </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4 bg-gray-50/50 rounded-lg p-3 border border-gray-100">
        {email && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span>{phone}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100 text-center">
          <BookOpen className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <p className="text-lg font-black text-blue-700">{subjectsCount}</p>
          <p className="text-xs text-gray-600 khmer-text">មុខវិជ្ជា</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100 text-center">
          <Users className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-black text-green-700">{classesCount}</p>
          <p className="text-xs text-gray-600 khmer-text">ថ្នាក់</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onView(teacher)}
          className="flex-1 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm border border-blue-200 flex items-center justify-center gap-1.5 khmer-text"
        >
          <Eye className="w-4 h-4" />
          មើល
        </button>
        <button
          onClick={() => onEdit(teacher)}
          className="flex-1 px-3 py-2.5 bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 text-green-700 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm border border-green-200 flex items-center justify-center gap-1.5 khmer-text"
        >
          <Edit className="w-4 h-4" />
          កែ
        </button>
        <button
          onClick={() => onDelete(teacher.id)}
          className="px-3 py-2.5 bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95 shadow-sm border border-red-200 khmer-text"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
