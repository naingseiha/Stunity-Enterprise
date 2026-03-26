'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Users, Clock, GraduationCap, X, SlidersHorizontal } from 'lucide-react';
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

// Compact draggable teacher row
function TeacherRow({ teacher, selectedSubjectId }: { teacher: Teacher; selectedSubjectId?: string }) {
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
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 9999 : undefined,
  };

  const displayName = getTeacherDisplayName(teacher);
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const workloadPercent = teacher.maxHoursPerWeek > 0
    ? Math.round((teacher.totalHoursAssigned / teacher.maxHoursPerWeek) * 100)
    : 0;
  const isOverloaded = workloadPercent > 100;
  const isNearMax = workloadPercent >= 80;

  const avatarClass = isOverloaded
    ? 'bg-gradient-to-br from-red-500 to-rose-600'
    : isNearMax
    ? 'bg-gradient-to-br from-amber-500 to-orange-500'
    : 'bg-gradient-to-br from-indigo-500 to-purple-600';

  const barClass = isOverloaded ? 'bg-red-500' : isNearMax ? 'bg-amber-500' : 'bg-emerald-500';

  const statusDot = isOverloaded
    ? 'bg-red-500'
    : isNearMax
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const primarySubjects = teacher.subjects.filter(s => s.isPrimary).slice(0, 2);
  const uniqueClasses = [...new Set((teacher.assignedClasses || []).map(c => c.className))];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
        border border-transparent cursor-grab active:cursor-grabbing select-none
        transition-all duration-150
        ${isDragging
          ? 'bg-indigo-50 border-indigo-200 shadow-xl ring-2 ring-indigo-400 scale-[1.03] z-50'
          : 'hover:bg-slate-50 hover:border-slate-200 dark:hover:bg-slate-800/40 dark:hover:border-slate-700'
        }
      `}
      {...attributes}
      {...listeners}
    >
      {/* Avatar */}
      <div className={`relative w-9 h-9 rounded-xl ${avatarClass} flex items-center justify-center flex-shrink-0 text-white text-xs font-black shadow-sm`}>
        {initials}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${statusDot} border-2 border-white dark:border-slate-900`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-none">{displayName}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {/* Mini workload bar */}
          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-[50px]">
            <div
              className={`h-full rounded-full transition-all ${barClass}`}
              style={{ width: `${Math.min(workloadPercent, 100)}%` }}
            />
          </div>
          <span className={`text-[10px] font-bold tabular-nums ${isOverloaded ? 'text-red-500' : isNearMax ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {teacher.totalHoursAssigned}h
          </span>
          {uniqueClasses.length > 0 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
              <GraduationCap className="w-3 h-3" />
              {uniqueClasses.length}
            </span>
          )}
        </div>
      </div>

      {/* Subject badge */}
      {primarySubjects.length > 0 && (
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {primarySubjects.map(s => (
            <span
              key={s.id}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md leading-none ${
                selectedSubjectId === s.subjectId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              {s.subjectCode}
            </span>
          ))}
        </div>
      )}
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

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const name = `${teacher.firstNameLatin || ''} ${teacher.lastNameLatin || ''} ${teacher.khmerName || ''}`.toLowerCase();
      if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
      if (selectedSubjectId) {
        if (!teacher.subjects.some(s => s.subjectId === selectedSubjectId)) return false;
      }
      if (showAvailableOnly) {
        const pct = (teacher.totalHoursAssigned / teacher.maxHoursPerWeek) * 100;
        if (pct >= 100) return false;
      }
      return true;
    });
  }, [teachers, searchQuery, selectedSubjectId, showAvailableOnly]);

  const groupedTeachers = useMemo(() => {
    const available: Teacher[] = [];
    const nearMax: Teacher[] = [];
    const overloaded: Teacher[] = [];
    filteredTeachers.forEach((t) => {
      const pct = (t.totalHoursAssigned / t.maxHoursPerWeek) * 100;
      if (pct >= 100) overloaded.push(t);
      else if (pct >= 80) nearMax.push(t);
      else available.push(t);
    });
    return { available, nearMax, overloaded };
  }, [filteredTeachers]);

  const sortedTeachers = useMemo(() => [
    ...groupedTeachers.available,
    ...groupedTeachers.nearMax,
    ...groupedTeachers.overloaded,
  ], [groupedTeachers]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 mb-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 transition-all shadow-sm"
      >
        <Users className="w-4 h-4" />
        Teachers ({teachers.length})
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="mb-4 flex flex-col bg-white dark:bg-gray-900/80 rounded-2xl border border-slate-200/70 dark:border-gray-800/70 shadow-sm overflow-hidden max-h-[340px]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-950/60 flex-shrink-0">
        {/* Title & counts */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">Teachers</span>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {groupedTeachers.available.length}
            </span>
            {groupedTeachers.nearMax.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                {groupedTeachers.nearMax.length}
              </span>
            )}
            {groupedTeachers.overloaded.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {groupedTeachers.overloaded.length}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-36 pl-7 pr-2 py-1.5 text-xs bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 dark:text-white dark:placeholder:text-gray-600 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            showFilters || selectedSubjectId || showAvailableOnly
              ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300'
              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
          }`}
          title="Filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Collapse */}
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-slate-400 flex-shrink-0"
          title="Collapse"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 flex flex-wrap items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              className="w-3 h-3 text-indigo-600 rounded border-gray-300 dark:border-gray-700"
            />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Available only</span>
          </label>
          <div className="h-3 w-px bg-slate-200 dark:bg-gray-700" />
          <span className="text-[11px] text-slate-400">Subject:</span>
          <button
            onClick={() => setSelectedSubjectId(undefined)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-lg transition-all ${
              !selectedSubjectId ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {subjects.slice(0, 10).map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(selectedSubjectId === s.id ? undefined : s.id)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-lg transition-all ${
                selectedSubjectId === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {s.code}
            </button>
          ))}
          {subjects.length > 10 && (
            <span className="text-[11px] text-slate-400">+{subjects.length - 10} more</span>
          )}
        </div>
      )}

      {/* Scrollable teacher list — 3 columns */}
      <div className="overflow-y-auto flex-1 p-3">
        {sortedTeachers.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">No teachers match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {sortedTeachers.map((teacher) => (
              <TeacherRow
                key={teacher.id}
                teacher={teacher}
                selectedSubjectId={selectedSubjectId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 flex-shrink-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center">
          Drag a teacher onto a timetable slot to assign · {sortedTeachers.length} of {teachers.length} shown
        </p>
      </div>
    </div>
  );
}
