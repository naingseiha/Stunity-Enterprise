"use client";

import { useState, useEffect, useCallback } from "react";
import StudentModal from "./StudentModal";
import {
  Search,
  RefreshCw,
  Eye,
  Edit,
  Users,
  ChevronRight,
  UserCircle2,
  Calendar,
  School,
  UserPlus,
} from "lucide-react";
import { studentsApi, PaginationInfo } from "@/lib/api/students";

interface StudentListViewV2Props {
  classes: any[];
}

export default function StudentListViewV2({ classes }: StudentListViewV2Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Infinite scroll state
  const [students, setStudents] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ✅ Fetch students with filters (resets to page 1)
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const perPage = itemsPerPage === "all" ? 99999 : itemsPerPage;
      const response = await studentsApi.getAllLightweight(
        1,
        perPage,
        selectedClass === "all" ? undefined : selectedClass,
        selectedGender === "all" ? undefined : selectedGender
      );
      if (response.success) {
        setStudents(response.data);
        setPagination(response.pagination || null);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setIsLoading(false);
    }
  }, [itemsPerPage, selectedClass, selectedGender]);

  // ✅ Load more students (append to existing, preserves filters)
  const loadMoreStudents = useCallback(async () => {
    if (!pagination || currentPage >= pagination.totalPages || isLoadingMore || itemsPerPage === "all") {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await studentsApi.getAllLightweight(
        nextPage,
        itemsPerPage as number,
        selectedClass === "all" ? undefined : selectedClass,
        selectedGender === "all" ? undefined : selectedGender
      );
      if (response.success) {
        setStudents((prev) => [...prev, ...response.data]);
        setPagination(response.pagination || null);
        setCurrentPage(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more students:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    currentPage,
    pagination,
    itemsPerPage,
    isLoadingMore,
    selectedClass,
    selectedGender,
  ]);

  // ✅ Initial load and when filters change
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ✅ Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchStudents();
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ Get full name from student object
  const getFullName = (student: any): string => {
    if (student.khmerName) return student.khmerName;
    if (student.name) return student.name;
    const lastName = student.lastName || student.last_name || "";
    const firstName = student.firstName || student.first_name || "";
    if (lastName && firstName) return `${lastName} ${firstName}`;
    if (lastName) return lastName;
    if (firstName) return firstName;
    return "N/A";
  };

  // ✅ Get class name
  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.name || "-";
  };

  // ✅ Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // ✅ Client-side search filter (only on loaded students)
  const filteredStudents = students.filter((student) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const fullName = getFullName(student).toLowerCase();
    const studentId = (student.studentId || "").toLowerCase();
    const className = getClassName(student.classId).toLowerCase();

    return (
      fullName.includes(query) ||
      studentId.includes(query) ||
      className.includes(query)
    );
  });

  // ✅ Handle view/edit
  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
    setModalMode("view");
    setShowModal(true);
  };

  const handleEditStudent = (student: any) => {
    setSelectedStudent(student);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleAddNewStudent = () => {
    setSelectedStudent(null);
    setModalMode("create");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  const handleUpdate = () => {
    fetchStudents();
  };

  // ✅ Get stats
  const stats = {
    total: pagination?.total || 0,
    loaded: students.length,
    filtered: filteredStudents.length,
    male: filteredStudents.filter((s) => s.gender === "male").length,
    female: filteredStudents.filter((s) => s.gender === "female").length,
  };

  // ✅ Check if can load more
  const canLoadMore = pagination && currentPage < pagination.totalPages && itemsPerPage !== "all";

  return (
    <div className="space-y-4">
      {/* ✅ Loading State */}
      {isLoading && currentPage === 1 ? (
        <>
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
                <div className="h-20"></div>
              </div>
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
            <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 border-2 border-gray-200 animate-pulse"
              >
                <div className="h-32"></div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* ✅ Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-blue-600 font-bold uppercase">
                    សរុប
                  </div>
                  <div className="text-2xl font-koulen text-blue-900">
                    {stats.total}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                  <UserCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-emerald-600 font-bold uppercase">
                    បានផ្ទុក
                  </div>
                  <div className="text-2xl font-koulen text-emerald-900">
                    {stats.loaded}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-4 border-2 border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-sky-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-koulen">👨‍🎓</span>
                </div>
                <div>
                  <div className="text-xs text-sky-600 font-bold uppercase">
                    ប្រុស
                  </div>
                  <div className="text-2xl font-koulen text-sky-900">
                    {stats.male}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border-2 border-pink-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-2xl font-koulen">👩‍🎓</span>
                </div>
                <div>
                  <div className="text-xs text-pink-600 font-bold uppercase">
                    ស្រី
                  </div>
                  <div className="text-2xl font-koulen text-pink-900">
                    {stats.female}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ Filters */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold bg-white cursor-pointer"
                >
                  <option value="all">📚 ថ្នាក់ទាំងអស់</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold bg-white cursor-pointer"
                >
                  <option value="all">👤 ភេទទាំងអស់</option>
                  <option value="male">👨 ប្រុស</option>
                  <option value="female">👩 ស្រី</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full h-12 px-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold bg-white cursor-pointer"
                >
                  <option value="50">បង្ហាញ 50</option>
                  <option value="100">បង្ហាញ 100</option>
                  <option value="200">បង្ហាញ 200</option>
                  <option value="all">🔢 បង្ហាញទាំងអស់</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={handleAddNewStudent}
                  className="w-full h-12 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 shadow-lg"
                >
                  <UserPlus className="w-5 h-5" />
                  បន្ថែមសិស្ស
                </button>
              </div>

              <div className="md:col-span-1">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full h-12 px-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 disabled:from-gray-100 disabled:to-gray-100 disabled:cursor-not-allowed border-2 border-gray-300 text-gray-700 font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ✅ Status Info */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-700 font-medium">
              {searchQuery && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold mr-2">
                  <Search className="w-4 h-4" />"{searchQuery}"
                </span>
              )}
              <span className="text-gray-600">បានផ្ទុក</span>{" "}
              <strong className="text-blue-600 text-lg">{stats.loaded}</strong>
              {" / "}
              <strong className="text-gray-900 text-lg">
                {stats.total}
              </strong>{" "}
              <span className="text-gray-600">នាក់</span>
              {searchQuery ? (
                <span className="text-gray-600 ml-2">
                  (បង្ហាញ{" "}
                  <strong className="text-emerald-600">{stats.filtered}</strong>{" "}
                  នាក់)
                </span>
              ) : null}
            </div>
          </div>

          {/* ✅ Empty State */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-16 text-center">
              <div className="text-gray-400 text-7xl mb-4">🔍</div>
              <h1 className="text-2xl font-koulen text-gray-900 mb-2">
                រកមិនឃើញទិន្នន័យ
              </h1>
              <p className="text-sm text-gray-600 mb-4">
                សូមព្យាយាមស្វែងរកដោយប្រើពាក្យគន្លឹះផ្សេង
              </p>
            </div>
          ) : (
            <>
              {/* ✅ Student Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => handleViewStudent(student)}
                  >
                    {/* Student ID Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-mono font-bold">
                        {student.studentId || "N/A"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          student.gender === "male"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-pink-100 text-pink-700"
                        }`}
                      >
                        {student.gender === "male" ? "👨 ប្រុស" : "👩 ស្រី"}
                      </span>
                    </div>

                    {/* Student Name */}
                    <h1 className="text-sm font-black text-gray-900 mb-3 truncate group-hover:text-blue-600 transition-colors">
                      {getFullName(student)}
                    </h1>

                    {/* Info Grid */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <School className="w-4 h-4 flex-shrink-0" />
                        <span className="font-semibold truncate">
                          {getClassName(student.classId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {formatDate(student.dateOfBirth)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t-2 border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewStudent(student);
                        }}
                        className="flex-1 h-10 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        មើល
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStudent(student);
                        }}
                        className="flex-1 h-10 bg-green-50 hover:bg-green-100 text-green-700 font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        កែប្រែ
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ✅ Load More Button */}
              {canLoadMore && !isLoading && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                  <button
                    onClick={loadMoreStudents}
                    disabled={isLoadingMore}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        កំពុងផ្ទុក...
                      </>
                    ) : (
                      <>
                        <ChevronRight className="w-5 h-5" />
                        ផ្ទុកបន្ថែម ({pagination?.totalPages! -
                          currentPage}{" "}
                        ទំព័រទៀត)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ✅ Student Modal */}
      {showModal && (
        <StudentModal
          student={selectedStudent}
          mode={modalMode}
          onClose={handleCloseModal}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
