import React from "react";
import { Filter, Search, Eye, EyeOff } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

interface ClassFiltersProps {
  showClasses: boolean;
  searchTerm: string;
  filterGrade: string;
  filterYear: string;
  filterStatus: string;
  academicYears: string[];
  filteredCount: number;
  totalCount: number;
  onToggleView: () => void;
  onSearchChange: (value: string) => void;
  onGradeChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function ClassFilters({
  showClasses,
  searchTerm,
  filterGrade,
  filterYear,
  filterStatus,
  academicYears,
  filteredCount,
  totalCount,
  onToggleView,
  onSearchChange,
  onGradeChange,
  onYearChange,
  onStatusChange,
  onClearFilters,
}: ClassFiltersProps) {
  const hasActiveFilters =
    searchTerm ||
    filterGrade !== "all" ||
    filterYear !== "all" ||
    filterStatus !== "all";

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
      {/* Toggle View Button */}
      <div className="mb-4">
        <Button
          onClick={onToggleView}
          variant={showClasses ? "secondary" : "primary"}
          icon={
            showClasses ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )
          }
          className="w-full"
        >
          {showClasses ? "លាក់ថ្នាក់រៀន" : "បង្ហាញថ្នាក់រៀន"}
        </Button>
      </div>

      {/* Filters */}
      {showClasses && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">
              ច្រោះតាមលក្ខណៈ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="ស្វែងរកថ្នាក់រៀន..."
              icon={<Search className="w-5 h-5" />}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ height: "52px" }}
            />

            <Select
              value={filterGrade}
              onChange={(e) => onGradeChange(e.target.value)}
              options={[
                { value: "all", label: "ថ្នាក់ទាំងអស់ • All Grades" },
                { value: "7", label: "ថ្នាក់ទី៧" },
                { value: "8", label: "ថ្នាក់ទី៨" },
                { value: "9", label: "ថ្នាក់ទី៩" },
                { value: "10", label: "ថ្នាក់ទី១០" },
                { value: "11", label: "ថ្នាក់ទី១១" },
                { value: "12", label: "ថ្នាក់ទី១២" },
              ]}
            />

            <Select
              value={filterYear}
              onChange={(e) => onYearChange(e.target.value)}
              options={[
                { value: "all", label: "ឆ្នាំសិក្សាទាំងអស់" },
                ...academicYears.map((year) => ({
                  value: year,
                  label: year,
                })),
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
              <span className="font-bold text-purple-600">{filteredCount}</span>{" "}
              ក្នុងចំណោម <span className="font-bold">{totalCount}</span>{" "}
              ថ្នាក់រៀន
            </span>
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="text-purple-600 hover:text-purple-800 font-semibold"
              >
                សម្អាតច្រោះ
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
