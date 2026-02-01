'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Users, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['available', 'all']));

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
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Expand teacher panel"
        >
          <Users className="w-5 h-5 text-gray-600" />
        </button>
        <div className="mt-4 text-xs font-medium text-gray-500 writing-vertical">
          {filteredTeachers.length} Teachers
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Teachers
            <span className="text-sm font-normal text-gray-500">({filteredTeachers.length})</span>
          </h3>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Subject Filter */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Subject</label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => onSubjectFilter(e.target.value || undefined)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Subjects</option>
            {relevantSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Filters */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showAvailableOnly}
            onChange={(e) => setShowAvailableOnly(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <span className="text-gray-700">Show available only</span>
        </label>
      </div>

      {/* Teacher List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Available Teachers */}
        {groupedTeachers.available.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory('available')}
              className="flex items-center justify-between w-full text-left mb-2"
            >
              <span className="text-xs font-semibold text-green-600 uppercase tracking-wide flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Available ({groupedTeachers.available.length})
              </span>
              {expandedCategories.has('available') ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedCategories.has('available') && (
              <div className="space-y-2">
                {groupedTeachers.available.map((teacher) => (
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
        )}

        {/* Near Max Teachers */}
        {groupedTeachers.nearMax.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory('nearMax')}
              className="flex items-center justify-between w-full text-left mb-2"
            >
              <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wide flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Near Capacity ({groupedTeachers.nearMax.length})
              </span>
              {expandedCategories.has('nearMax') ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedCategories.has('nearMax') && (
              <div className="space-y-2">
                {groupedTeachers.nearMax.map((teacher) => (
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
        )}

        {/* Overloaded Teachers */}
        {groupedTeachers.overloaded.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory('overloaded')}
              className="flex items-center justify-between w-full text-left mb-2"
            >
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Overloaded ({groupedTeachers.overloaded.length})
              </span>
              {expandedCategories.has('overloaded') ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {expandedCategories.has('overloaded') && (
              <div className="space-y-2">
                {groupedTeachers.overloaded.map((teacher) => (
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
        )}

        {filteredTeachers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No teachers found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-green-600">{groupedTeachers.available.length}</p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
          <div>
            <p className="text-lg font-bold text-yellow-600">{groupedTeachers.nearMax.length}</p>
            <p className="text-xs text-gray-500">Near Max</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{groupedTeachers.overloaded.length}</p>
            <p className="text-xs text-gray-500">Over</p>
          </div>
        </div>
      </div>
    </div>
  );
}
