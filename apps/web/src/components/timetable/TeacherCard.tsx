'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { User, BookOpen, Clock, AlertTriangle, GripVertical } from 'lucide-react';
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

  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          flex items-center gap-2 p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing
          transition-all duration-200 hover:shadow-md
          ${isDragging ? 'shadow-lg ring-2 ring-indigo-500' : ''}
          ${!canTeachSelectedSubject ? 'opacity-40 cursor-not-allowed' : ''}
          ${isOverloaded ? 'border-red-300 bg-red-50' : 
            isNearMax ? 'border-yellow-300 bg-yellow-50' : 
            'border-gray-200 bg-white hover:border-indigo-300'}
        `}
      >
        {showDragHandle && (
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
          <p className="text-xs text-gray-500">{teacher.totalHoursAssigned}/{teacher.maxHoursPerWeek}h</p>
        </div>
        {isOverloaded && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-3 rounded-xl border-2 cursor-grab active:cursor-grabbing
        transition-all duration-200 hover:shadow-md
        ${isDragging ? 'shadow-lg ring-2 ring-indigo-500 scale-105' : ''}
        ${!canTeachSelectedSubject ? 'opacity-40 cursor-not-allowed' : ''}
        ${isOverloaded ? 'border-red-300 bg-red-50' : 
          isNearMax ? 'border-yellow-300 bg-yellow-50' : 
          'border-gray-200 bg-white hover:border-indigo-300'}
      `}
    >
      <div className="flex items-start gap-3">
        {showDragHandle && (
          <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
        )}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900 truncate">{displayName}</p>
            {isOverloaded && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Overloaded
              </span>
            )}
          </div>

          {/* Workload bar */}
          <div className="mt-2 flex items-center gap-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  isOverloaded ? 'bg-red-500' : isNearMax ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(workloadPercent, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${
              isOverloaded ? 'text-red-600' : isNearMax ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {teacher.totalHoursAssigned}/{teacher.maxHoursPerWeek}h
            </span>
          </div>

          {/* Subjects */}
          {teacher.subjects.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {teacher.subjects.slice(0, 3).map((subject) => (
                <span
                  key={subject.id}
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    subject.isPrimary 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-600'
                  } ${selectedSubjectId === subject.subjectId ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  {subject.subjectCode}
                </span>
              ))}
              {teacher.subjects.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
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
