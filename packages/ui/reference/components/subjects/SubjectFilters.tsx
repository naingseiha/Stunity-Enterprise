import React from "react";
import { Filter, Search } from "lucide-react";
import Select from "@/components/ui/Select";

interface SubjectFiltersProps {
  searchTerm: string;
  filterGrade: string;
  filterCategory: string;
  filterTrack: string;
  filterStatus: string;
  filteredCount: number;
  totalCount: number;
  onSearchChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onTrackChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function SubjectFilters({
  searchTerm,
  filterGrade,
  filterCategory,
  filterTrack,
  filterStatus,
  filteredCount,
  totalCount,
  onSearchChange,
  onGradeChange,
  onCategoryChange,
  onTrackChange,
  onStatusChange,
  onClearFilters,
}: SubjectFiltersProps) {
  const hasActiveFilters =
    searchTerm ||
    filterGrade !== "all" ||
    filterCategory !== "all" ||
    filterTrack !== "all" ||
    filterStatus !== "all";

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      {/* Filters Header */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <span className="text-sm font-semibold text-gray-700">
          ច្រោះតាមលក្ខណៈ
        </span>
      </div>

      {/* Filter Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* ✅ Search Input - matching Select height exactly */}
        <div className="relative w-full">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="ស្វែងរកមុខវិជ្ជា..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white cursor-text"
            style={{ height: "52px" }}
          />
        </div>

        <Select
          value={filterGrade}
          onChange={(e) => onGradeChange(e.target.value)}
          options={[
            { value: "all", label: "ថ្នាក់ទាំងអស់" },
            { value: "7", label: "ថ្នាក់ទី៧" },
            { value: "8", label: "ថ្នាក់ទី៨" },
            { value: "9", label: "ថ្នាក់ទី៩" },
            { value: "10", label: "ថ្នាក់ទី១០" },
            { value: "11", label: "ថ្នាក់ទី១១" },
            { value: "12", label: "ថ្នាក់ទី១២" },
          ]}
        />

        <Select
          value={filterCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          options={[
            { value: "all", label: "ប្រភេទទាំងអស់" },
            { value: "social", label: "សង្គម" },
            { value: "science", label: "វិទ្យាសាស្ត្រ" },
          ]}
        />

        <Select
          value={filterTrack}
          onChange={(e) => onTrackChange(e.target.value)}
          options={[
            { value: "all", label: "ផ្លូវទាំងអស់" },
            { value: "none", label: "គ្មាន" },
            { value: "science", label: "វិទ្យាសាស្ត្រ" },
            { value: "social", label: "សង្គម" },
          ]}
        />

        <Select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[
            { value: "all", label: "ស្ថានភាពទាំងអស់" },
            { value: "active", label: "សកម្ម" },
            { value: "inactive", label: "អសកម្ម" },
          ]}
        />
      </div>

      {/* Filter Summary */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          បង្ហាញ{" "}
          <span className="font-bold text-blue-600">{filteredCount}</span>{" "}
          ក្នុងចំណោម <span className="font-bold">{totalCount}</span> មុខវិជ្ជា
        </span>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            សម្អាតច្រោះ
          </button>
        )}
      </div>
    </div>
  );
}
