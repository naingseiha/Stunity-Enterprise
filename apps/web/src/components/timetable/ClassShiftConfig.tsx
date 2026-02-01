'use client';

import React, { useState } from 'react';
import { Sun, Moon, Save, Loader2, RefreshCw } from 'lucide-react';
import { DAYS, DAY_LABELS, SHIFT_CONFIG, DayOfWeek, ShiftType, ClassShiftSchedule, GradeLevel } from './types';

interface ClassShiftConfigProps {
  classId: string;
  className: string;
  grade: number;
  gradeLevel: GradeLevel;
  shiftSchedule: ClassShiftSchedule[];
  onSave: (schedule: ClassShiftSchedule[]) => Promise<void>;
  isCompact?: boolean;
}

export default function ClassShiftConfig({
  classId,
  className,
  grade,
  gradeLevel,
  shiftSchedule,
  onSave,
  isCompact = false,
}: ClassShiftConfigProps) {
  // Initialize with default shifts based on grade level
  const getDefaultShift = (day: DayOfWeek): ShiftType => {
    // Default: Secondary = Afternoon, High School = Morning
    // Can be customized per day
    return gradeLevel === 'SECONDARY' ? 'AFTERNOON' : 'MORNING';
  };

  const [schedule, setSchedule] = useState<Record<DayOfWeek, ShiftType>>(() => {
    const initial: Record<DayOfWeek, ShiftType> = {} as Record<DayOfWeek, ShiftType>;
    DAYS.forEach((day) => {
      const existing = shiftSchedule.find((s) => s.dayOfWeek === day);
      initial[day] = existing?.shiftType || getDefaultShift(day);
    });
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const toggleShift = (day: DayOfWeek) => {
    setSchedule((prev) => {
      const newSchedule = {
        ...prev,
        [day]: prev[day] === 'MORNING' ? 'AFTERNOON' : 'MORNING',
      };
      setHasChanges(true);
      return newSchedule;
    });
  };

  const setAllToShift = (shiftType: ShiftType) => {
    const newSchedule: Record<DayOfWeek, ShiftType> = {} as Record<DayOfWeek, ShiftType>;
    DAYS.forEach((day) => {
      newSchedule[day] = shiftType;
    });
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const resetToDefault = () => {
    const newSchedule: Record<DayOfWeek, ShiftType> = {} as Record<DayOfWeek, ShiftType>;
    DAYS.forEach((day) => {
      newSchedule[day] = getDefaultShift(day);
    });
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const scheduleArray: ClassShiftSchedule[] = DAYS.map((day) => ({
        classId,
        dayOfWeek: day,
        shiftType: schedule[day],
      }));
      await onSave(scheduleArray);
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving shift schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  if (isCompact) {
    return (
      <div className="flex items-center gap-1">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => toggleShift(day)}
            className={`w-8 h-6 rounded text-xs font-medium transition-all ${
              schedule[day] === 'MORNING'
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            title={`${DAY_LABELS[day].en}: ${schedule[day]}`}
          >
            {schedule[day] === 'MORNING' ? '🌅' : '🌙'}
          </button>
        ))}
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-2 p-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-gray-800">Shift Schedule</h4>
            <p className="text-xs text-gray-500">{className} • Grade {grade}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetToDefault}
              className="p-1.5 text-gray-500 hover:bg-gray-200 rounded transition-colors"
              title="Reset to default"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Quick actions */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Set all to:</span>
          <button
            onClick={() => setAllToShift('MORNING')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <Sun className="w-3 h-3" />
            Morning
          </button>
          <button
            onClick={() => setAllToShift('AFTERNOON')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Moon className="w-3 h-3" />
            Afternoon
          </button>
        </div>

        {/* Day-by-day schedule */}
        <div className="grid grid-cols-6 gap-2">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleShift(day)}
              className={`p-3 rounded-xl border-2 transition-all ${
                schedule[day] === 'MORNING'
                  ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-400'
                  : 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">
                  {schedule[day] === 'MORNING' ? '🌅' : '🌙'}
                </div>
                <div className="text-xs font-semibold text-gray-700">
                  {DAY_LABELS[day].short}
                </div>
                <div className={`text-[10px] font-medium mt-1 ${
                  schedule[day] === 'MORNING' ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  {schedule[day] === 'MORNING' ? '7-12' : '12-5'}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Shift time info */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              Morning: {SHIFT_CONFIG.MORNING.startTime} - {SHIFT_CONFIG.MORNING.endTime}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-400" />
              Afternoon: {SHIFT_CONFIG.AFTERNOON.startTime} - {SHIFT_CONFIG.AFTERNOON.endTime}
            </span>
          </div>
        </div>
      </div>

      {/* Save button */}
      {hasChanges && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Schedule
          </button>
        </div>
      )}
    </div>
  );
}
