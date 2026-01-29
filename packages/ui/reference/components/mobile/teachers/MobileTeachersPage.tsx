// 📂 src/components/mobile/teachers/MobileTeachersPage.tsx

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ChevronRight,
  Filter,
  X,
  Users,
  Sparkles,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  School,
  User,
  Calendar,
  Award,
  CreditCard,
  BookOpen,
} from "lucide-react";
import { teachersApi, Teacher } from "@/lib/api/teachers";
import MobileLayout from "@/components/layout/MobileLayout";

export default function MobileTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadTeachers();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadTeachers = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Abort previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const data = await teachersApi.getAllLightweight();
      setTeachers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setError(error.message || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យគ្រូ");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Memoized filtered teachers
  const filteredTeachers = useMemo(() => {
    let filtered = teachers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((teacher) => {
        const khmerMatch = teacher.khmerName?.toLowerCase().includes(query);
        const idMatch = teacher.teacherId?.toLowerCase().includes(query);
        const firstNameMatch = teacher.firstName?.toLowerCase().includes(query);
        const lastNameMatch = teacher.lastName?.toLowerCase().includes(query);
        const emailMatch = teacher.email?.toLowerCase().includes(query);
        const phoneMatch =
          teacher.phone?.includes(query) ||
          teacher.phoneNumber?.includes(query);
        const fullNameMatch = `${teacher.firstName} ${teacher.lastName}`
          .toLowerCase()
          .includes(query);

        return (
          khmerMatch ||
          idMatch ||
          firstNameMatch ||
          lastNameMatch ||
          fullNameMatch ||
          emailMatch ||
          phoneMatch
        );
      });
    }

    // Filter by role
    if (selectedRole !== "all") {
      filtered = filtered.filter((teacher) => teacher.role === selectedRole);
    }

    return filtered;
  }, [teachers, searchQuery, selectedRole]);

  const roleStats = useMemo(() => {
    return {
      all: teachers.length,
      TEACHER: teachers.filter((t) => t.role === "TEACHER").length,
      INSTRUCTOR: teachers.filter((t) => t.role === "INSTRUCTOR").length,
    };
  }, [teachers]);

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
  };

  const closeTeacherDetails = () => {
    setSelectedTeacher(null);
  };

  if (error) {
    return (
      <MobileLayout title="គ្រូបង្រៀន • Teachers">
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="font-koulen text-2xl text-gray-900 mb-2">
              មានបញ្ហា
            </h2>
            <p className="font-battambang text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => loadTeachers()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-battambang font-semibold py-3 px-6 rounded-2xl hover:shadow-lg transition-all active:scale-95"
            >
              ព្យាយាមម្តងទៀត
            </button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="គ្រូបង្រៀន • Teachers">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 pb-24">
        {/* Header with Search */}
        <div className="bg-white px-5 pt-6 pb-4 shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-koulen text-orange-500 text-base leading-tight">
                គ្រូបង្រៀន
              </h1>
              <p className="font-battambang text-[10px] text-gray-500">
                {isLoading
                  ? "កំពុងផ្ទុក..."
                  : `${filteredTeachers.length} នាក់`}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ស្វែងរកគ្រូ... (ឈ្មោះ, អ៊ីមែល, ទូរស័ព្ទ)"
              className="w-full h-12 pl-11 pr-10 bg-gray-50 border border-gray-200 rounded-2xl font-battambang text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all"
              style={{ fontSize: "16px" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setSelectedRole("all")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-battambang text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRole === "all"
                  ? "bg-indigo-100 text-indigo-700 shadow-sm"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              ទាំងអស់ ({roleStats.all})
            </button>
            <button
              onClick={() => setSelectedRole("INSTRUCTOR")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-battambang text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRole === "INSTRUCTOR"
                  ? "bg-purple-100 text-purple-700 shadow-sm"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              គ្រូថ្នាក់ ({roleStats.INSTRUCTOR})
            </button>
            <button
              onClick={() => setSelectedRole("TEACHER")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-battambang text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRole === "TEACHER"
                  ? "bg-blue-100 text-blue-700 shadow-sm"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <School className="w-3.5 h-3.5" />
              គ្រូបង្រៀន ({roleStats.TEACHER})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="px-5 pt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 shadow-sm animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTeachers.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-koulen text-xl text-gray-900 mb-2">រកមិនឃើញ</h3>
            <p className="font-battambang text-sm text-gray-500 text-center">
              {searchQuery
                ? "មិនមានគ្រូដែលត្រូវនឹងការស្វែងរករបស់អ្នក"
                : "មិនមានគ្រូនៅឡើយទេ"}
            </p>
          </div>
        ) : (
          /* Teachers List */
          <div className="px-5 pt-4 space-y-2.5">
            {filteredTeachers.map((teacher) => (
              <div
                key={teacher.id}
                onClick={() => handleTeacherClick(teacher)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                      teacher.role === "INSTRUCTOR"
                        ? "bg-gradient-to-br from-purple-500 to-pink-600"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600"
                    }`}
                  >
                    <User className="w-7 h-7 text-white" />
                  </div>

                  {/* Teacher Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-battambang text-sm font-bold text-gray-900 truncate mb-0.5">
                      {teacher.khmerName ||
                        `${teacher.firstName} ${teacher.lastName}`}
                    </h3>

                    {/* Role Badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-battambang font-semibold ${
                          teacher.role === "INSTRUCTOR"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {teacher.role === "INSTRUCTOR" ? (
                          <>
                            <GraduationCap className="w-3 h-3" />
                            គ្រូថ្នាក់
                          </>
                        ) : (
                          <>
                            <School className="w-3 h-3" />
                            គ្រូបង្រៀន
                          </>
                        )}
                      </span>

                      {teacher.homeroomClass && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-battambang font-semibold bg-orange-100 text-orange-700">
                          <Briefcase className="w-3 h-3" />
                          {teacher.homeroomClass.name}
                        </span>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-col gap-0.5">
                      {teacher.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="font-battambang text-[11px] text-gray-600 truncate">
                            {teacher.email}
                          </span>
                        </div>
                      )}
                      {(teacher.phone || teacher.phoneNumber) && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="font-battambang text-[11px] text-gray-600">
                            {teacher.phone || teacher.phoneNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teacher Details Modal - Social Media Style */}
      {selectedTeacher && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
          onClick={closeTeacherDetails}
        >
          <div
            className="bg-white w-full rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Floating */}
            <button
              onClick={closeTeacherDetails}
              className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full shadow-lg transition-all"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Cover/Banner */}
            <div className="relative h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
              </div>
              {/* Role Badge */}
              <div className="absolute top-3 left-3">
                <div
                  className={`px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    selectedTeacher.role === "INSTRUCTOR"
                      ? "bg-purple-400"
                      : "bg-blue-400"
                  }`}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-white text-xs font-bold font-battambang">
                    {selectedTeacher.role === "INSTRUCTOR"
                      ? "គ្រូថ្នាក់"
                      : "គ្រូបង្រៀន"}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Info Section - Center Aligned */}
            <div className="px-5 pb-24">
              {/* Avatar - Overlapping cover - Center Aligned */}
              <div className="flex flex-col items-center -mt-16 mb-4">
                <div className="relative mb-4">
                  <div
                    className={`w-32 h-32 rounded-full p-1 ${
                      selectedTeacher.role === "INSTRUCTOR"
                        ? "bg-gradient-to-br from-purple-500 to-pink-600"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600"
                    }`}
                  >
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <User
                        className={`w-16 h-16 ${
                          selectedTeacher.role === "INSTRUCTOR"
                            ? "text-purple-600"
                            : "text-indigo-600"
                        }`}
                      />
                    </div>
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center ${
                      selectedTeacher.role === "INSTRUCTOR"
                        ? "bg-purple-400"
                        : "bg-blue-400"
                    }`}
                  >
                    {selectedTeacher.role === "INSTRUCTOR" ? (
                      <GraduationCap className="w-5 h-5 text-white" />
                    ) : (
                      <School className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>

                {/* Name & Bio - Center Aligned */}
                <div className="text-center mb-4">
                  <h1 className="text-xl font-black text-gray-900 mb-1 font-battambang">
                    {selectedTeacher.khmerName ||
                      `${selectedTeacher.firstName} ${selectedTeacher.lastName}`}
                  </h1>
                  <p className="text-sm text-gray-600 mb-2 font-battambang">
                    {selectedTeacher.firstName} {selectedTeacher.lastName}
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {selectedTeacher.teacherId && (
                      <>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="font-medium font-battambang">
                            {selectedTeacher.teacherId}
                          </span>
                        </div>
                        {selectedTeacher.homeroomClass && (
                          <span className="text-gray-300">•</span>
                        )}
                      </>
                    )}
                    {selectedTeacher.homeroomClass && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="font-medium font-battambang">
                          {selectedTeacher.homeroomClass.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Position Badge */}
                  {selectedTeacher.position && (
                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-700 font-battambang">
                        {selectedTeacher.position}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid - Compact & Improved Design */}
              <div className="grid grid-cols-3 gap-3 py-4 border-t border-gray-100 mb-4">
                {/* Subjects Count */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-3.5 border border-indigo-100">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-2">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-md font-black text-gray-900 mb-0.5">
                      {selectedTeacher.subjects?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600 font-bold font-battambang">
                      មុខវិជ្ជា
                    </div>
                  </div>
                </div>

                {/* Teaching Classes Count */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-3.5 border border-green-100">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-2">
                      <School className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-md font-black text-gray-900 mb-0.5">
                      {selectedTeacher.teachingClasses?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600 font-bold font-battambang">
                      ថ្នាក់រៀន
                    </div>
                  </div>
                </div>

                {/* Total Students */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-3.5 border border-blue-100">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mb-2">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-md font-black text-gray-900 mb-0.5">
                      {(selectedTeacher.homeroomClass?._count?.students || 0) +
                        (selectedTeacher.teachingClasses?.reduce(
                          (sum, cls) => sum + (cls._count?.students || 0),
                          0
                        ) || 0)}
                    </div>
                    <div className="text-xs text-gray-600 font-bold font-battambang">
                      សិស្ស
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
                  <h2 className="text-sm font-black text-gray-900 font-battambang">
                    ព័ត៌មានទំនាក់ទំនង
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    Contact Info
                  </span>
                </div>

                {/* Email */}
                {selectedTeacher.email && (
                  <a
                    href={`mailto:${selectedTeacher.email}`}
                    className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 px-4 py-3 rounded-xl active:scale-98 transition-all"
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5 font-battambang">
                        អ៊ីមែល
                      </p>
                      <p className="text-sm font-bold text-indigo-600 truncate font-battambang">
                        {selectedTeacher.email}
                      </p>
                    </div>
                  </a>
                )}

                {/* Phone */}
                {(selectedTeacher.phone || selectedTeacher.phoneNumber) && (
                  <a
                    href={`tel:${
                      selectedTeacher.phone || selectedTeacher.phoneNumber
                    }`}
                    className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 px-4 py-3 rounded-xl active:scale-98 transition-all"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-0.5 font-battambang">
                        លេខទូរស័ព្ទ
                      </p>
                      <p className="text-sm font-bold text-green-600 font-battambang">
                        {selectedTeacher.phone || selectedTeacher.phoneNumber}
                      </p>
                    </div>
                  </a>
                )}

                {/* Address */}
                {selectedTeacher.address && (
                  <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-4 py-3 rounded-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5 font-battambang">
                        អាសយដ្ឋាន
                      </p>
                      <p className="text-sm font-bold text-gray-900 font-battambang">
                        {selectedTeacher.address}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subjects - Beautiful Cards */}
              {selectedTeacher.subjects &&
                selectedTeacher.subjects.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
                      <h2 className="text-sm font-black text-gray-900 font-battambang">
                        មុខវិជ្ជាបង្រៀន
                      </h2>
                      <span className="text-xs text-gray-500 font-medium">
                        Subjects
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {selectedTeacher.subjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="flex items-center gap-2 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 px-3 py-2.5 rounded-xl"
                        >
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          </div>
                          <p className="text-xs font-bold text-gray-900 font-battambang truncate">
                            {subject.nameKh || subject.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Teaching Classes */}
              {selectedTeacher.teachingClasses &&
                selectedTeacher.teachingClasses.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
                      <h2 className="text-sm font-black text-gray-900 font-battambang">
                        ថ្នាក់បង្រៀន
                      </h2>
                      <span className="text-xs text-gray-500 font-medium">
                        Teaching Classes
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedTeacher.teachingClasses.map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 px-4 py-3 rounded-xl"
                        >
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <School className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900 font-battambang">
                              {cls.name}
                            </p>
                            {cls._count && (
                              <p className="text-xs text-gray-600 font-battambang">
                                {cls._count.students} សិស្ស
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Homeroom Class - Highlighted */}
              {selectedTeacher.homeroomClass && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
                    <h2 className="text-sm font-black text-gray-900 font-battambang">
                      ថ្នាក់ទទួលបន្ទុក
                    </h2>
                    <span className="text-xs text-gray-500 font-medium">
                      Homeroom
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-black text-gray-900 font-battambang mb-1">
                          {selectedTeacher.homeroomClass.name}
                        </p>
                        {selectedTeacher.homeroomClass._count && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-gray-500" />
                            <p className="text-xs text-gray-600 font-battambang">
                              {selectedTeacher.homeroomClass._count.students}{" "}
                              សិស្ស
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center">
                        <span className="text-amber-700 font-black text-xs">
                          ★
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
