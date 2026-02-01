'use client';

import React, { useMemo } from 'react';
import { 
  DAYS, 
  DAY_LABELS, 
  PERIOD_TIMES, 
  TimetableEntry, 
  ClassShiftSchedule, 
  DayOfWeek, 
  ShiftType,
  ConflictInfo 
} from './types';
import TimetableCell from './TimetableCell';

interface ClassTimetableGridProps {
  classId: string;
  className: string;
  grade: number;
  entries: TimetableEntry[];
  shiftSchedule: ClassShiftSchedule[];
  conflicts?: ConflictInfo[];
  onCellClick: (day: DayOfWeek, period: number) => void;
  onEntryDelete?: (entryId: string) => void;
  highlightedSlots?: Set<string>; // Format: "day-period"
  academicYearId: string;
}

export default function ClassTimetableGrid({
  classId,
  className,
  grade,
  entries,
  shiftSchedule,
  conflicts = [],
  onCellClick,
  onEntryDelete,
  highlightedSlots = new Set(),
  academicYearId,
}: ClassTimetableGridProps) {
  // Build a grid of entries for quick lookup
  const entryGrid = useMemo(() => {
    const grid: Record<string, TimetableEntry> = {};
    entries.forEach((entry) => {
      const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
      grid[key] = entry;
    });
    return grid;
  }, [entries]);

  // Build conflict lookup
  const conflictGrid = useMemo(() => {
    const grid: Record<string, ConflictInfo> = {};
    conflicts.forEach((conflict) => {
      if (conflict.entryId) {
        const entry = entries.find(e => e.id === conflict.entryId);
        if (entry) {
          const key = `${entry.dayOfWeek}-${entry.periodNumber}`;
          grid[key] = conflict;
        }
      }
    });
    return grid;
  }, [conflicts, entries]);

  // Get shift for each day
  const dayShifts = useMemo(() => {
    const shifts: Record<DayOfWeek, ShiftType> = {} as Record<DayOfWeek, ShiftType>;
    DAYS.forEach((day) => {
      const schedule = shiftSchedule.find((s) => s.dayOfWeek === day);
      // Default: Secondary (7-9) = Afternoon, High School (10-12) = Morning
      const defaultShift = grade >= 7 && grade <= 9 ? 'AFTERNOON' : 'MORNING';
      shifts[day] = schedule?.shiftType || defaultShift;
    });
    return shifts;
  }, [shiftSchedule, grade]);

  // Get unique shifts used
  const shiftsUsed = useMemo(() => {
    const shifts = new Set(Object.values(dayShifts));
    return Array.from(shifts);
  }, [dayShifts]);

  // Calculate period numbers based on shift
  const periods = [1, 2, 3, 4, 5];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <h3 className="font-bold text-lg">{className}</h3>
        <p className="text-sm text-white/80">Grade {grade} • {shiftsUsed.length > 1 ? 'Mixed Shifts' : shiftsUsed[0]}</p>
      </div>

      {/* Timetable Grid */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 w-24 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                <div>Period</div>
                <div className="text-xs font-normal text-gray-500">ម៉ោង</div>
              </th>
              {DAYS.map((day) => (
                <th key={day} className="px-2 py-3 text-center border-r border-gray-200">
                  <div className="text-sm font-semibold text-gray-700">{DAY_LABELS[day].en}</div>
                  <div className="text-xs text-gray-500">{DAY_LABELS[day].kh}</div>
                  <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${
                    dayShifts[day] === 'MORNING' 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {dayShifts[day] === 'MORNING' ? '🌅 AM' : '🌙 PM'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => {
              // Determine time based on most common shift (or first day's shift)
              const representativeShift = dayShifts['MONDAY'];
              const periodTime = PERIOD_TIMES[representativeShift][period - 1];

              return (
                <tr key={period} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-gray-200">
                    <div className="font-semibold text-gray-800">Period {period}</div>
                    <div className="text-xs text-gray-500">
                      {periodTime?.start} - {periodTime?.end}
                    </div>
                  </td>
                  {DAYS.map((day) => {
                    const slotKey = `${day}-${period}`;
                    const entry = entryGrid[slotKey];
                    const conflict = conflictGrid[slotKey];
                    const isHighlighted = highlightedSlots.has(slotKey);
                    const dayShift = dayShifts[day];

                    return (
                      <TimetableCell
                        key={slotKey}
                        day={day}
                        period={period}
                        classId={classId}
                        shiftType={dayShift}
                        entry={entry}
                        hasConflict={!!conflict}
                        conflictMessage={conflict?.message}
                        onCellClick={onCellClick}
                        onEntryDelete={onEntryDelete}
                        isDraggedOver={isHighlighted}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            <span className="font-semibold text-gray-800">{entries.length}</span> / {DAYS.length * 5} slots filled
          </span>
          {conflicts.length > 0 && (
            <span className="text-red-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {conflicts.length} conflicts
            </span>
          )}
        </div>
        <div className="text-gray-500">
          Coverage: <span className="font-semibold text-gray-800">
            {Math.round((entries.length / (DAYS.length * 5)) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
