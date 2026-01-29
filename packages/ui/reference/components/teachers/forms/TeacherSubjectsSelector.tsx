"use client";

import React, { useState, useEffect, useMemo } from "react";
import { BookOpen, X, Loader2, Plus } from "lucide-react";
import { subjectsApi } from "@/lib/api/subjects";

interface TeacherSubjectsSelectorProps {
  selectedSubjects: string[];
  onToggle: (subjectId: string) => void;
  gradeOptions: { value: string; label: string }[];
  preloadedSubjects?: any[];
}

export default function TeacherSubjectsSelector({
  selectedSubjects,
  onToggle,
  gradeOptions,
  preloadedSubjects,
}: TeacherSubjectsSelectorProps) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("all");

  useEffect(() => {
    if (preloadedSubjects && preloadedSubjects.length > 0) {
      setSubjects(preloadedSubjects);
    } else {
      loadSubjects();
    }
  }, [preloadedSubjects]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await subjectsApi.getAll();
      setSubjects(data);
    } catch (error) {
      console.error("Error loading subjects:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Get unique selected subjects
  const uniqueSelectedSubjects = useMemo(() => {
    const uniqueIds = Array.from(new Set(selectedSubjects));
    const subjectObjects = uniqueIds
      .map((id) => subjects.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);
    return subjectObjects.sort((a, b) =>
      (a.nameKh || a.name).localeCompare(b.nameKh || b.name)
    );
  }, [selectedSubjects, subjects]);

  // Filter available subjects
  const filteredAvailableSubjects = useMemo(() => {
    let filtered = subjects.filter((s) => !selectedSubjects.includes(s.id));

    if (selectedGrade !== "all") {
      filtered = filtered.filter((s) => {
        const code = s.code?.toUpperCase() || "";
        if (selectedGrade === "11-science") {
          return code.includes("G11") && code.includes("SCIENCE");
        }
        if (selectedGrade === "11-social") {
          return code.includes("G11") && code.includes("SOCIAL");
        }
        if (selectedGrade === "12-science") {
          return code.includes("G12") && code.includes("SCIENCE");
        }
        if (selectedGrade === "12-social") {
          return code.includes("G12") && code.includes("SOCIAL");
        }
        return code.includes(`G${selectedGrade}`);
      });
    }

    return filtered.sort((a, b) =>
      (a.nameKh || a.name).localeCompare(b.nameKh || b.name)
    );
  }, [subjects, selectedSubjects, selectedGrade]);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-300 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-purple-900 text-lg">
              មុខវិជ្ជាបង្រៀន • Teaching Subjects
            </h3>
            <p className="text-xs text-purple-600">(ការដែលត្រូវបានចាត់តាំង)</p>
          </div>
        </div>
      </div>

      {/* ✅ SECTION 1: Currently Teaching */}
      <div className="bg-white rounded-xl p-4 border-2 border-purple-200 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-purple-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            បច្ចុប្បន្ន • Currently Teaching
          </h4>
          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
            {uniqueSelectedSubjects.length} មុខវិជ្ជា
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
          </div>
        ) : uniqueSelectedSubjects.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 font-semibold">
              មិនទាន់មានមុខវិជ្ជាដែលបានចាត់តាំង
            </p>
            <p className="text-xs text-gray-500 mt-1">
              សូមជ្រើសរើសមុខវិជ្ជាពីខាងក្រោម
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {uniqueSelectedSubjects.map((subject) => (
              <div
                key={subject.id}
                className="group relative flex items-center justify-between p-3 bg-white border-2 border-purple-200 hover:border-purple-400 hover:shadow-md rounded-lg transition-all duration-200"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <BookOpen className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-purple-900 truncate">
                      {subject.nameKh || subject.name}
                    </p>
                    <p className="text-xs text-purple-600 truncate">
                      {subject.code}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onToggle(subject.id)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-all group-hover:scale-110"
                  title="ដកមុខវិជ្ជាចេញ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ SECTION 2: Add New Subjects */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border-2 border-indigo-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-indigo-800 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            បន្ថែមមុខវិជ្ជាថ្មី • Add New Subjects
          </h4>
          {/* ✅ FIXED:  Larger dropdown */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-4 py-2.5 text-sm font-semibold border-2 border-indigo-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus: border-transparent transition-all cursor-pointer hover:border-indigo-400"
          >
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredAvailableSubjects.length === 0 ? (
            <div className="col-span-2 text-center py-8 bg-white rounded-lg border-2 border-dashed border-indigo-200">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-indigo-300" />
              <p className="text-sm text-indigo-600 font-semibold">
                គ្មានមុខវិជ្ជាថ្មីដើម្បីបន្ថែម
              </p>
            </div>
          ) : (
            filteredAvailableSubjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => onToggle(subject.id)}
                className="group flex items-center gap-2 p-3 bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg transition-all text-left hover:shadow-md hover:scale-[1.02]"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg flex items-center justify-center transition-colors">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-indigo-900 truncate">
                    {subject.nameKh || subject.name}
                  </p>
                  <p className="text-xs text-indigo-600 truncate">
                    {subject.code}
                  </p>
                </div>
                <Plus className="w-4 h-4 text-indigo-500 group-hover:text-indigo-700 flex-shrink-0 group-hover:scale-125 transition-transform" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Custom scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #a855f7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9333ea;
        }
      `}</style>
    </div>
  );
}
