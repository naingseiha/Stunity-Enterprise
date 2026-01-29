"use client";

import React, { useState } from "react";
import {
  TimetableEntry,
  DayOfWeek,
  DAYS_KH,
  DAYS_EN,
  SESSION_NAMES,
} from "@/types/schedule";
import { Teacher, Subject } from "@/types";
import { getSubjectColor } from "@/lib/scheduleUtils";
import { Edit, Trash2, AlertCircle, Sun, Moon } from "lucide-react";

interface DualSessionTimetableGridProps {
  entries: TimetableEntry[];
  teachers: Teacher[];
  subjects: Subject[];
  onEditEntry: (entry: TimetableEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onCellClick: (
    day: DayOfWeek,
    period: number,
    session: "morning" | "afternoon"
  ) => void;
  conflicts?: Set<string>; // Set of "session-day-period" strings with conflicts
  showBothSessions?: boolean; // Show both morning and afternoon
}

export default function DualSessionTimetableGrid({
  entries,
  teachers,
  subjects,
  onEditEntry,
  onDeleteEntry,
  onCellClick,
  conflicts = new Set(),
  showBothSessions = true,
}: DualSessionTimetableGridProps) {
  const days: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const getTimeRange = (
    period: number,
    session: "morning" | "afternoon"
  ): string => {
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
    period: number,
    session: "morning" | "afternoon"
  ): TimetableEntry | undefined => {
    return entries.find(
      (e) => e.day === day && e.period === period && e.session === session
    );
  };

  const renderCell = (
    day: DayOfWeek,
    period: number,
    session: "morning" | "afternoon"
  ) => {
    const entry = getEntryForCell(day, period, session);
    const cellKey = `${session}-${day}-${period}`;
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
        key={cellKey}
        className={`
          px-2 py-2 border-r-2 border-b-2 border-gray-200 last:border-r-0 relative
          ${!entry ? "cursor-pointer hover:bg-indigo-50" : ""}
          ${hasConflict ? "bg-red-50 ring-2 ring-red-300" : ""}
          ${isHovered && !entry ? "bg-indigo-100" : ""}
          transition-all duration-200
        `}
        onClick={() => !entry && onCellClick(day, period, session)}
        onMouseEnter={() => setHoveredCell(cellKey)}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {entry ? (
          <div
            className={`
              relative p-2 rounded-lg border-2 min-h-[70px] group
              ${getSubjectColor(subject?.name || "")}
              hover:shadow-md transition-all duration-200
            `}
          >
            {hasConflict && (
              <div className="absolute -top-1 -right-1">
                <AlertCircle className="w-4 h-4 text-red-600 fill-red-100" />
              </div>
            )}

            <div className="space-y-1">
              <div className="font-bold text-xs leading-tight line-clamp-2">
                {subject?.name || "Unknown"}
              </div>
              <div className="text-[10px] opacity-75 line-clamp-1">
                {subject?.nameEn || ""}
              </div>
              <div className="text-[10px] font-medium mt-1 flex items-center gap-1">
                <span>👨‍🏫</span>
                <span className="truncate">
                  {teacher?.name?.split(" ").slice(-2).join(" ") || "TBA"}
                </span>
              </div>
            </div>

            {/* Action buttons - show on hover */}
            <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditEntry(entry);
                }}
                className="p-0.5 bg-white rounded shadow hover:bg-blue-50 transition-colors"
                title="Edit"
              >
                <Edit className="w-3 h-3 text-blue-600" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEntry(entry.id);
                }}
                className="p-0.5 bg-white rounded shadow hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[70px] text-gray-400">
            <div className="text-center">
              <div className="text-xl font-koulen mb-0.5">+</div>
              <div className="text-[10px]">Add</div>
            </div>
          </div>
        )}
      </td>
    );
  };

  const renderSessionGrid = (session: "morning" | "afternoon") => {
    const sessionInfo = SESSION_NAMES[session];
    const periods = 5;

    return (
      <div className="mb-6 last:mb-0">
        {/* Session Header */}
        <div
          className={`bg-gradient-to-r ${sessionInfo.color} text-white px-6 py-4 rounded-t-xl flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            {session === "morning" ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6" />
            )}
            <div>
              <h3 className="text-xl font-koulen">
                {sessionInfo.icon} {sessionInfo.kh}
              </h3>
              <p className="text-sm text-white/90">
                {sessionInfo.en} • {sessionInfo.time}
              </p>
            </div>
          </div>
          <div className="text-sm font-medium bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
            {entries.filter((e) => e.session === session).length} ម៉ោង
          </div>
        </div>

        {/* Grid Table */}
        <div className="overflow-x-auto border-2 border-t-0 border-gray-200 rounded-b-xl">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
                <th className="px-3 py-3 text-left text-xs font-bold border-r-2 border-gray-300 min-w-[80px]">
                  <div>ម៉ោង</div>
                  <div className="text-[10px] font-normal text-gray-600">
                    Time
                  </div>
                </th>
                {days.map((day) => (
                  <th
                    key={day}
                    className="px-3 py-3 text-center text-xs font-bold border-r-2 border-gray-300 last:border-r-0 min-w-[120px]"
                  >
                    <div>{DAYS_KH[day]}</div>
                    <div className="text-[10px] font-normal text-gray-600">
                      {DAYS_EN[day]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: periods }, (_, i) => i + 1).map(
                (period) => (
                  <tr
                    key={period}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-r-2 border-b-2 border-gray-200">
                      <div className="text-center">
                        <div className="text-sm">ម៉ោង {period}</div>
                        <div className="text-[10px] text-gray-500">
                          {getTimeRange(period, session)}
                        </div>
                      </div>
                    </td>
                    {days.map((day) => renderCell(day, period, session))}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {showBothSessions ? (
        <>
          {renderSessionGrid("morning")}
          {renderSessionGrid("afternoon")}
        </>
      ) : (
        renderSessionGrid("morning")
      )}
    </div>
  );
}
