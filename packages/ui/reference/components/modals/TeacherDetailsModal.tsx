"use client";

import React from "react";
import {
  X,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  MapPin,
  Briefcase,
  Clock,
  Home,
  School,
  Star,
  Award,
  CreditCard,
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
  subjectIds?: string[];
  subjects?: any[];
  employeeId?: string;
  teacherId?: string;
  gender?: string;
  position?: string;
  role?: string;
  address?: string;
  dateOfBirth?: string;
  hireDate?: string;
  homeroomClass?: any;
  homeroomClassId?: string;
  teachingClasses?: any[];
  teacherClasses?: any[];
  classes?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface TeacherDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  subjects?: any[];
}

export default function TeacherDetailsModal({
  isOpen,
  onClose,
  teacher,
  subjects = [],
}: TeacherDetailsModalProps) {
  if (!isOpen || !teacher) return null;

  // Get full name
  const fullName =
    teacher.firstName && teacher.lastName
      ? `${teacher.firstName} ${teacher.lastName}`
      : teacher.name || "Unknown Teacher";

  // Get initials
  const initials =
    teacher.firstName && teacher.lastName
      ? `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(0)}`
      : fullName
          .split(" ")
          .map((n) => n.charAt(0))
          .join("")
          .substring(0, 2);

  // Get homeroom class
  const homeroomClass = teacher.homeroomClass || null;

  // Get teaching classes (handle different data structures)
  // Backend returns 'teacherClasses' as array of class objects
  const teachingClasses = (
    teacher.teachingClasses ||
    teacher.teacherClasses ||
    teacher.classes ||
    []
  )
    .map((item: any) => item.class || item)
    .filter(Boolean);

  // Calculate total students across all teaching classes
  const totalStudents = teachingClasses.reduce(
    (sum: number, classItem: any) => sum + (classItem._count?.students || 0),
    0
  );

  // Get subject list from multiple sources
  const teacherSubjects = teacher.subjects?.length
    ? teacher.subjects.map((s) => s.nameKh || s.name)
    : teacher.subject
    ? teacher.subject.split(",").map((s) => s.trim())
    : [];

  // Calculate years of service
  const yearsOfService = teacher.hireDate
    ? new Date().getFullYear() - new Date(teacher.hireDate).getFullYear()
    : null;

  // Calculate age
  const age = teacher.dateOfBirth
    ? new Date().getFullYear() - new Date(teacher.dateOfBirth).getFullYear()
    : null;

  // Get gradient colors based on role and gender
  const getGradientColors = () => {
    if (teacher.role === "INSTRUCTOR") {
      return "from-amber-500 via-orange-500 to-red-500";
    }
    return teacher.gender === "FEMALE"
      ? "from-pink-500 via-rose-500 to-red-500"
      : "from-blue-500 via-indigo-500 to-purple-500";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl max-w-7xl w-full max-h-[95vh] overflow-hidden shadow-2xl animate-scaleIn border border-gray-200">
        {/* Modern Header with Gradient Background */}
        <div
          className={`relative overflow-hidden bg-gradient-to-br ${getGradientColors()} px-8 py-8`}
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div
              className="absolute bottom-0 left-0 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: "1s" }}
            ></div>
          </div>

          <div className="relative z-10">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-0 right-0 p-3 hover:bg-white/20 rounded-xl transition-all duration-200 group"
            >
              <X className="w-7 h-7 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Header Content */}
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 bg-white/25 backdrop-blur-xl rounded-3xl flex items-center justify-center border-4 border-white/40 shadow-2xl transform hover:scale-105 transition-transform">
                  <span className="text-5xl font-moul text-white drop-shadow-lg">
                    {initials}
                  </span>
                </div>
                {teacher.role === "INSTRUCTOR" && (
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl border-4 border-white animate-bounce">
                    <Star
                      className="w-6 h-6 text-yellow-900"
                      fill="currentColor"
                    />
                  </div>
                )}
              </div>

              {/* Teacher Info */}
              <div className="flex-1 pt-2">
                <h2 className="text-4xl font-moul text-white mb-2 drop-shadow-lg">
                  {fullName}
                </h2>
                {teacher.khmerName && (
                  <p className="text-2xl text-white/95 mb-4 font-bold khmer-text drop-shadow-md">
                    {teacher.khmerName}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {teacher.employeeId && (
                    <div className="px-4 py-2 bg-white/30 backdrop-blur-sm rounded-xl text-sm font-black border-2 border-white/40 text-white shadow-lg flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      {teacher.employeeId}
                    </div>
                  )}
                  {teacher.role && (
                    <div className="px-4 py-2 bg-white/30 backdrop-blur-sm rounded-xl text-sm font-black border-2 border-white/40 text-white shadow-lg khmer-text">
                      {teacher.role === "INSTRUCTOR"
                        ? "🏠 គ្រូប្រចាំថ្នាក់"
                        : "📚 គ្រូបង្រៀន"}
                    </div>
                  )}
                  {teacher.gender && (
                    <div className="px-4 py-2 bg-white/30 backdrop-blur-sm rounded-xl text-sm font-black border-2 border-white/40 text-white shadow-lg">
                      {teacher.gender === "MALE" ? "👨 Male" : "👩 Female"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] bg-gradient-to-br from-gray-50 to-white">
          <div className="p-8 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="group bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-2xl p-6 border-2 border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Home className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-5xl font-moul text-amber-900 mb-2">
                    {homeroomClass ? "1" : "0"}
                  </p>
                  <p className="text-xs font-bold text-amber-700 khmer-text">
                    ថ្នាក់ប្រចាំ
                  </p>
                  <p className="text-xs text-amber-600">Homeroom</p>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-2xl p-6 border-2 border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-5xl font-moul text-blue-900 mb-2">
                    {teachingClasses.length}
                  </p>
                  <p className="text-xs font-bold text-blue-700 khmer-text">
                    ថ្នាក់បង្រៀន
                  </p>
                  <p className="text-xs text-blue-600">Classes</p>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-2xl p-6 border-2 border-green-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-5xl font-moul text-green-900 mb-2">
                    {teacherSubjects.length}
                  </p>
                  <p className="text-xs font-bold text-green-700 khmer-text">
                    មុខវិជ្ជា
                  </p>
                  <p className="text-xs text-green-600">Subjects</p>
                </div>
              </div>

              <div className="group bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-2xl p-6 border-2 border-purple-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-5xl font-moul text-purple-900 mb-2">
                    {totalStudents}
                  </p>
                  <p className="text-xs font-bold text-purple-700 khmer-text">
                    សិស្សសរុប
                  </p>
                  <p className="text-xs text-purple-600">Students</p>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Contact Information */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 khmer-text">
                        ព័ត៌មានទំនាក់ទំនង
                      </h3>
                      <p className="text-xs text-gray-500 font-semibold">
                        Contact Information
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {teacher.email && (
                      <div className="group bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl p-4 transition-all border border-blue-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-600 font-bold mb-1">
                              អ៊ីមែល • Email
                            </p>
                            <p className="text-sm font-black text-gray-900 truncate">
                              {teacher.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(teacher.phone || teacher.phoneNumber) && (
                      <div className="group bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl p-4 transition-all border border-green-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 font-bold mb-1 khmer-text">
                              លេខទូរស័ព្ទ • Phone
                            </p>
                            <p className="text-sm font-black text-gray-900">
                              {teacher.phone || teacher.phoneNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {teacher.address && (
                      <div className="group bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl p-4 transition-all border border-purple-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 font-bold mb-1 khmer-text">
                              អាសយដ្ឋាន • Address
                            </p>
                            <p className="text-sm font-black text-gray-900 khmer-text">
                              {teacher.address}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Professional Info */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 khmer-text">
                        ព័ត៌មានវិជ្ជាជីវៈ
                      </h3>
                      <p className="text-xs text-gray-500 font-semibold">
                        Professional Details
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {teacher.position && (
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center gap-3">
                          <Award className="w-5 h-5 text-purple-600" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 font-bold mb-1 khmer-text">
                              តួនាទី • Position
                            </p>
                            <p className="text-sm font-black text-gray-900 khmer-text">
                              {teacher.position}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {teacher.dateOfBirth && (
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-indigo-600" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 font-bold mb-1 khmer-text">
                              ថ្ងៃខែឆ្នាំកំណើត • DOB
                            </p>
                            <p className="text-sm font-black text-gray-900">
                              {new Date(teacher.dateOfBirth).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                              {age && (
                                <span className="text-xs text-indigo-600 ml-2 font-bold khmer-text">
                                  ({age} ឆ្នាំ)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {teacher.hireDate && (
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-emerald-600" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 font-bold mb-1 khmer-text">
                              ថ្ងៃចូលបម្រើការងារ • Hire Date
                            </p>
                            <p className="text-sm font-black text-gray-900">
                              {new Date(teacher.hireDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                              {yearsOfService !== null && (
                                <span className="text-xs text-emerald-600 ml-2 font-bold khmer-text">
                                  ({yearsOfService} ឆ្នាំបម្រើការ)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Teaching Subjects */}
                {teacherSubjects.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-black text-gray-900 khmer-text">
                          មុខវិជ្ជាបង្រៀន
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold">
                          Teaching Subjects
                        </p>
                      </div>
                      <span className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-black rounded-full">
                        {teacherSubjects.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {teacherSubjects.map((subject: string, index: number) => (
                        <div
                          key={index}
                          className="group bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl p-3 border border-green-200 hover:border-green-400 hover:shadow-md transition-all text-center"
                        >
                          <span className="text-sm font-black text-gray-900 khmer-text group-hover:text-green-700 transition-colors">
                            {subject}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Homeroom Class */}
                {homeroomClass && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                        <Home className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 khmer-text">
                          ថ្នាក់ប្រចាំ
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold">
                          Homeroom Class
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border-2 border-amber-200 hover:shadow-lg transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-2xl font-koulen text-gray-900 mb-1 khmer-text">
                            {homeroomClass.name}
                          </h4>
                          <p className="text-sm text-gray-600 font-bold">
                            Grade {homeroomClass.grade}
                            {homeroomClass.section &&
                              ` • ${homeroomClass.section}`}
                          </p>
                        </div>
                        <div className="w-14 h-14 bg-amber-500 rounded-xl flex items-center justify-center shadow-md">
                          <Home className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-amber-200">
                        <Users className="w-5 h-5 text-amber-600" />
                        <p className="text-sm text-amber-700 font-black khmer-text">
                          {homeroomClass._count?.students || 0} សិស្ស
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Teaching Classes */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-indigo-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                      <School className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-gray-900 khmer-text">
                        ថ្នាក់បង្រៀន
                      </h3>
                      <p className="text-xs text-gray-500 font-semibold">
                        Teaching Classes
                      </p>
                    </div>
                    <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-sm font-black rounded-full">
                      {teachingClasses.length}
                    </span>
                  </div>

                  {teachingClasses.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
                      <School className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-bold khmer-text mb-1">
                        មិនទាន់មានថ្នាក់បង្រៀន
                      </p>
                      <p className="text-gray-400 text-sm">
                        No teaching classes assigned
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-2">
                      {teachingClasses.map((classItem: any, index: number) => {
                        const isHomeroom =
                          classItem.id === teacher.homeroomClassId;

                        const gradients = [
                          "from-blue-500 to-cyan-500",
                          "from-indigo-500 to-purple-500",
                          "from-violet-500 to-fuchsia-500",
                          "from-cyan-500 to-teal-500",
                        ];
                        const gradient = gradients[index % gradients.length];

                        return (
                          <div
                            key={classItem.id}
                            className={`group relative overflow-hidden rounded-xl border-2 hover:shadow-lg transition-all duration-300 ${
                              isHomeroom
                                ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300"
                                : "bg-white border-indigo-200 hover:border-indigo-400"
                            }`}
                          >
                            <div
                              className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                                isHomeroom
                                  ? "from-amber-400 to-orange-500"
                                  : gradient
                              }`}
                            ></div>

                            <div className="p-4 pt-5">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {isHomeroom && (
                                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                                        <Home className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <h4 className="text-lg font-black text-gray-900 khmer-text">
                                        {classItem.name}
                                      </h4>
                                      {isHomeroom && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-full khmer-text">
                                          ថ្នាក់ប្រចាំ
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 text-sm mb-3">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <div
                                        className={`w-2 h-2 rounded-full bg-gradient-to-r ${
                                          isHomeroom
                                            ? "from-amber-400 to-orange-500"
                                            : gradient
                                        }`}
                                      ></div>
                                      <span className="font-bold">
                                        Grade {classItem.grade}
                                      </span>
                                    </div>
                                    {classItem.section && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-600 font-bold">
                                          {classItem.section}
                                        </span>
                                      </>
                                    )}
                                    {classItem.track && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            classItem.track === "science"
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-purple-100 text-purple-700"
                                          }`}
                                        >
                                          {classItem.track === "science"
                                            ? "វិទ្យាសាស្ត្រ"
                                            : "សង្គម"}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <div
                                    className={`flex items-center gap-2 pt-3 border-t ${
                                      isHomeroom
                                        ? "border-amber-200"
                                        : "border-indigo-100"
                                    }`}
                                  >
                                    <Users
                                      className={`w-4 h-4 ${
                                        isHomeroom
                                          ? "text-amber-600"
                                          : "text-indigo-600"
                                      }`}
                                    />
                                    <p
                                      className={`text-sm font-black ${
                                        isHomeroom
                                          ? "text-amber-900"
                                          : "text-indigo-900"
                                      }`}
                                    >
                                      {classItem._count?.students || 0}{" "}
                                      <span className="khmer-text">សិស្ស</span>
                                    </p>
                                  </div>
                                </div>

                                <div
                                  className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${
                                    isHomeroom
                                      ? "bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300"
                                      : `bg-gradient-to-br ${gradient.replace(
                                          "500",
                                          "100"
                                        )} border-2 border-indigo-200`
                                  }`}
                                >
                                  <GraduationCap
                                    className={`w-7 h-7 ${
                                      isHomeroom
                                        ? "text-amber-700"
                                        : "text-indigo-700"
                                    }`}
                                  />
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
            </div>
          </div>
        </div>

        {/* Modern Footer */}
        <div className="sticky bottom-0 bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-200 px-8 py-5 flex justify-between items-center rounded-b-3xl">
          <div className="text-xs text-gray-500">
            Created:{" "}
            {teacher.createdAt
              ? new Date(teacher.createdAt).toLocaleDateString()
              : "N/A"}
          </div>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white rounded-xl font-black transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            បិទ • Close
          </button>
        </div>
      </div>
    </div>
  );
}
