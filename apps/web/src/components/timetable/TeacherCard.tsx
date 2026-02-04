'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { User, Clock, AlertCircle, GripVertical } from 'lucide-react';
import { Teacher, getTeacherDisplayName } from './types';

interface TeacherCardProps {
  teacher: Teacher;
  selectedSubjectId?: string;
  isCompact?: boolean;
  showDragHandle?: boolean;
}

export default function TeacherCard({ 
  teacher, 
  selectedSubjectId,
  isCompact = false,
  showDragHandle = true 
}: TeacherCardProps) {
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
  const workloadPercent = Math.round((teacher.totalHoursAssigned / teacher.maxHoursPerWeek) * 100);
  const isOverloaded = workloadPercent > 100;
  const isNearMax = workloadPercent >= 80;

  // Filter subjects if a subject is selected
  const relevantSubjects = selectedSubjectId 
    ? teacher.subjects.filter(s => s.subjectId === selectedSubjectId)
    : teacher.subjects;

  const canTeachSelectedSubject = selectedSubjectId 
    ? relevantSubjects.length > 0
    : true;

  // Get status color
  const getStatusColor = () => {
    if (isOverloaded) return { bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-500' };
    if (isNearMax) return { bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-500' };
    return { bg: 'bg-white', border: 'border-gray-200', ring: 'ring-indigo-500' };
  };

  const colors = getStatusColor();

  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border
          cursor-grab active:cursor-grabbing select-none
          transition-all duration-200
          ${colors.bg} ${colors.border}
          ${isDragging ? `shadow-xl ring-2 ${colors.ring} scale-105 z-50` : 'hover:shadow-md hover:border-indigo-300'}
          ${!canTeachSelectedSubject ? 'opacity-40 pointer-events-none' : ''}
        `}
      >
        {showDragHandle && (
          <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
        )}
        
        {/* Avatar */}
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold
          ${isOverloaded ? 'bg-red-100 text-red-600' : 
            isNearMax ? 'bg-amber-100 text-amber-600' : 
            'bg-indigo-100 text-indigo-600'}
        `}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate leading-tight">{displayName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Mini workload bar */}
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden max-w-[60px]">
              <div 
                className={`h-full transition-all ${
                  isOverloaded ? 'bg-red-500' : isNearMax ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(workloadPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 tabular-nums">
              {teacher.totalHoursAssigned}/{teacher.maxHoursPerWeek}h
            </span>
          </div>
        </div>

        {/* Status indicator */}
        {isOverloaded && (
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        )}
      </div>
    );
  }

  // Full card (for drag overlay or expanded view)
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing select-none
        transition-all duration-200
        ${colors.bg} ${colors.border}
        ${isDragging ? `shadow-2xl ring-2 ${colors.ring} scale-105` : 'hover:shadow-lg'}
        ${!canTeachSelectedSubject ? 'opacity-40 pointer-events-none' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {showDragHandle && (
          <GripVertical className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
        )}
        
        {/* Avatar */}
        <div className={`
          w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold
          ${isOverloaded ? 'bg-gradient-to-br from-red-400 to-red-500 text-white' : 
            isNearMax ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white' : 
            'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'}
        `}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Name and status */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            {isOverloaded && (
              <span className="flex items-center gap-1 text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <AlertCircle className="w-3 h-3" />
                Full
              </span>
            )}
          </div>

          {/* Workload bar */}
          <div className="mt-2 flex items-center gap-2">
            <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  isOverloaded ? 'bg-red-500' : isNearMax ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(workloadPercent, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium tabular-nums ${
              isOverloaded ? 'text-red-600' : isNearMax ? 'text-amber-600' : 'text-gray-500'
            }`}>
              {teacher.totalHoursAssigned}/{teacher.maxHoursPerWeek}h
            </span>
          </div>

          {/* Subjects */}
          {teacher.subjects.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1">
              {teacher.subjects.slice(0, 3).map((subject) => (
                <span
                  key={subject.id}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                    subject.isPrimary 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-600'
                  } ${selectedSubjectId === subject.subjectId ? 'ring-1 ring-indigo-400' : ''}`}
                >
                  {subject.subjectCode}
                </span>
              ))}
              {teacher.subjects.length > 3 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                  +{teacher.subjects.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
