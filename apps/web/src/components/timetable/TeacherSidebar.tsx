'use client';

import React, { useState, useMemo } from 'react';
import { Search, Users, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { Teacher, Subject, GradeLevel } from './types';
import TeacherCard from './TeacherCard';

interface TeacherSidebarProps {
  teachers: Teacher[];
  subjects: Subject[];
  selectedGradeLevel?: GradeLevel;
  selectedGrade?: number;
  selectedSubjectId?: string;
  onSubjectFilter: (subjectId: string | undefined) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function TeacherSidebar({
  teachers,
  subjects,
  selectedGradeLevel,
  selectedGrade,
  selectedSubjectId,
  onSubjectFilter,
  isCollapsed = false,
  onToggleCollapse,
}: TeacherSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['available']));

  // Filter teachers based on search and filters
  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      // Search filter
      const name = `${teacher.firstNameLatin || ''} ${teacher.lastNameLatin || ''} ${teacher.khmerName || ''}`.toLowerCase();
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Subject filter
      if (selectedSubjectId) {
        const canTeach = teacher.subjects.some((s) => s.subjectId === selectedSubjectId);
        if (!canTeach) return false;

        // Also check if they can teach the selected grade
        if (selectedGrade) {
          const subjectAssignment = teacher.subjects.find((s) => s.subjectId === selectedSubjectId);
          if (subjectAssignment && !subjectAssignment.grades.includes(selectedGrade)) {
            return false;
          }
        }
      }

      // Available only filter
      if (showAvailableOnly) {
        const workloadPercent = (teacher.totalHoursAssigned / teacher.maxHoursPerWeek) * 100;
        if (workloadPercent >= 100) return false;
      }

      return true;
    });
  }, [teachers, searchQuery, selectedSubjectId, selectedGrade, showAvailableOnly]);

  // Group teachers by availability status
  const groupedTeachers = useMemo(() => {
    const available: Teacher[] = [];
    const nearMax: Teacher[] = [];
    const overloaded: Teacher[] = [];

    filteredTeachers.forEach((teacher) => {
      const percent = (teacher.totalHoursAssigned / teacher.maxHoursPerWeek) * 100;
      if (percent >= 100) {
        overloaded.push(teacher);
      } else if (percent >= 80) {
        nearMax.push(teacher);
      } else {
        available.push(teacher);
      }
    });

    return { available, nearMax, overloaded };
  }, [filteredTeachers]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get subjects that can be taught at the selected grade level
  const relevantSubjects = useMemo(() => {
    if (!selectedGrade) return subjects;
    return subjects.filter((s) => {
      // Check if any teacher can teach this subject at this grade
      return teachers.some((t) =>
        t.subjects.some((ts) => ts.subjectId === s.id && ts.grades.includes(selectedGrade))
      );
    });
  }, [subjects, teachers, selectedGrade]);

  if (isCollapsed) {
    return (
      <div className="w-14 bg-white/80 backdrop-blur-sm border-l border-gray-100 flex flex-col items-center py-6 shadow-sm">
        <button
          onClick={onToggleCollapse}
          className="p-2.5 hover:bg-indigo-50 rounded-xl transition-all duration-200 group"
          title="Expand teacher panel"
        >
          <Users className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
        </button>
        <div className="mt-6 flex flex-col items-center gap-1">
          <span className="text-lg font-semibold text-gray-700">{filteredTeachers.length}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Teachers</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-80 bg-white/95 backdrop-blur-sm border-l border-gray-100 flex flex-col shadow-lg"
      style={{ height: 'calc(100vh - 64px)', position: 'sticky', top: '64px' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <GripVertical className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Drag Teachers</h3>
              <p className="text-xs text-gray-500">{filteredTeachers.length} available</p>
            </div>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 hover:bg-white rounded-lg transition-colors"
              title="Collapse panel"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Subject Filter Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => onSubjectFilter(undefined)}
            className={`px-2.5 py-1 text-xs rounded-full transition-all ${
              !selectedSubjectId 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            All
          </button>
          {relevantSubjects.slice(0, 4).map((subject) => (
            <button
              key={subject.id}
              onClick={() => onSubjectFilter(selectedSubjectId === subject.id ? undefined : subject.id)}
              className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                selectedSubjectId === subject.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
              }`}
            >
              {subject.code}
            </button>
          ))}
          {relevantSubjects.length > 4 && (
            <span className="px-2 py-1 text-xs text-gray-400">+{relevantSubjects.length - 4}</span>
          )}
        </div>
      </div>

      {/* Teacher List */}
      <div className="flex-1 overflow-y-auto">
        {/* Available Teachers */}
        {groupedTeachers.available.length > 0 && (
          <TeacherGroup
            title="Available"
            count={groupedTeachers.available.length}
            color="emerald"
            isExpanded={expandedCategories.has('available')}
            onToggle={() => toggleCategory('available')}
            teachers={groupedTeachers.available}
            selectedSubjectId={selectedSubjectId}
          />
        )}

        {/* Near Max Teachers */}
        {groupedTeachers.nearMax.length > 0 && (
          <TeacherGroup
            title="Near Limit"
            count={groupedTeachers.nearMax.length}
            color="amber"
            isExpanded={expandedCategories.has('nearMax')}
            onToggle={() => toggleCategory('nearMax')}
            teachers={groupedTeachers.nearMax}
            selectedSubjectId={selectedSubjectId}
          />
        )}

        {/* Overloaded Teachers */}
        {groupedTeachers.overloaded.length > 0 && (
          <TeacherGroup
            title="At Capacity"
            count={groupedTeachers.overloaded.length}
            color="red"
            isExpanded={expandedCategories.has('overloaded')}
            onToggle={() => toggleCategory('overloaded')}
            teachers={groupedTeachers.overloaded}
            selectedSubjectId={selectedSubjectId}
          />
        )}

        {filteredTeachers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600">No teachers found</p>
            <p className="text-xs text-gray-400 mt-1 text-center">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StatusBadge color="emerald" count={groupedTeachers.available.length} label="Free" />
            <StatusBadge color="amber" count={groupedTeachers.nearMax.length} label="Busy" />
            <StatusBadge color="red" count={groupedTeachers.overloaded.length} label="Full" />
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <span className="text-xs text-gray-500">Available only</span>
          </label>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function TeacherGroup({ 
  title, 
  count, 
  color, 
  isExpanded, 
  onToggle, 
  teachers, 
  selectedSubjectId 
}: {
  title: string;
  count: number;
  color: 'emerald' | 'amber' | 'red';
  isExpanded: boolean;
  onToggle: () => void;
  teachers: Teacher[];
  selectedSubjectId?: string;
}) {
  const colorClasses = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className="border-b border-gray-50 last:border-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-5 py-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colorClasses[color]}`} />
          <span className="text-xs font-medium text-gray-700">{title}</span>
          <span className="text-xs text-gray-400">({count})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {teachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={teacher}
              selectedSubjectId={selectedSubjectId}
              isCompact={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ color, count, label }: { color: 'emerald' | 'amber' | 'red'; count: number; label: string }) {
  const colorClasses = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };
  const bgClasses = {
    emerald: 'bg-emerald-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-5 h-5 rounded-full ${bgClasses[color]} flex items-center justify-center text-xs font-semibold ${colorClasses[color]}`}>
        {count}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
