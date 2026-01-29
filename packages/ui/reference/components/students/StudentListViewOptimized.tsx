"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import StudentModal from "./StudentModal";
import StudentListSkeleton from "./StudentListSkeleton";
import {
  Search,
  Grid,
  List,
  RefreshCw,
  Eye,
  Edit,
  X,
  Users,
  Filter,
  ChevronRight,
} from "lucide-react";
import { studentsApi, PaginationInfo } from "@/lib/api/students";

interface StudentListViewOptimizedProps {
  classes: any[];
}

export default function StudentListViewOptimized({
  classes,
}: StudentListViewOptimizedProps) {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Infinite scroll state
  const [students, setStudents] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ✅ Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ✅ Fetch students (initial load only)
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await studentsApi.getAllLightweight(1, itemsPerPage);
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
  }, [itemsPerPage]);

  // ✅ Load more students (append to existing)
  const loadMoreStudents = useCallback(async () => {
    if (!pagination || currentPage >= pagination.totalPages || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await studentsApi.getAllLightweight(
        nextPage,
        itemsPerPage
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
  }, [currentPage, pagination, itemsPerPage, isLoadingMore]);

  // ✅ Initial load
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
    if (student.name) return student.name;
    const lastName = student.lastName || student.last_name || "";
    const firstName = student.firstName || student.first_name || "";
    if (lastName && firstName) return `${lastName} ${firstName}`;
    if (lastName) return lastName;
    if (firstName) return firstName;
    if (student.khmerName) return student.khmerName;
    return "N/A";
  };

  // ✅ Client-side filter (after pagination)
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const fullName = getFullName(student);
      const matchesSearch =
        debouncedSearch === "" ||
        fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        student.studentId
          ?.toLowerCase()
          .includes(debouncedSearch.toLowerCase());

      const matchesClass =
        selectedClass === "all" || student.classId === selectedClass;

      const matchesGender =
        selectedGender === "all" || student.gender === selectedGender;

      return matchesSearch && matchesClass && matchesGender;
    });
  }, [students, debouncedSearch, selectedClass, selectedGender]);

  // ✅ Virtual scrolling for table
  const tableParentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredStudents.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 60,
    overscan: 5,
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

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  const handleUpdate = () => {
    fetchStudents();
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
      return date.toLocaleDateString("km-KH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
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
  const canLoadMore = pagination && currentPage < pagination.totalPages;

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

          {/* Table Skeleton */}
          <StudentListSkeleton viewMode={viewMode} count={10} />
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
                  <Filter className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs text-emerald-600 font-bold uppercase">
                    បង្ហាញ
                  </div>
                  <div className="text-2xl font-koulen text-emerald-900">
                    {stats.filtered}
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
              <div className="md:col-span-5">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-12 pr-12 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="all">📚 ថ្នាក់ទាំងអស់</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls._count?.students || 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="all">👥 ភេទទាំងអស់</option>
                  <option value="male">👨 ប្រុស</option>
                  <option value="female">👩 ស្រី</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full h-12 px-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 disabled:from-gray-100 disabled:to-gray-100 disabled:cursor-not-allowed border-2 border-gray-300 text-gray-700 font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105"
                >
                  <RefreshCw
                    className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "កំពុងផ្ទុក..." : "ផ្ទុកឡើងវិញ"}
                </button>
              </div>
            </div>
          </div>

          {/* ✅ View Mode & Pagination */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="text-sm text-gray-700 font-medium">
                {searchQuery && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold mr-2">
                    <Search className="w-4 h-4" />"{searchQuery}"
                  </span>
                )}
                <span className="text-gray-600">បានផ្ទុក</span>{" "}
                <strong className="text-blue-600 text-lg">
                  {stats.loaded}
                </strong>
                {" / "}
                <strong className="text-gray-900 text-lg">
                  {stats.total}
                </strong>{" "}
                <span className="text-gray-600">នាក់</span>
                {searchQuery ||
                selectedClass !== "all" ||
                selectedGender !== "all" ? (
                  <span className="text-gray-600 ml-2">
                    (បង្ហាញ{" "}
                    <strong className="text-emerald-600">
                      {stats.filtered}
                    </strong>{" "}
                    នាក់)
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`h-11 px-5 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 ${
                      viewMode === "table"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-300"
                    }`}
                  >
                    <List className="w-4 h-4" />
                    តារាង
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`h-11 px-5 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 ${
                      viewMode === "grid"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-300"
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                    ក្រឡា
                  </button>
                </div>
              </div>
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
              {(searchQuery ||
                selectedClass !== "all" ||
                selectedGender !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedClass("all");
                    setSelectedGender("all");
                  }}
                  className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  សម្អាតតម្រង
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
              {viewMode === "table" ? (
                <div
                  ref={tableParentRef}
                  className="overflow-auto"
                  style={{ height: "600px" }}
                >
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-100 to-gray-50">
                      <tr className="border-b-2 border-gray-300">
                        <th className="px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide">
                          លេខ
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-black text-blue-700 uppercase tracking-wide">
                          អត្តលេខ
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide">
                          គោត្តនាម និង នាម
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide">
                          ភេទ
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide">
                          ថ្នាក់
                        </th>
                        <th className="px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide">
                          ថ្ងៃខែឆ្នាំកំណើត
                        </th>
                        <th className="px-5 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wide">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ position: "relative" }}>
                      <tr
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                      >
                        <td colSpan={7}></td>
                      </tr>
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const student = filteredStudents[virtualRow.index];
                        const index = virtualRow.index;

                        return (
                          <tr
                            key={student.id}
                            data-index={virtualRow.index}
                            ref={(node) => rowVirtualizer.measureElement(node)}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => handleViewStudent(student)}
                          >
                            <td className="px-5 py-4 text-sm text-gray-600 font-bold">
                              {index + 1}
                            </td>
                            <td className="px-5 py-4 text-sm font-mono font-bold text-blue-600">
                              {student.studentId || "-"}
                            </td>
                            <td className="px-5 py-4 text-sm font-black text-gray-900">
                              {getFullName(student)}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black ${
                                  student.gender === "male"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-pink-100 text-pink-700"
                                }`}
                              >
                                {student.gender === "male"
                                  ? "👨 ប្រុស"
                                  : "👩 ស្រី"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                              {getClassName(student.classId)}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-600">
                              {formatDate(student.dateOfBirth)}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewStudent(student);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                                  title="មើលព័ត៌មាន"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStudent(student);
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
                                  title="កែប្រែ"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                      onClick={() => handleViewStudent(student)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="font-black text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                            {getFullName(student)}
                          </div>
                          <div className="text-xs text-gray-500 font-mono font-bold">
                            ID: {student.studentId || "N/A"}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-black ${
                            student.gender === "male"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-pink-100 text-pink-700"
                          }`}
                        >
                          {student.gender === "male" ? "👨 ប្រុស" : "👩 ស្រី"}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <span>📚</span>
                          <span className="font-semibold">
                            {getClassName(student.classId)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🎂</span>
                          <span>{formatDate(student.dateOfBirth)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
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
              )}

              {/* ✅ Load More Button */}
              {canLoadMore && !isLoading && (
                <div className="p-6 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
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
                        ផ្ទុកបន្ថែម ({pagination?.totalPages! - currentPage} ទំព័រទៀត)
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ✅ Student Modal */}
      {showModal && selectedStudent && (
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
