'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Filter, X, Clock, Users, BookOpen, GraduationCap } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Teacher, Subject, GradeLevel, getTeacherDisplayName } from './types';

interface HorizontalTeacherPanelProps {
  teachers: Teacher[];
  subjects: Subject[];
  selectedGradeLevel?: GradeLevel;
  isVisible: boolean;
  onToggle: () => void;
}

// Enhanced draggable teacher card
function TeacherCard({ teacher, selectedSubjectId }: { teacher: Teacher; selectedSubjectId?: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `teacher-${teacher.id}`,
    data: {
      type: 'TEACHER',
      teacherId: teacher.id,
      teacher,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const displayName = getTeacherDisplayName(teacher);
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const workloadPercent = Math.round((teacher.totalHoursAssigned / teacher.maxHoursPerWeek) * 100);
  const isOverloaded = workloadPercent > 100;
  const isNearMax = workloadPercent >= 80;

  // Get assigned classes info
  const assignedClasses = teacher.assignedClasses || [];
  const totalClasses = assignedClasses.length;
  const uniqueClasses = [...new Set(assignedClasses.map(c => c.className))];

  // Get status styling
  const getStatusStyle = () => {
    if (isOverloaded) return {
      bg: 'bg-gradient-to-br from-red-500 to-rose-600',
      border: 'border-red-200 hover:border-red-300',
      ring: 'ring-red-400',
      cardBg: 'bg-gradient-to-br from-red-50 to-rose-50',
      statusColor: 'text-red-600',
      statusBg: 'bg-red-100',
    };
    if (isNearMax) return {
      bg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      border: 'border-amber-200 hover:border-amber-300',
      ring: 'ring-amber-400',
      cardBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      statusColor: 'text-amber-600',
      statusBg: 'bg-amber-100',
    };
    return {
      bg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      border: 'border-gray-200 hover:border-indigo-300',
      ring: 'ring-indigo-400',
      cardBg: 'bg-white',
      statusColor: 'text-emerald-600',
      statusBg: 'bg-emerald-100',
    };
  };

  const statusStyle = getStatusStyle();

  // Get primary subjects
  const primarySubjects = teacher.subjects.filter(s => s.isPrimary).slice(0, 3);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-xl border overflow-hidden
        transition-all duration-200 w-[240px]
        ${statusStyle.cardBg} ${statusStyle.border}
        ${isDragging ? `shadow-2xl ring-2 ${statusStyle.ring} scale-105 z-50` : 'hover:shadow-lg'}
      `}
    >
      {/* Draggable Header */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing select-none p-3"
      >
        <div className="flex items-start gap-2.5">
          {/* Avatar */}
          <div className={`
            w-10 h-10 rounded-xl ${statusStyle.bg} flex items-center justify-center flex-shrink-0
            text-white text-sm font-bold shadow-md
          `}>
            {initials}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{displayName}</p>
            
            {/* Stats Row */}
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${statusStyle.statusBg} ${statusStyle.statusColor}`}>
                <Clock className="w-3 h-3" />
                {teacher.totalHoursAssigned}/{teacher.maxHoursPerWeek}h
              </span>
              {totalClasses > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-600">
                  <GraduationCap className="w-3 h-3" />
                  {uniqueClasses.length} class{uniqueClasses.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>

            {/* Workload Bar */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    isOverloaded ? 'bg-red-500' : isNearMax ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(workloadPercent, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 tabular-nums w-7">{workloadPercent}%</span>
            </div>
          </div>
        </div>

        {/* Subject Tags */}
        {primarySubjects.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {primarySubjects.map((subject) => (
              <span
                key={subject.id}
                className={`px-1.5 py-0.5 text-[9px] font-medium rounded-md ${
                  selectedSubjectId === subject.subjectId
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {subject.subjectCode}
              </span>
            ))}
            {teacher.subjects.length > 3 && (
              <span className="px-1.5 py-0.5 text-[9px] text-gray-400">
                +{teacher.subjects.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Assigned Classes Section */}
      {uniqueClasses.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Assigned Classes
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          
          {isExpanded && (
            <div className="px-3 pb-2 space-y-1">
              {uniqueClasses.slice(0, 5).map((className, idx) => {
                const classEntries = assignedClasses.filter(c => c.className === className);
                const totalHours = classEntries.reduce((sum, c) => sum + c.hoursPerWeek, 0);
                return (
                  <div key={idx} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] font-medium text-gray-700">{className}</span>
                    <span className="text-[9px] text-gray-400">{totalHours}h/week</span>
                  </div>
                );
              })}
              {uniqueClasses.length > 5 && (
                <div className="text-[9px] text-gray-400 text-center py-1">
                  +{uniqueClasses.length - 5} more classes
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No assignments indicator */}
      {uniqueClasses.length === 0 && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Available - No assignments
          </div>
        </div>
      )}

      {/* Drag hint overlay */}
      <div className="absolute inset-0 rounded-xl border-2 border-dashed border-indigo-400 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
    </div>
  );
}

export default function HorizontalTeacherPanel({
  teachers,
  subjects,
  selectedGradeLevel,
  isVisible,
  onToggle,
}: HorizontalTeacherPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Filter teachers
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
      }

      // Available only filter
      if (showAvailableOnly) {
        const workloadPercent = (teacher.totalHoursAssigned / teacher.maxHoursPerWeek) * 100;
        if (workloadPercent >= 100) return false;
      }

      return true;
    });
  }, [teachers, searchQuery, selectedSubjectId, showAvailableOnly]);

  // Group teachers by availability
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

  // Sort: available first, then near max, then overloaded
  const sortedTeachers = useMemo(() => {
    return [...groupedTeachers.available, ...groupedTeachers.nearMax, ...groupedTeachers.overloaded];
  }, [groupedTeachers]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
      >
        <ChevronDown className="w-4 h-4" />
        Show Teachers ({teachers.length})
      </button>
    );
  }

  return (
    <div className="mb-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">Drag Teachers to Timetable</span>
              <span className="text-xs text-gray-400">({filteredTeachers.length} of {teachers.length})</span>
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-gray-500">{groupedTeachers.available.length} available</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-500">{groupedTeachers.nearMax.length} busy</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-500">{groupedTeachers.overloaded.length} full</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${
                showFilters || selectedSubjectId ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {/* Collapse */}
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Filter by subject:</span>
            <button
              onClick={() => setSelectedSubjectId(undefined)}
              className={`px-2 py-1 text-xs rounded-lg transition-all ${
                !selectedSubjectId 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {subjects.slice(0, 8).map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubjectId(selectedSubjectId === subject.id ? undefined : subject.id)}
                className={`px-2 py-1 text-xs rounded-lg transition-all ${
                  selectedSubjectId === subject.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {subject.code}
              </button>
            ))}
            {subjects.length > 8 && (
              <span className="text-xs text-gray-400">+{subjects.length - 8} more</span>
            )}
            
            <div className="h-4 w-px bg-gray-200 mx-2" />
            
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300"
              />
              <span className="text-xs text-gray-600">Available only</span>
            </label>
          </div>
        )}
      </div>

      {/* Teacher Grid */}
      <div className="p-4">
        {sortedTeachers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-gray-500">No teachers found matching your filters</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {sortedTeachers.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                selectedSubjectId={selectedSubjectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
