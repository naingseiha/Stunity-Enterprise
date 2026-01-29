"use client";

import React, { useState, useMemo } from "react";
import {
  Schedule,
  TimetableEntry,
  DayOfWeek,
  DAYS_KH,
  DAYS_EN,
  SESSION_NAMES,
} from "@/types/schedule";
import { Teacher, Subject, Class } from "@/types";
import { getSubjectColor } from "@/lib/scheduleUtils";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Search,
  Filter,
  Sun,
  Moon,
  Calendar,
} from "lucide-react";
import Select from "@/components/ui/Select";

interface MasterTimetableViewProps {
  schedules: Schedule[];
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
}

type ViewMode = "compact" | "detailed";
type FilterSession = "all" | "morning" | "afternoon";
type GroupBy = "session" | "grade" | "day";

export default function MasterTimetableView({
  schedules,
  classes,
  teachers,
  subjects,
}: MasterTimetableViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("compact");
  const [filterSession, setFilterSession] = useState<FilterSession>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("session");
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");

  const days: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const periods = 5;

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (filterGrade !== "all" && schedule.grade.toString() !== filterGrade)
        return false;
      if (
        searchQuery &&
        !schedule.className.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [schedules, filterGrade, searchQuery]);

  // Get all entries for a specific cell
  const getEntriesForCell = (
    day: DayOfWeek,
    period: number,
    session: "morning" | "afternoon"
  ) => {
    const entries: Array<{
      entry: TimetableEntry;
      schedule: Schedule;
      subject: Subject | undefined;
      teacher: Teacher | undefined;
    }> = [];

    filteredSchedules.forEach((schedule) => {
      const entry = schedule.entries.find(
        (e) => e.day === day && e.period === period && e.session === session
      );
      if (entry) {
        entries.push({
          entry,
          schedule,
          subject: subjects.find((s) => s.id === entry.subjectId),
          teacher: teachers.find((t) => t.id === entry.teacherId),
        });
      }
    });

    return entries;
  };

  const toggleClassExpanded = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

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

  // Render compact view - shows all classes in one grid
  const renderCompactView = (session: "morning" | "afternoon") => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-200">
              <th className="px-2 py-2 text-left font-bold border-2 border-gray-300 min-w-[60px] sticky left-0 bg-gray-100 z-10">
                ម៉ោង
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-2 py-2 text-center font-bold border-2 border-gray-300 min-w-[200px]"
                >
                  <div className="font-bold">{DAYS_KH[day]}</div>
                  <div className="text-[10px] font-normal text-gray-600">
                    {DAYS_EN[day]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periods }, (_, i) => i + 1).map((period) => (
              <tr key={period} className="hover:bg-gray-50">
                <td className="px-2 py-2 font-semibold bg-gray-50 border-2 border-gray-300 text-center sticky left-0 z-10">
                  <div className="text-sm">ម៉ោង {period}</div>
                  <div className="text-[10px] text-gray-500">
                    {getTimeRange(period, session)}
                  </div>
                </td>
                {days.map((day) => {
                  const entries = getEntriesForCell(day, period, session);
                  return (
                    <td
                      key={day}
                      className="border-2 border-gray-200 p-1 align-top"
                    >
                      {entries.length > 0 ? (
                        <div className="space-y-1">
                          {entries.map(
                            ({ entry, schedule, subject, teacher }, idx) => (
                              <div
                                key={idx}
                                className={`p-1.5 rounded border ${getSubjectColor(
                                  subject?.name || ""
                                )} text-[10px]`}
                              >
                                <div className="font-bold truncate">
                                  {schedule.className}
                                </div>
                                <div className="truncate">
                                  {subject?.name || "N/A"}
                                </div>
                                <div className="text-[9px] opacity-75 truncate">
                                  👨‍🏫{" "}
                                  {teacher?.name?.split(" ").slice(-1)[0] ||
                                    "N/A"}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="h-full min-h-[40px] flex items-center justify-center text-gray-300">
                          -
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
  };

  // Render detailed view - grouped by class with expand/collapse
  const renderDetailedView = () => {
    const groupedSchedules = useMemo(() => {
      const groups: { [key: string]: Schedule[] } = {};

      filteredSchedules.forEach((schedule) => {
        let key = "";
        if (groupBy === "session") {
          key = schedule.sessionType;
        } else if (groupBy === "grade") {
          key = `Grade ${schedule.grade}`;
        } else {
          key = "All Classes";
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(schedule);
      });

      return groups;
    }, [filteredSchedules, groupBy]);

    return (
      <div className="space-y-6">
        {Object.entries(groupedSchedules).map(([groupName, groupSchedules]) => (
          <div
            key={groupName}
            className="border-2 border-gray-200 rounded-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-3 border-b-2 border-gray-200">
              <h3 className="font-bold text-lg text-indigo-900">
                {groupName === "morning"
                  ? "🌅 ពេលព្រឹក Morning"
                  : groupName === "afternoon"
                  ? "🌇 ពេលរសៀល Afternoon"
                  : groupName === "both"
                  ? "📚 ទាំងពីរវេន Both Sessions"
                  : groupName}
                <span className="ml-2 text-sm font-normal">
                  ({groupSchedules.length} ថ្នាក់)
                </span>
              </h3>
            </div>

            <div className="divide-y-2 divide-gray-200">
              {groupSchedules.map((schedule) => {
                const isExpanded = expandedClasses.has(schedule.id);
                const sessionInfo = SESSION_NAMES[schedule.sessionType];

                return (
                  <div key={schedule.id} className="bg-white">
                    {/* Class Header */}
                    <button
                      onClick={() => toggleClassExpanded(schedule.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg bg-gradient-to-br ${sessionInfo.color} text-white`}
                        >
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-gray-900">
                            {schedule.className}
                          </div>
                          <div className="text-xs text-gray-600">
                            {schedule.level} • {sessionInfo.kh} •{" "}
                            {schedule.entries.length} ម៉ោង
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        {/* Morning Session */}
                        {(schedule.sessionType === "morning" ||
                          schedule.sessionType === "both") && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-yellow-700">
                              <Sun className="w-4 h-4" />
                              <span>ពេលព្រឹក Morning (7:00-12:00)</span>
                            </div>
                            {renderClassSessionGrid(schedule, "morning")}
                          </div>
                        )}

                        {/* Afternoon Session */}
                        {(schedule.sessionType === "afternoon" ||
                          schedule.sessionType === "both") && (
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-blue-700">
                              <Moon className="w-4 h-4" />
                              <span>ពេលរសៀល Afternoon (12:00-17:00)</span>
                            </div>
                            {renderClassSessionGrid(schedule, "afternoon")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render grid for a single class session
  const renderClassSessionGrid = (
    schedule: Schedule,
    session: "morning" | "afternoon"
  ) => {
    const sessionEntries = schedule.entries.filter(
      (e) => e.session === session
    );

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-2 border border-gray-300 text-left font-semibold min-w-[60px]">
                ម៉ោង
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-2 py-2 border border-gray-300 text-center font-semibold min-w-[100px]"
                >
                  {DAYS_KH[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periods }, (_, i) => i + 1).map((period) => (
              <tr key={period}>
                <td className="px-2 py-2 border border-gray-300 bg-gray-50 text-center font-medium">
                  {period}
                </td>
                {days.map((day) => {
                  const entry = sessionEntries.find(
                    (e) => e.day === day && e.period === period
                  );
                  const subject = entry
                    ? subjects.find((s) => s.id === entry.subjectId)
                    : null;
                  const teacher = entry
                    ? teachers.find((t) => t.id === entry.teacherId)
                    : null;

                  return (
                    <td key={day} className="border border-gray-300 p-1">
                      {entry ? (
                        <div
                          className={`p-2 rounded ${getSubjectColor(
                            subject?.name || ""
                          )} text-[10px]`}
                        >
                          <div className="font-bold truncate">
                            {subject?.name}
                          </div>
                          <div className="opacity-75 truncate">
                            {teacher?.name?.split(" ").slice(-2).join(" ")}
                          </div>
                        </div>
                      ) : (
                        <div className="h-12 flex items-center justify-center text-gray-300">
                          -
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
  };

  // Grade options for filter
  const gradeOptions = [
    { value: "all", label: "ថ្នាក់ទាំងអស់ All Grades" },
    ...Array.from(new Set(schedules.map((s) => s.grade)))
      .sort((a, b) => a - b)
      .map((grade) => ({
        value: grade.toString(),
        label: `ថ្នាក់ទី${grade} Grade ${grade}`,
      })),
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-koulen text-gray-900">
              តារាងកាលវិភាគរួម Master Timetable
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              កាលវិភាគរួមសម្រាប់ថ្នាក់ទាំងអស់ • Combined schedule for all
              classes
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("compact")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "compact"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📊 Compact
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "detailed"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              📋 Detailed
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ស្វែងរកថ្នាក់..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          {/* Grade Filter */}
          <Select
            label=""
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            options={gradeOptions}
          />

          {/* Session Filter (for compact view) */}
          {viewMode === "compact" && (
            <Select
              label=""
              value={filterSession}
              onChange={(e) =>
                setFilterSession(e.target.value as FilterSession)
              }
              options={[
                { value: "all", label: "📚 ទាំងពីរវេន Both Sessions" },
                { value: "morning", label: "🌅 ពេលព្រឹក Morning" },
                { value: "afternoon", label: "🌇 ពេលរសៀល Afternoon" },
              ]}
            />
          )}

          {/* Group By (for detailed view) */}
          {viewMode === "detailed" && (
            <Select
              label=""
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              options={[
                { value: "session", label: "Group by Session" },
                { value: "grade", label: "Group by Grade" },
              ]}
            />
          )}
        </div>

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border-2 border-blue-200">
            <div className="text-xs text-blue-600 mb-1">ចំនួនថ្នាក់</div>
            <div className="text-2xl font-koulen text-blue-900">
              {filteredSchedules.length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border-2 border-green-200">
            <div className="text-xs text-green-600 mb-1">មុខវិជ្ជា</div>
            <div className="text-2xl font-koulen text-green-900">
              {
                new Set(
                  schedules.flatMap((s) => s.entries.map((e) => e.subjectId))
                ).size
              }
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-purple-200">
            <div className="text-xs text-purple-600 mb-1">គ្រូបង្រៀន</div>
            <div className="text-2xl font-koulen text-purple-900">
              {
                new Set(
                  schedules.flatMap((s) => s.entries.map((e) => e.teacherId))
                ).size
              }
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-3 border-2 border-orange-200">
            <div className="text-xs text-orange-600 mb-1">ម៉ោងសរុប</div>
            <div className="text-2xl font-koulen text-orange-900">
              {schedules.reduce((sum, s) => sum + s.entries.length, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === "compact" ? (
        <div className="space-y-6">
          {(filterSession === "all" || filterSession === "morning") && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <Sun className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-koulen">
                      🌅 ពេលព្រឹក Morning Session
                    </h3>
                    <p className="text-sm text-white/90">
                      7:00 - 12:00 (5 periods)
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">{renderCompactView("morning")}</div>
            </div>
          )}

          {(filterSession === "all" || filterSession === "afternoon") && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <Moon className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-koulen">
                      🌇 ពេលរសៀល Afternoon Session
                    </h3>
                    <p className="text-sm text-white/90">
                      12:00 - 17:00 (5 periods)
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">{renderCompactView("afternoon")}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {renderDetailedView()}
        </div>
      )}

      {filteredSchedules.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
          <Eye className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-koulen text-gray-400 mb-2">
            មិនមានកាលវិភាគ
          </h3>
          <p className="text-gray-500">
            No schedules found matching your filters
          </p>
        </div>
      )}
    </div>
  );
}
