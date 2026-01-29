"use client";

import { useState } from "react";
import TeacherCard from "./TeacherCard";
import TeacherCreateModal from "./TeacherAddModal";
import TeacherEditModal from "./TeacherEditModal";
import TeacherDetailsModal from "../modals/TeacherDetailsModal";
import {
  Plus,
  Search,
  Grid,
  List,
  RefreshCw,
  Loader2,
  Database,
} from "lucide-react";
import { teachersApi } from "@/lib/api/teachers";

interface TeacherListViewProps {
  teachers: any[];
  subjects: any[];
  isDataLoaded: boolean; // ✅ NEW
  loading?: boolean; // ✅ NEW
  onLoadData: () => Promise<void>; // ✅ NEW
  onRefresh: () => void;
}

export default function TeacherListView({
  teachers,
  subjects,
  isDataLoaded,
  loading = false,
  onLoadData,
  onRefresh,
}: TeacherListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [loadingTeacherDetails, setLoadingTeacherDetails] = useState(false);

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setEditModalOpen(true);
  };

  const handleView = async (teacher: any) => {
    // Show loading state
    setLoadingTeacherDetails(true);

    // Fetch full teacher data with all relations
    try {
      const fullTeacherData = await teachersApi.getById(teacher.id);
      if (fullTeacherData) {
        setSelectedTeacher(fullTeacherData);
        setViewModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch teacher details:", error);
      // Fallback to lightweight data
      setSelectedTeacher(teacher);
      setViewModalOpen(true);
    } finally {
      setLoadingTeacherDetails(false);
    }
  };

  const handleDelete = async (teacherId: string) => {
    if (
      !confirm(
        "តើអ្នកប្រាកដថាចង់លុបគ្រូបង្រៀននេះមែនទេ?\nAre you sure you want to delete this teacher?"
      )
    ) {
      return;
    }

    try {
      await teachersApi.delete(teacherId);
      alert("✅ លុបគ្រូបង្រៀនបានជោគជ័យ!");
      onRefresh();
    } catch (error: any) {
      console.error("Failed to delete teacher:", error);
      alert(`❌ បរាជ័យក្នុងការលុប: ${error.message}`);
    }
  };

  const handleCreateSuccess = () => {
    onRefresh();
    setCreateModalOpen(false);
  };

  const handleEditSuccess = () => {
    onRefresh();
    setEditModalOpen(false);
  };

  // Filter teachers
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.khmerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.phone?.includes(searchQuery);

    const matchesRole = filterRole === "all" || teacher.role === filterRole;

    const matchesGrade =
      filterGrade === "all" ||
      teacher.teachingClasses?.some((tc: any) =>
        tc.class?.name?.includes(filterGrade)
      );

    return matchesSearch && matchesRole && matchesGrade;
  });

  // ✅ Show beautiful empty state if not loaded
  if (!isDataLoaded) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 rounded-2xl border-2 border-dashed border-gray-200 shadow-sm">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-5 left-5 w-24 h-24 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-5 right-5 w-24 h-24 bg-indigo-500 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 text-center px-6 py-10">
          {/* Icon */}
          <div className="mb-4 inline-flex">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                <Database className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-md animate-bounce">
                <span className="text-xs">✨</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-koulen text-gray-900 mb-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent khmer-title">
            រៀបចំជាស្រេច!
          </h1>
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Ready to Load Teacher Data
          </p>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-5 max-w-md mx-auto khmer-text">
            ចុចប៊ូតុង{" "}
            <span className="font-bold text-blue-600">"ផ្ទុកទិន្នន័យ"</span>{" "}
            ដើម្បីទាញយកបញ្ជីគ្រូបង្រៀនទាំងអស់
          </p>

          {/* Load Button */}
          <button
            onClick={onLoadData}
            disabled={loading}
            className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none inline-flex items-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="khmer-text">កំពុងផ្ទុក...</span>
              </>
            ) : (
              <>
                <Database className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="khmer-text">ផ្ទុកទិន្នន័យគ្រូបង្រៀន</span>
              </>
            )}
          </button>

          {/* Info cards */}
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-blue-600 text-xl font-koulen mb-1">⚡</div>
              <p className="text-xs font-bold text-gray-900 khmer-text">
                ផ្ទុកលឿន
              </p>
              <p className="text-xs text-gray-500">Optimized</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-indigo-600 text-xl font-koulen mb-1">🔄</div>
              <p className="text-xs font-bold text-gray-900">Real-time</p>
              <p className="text-xs text-gray-500 khmer-text">ទិន្នន័យថ្មី</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-purple-600 text-xl font-koulen mb-1">✅</div>
              <p className="text-xs font-bold text-gray-900 khmer-text">
                សុវត្ថិភាព
              </p>
              <p className="text-xs text-gray-500">Secure</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Show full interface after loaded
  return (
    <>
      {/* Filters and Actions - Modern Design */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ស្វែងរកគ្រូបង្រៀន... (ឈ្មោះ, អ៊ីមែល, ទូរស័ព្ទ)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
              />
            </div>
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white hover:border-gray-300"
          >
            <option value="all">តួនាទីទាំងអស់</option>
            <option value="TEACHER">គ្រូបង្រៀន</option>
            <option value="INSTRUCTOR">គ្រូប្រចាំថ្នាក់</option>
          </select>

          {/* Grade Filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white hover:border-gray-300"
          >
            <option value="all">កម្រិតទាំងអស់</option>
            <option value="ថ្នាក់ទី៧">ថ្នាក់ទី៧</option>
            <option value="ថ្នាក់ទី៨">ថ្នាក់ទី៨</option>
            <option value="ថ្នាក់ទី៩">ថ្នាក់ទី៩</option>
            <option value="ថ្នាក់ទី១០">ថ្នាក់ទី១០</option>
            <option value="ថ្នាក់ទី១១">ថ្នាក់ទី១១</option>
            <option value="ថ្នាក់ទី១២">ថ្នាក់ទី១២</option>
          </select>

          {/* View Toggle */}
          <div className="flex gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white shadow-md scale-105"
                  : "hover:bg-gray-200 hover:scale-105"
              }`}
              title="ប្រូក្រឡា"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white shadow-md scale-105"
                  : "hover:bg-gray-200 hover:scale-105"
              }`}
              title="តារាង"
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-5 py-3 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 border-2 border-gray-300 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2.5 hover:scale-105 active:scale-95"
            title="ផ្ទុកឡើងវិញ"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">ផ្ទុកឡើងវិញ</span>
          </button>

          {/* Add New */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            បន្ថែមគ្រូ
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          បង្ហាញ <strong>{filteredTeachers.length}</strong> ពី{" "}
          <strong>{teachers.length}</strong> គ្រូបង្រៀន
        </p>
      </div>

      {/* Teachers Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">កំពុងផ្ទុកទិន្នន័យ...</p>
          </div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold mb-2">
            គ្មានគ្រូបង្រៀនត្រូវនឹងលក្ខខណ្ឌស្វែងរក
          </p>
          <p className="text-sm text-gray-500">
            សូមព្យាយាមប្តូរលក្ខខណ្ឌស្វែងរក
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {filteredTeachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {createModalOpen && (
        <TeacherCreateModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          subjects={subjects}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editModalOpen && selectedTeacher && (
        <TeacherEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          teacher={selectedTeacher}
          subjects={subjects}
          onSuccess={handleEditSuccess}
        />
      )}

      {viewModalOpen && selectedTeacher && (
        <TeacherDetailsModal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          teacher={selectedTeacher}
        />
      )}

      {/* Loading Modal for Teacher Details */}
      {loadingTeacherDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  <span className="text-lg">✨</span>
                </div>
              </div>
              <h3 className="text-xl font-koulen text-gray-900 mb-2 khmer-title">
                កំពុងទាញយកទិន្នន័យ...
              </h3>
              <p className="text-sm text-gray-600 font-semibold">
                Loading teacher details
              </p>
              <div className="mt-4 flex justify-center gap-1">
                <div
                  className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
