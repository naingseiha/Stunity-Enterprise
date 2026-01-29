"use client";

import React, { useState } from "react";
import { Home, AlertCircle, ChevronDown, Loader2, X } from "lucide-react"; // ✅ ADD X
import { classesApi } from "@/lib/api/classes";

type GradeType =
  | "7"
  | "8"
  | "9"
  | "10"
  | "11-science"
  | "11-social"
  | "12-science"
  | "12-social"
  | "all";

interface TeacherHomeroomClassSelectorProps {
  selectedClassId: string;
  onSelect: (classId: string) => void;
  error?: string;
  gradeOptions: Array<{ value: string; label: string }>;
}

export default function TeacherHomeroomClassSelector({
  selectedClassId,
  onSelect,
  error,
  gradeOptions,
}: TeacherHomeroomClassSelectorProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeType>("all");
  const [classesByGrade, setClassesByGrade] = useState<Record<string, any[]>>(
    {}
  );
  const [loadingClasses, setLoadingClasses] = useState<Record<string, boolean>>(
    {}
  );

  const loadClassesForGrade = async (grade: GradeType) => {
    if (grade === "all" || loadingClasses[grade] || classesByGrade[grade]) {
      return;
    }

    setLoadingClasses((prev) => ({ ...prev, [grade]: true }));

    try {
      let classes: any[] = [];
      const allClasses = await classesApi.getAll();

      if (grade.includes("-")) {
        const [gradeNum, track] = grade.split("-");
        classes = allClasses.filter(
          (c: any) => c.grade === gradeNum && c.track?.toLowerCase() === track
        );
      } else {
        classes = allClasses.filter((c: any) => c.grade === grade);
      }

      setClassesByGrade((prev) => ({ ...prev, [grade]: classes }));
    } catch (error) {
      console.error(`Failed to load classes: `, error);
      alert("បរាជ័យក្នុងការទាញយកថ្នាក់!");
    } finally {
      setLoadingClasses((prev) => ({ ...prev, [grade]: false }));
    }
  };

  const handleGradeChange = async (grade: GradeType) => {
    setSelectedGrade(grade);
    if (grade !== "all") {
      await loadClassesForGrade(grade);
    }
  };

  const getFilteredClasses = () => {
    if (selectedGrade === "all") {
      return Object.values(classesByGrade).flat();
    }
    return classesByGrade[selectedGrade] || [];
  };

  const filteredClasses = getFilteredClasses();

  // ✅ Get selected class name
  const selectedClass = filteredClasses.find((c) => c.id === selectedClassId);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border-2 border-amber-300 shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Home className="w-5 h-5 text-amber-600" />
            ថ្នាក់ប្រចាំ • Homeroom Class
            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full">
              ចាំបាច់
            </span>
          </h3>
          <p className="text-sm text-amber-700 mt-1 flex items-center gap-1 font-semibold">
            <AlertCircle className="w-4 h-4" />
            គ្រូប្រចាំថ្នាក់គ្រប់គ្រងបានតែមួយថ្នាក់ប៉ុណ្ណោះ
          </p>
        </div>

        <div className="relative">
          <select
            value={selectedGrade}
            onChange={(e) => handleGradeChange(e.target.value as GradeType)}
            className="px-4 py-2 pr-10 border-2 border-amber-300 rounded-lg font-bold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer"
          >
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.value !== "all" &&
                  classesByGrade[option.value] &&
                  ` (${classesByGrade[option.value].length})`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600 pointer-events-none" />
        </div>
      </div>

      {/* ✅ SHOW SELECTED CLASS WITH CLEAR BUTTON */}
      {selectedClassId && selectedClass && (
        <div className="mb-4 p-4 bg-white border-2 border-amber-400 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Home className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">
                  ថ្នាក់ប្រចាំបច្ចុប្បន្ន:{" "}
                </p>
                <p className="font-black text-gray-900 text-lg">
                  {selectedClass.name}
                </p>
                <p className="text-xs text-gray-600">
                  Grade {selectedClass.grade}
                  {selectedClass.section && ` • ${selectedClass.section}`}
                  {selectedClass._count?.students !== undefined &&
                    ` • ${selectedClass._count.students} សិស្ស`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect("")}
              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors group"
              title="ដកចេញពីគ្រូប្រចាំថ្នាក់"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {loadingClasses[selectedGrade] ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <span className="ml-2 text-gray-600 font-semibold">
            កំពុងទាញយក...
          </span>
        </div>
      ) : filteredClasses.length === 0 && selectedGrade !== "all" ? (
        <div className="text-center py-8 text-gray-500 font-semibold">
          មិនមានថ្នាក់សម្រាប់កម្រិតនេះ
        </div>
      ) : selectedGrade === "all" ? (
        <div className="text-center py-8 text-gray-400 font-semibold">
          👆 សូមជ្រើសរើសកម្រិតដើម្បីមើលថ្នាក់
        </div>
      ) : (
        <div className="relative">
          <select
            value={selectedClassId}
            onChange={(e) => onSelect(e.target.value)}
            className={`w-full px-4 py-3 pr-10 border-2 ${
              error ? "border-red-500" : "border-amber-300"
            } rounded-lg font-bold text-amber-900 bg-white focus:ring-2 focus:ring-amber-500 appearance-none cursor-pointer`}
          >
            <option value="">-- សូមជ្រើសរើសថ្នាក់ប្រចាំ --</option>
            {filteredClasses.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name} - Grade {classItem.grade}
                {classItem.section && ` • ${classItem.section}`}
                {classItem.track &&
                  ` • ${
                    classItem.track === "science" ? "វិទ្យាសាស្ត្រ" : "សង្គម"
                  }`}
                {classItem._count?.students !== undefined &&
                  ` (${classItem._count.students} សិស្ស)`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600 pointer-events-none" />
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2 font-semibold flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
