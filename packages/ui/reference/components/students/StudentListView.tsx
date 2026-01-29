"use client";

import { useState, useEffect } from "react";
import StudentModal from "./StudentModal";
import {
  Search,
  Grid,
  List,
  Database,
  RefreshCw,
  Eye,
  Edit,
  X,
  Loader2,
  Users,
  Filter,
} from "lucide-react";

interface StudentListViewProps {
  students: any[];
  classes: any[];
  isDataLoaded: boolean;
  onLoadData: () => void;
  onRefresh: () => void;
}

export default function StudentListView({
  students,
  classes,
  isDataLoaded,
  onLoadData,
  onRefresh,
}: StudentListViewProps) {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ Get full name from student object
  const getFullName = (student: any): string => {
    if (student.name) {
      return student.name;
    }

    // Handle firstName + lastName
    const lastName = student.lastName || student.last_name || "";
    const firstName = student.firstName || student.first_name || "";

    if (lastName && firstName) {
      return `${lastName} ${firstName}`;
    }

    if (lastName) return lastName;
    if (firstName) return firstName;

    // Khmer name fallback
    if (student.khmerName) return student.khmerName;

    return "N/A";
  };

  // ✅ Filter students
  const filteredStudents = students.filter((student) => {
    const fullName = getFullName(student);
    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClass === "all" || student.classId === selectedClass;

    const matchesGender =
      selectedGender === "all" || student.gender === selectedGender;

    return matchesSearch && matchesClass && matchesGender;
  });

  // ✅ Handle load data
  const handleLoadData = async () => {
    setIsLoading(true);
    try {
      await onLoadData();
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ Handle view student - Open modal in VIEW mode
  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
    setModalMode("view");
    setShowModal(true);
  };

  // ✅ Handle edit student - Open modal in EDIT mode
  const handleEditStudent = (student: any) => {
    setSelectedStudent(student);
    setModalMode("edit");
    setShowModal(true);
  };

  // ✅ Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  // ✅ Handle update (refresh data after save)
  const handleUpdate = () => {
    onRefresh();
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

  // ✅ Get column background
  const getColumnBg = (index: number) => {
    const colors = [
      "bg-slate-50",
      "bg-blue-50",
      "bg-rose-50",
      "bg-purple-50",
      "bg-emerald-50",
      "bg-amber-50",
      "bg-cyan-50",
    ];
    return colors[index % colors.length];
  };

  // ✅ Get stats
  const stats = {
    total: students.length,
    filtered: filteredStudents.length,
    male: filteredStudents.filter((s) => s.gender === "male").length,
    female: filteredStudents.filter((s) => s.gender === "female").length,
  };

  return (
    <div className="space-y-4">
      {/* ✅ No Data State */}
      {!isDataLoaded ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              {isLoading ? (
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              ) : (
                <Database className="w-12 h-12 text-blue-600" />
              )}
            </div>
            <h1 className="text-2xl font-koulen text-gray-900 mb-3">
              {isLoading
                ? "កំពុងផ្ទុកទិន្នន័យ..."
                : "ទិន្នន័យសិស្សមិនទាន់ផ្ទុក"}
            </h1>
            <p className="text-sm text-gray-600 mb-8 leading-relaxed">
              {isLoading
                ? "សូមរង់ចាំបន្តិច យើងកំពុងទាញយកទិន្នន័យពីប្រព័ន្ធ"
                : "ចុចប៊ូតុងខាងក្រោម ដើម្បីផ្ទុកទិន្នន័យសិស្សទាំងអស់ពីប្រព័ន្ធ"}
            </p>
            {!isLoading && (
              <button
                onClick={handleLoadData}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg transition-all duration-200 inline-flex items-center gap-3 shadow-lg shadow-blue-500/30 hover:scale-105"
              >
                <Database className="w-5 h-5" />
                ផ្ទុកទិន្នន័យសិស្ស
              </button>
            )}
          </div>
        </div>
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
                    className="w-full h-12 pl-12 pr-12 text-sm font-medium border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus: ring-blue-500 focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover: text-gray-600 transition-colors"
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
                  className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 rounded-lg focus:outline-none focus: ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

          {/* ✅ View Mode Selector */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 font-medium">
                {searchQuery && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold mr-2">
                    <Search className="w-4 h-4" />"{searchQuery}"
                  </span>
                )}
                បង្ហាញ{" "}
                <strong className="text-blue-600 text-lg">
                  {filteredStudents.length}
                </strong>{" "}
                នាក់ ពី{" "}
                <strong className="text-gray-900 text-lg">
                  {students.length}
                </strong>{" "}
                នាក់
              </div>
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th
                          className={`px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide ${getColumnBg(
                            0
                          )}`}
                        >
                          លេខ
                        </th>
                        <th
                          className={`px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide ${getColumnBg(
                            1
                          )}`}
                        >
                          អត្តលេខ
                        </th>
                        <th
                          className={`px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide ${getColumnBg(
                            2
                          )}`}
                        >
                          គោត្តនាម និង នាម
                        </th>
                        <th
                          className={`px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide ${getColumnBg(
                            3
                          )}`}
                        >
                          ភេទ
                        </th>
                        <th
                          className={`px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide ${getColumnBg(
                            4
                          )}`}
                        >
                          ថ្នាក់
                        </th>
                        <th
                          className={`px-5 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wide ${getColumnBg(
                            5
                          )}`}
                        >
                          ថ្ងៃខែឆ្នាំកំណើត
                        </th>
                        <th
                          className={`px-5 py-4 text-center text-xs font-black text-gray-700 uppercase tracking-wide ${getColumnBg(
                            6
                          )}`}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => (
                        <tr
                          key={student.id}
                          className="border-b border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer"
                          onClick={() => handleViewStudent(student)}
                        >
                          <td
                            className={`px-5 py-4 text-sm text-gray-600 font-bold ${getColumnBg(
                              0
                            )}`}
                          >
                            {index + 1}
                          </td>
                          <td
                            className={`px-5 py-4 text-sm font-mono font-bold text-blue-600 ${getColumnBg(
                              1
                            )}`}
                          >
                            {student.studentId || "-"}
                          </td>
                          <td
                            className={`px-5 py-4 text-sm font-black text-gray-900 ${getColumnBg(
                              2
                            )}`}
                          >
                            {getFullName(student)}
                          </td>
                          <td className={`px-5 py-4 text-sm ${getColumnBg(3)}`}>
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
                          <td
                            className={`px-5 py-4 text-sm font-semibold text-gray-700 ${getColumnBg(
                              4
                            )}`}
                          >
                            {getClassName(student.classId)}
                          </td>
                          <td
                            className={`px-5 py-4 text-sm text-gray-600 ${getColumnBg(
                              5
                            )}`}
                          >
                            {formatDate(student.dateOfBirth)}
                          </td>
                          <td className={`px-5 py-4 text-sm ${getColumnBg(6)}`}>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md: grid-cols-2 lg: grid-cols-3 gap-4 p-6">
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
                          className="flex-1 h-10 bg-green-50 hover: bg-green-100 text-green-700 font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          កែប្រែ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ✅ Student Modal (New Integration) */}
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
