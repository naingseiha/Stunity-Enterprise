"use client";

import React, { useState, useEffect } from "react";
import { School, AlertCircle, ChevronDown, Loader2, X } from "lucide-react";
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

interface TeacherClassesSelectorProps {
  selectedClasses: string[];
  homeroomClassId: string;
  onToggle: (classId: string) => void;
  gradeOptions: Array<{ value: string; label: string }>;
  preloadedClasses?: any[];
}

export default function TeacherClassesSelector({
  selectedClasses,
  homeroomClassId,
  onToggle,
  gradeOptions,
  preloadedClasses = [],
}: TeacherClassesSelectorProps) {
  const [selectedGrade, setSelectedGrade] = useState<GradeType>("all");
  const [classesByGrade, setClassesByGrade] = useState<Record<string, any[]>>(
    {}
  );
  const [loadingClasses, setLoadingClasses] = useState<Record<string, boolean>>(
    {}
  );

  // Initialize with preloaded data
  useEffect(() => {
    if (preloadedClasses.length > 0) {
      console.log("🏫 Using preloaded classes:", preloadedClasses.length);

      const grouped: Record<string, any[]> = {};

      preloadedClasses.forEach((classItem) => {
        const grade = classItem.grade;

        if (!grouped[grade]) {
          grouped[grade] = [];
        }
        grouped[grade].push(classItem);

        if (grade === "11" || grade === "12") {
          if (classItem.track) {
            const key = `${grade}-${classItem.track.toLowerCase()}`;
            if (!grouped[key]) {
              grouped[key] = [];
            }
            grouped[key].push(classItem);
          }
        }
      });

      setClassesByGrade(grouped);
      console.log("✅ Classes grouped by grade:", Object.keys(grouped));
    }
  }, [preloadedClasses]);

  const loadClassesForGrade = async (grade: GradeType) => {
    if (grade === "all" || classesByGrade[grade]?.length > 0) {
      return;
    }

    if (loadingClasses[grade]) {
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
      console.error(`Failed to load classes:`, error);
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

  // ✅ FIXED: Get unique selected classes (remove duplicates)
  const getAllSelectedClasses = () => {
    const allClasses = Object.values(classesByGrade).flat();

    // ✅ Remove duplicates by ID
    const uniqueClasses = allClasses.filter(
      (c, index, self) => index === self.findIndex((t) => t.id === c.id)
    );

    // Filter only selected ones
    const selected = uniqueClasses.filter((c) =>
      selectedClasses.includes(c.id)
    );

    console.log("🔍 All classes:", allClasses.length);
    console.log("🔍 Unique classes:", uniqueClasses.length);
    console.log("🔍 Selected classes:", selected.length);

    return selected;
  };

  const filteredClasses = getFilteredClasses();
  const selectedClassesList = getAllSelectedClasses();

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <School className="w-5 h-5 text-green-600" />
            ថ្នាក់ដែលត្រូវបង្រៀន • Teaching Classes
            <span className="text-sm font-normal text-gray-600">
              (ជ្រើសរើសច្រើន)
            </span>
          </h3>
          <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            អាចជ្រើសរើសថ្នាក់ច្រើនដើម្បីបង្រៀន រួមទាំងថ្នាក់ប្រចាំផងដែរ
          </p>
        </div>

        <div className="relative">
          <select
            value={selectedGrade}
            onChange={(e) => handleGradeChange(e.target.value as GradeType)}
            className="px-4 py-2 pr-10 border-2 border-green-300 rounded-lg font-bold text-green-900 bg-white focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
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
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 pointer-events-none" />
        </div>
      </div>

      {/* ✅ SHOW SELECTED CLASSES WITH REMOVE BUTTONS (No Duplicates) */}
      {selectedClassesList.length > 0 && (
        <div className="mb-4 p-4 bg-white border-2 border-green-300 rounded-xl">
          <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <School className="w-4 h-4 text-green-600" />
            បានជ្រើសរើស ({selectedClassesList.length}):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedClassesList.map((classItem) => (
              <div
                key={classItem.id}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
                  homeroomClassId === classItem.id
                    ? "bg-amber-50 border-amber-400"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <School className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {classItem.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-600">
                        Grade {classItem.grade}
                      </span>
                      {homeroomClassId === classItem.id && (
                        <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-black rounded-full">
                          ថ្នាក់ប្រចាំ
                        </span>
                      )}
                      {classItem.track && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full">
                          {classItem.track === "science" ? "វិទ្យា" : "សង្គម"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(classItem.id)}
                  className="p-1. 5 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                  title="លុបចេញ"
                  disabled={homeroomClassId === classItem.id}
                >
                  <X
                    className={`w-4 h-4 ${
                      homeroomClassId === classItem.id
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-red-600"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          {homeroomClassId && selectedClasses.includes(homeroomClassId) && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              មិនអាចលុបថ្នាក់ប្រចាំចេញពីបញ្ជីបង្រៀនបានទេ
            </p>
          )}
        </div>
      )}

      {/* Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto border-2 border-green-100 rounded-lg p-3 bg-white">
        {loadingClasses[selectedGrade] ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600 font-semibold">
              កំពុងទាញយក...
            </span>
          </div>
        ) : filteredClasses.length === 0 && selectedGrade !== "all" ? (
          <div className="col-span-full text-center py-8 text-gray-500 font-semibold">
            មិនមានថ្នាក់សម្រាប់កម្រិតនេះ
          </div>
        ) : selectedGrade === "all" ? (
          <div className="col-span-full text-center py-8 text-gray-400 font-semibold">
            👆 សូមជ្រើសរើសកម្រិតដើម្បីមើលថ្នាក់
          </div>
        ) : (
          filteredClasses.map((classItem) => (
            <label
              key={classItem.id}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                selectedClasses.includes(classItem.id)
                  ? "bg-green-100 border-2 border-green-500 shadow-md"
                  : "bg-gray-50 border-2 border-gray-200 hover:border-green-300 hover:shadow-sm"
              } ${
                homeroomClassId === classItem.id ? "ring-2 ring-amber-400" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedClasses.includes(classItem.id)}
                onChange={() => onToggle(classItem.id)}
                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-gray-900">
                    {classItem.name}
                  </span>
                  {homeroomClassId === classItem.id && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
                      ថ្នាក់ប្រចាំ
                    </span>
                  )}
                  {classItem.track && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full">
                      {classItem.track === "science" ? "វិទ្យា" : "សង្គម"}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {classItem.section || `Grade ${classItem.grade}`}
                </span>
                {classItem._count?.students !== undefined && (
                  <span className="text-xs text-green-600 block mt-0.5 font-semibold">
                    {classItem._count.students} សិស្ស
                  </span>
                )}
              </div>
            </label>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between px-2">
        <p className="text-xs text-green-600 font-semibold">
          ✓ បានជ្រើសរើស: {selectedClasses.length} ថ្នាក់
        </p>
        {selectedClasses.length > 0 && (
          <button
            type="button"
            onClick={() => {
              selectedClasses
                .filter((id) => id !== homeroomClassId)
                .forEach((id) => onToggle(id));
            }}
            className="text-xs text-red-600 hover:text-red-800 font-bold underline"
          >
            លុបទាំងអស់ (លើកលែងថ្នាក់ប្រចាំ)
          </button>
        )}
      </div>
    </div>
  );
}
