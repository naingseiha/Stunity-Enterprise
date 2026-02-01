'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, X, AlertTriangle } from 'lucide-react';
import { TimetableEntry, DayOfWeek, ShiftType, getSubjectColors, getTeacherDisplayName } from './types';

interface TimetableCellProps {
  day: DayOfWeek;
  period: number;
  classId: string;
  shiftType: ShiftType;
  entry: TimetableEntry | null;
  isBreak?: boolean;
  hasConflict?: boolean;
  conflictMessage?: string;
  onCellClick: (day: DayOfWeek, period: number) => void;
  onEntryDelete?: (entryId: string) => void;
  isDropTarget?: boolean;
  isDraggedOver?: boolean;
}

// Draggable Entry Component
function DraggableEntry({ 
  entry, 
  onDelete 
}: { 
  entry: TimetableEntry; 
  onDelete?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry-${entry.id}`,
    data: {
      type: 'ENTRY',
      entry,
      fromSlot: {
        day: entry.dayOfWeek,
        period: entry.periodNumber,
        classId: entry.classId,
      },
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const colors = getSubjectColors(entry.subjectCategory);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative h-full p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing
        transition-all duration-200 group
        ${colors.bg} ${colors.border} ${colors.text}
        ${isDragging ? 'opacity-50 scale-95 shadow-lg ring-2 ring-indigo-500' : 'hover:shadow-md'}
      `}
    >
      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-white rounded-full shadow hover:bg-red-50"
        >
          <X className="w-3 h-3 text-red-500" />
        </button>
      )}

      {/* Content */}
      <div className="pt-3">
        <p className="font-semibold text-xs truncate" title={entry.subjectName}>
          {entry.subjectName || 'No Subject'}
        </p>
        <p className="text-xs opacity-75 truncate mt-0.5" title={entry.teacherName}>
          {entry.teacherName || 'No Teacher'}
        </p>
        {entry.room && (
          <p className="text-xs opacity-50 truncate mt-0.5">
            {entry.room}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TimetableCell({
  day,
  period,
  classId,
  shiftType,
  entry,
  isBreak = false,
  hasConflict = false,
  conflictMessage,
  onCellClick,
  onEntryDelete,
  isDropTarget = true,
  isDraggedOver = false,
}: TimetableCellProps) {
  const dropId = `${classId}-${day}-${period}`;
  
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: {
      day,
      period,
      classId,
      shiftType,
    },
    disabled: isBreak || !!entry,
  });

  const isHighlighted = isDropTarget && (isOver || isDraggedOver);

  // Break cell
  if (isBreak) {
    return (
      <td className="px-1 py-1 bg-gray-100 border-r border-gray-200">
        <div className="h-16 flex items-center justify-center">
          <span className="text-xs text-gray-400 italic">Break</span>
        </div>
      </td>
    );
  }

  return (
    <td 
      ref={setNodeRef}
      className={`
        px-1 py-1 border-r border-gray-200 relative
        ${hasConflict ? 'bg-red-50' : ''}
        ${isHighlighted ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''}
      `}
    >
      {/* Conflict indicator */}
      {hasConflict && (
        <div 
          className="absolute top-0 right-0 z-10"
          title={conflictMessage}
        >
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
      )}

      {entry ? (
        <div className="h-16">
          <DraggableEntry entry={entry} onDelete={onEntryDelete} />
        </div>
      ) : (
        <div
          onClick={() => onCellClick(day, period)}
          className={`
            h-16 border-2 border-dashed rounded-lg flex items-center justify-center
            cursor-pointer transition-all duration-200
            ${isHighlighted 
              ? 'border-indigo-400 bg-indigo-100 text-indigo-500' 
              : 'border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50'}
          `}
        >
          <Plus className="w-5 h-5" />
        </div>
      )}
    </td>
  );
}
