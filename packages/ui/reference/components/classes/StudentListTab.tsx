"use client";

import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Upload,
  Trash2,
  Search,
  Filter,
  Download,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  Award,
  ArrowUpDown,
} from "lucide-react";
import { Student } from "@/lib/api/classes";
import Button from "@/components/ui/Button";
import { useToast } from "@/hooks/useToast";

interface StudentListTabProps {
  students: Student[];
  classId: string;
  loading?: boolean;
  onAddStudent: () => void;
  onImportStudents: () => void;
  onRemoveStudent: (studentId: string) => void;
}

export default function StudentListTab({
  students,
  classId,
  loading = false,
  onAddStudent,
  onImportStudents,
  onRemoveStudent,
}: StudentListTabProps) {
  const { success, warning } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "MALE" | "FEMALE">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"name" | "id" | "gender">("name");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <Sparkles className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-gray-600 mt-4 font-medium">
          កំពុងផ្ទុកបញ្ជីសិស្ស...{" "}
        </p>
      </div>
    );
  }

  // Filter and sort students
  const filteredStudents = students
    .filter((student) => {
      const matchesSearch =
        (student.khmerName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.firstName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.lastName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.studentId || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (student.email || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesGender =
        genderFilter === "all" || student.gender === genderFilter;

      return matchesSearch && matchesGender;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        const nameA = a.khmerName || `${a.firstName} ${a.lastName}`;
        const nameB = b.khmerName || `${b.firstName} ${b.lastName}`;
        return nameA.localeCompare(nameB);
      } else if (sortBy === "id") {
        return (a.studentId || "").localeCompare(b.studentId || "");
      } else if (sortBy === "gender") {
        return a.gender.localeCompare(b.gender);
      }
      return 0;
    });

  const maleCount = students.filter((s) => s.gender === "MALE").length;
  const femaleCount = students.filter((s) => s.gender === "FEMALE").length;

  const handleExportStudents = () => {
    warning(
      "នាំចេញសិស្ស • Export Students\n\nមុខងារនេះនឹងត្រូវ implement ជាមួយ CSV/Excel export"
    );
  };

  const handleRemoveStudent = (student: Student) => {
    if (
      confirm(
        `តើអ្នកចង់ដកសិស្ស "${
          student.khmerName || student.firstName
        }" ចេញពីថ្នាក់នេះមែនទេ?\n\nសិស្សនឹងមិនត្រូវបានលុបចេញទេ គ្រាន់តែដកចេញពីថ្នាក់ប៉ុណ្ណោះ។`
      )
    ) {
      onRemoveStudent(student.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Stats */}
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-xl shadow-md">
              <Users className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-koulen text-gray-900">
                បញ្ជីសិស្សសរុប
              </h1>
              <p className="text-sm text-gray-600 font-medium">
                Student List • Total Students
              </p>
            </div>
          </div>

          {/* ✅ FIXED: Better Button Design */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportStudents}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-all font-bold shadow-sm hover:shadow"
            >
              <Download className="w-5 h-5" />
              <span>នាំចេញ</span>
            </button>

            <button
              onClick={onImportStudents}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition-all font-bold shadow-sm hover:shadow"
            >
              <Upload className="w-5 h-5" />
              <span>នាំចូល</span>
            </button>

            <button
              onClick={onAddStudent}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-all font-bold shadow-md hover:shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              <span>បន្ថែមសិស្ស</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-purple-100">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-bold text-gray-600">សរុប</span>
            </div>
            <p className="text-3xl font-moul text-purple-600">
              {students.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">នាក់ • Students</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👨‍🎓</span>
              <span className="text-sm font-bold text-gray-600">ប្រុស</span>
            </div>
            <p className="text-3xl font-moul text-blue-600">{maleCount}</p>
            <p className="text-xs text-gray-500 mt-1">
              {students.length > 0
                ? Math.round((maleCount / students.length) * 100)
                : 0}
              % • Male
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-pink-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">👩‍🎓</span>
              <span className="text-sm font-bold text-gray-600">ស្រី</span>
            </div>
            <p className="text-3xl font-moul text-pink-600">{femaleCount}</p>
            <p className="text-xs text-gray-500 mt-1">
              {students.length > 0
                ? Math.round((femaleCount / students.length) * 100)
                : 0}
              % • Female
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      {students.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-bold text-gray-700">
              ច្រោះ & ស្វែងរក • Filter & Search
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ស្វែងរកតាមឈ្មោះ, លេខសម្គាល់, ឬអ៊ីមែល..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Gender Filter */}
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer font-medium"
            >
              <option value="all">ភេទទាំងអស់ • All Genders</option>
              <option value="MALE">👨‍🎓 ប្រុស • Male</option>
              <option value="FEMALE">👩‍🎓 ស្រី • Female</option>
            </select>
          </div>

          {/* Results count */}
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-3">
              រកឃើញ{" "}
              <span className="font-bold text-purple-600">
                {filteredStudents.length}
              </span>{" "}
              នាក់
            </p>
          )}
        </div>
      )}

      {/* Student Table */}
      {students.length > 0 ? (
        filteredStudents.length > 0 ? (
          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider">
                      <button
                        onClick={() => setSortBy("id")}
                        className="flex items-center gap-1 hover:text-purple-200 transition-colors"
                      >
                        លេខសម្គាល់
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider">
                      <button
                        onClick={() => setSortBy("name")}
                        className="flex items-center gap-1 hover:text-purple-200 transition-colors"
                      >
                        ឈ្មោះសិស្ស
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider">
                      <button
                        onClick={() => setSortBy("gender")}
                        className="flex items-center gap-1 hover:text-purple-200 transition-colors"
                      >
                        ភេទ
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider">
                      ថ្ងៃកំណើត
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-wider">
                      ទំនាក់ទំនង
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-wider">
                      សកម្មភាព
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student, index) => (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        index % 2 === 0
                          ? "bg-white hover:bg-purple-50"
                          : "bg-gray-50 hover:bg-purple-50"
                      }`}
                    >
                      {/* Row Number */}
                      <td className="px-4 py-4">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                          {index + 1}
                        </div>
                      </td>

                      {/* Student ID */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-gray-400" />
                          <span className="font-bold text-gray-900">
                            {student.studentId || "N/A"}
                          </span>
                        </div>
                      </td>

                      {/* Student Name */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${
                              student.gender === "MALE"
                                ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                                : "bg-gradient-to-br from-pink-500 to-rose-500"
                            }`}
                          >
                            {(student.khmerName || student.firstName)
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">
                              {student.khmerName ||
                                `${student.firstName} ${student.lastName}`}
                            </p>
                            {student.email && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <Mail className="w-3 h-3" />
                                <span>{student.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Gender */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black shadow-sm ${
                            student.gender === "MALE"
                              ? "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-2 border-blue-300"
                              : "bg-gradient-to-r from-pink-100 to-rose-100 text-pink-800 border-2 border-pink-300"
                          }`}
                        >
                          <span className="text-base">
                            {student.gender === "MALE" ? "👨‍🎓" : "👩‍🎓"}
                          </span>
                          {student.gender === "MALE" ? "ប្រុស" : "ស្រី"}
                        </span>
                      </td>

                      {/* Date of Birth */}
                      <td className="px-4 py-4">
                        {student.dateOfBirth ? (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {new Date(student.dateOfBirth).toLocaleDateString(
                                "km-KH"
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4">
                        {student.phoneNumber ? (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {student.phoneNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleRemoveStudent(student)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-bold border-2 border-red-200 hover:border-red-300 shadow-sm hover:shadow"
                          title="ដកចេញពីថ្នាក់"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-xs">ដកចេញ</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-bold text-lg">រកមិនឃើញសិស្ស</p>
            <p className="text-gray-500 text-sm mt-2">
              សូមព្យាយាមស្វែងរកដោយពាក្យគន្លឹះផ្សេង
            </p>
          </div>
        )
      ) : (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-16 text-center">
          <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-xl font-koulen text-gray-900 mb-2">
            មិនទាន់មានសិស្សក្នុងថ្នាក់នេះ
          </h1>
          <p className="text-gray-600 mb-6">
            ចុចប៊ូតុង "បន្ថែមសិស្ស" ឬ "នាំចូលសិស្ស" ដើម្បីបន្ថែមសិស្ស
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              icon={<Upload className="w-5 h-5" />}
              onClick={onImportStudents}
            >
              នាំចូលសិស្ស
            </Button>
            <Button
              variant="primary"
              icon={<UserPlus className="w-5 h-5" />}
              onClick={onAddStudent}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              បន្ថែមសិស្ស
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
