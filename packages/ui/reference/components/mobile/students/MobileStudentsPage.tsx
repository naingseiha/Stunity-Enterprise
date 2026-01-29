"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  User,
  ChevronRight,
  Filter,
  X,
  Users,
  UserCircle2,
  Sparkles,
  GraduationCap,
  School,
  Copy,
  Check,
  Bell,
  MapPin,
  Mic,
} from "lucide-react";
import { studentsApi, Student } from "@/lib/api/students";

export default function MobileStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState(
    searchParams?.get("search") || ""
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const touchStartRef = useRef<number>(0);
  const touchMoveRef = useRef<number>(0);

  useEffect(() => {
    loadStudents();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadStudents = useCallback(async (refresh = false) => {
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

      // Load all students with a large limit (mobile doesn't need pagination)
      const response = await studentsApi.getAllLightweight(1, 10000, undefined, undefined);
      if (response.success && Array.isArray(response.data)) {
        setStudents(response.data);
      } else {
        setStudents([]);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setError(error.message || "មានបញ្ហាក្នុងការទាញយកទិន្នន័យសិស្ស");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Memoized filtered students
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((student) => {
        const khmerMatch = student.khmerName?.toLowerCase().includes(query);
        const idMatch = student.studentId?.toLowerCase().includes(query);
        const firstNameMatch = student.firstName?.toLowerCase().includes(query);
        const lastNameMatch = student.lastName?.toLowerCase().includes(query);
        const fullNameMatch = `${student.firstName} ${student.lastName}`
          .toLowerCase()
          .includes(query);

        return (
          khmerMatch ||
          idMatch ||
          firstNameMatch ||
          lastNameMatch ||
          fullNameMatch
        );
      });
    }

    // Filter by grade
    if (selectedGrade !== "all") {
      filtered = filtered.filter((student) => {
        const className = student.class?.name || "";
        return className.includes(`ទី${selectedGrade}`);
      });
    }

    return filtered;
  }, [students, searchQuery, selectedGrade]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedGrade("all");
  }, []);

  const handleCopy = useCallback((studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(studentId);
    setCopiedId(studentId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Pull to refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchMoveRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const touchDiff = touchMoveRef.current - touchStartRef.current;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    if (scrollTop === 0 && touchDiff > 100 && !isRefreshing && !isLoading) {
      loadStudents(true);
    }

    touchStartRef.current = 0;
    touchMoveRef.current = 0;
  }, [isRefreshing, isLoading, loadStudents]);

  const grades = ["7", "8", "9", "10", "11", "12"];

  // Memoized Statistics
  const stats = useMemo(
    () => ({
      total: students.length,
      male: students.filter((s) => s.gender === "male").length,
      female: students.filter((s) => s.gender === "female").length,
      withClass: students.filter((s) => s.classId).length,
    }),
    [students]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 p-4">
        <div className="animate-pulse space-y-4">
          {/* Header skeleton */}
          <div className="h-32 bg-white rounded-2xl"></div>
          {/* Search skeleton */}
          <div className="h-14 bg-white rounded-xl"></div>
          {/* Stats skeleton */}
          <div className="h-40 bg-white rounded-2xl"></div>
          {/* Student cards skeleton */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="font-koulen text-2xl text-gray-900 mb-2">មានបញ្ហា</h1>
          <p className="font-battambang text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => loadStudents(false)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-battambang font-semibold py-3 px-6 rounded-2xl hover:shadow-lg transition-all active:scale-95"
          >
            ព្យាយាមម្តងទៀត
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-battambang text-sm text-gray-700 font-semibold">
            កំពុងបន្ទាន់សម័យ...
          </span>
        </div>
      )}

      {/* Clean Modern Header */}
      <div className="bg-white px-5 pt-6 pb-5 shadow-sm">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-koulen text-blue-500 text-sm leading-tight">
                សិស្សសរុប
              </p>
              <p className="font-battambang text-[10px] text-gray-500">
                Student List
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>

        {/* Search Bar - Top Priority */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && {}}
            placeholder="Search Students..."
            className="w-full pl-11 pr-11 py-3.5 rounded-xl font-battambang text-sm text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={clearFilters}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Banner */}
      <div className="px-5 pt-4 pb-3">
        <div className="bg-gradient-to-br from-slate-100 via-gray-100 to-zinc-100 rounded-3xl p-5 shadow-lg border border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <p className="font-koulen text-blue-500 text-sm">ស្ថិតិសិស្ស</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Users className="w-3 h-3 text-white" />
                  </div>
                  <p className="font-battambang text-[10px] text-gray-600 font-semibold">
                    សរុប
                  </p>
                </div>
                <p className="font-koulen text-2xl text-gray-900">
                  {stats.total}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <School className="w-3 h-3 text-white" />
                  </div>
                  <p className="font-battambang text-[10px] text-gray-600 font-semibold">
                    មានថ្នាក់
                  </p>
                </div>
                <p className="font-koulen text-2xl text-gray-900">
                  {stats.withClass}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <UserCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <p className="font-battambang text-[10px] text-gray-600 font-semibold">
                    ប្រុស
                  </p>
                </div>
                <p className="font-koulen text-2xl text-gray-900">
                  {stats.male}
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 border border-gray-200/50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <UserCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <p className="font-battambang text-[10px] text-gray-600 font-semibold">
                    ស្រី
                  </p>
                </div>
                <p className="font-koulen text-2xl text-gray-900">
                  {stats.female}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grade Filters */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-koulen text-lg text-gray-900">
            ជ្រើសរើសតាមថ្នាក់
          </h1>
          <span className="font-battambang text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredStudents.length} សិស្ស
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          <button
            onClick={() => setSelectedGrade("all")}
            className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-battambang text-xs font-bold transition-all ${
              selectedGrade === "all"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-200 shadow-sm active:scale-95"
            }`}
          >
            ទាំងអស់
          </button>
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-battambang text-xs font-bold transition-all ${
                selectedGrade === grade
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  : "bg-white text-gray-700 border border-gray-200 shadow-sm active:scale-95"
              }`}
            >
              ថ្នាក់ {grade}
            </button>
          ))}
        </div>
      </div>

      {/* Student List */}
      <div className="px-5 pb-6">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="font-koulen text-lg text-gray-900 mb-2">
              មិនមានសិស្ស
            </h1>
            <p className="font-battambang text-sm text-gray-600 mb-4">
              {searchQuery || selectedGrade !== "all"
                ? "សូមសាកល្បងផ្លាស់ប្តូរការស្វែងរក"
                : "មិនមានទិន្នន័យសិស្ស"}
            </p>
            {(searchQuery || selectedGrade !== "all") && (
              <button
                onClick={clearFilters}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-battambang font-semibold rounded-xl hover:shadow-lg transition-all active:scale-95"
              >
                សម្អាតការស្វែងរក
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student, index) => (
              <button
                key={student.id}
                onClick={() => router.push(`/students/${student.id}`)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                    student.gender === "male"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-500"
                      : "bg-gradient-to-br from-pink-500 to-rose-500"
                  }`}
                >
                  <User className="w-6 h-6 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-koulen text-sm text-gray-900 truncate mb-1">
                    {student.khmerName ||
                      `${student.firstName} ${student.lastName}`}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-lg">
                      <span className="font-battambang text-xs text-blue-700 font-semibold">
                        {student.studentId}
                      </span>
                      <button
                        onClick={(e) => handleCopy(student.studentId, e)}
                        className="hover:scale-110 transition-transform"
                      >
                        {copiedId === student.studentId ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-blue-500" />
                        )}
                      </button>
                    </div>
                    {student.class?.name && (
                      <>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="font-battambang text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                          {student.class.name}
                        </span>
                      </>
                    )}
                    <span
                      className={`font-battambang text-xs px-2 py-0.5 rounded-full ${
                        student.gender === "male"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-pink-100 text-pink-700"
                      }`}
                    >
                      {student.gender === "male" ? "ប្រុស" : "ស្រី"}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
