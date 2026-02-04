'use client';

import React, { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, X, AlertTriangle, User, Ban, ArrowRightLeft, Loader2 } from 'lucide-react';
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
  onTeacherDrop?: (teacherId: string, day: DayOfWeek, period: number) => void;
  isDropTarget?: boolean;
  isDraggedOver?: boolean;
  acceptTeacherDrop?: boolean;
  // New props for improved drag & drop
  isTeacherBusy?: boolean; // Teacher being dragged is busy at this slot
  draggedTeacherId?: string | null; // ID of teacher being dragged
  isPending?: boolean; // Is there a pending operation on this cell
  allowSwap?: boolean; // Allow swapping entries
}

// Draggable Entry Component
const DraggableEntry = memo(function DraggableEntry({ 
  entry, 
  onDelete,
  isPending = false,
}: { 
  entry: TimetableEntry; 
  onDelete?: (id: string) => void;
  isPending?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry-${entry.id}`,
    data: {
      type: 'ENTRY',
      entry,
      entryId: entry.id,
      fromSlot: {
        day: entry.dayOfWeek,
        period: entry.periodNumber,
        periodId: entry.periodId,
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
        transition-all duration-150 group
        ${colors.bg} ${colors.border} ${colors.text}
        ${isDragging ? 'opacity-50 scale-95 shadow-lg ring-2 ring-indigo-500' : 'hover:shadow-md'}
        ${isPending ? 'animate-pulse' : ''}
      `}
    >
      {/* Pending indicator */}
      {isPending && (
        <div className="absolute top-1 left-1">
          <Loader2 className="w-3 h-3 animate-spin text-white/70" />
        </div>
      )}

      {/* Drag handle */}
      <div 
        {...attributes}
        {...listeners}
        className={`absolute top-1 ${isPending ? 'left-5' : 'left-1'} opacity-0 group-hover:opacity-100 transition-opacity`}
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {/* Delete button */}
      {onDelete && !isPending && (
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
});

export default memo(function TimetableCell({
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
  onTeacherDrop,
  isDropTarget = true,
  isDraggedOver = false,
  acceptTeacherDrop = true,
  isTeacherBusy = false,
  draggedTeacherId = null,
  isPending = false,
  allowSwap = true,
}: TimetableCellProps) {
  const dropId = `${classId}-${day}-${period}`;
  
  // Determine if drop should be disabled
  const isDropDisabled = isBreak || isTeacherBusy;
  
  const { setNodeRef, isOver, active } = useDroppable({
    id: dropId,
    data: {
      type: 'SLOT',
      day,
      period,
      classId,
      shiftType,
      isEmpty: !entry,
      hasEntry: !!entry,
      entryId: entry?.id,
    },
    disabled: isDropDisabled,
  });

  // Check what's being dragged
  const isDraggingTeacher = active?.data?.current?.type === 'TEACHER';
  const isDraggingEntry = active?.data?.current?.type === 'ENTRY';
  const draggedEntryId = active?.data?.current?.entryId;
  
  // Determine visual states
  const isHighlighted = isDropTarget && isOver && !isTeacherBusy;
  const showUnavailable = isDraggingTeacher && isTeacherBusy;
  const showSwapIndicator = isDraggingEntry && entry && isOver && allowSwap && entry.id !== draggedEntryId;
  const canReceiveDrop = !isBreak && !isTeacherBusy && (isDraggingTeacher || isDraggingEntry);

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
        px-1 py-1 border-r border-gray-200 relative transition-all duration-150
        ${hasConflict ? 'bg-red-50' : ''}
        ${isHighlighted && !entry ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''}
        ${showUnavailable ? 'bg-red-50/50' : ''}
        ${showSwapIndicator ? 'bg-amber-50 ring-2 ring-inset ring-amber-400' : ''}
        ${isPending ? 'opacity-70' : ''}
      `}
    >
      {/* Unavailable overlay for busy teacher */}
      {showUnavailable && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-100/80 rounded-lg pointer-events-none">
          <div className="flex flex-col items-center text-red-600">
            <Ban className="w-5 h-5" />
            <span className="text-[9px] font-medium mt-0.5">Busy</span>
          </div>
        </div>
      )}

      {/* Conflict indicator */}
      {hasConflict && !showUnavailable && (
        <div 
          className="absolute top-0 right-0 z-10"
          title={conflictMessage}
        >
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
      )}

      {entry ? (
        <div className="h-16 relative">
          <DraggableEntry entry={entry} onDelete={onEntryDelete} isPending={isPending} />
          
          {/* Swap indicator overlay */}
          {showSwapIndicator && (
            <div className="absolute inset-0 bg-amber-500/20 rounded-lg flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white px-2 py-1 rounded-lg text-xs font-medium text-amber-700 shadow-lg flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                Swap
              </div>
            </div>
          )}
          
          {/* Replace teacher overlay */}
          {isHighlighted && isDraggingTeacher && !showUnavailable && (
            <div className="absolute inset-0 bg-indigo-500/20 rounded-lg flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-white px-2 py-1 rounded-lg text-xs font-medium text-indigo-600 shadow-lg">
                Replace Teacher
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !isPending && onCellClick(day, period)}
          className={`
            h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center
            transition-all duration-150
            ${isPending ? 'cursor-wait' : 'cursor-pointer'}
            ${showUnavailable
              ? 'border-red-300 bg-red-50 text-red-400'
              : isHighlighted 
                ? isDraggingTeacher
                  ? 'border-indigo-500 bg-indigo-100 text-indigo-600 scale-105 shadow-lg'
                  : isDraggingEntry
                    ? 'border-green-500 bg-green-100 text-green-600 scale-105 shadow-lg'
                    : 'border-indigo-400 bg-indigo-100 text-indigo-500' 
                : canReceiveDrop
                  ? 'border-indigo-300 bg-indigo-50/50 text-indigo-400'
                  : 'border-gray-200 text-gray-300 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50'
            }
          `}
        >
          {showUnavailable ? (
            <>
              <Ban className="w-4 h-4" />
              <span className="text-[9px] mt-0.5">Unavailable</span>
            </>
          ) : isHighlighted ? (
            isDraggingTeacher ? (
              <>
                <User className="w-5 h-5" />
                <span className="text-xs mt-0.5 font-medium">Drop here</span>
              </>
            ) : isDraggingEntry ? (
              <>
                <ArrowRightLeft className="w-5 h-5" />
                <span className="text-xs mt-0.5 font-medium">Move here</span>
              </>
            ) : (
              <Plus className="w-5 h-5" />
            )
          ) : (
            <Plus className="w-5 h-5" />
          )}
        </div>
      )}
    </td>
  );
});
