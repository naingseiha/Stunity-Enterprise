"use client";

import { Search, Filter } from "lucide-react";

interface ParentFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  relationshipFilter: string;
  onRelationshipChange: (value: string) => void;
}

export default function ParentFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  relationshipFilter,
  onRelationshipChange,
}: ParentFiltersProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-600" />
        <h3 className="font-khmer-body font-semibold text-gray-900">
          ការស្វែងរក និងតម្រង
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ស្វែងរកតាមឈ្មោះ លេខទូរស័ព្ទ..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 p-3 border border-gray-200 rounded-xl
              font-khmer-body focus:ring-2 focus:ring-purple-500
              focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="p-3 border border-gray-200 rounded-xl font-khmer-body
            focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">ស្ថានភាព: ទាំងអស់</option>
          <option value="with-account">មានគណនី</option>
          <option value="without-account">គ្មានគណនី</option>
          <option value="active">សកម្ម</option>
          <option value="inactive">អសកម្ម</option>
        </select>

        {/* Relationship Filter */}
        <select
          value={relationshipFilter}
          onChange={(e) => onRelationshipChange(e.target.value)}
          className="p-3 border border-gray-200 rounded-xl font-khmer-body
            focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">តួនាទី: ទាំងអស់</option>
          <option value="FATHER">ឪពុក</option>
          <option value="MOTHER">ម្តាយ</option>
          <option value="GUARDIAN">អាណាព្យាបាល</option>
          <option value="STEP_FATHER">ឪពុកចុង</option>
          <option value="STEP_MOTHER">ម្តាយចុង</option>
          <option value="GRANDPARENT">ជីតា/យាយ</option>
          <option value="OTHER">ផ្សេងៗ</option>
        </select>
      </div>
    </div>
  );
}
