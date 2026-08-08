'use client';

import { CalendarRange, LockKeyhole } from 'lucide-react';
import { useAcademicYear } from '@/contexts/AcademicYearContext';

export default function AcademicYearScopeNotice({
  className = '',
  planningEditable = false,
}: {
  className?: string;
  planningEditable?: boolean;
}) {
  const { selectedYear, selectedYearMode } = useAcademicYear();
  const isEditable = selectedYearMode === 'operational' || (planningEditable && selectedYearMode === 'planning');

  return (
    <div
      className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 ${
        isEditable
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      } ${className}`}
    >
      {isEditable ? <CalendarRange className="h-4 w-4 shrink-0" /> : <LockKeyhole className="h-4 w-4 shrink-0" />}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{selectedYear?.name || 'No academic year selected'}</p>
        <p className="text-[10px] font-medium opacity-75">
          {isEditable
            ? selectedYearMode === 'planning'
              ? 'Planning year · timetable setup is editable'
              : 'Working year · change it from the top menu'
            : selectedYearMode === 'planning'
              ? 'Planning year · operational records are read-only'
              : 'Historical year · view and export only'}
        </p>
      </div>
    </div>
  );
}
