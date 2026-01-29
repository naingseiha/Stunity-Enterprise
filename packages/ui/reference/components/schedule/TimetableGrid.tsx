"use client";

import React, { useState } from "react";
import {
  TimetableEntry,
  DayOfWeek,
  DAYS_KH,
  DAYS_EN,
  SessionType,
} from "@/types/schedule";
import { Teacher, Subject } from "@/types";
import { getSubjectColor } from "@/lib/scheduleUtils";
import { Edit, Trash2, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface TimetableGridProps {
  entries: TimetableEntry[];
  session: SessionType;
  teachers: Teacher[];
  subjects: Subject[];
  onEditEntry: (entry: TimetableEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onCellClick: (day: DayOfWeek, period: number) => void;
  conflicts?: Set<string>; // Set of "day-period" strings with conflicts
}

export default function TimetableGrid({
  entries,
  session,
  teachers,
  subjects,
  onEditEntry,
  onDeleteEntry,
  onCellClick,
  conflicts = new Set(),
}: TimetableGridProps) {
  const days: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const periods = session === "morning" ? 5 : 5;
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const getTimeRange = (period: number): string => {
    if (session === "morning") {
      const startHour = 6 + period;
      return `${startHour}:00-${startHour + 1}:00`;
    } else {
      const startHour = 11 + period;
      return `${startHour}:00-${startHour + 1}:00`;
    }
  };

  const getEntryForCell = (
    day: DayOfWeek,
    period: number
  ): TimetableEntry | undefined => {
    return entries.find((e) => e.day === day && e.period === period);
  };

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-lg bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <th className="px-4 py-4 text-left text-sm font-bold text-white border-r-2 border-white/20 min-w-[100px]">
              <div>ម៉ោង</div>
              <div className="text-xs font-normal text-white/80">Time</div>
            </th>
            {days.map((day) => (
              <th
                key={day}
                className="px-4 py-4 text-center text-sm font-bold text-white border-r-2 border-white/20 last:border-r-0 min-w-[140px]"
              >
                <div>{DAYS_KH[day]}</div>
                <div className="text-xs font-normal text-white/80">
                  {DAYS_EN[day]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: periods }, (_, i) => i + 1).map((period) => (
            <tr key={period} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-50 border-r-2 border-b-2 border-gray-200">
                <div className="text-center">
                  <div className="text-base">ម៉ោង {period}</div>
                  <div className="text-xs text-gray-500">
                    {getTimeRange(period)}
                  </div>
                </div>
              </td>
              {days.map((day) => {
                const entry = getEntryForCell(day, period);
                const cellKey = `${day}-${period}`;
                const hasConflict = conflicts.has(cellKey);
                const isHovered = hoveredCell === cellKey;
                const subject = entry
                  ? subjects.find((s) => s.id === entry.subjectId)
                  : null;
                const teacher = entry
                  ? teachers.find((t) => t.id === entry.teacherId)
                  : null;

                return (
                  <td
                    key={day}
                    className={`
                      px-2 py-2 border-r-2 border-b-2 border-gray-200 last:border-r-0 relative
                      ${!entry ? "cursor-pointer hover:bg-indigo-50" : ""}
                      ${hasConflict ? "bg-red-50 ring-2 ring-red-300" : ""}
                      ${isHovered && !entry ? "bg-indigo-100" : ""}
                      transition-all duration-200
                    `}
                    onClick={() => !entry && onCellClick(day, period)}
                    onMouseEnter={() => setHoveredCell(cellKey)}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {entry ? (
                      <div
                        className={`
                          relative p-3 rounded-lg border-2 min-h-[80px] group
                          ${getSubjectColor(subject?.name || "")}
                          hover:shadow-md transition-all duration-200
                        `}
                      >
                        {hasConflict && (
                          <div className="absolute -top-1 -right-1">
                            <AlertCircle className="w-5 h-5 text-red-600 fill-red-100" />
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="font-bold text-sm leading-tight">
                            {subject?.name || "Unknown"}
                          </div>
                          <div className="text-xs opacity-75">
                            {subject?.nameEn || ""}
                          </div>
                          <div className="text-xs font-medium mt-2 flex items-center gap-1">
                            <span>👨‍🏫</span>
                            <span className="truncate">
                              {teacher?.name || "TBA"}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons - show on hover */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEntry(entry);
                            }}
                            className="p-1 bg-white rounded shadow hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3 text-blue-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteEntry(entry.id);
                            }}
                            className="p-1 bg-white rounded shadow hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center min-h-[80px] text-gray-400">
                        <div className="text-center">
                          <div className="text-2xl font-koulen mb-1">+</div>
                          <div className="text-xs">Add Subject</div>
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
