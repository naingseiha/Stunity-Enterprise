"use client";

import React, { useState, useMemo } from "react";
import { Schedule, DayOfWeek, DAYS_KH } from "@/types/schedule";
import { Teacher, Subject, Class } from "@/types";
import { getSubjectColor } from "@/lib/scheduleUtils";
import { Search, User } from "lucide-react";

interface TeacherScheduleViewProps {
  schedules: Schedule[];
  teachers: Teacher[];
  subjects: Subject[];
  classes: Class[];
}

export default function TeacherScheduleView({
  schedules,
  teachers,
  subjects,
  classes,
}: TeacherScheduleViewProps) {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const days: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teachers, searchQuery]);

  // Get teacher's schedule
  const teacherSchedule = useMemo(() => {
    if (!selectedTeacherId) return null;

    const morningSchedule: { [key: string]: any[] } = {};
    const afternoonSchedule: { [key: string]: any[] } = {};

    days.forEach((day) => {
      morningSchedule[day] = Array(5).fill(null);
      afternoonSchedule[day] = Array(5).fill(null);
    });

    schedules.forEach((schedule) => {
      schedule.entries
        .filter((entry) => entry.teacherId === selectedTeacherId)
        .forEach((entry) => {
          const subject = subjects.find((s) => s.id === entry.subjectId);
          const cls = classes.find((c) => c.id === entry.classId);

          const data = {
            subject: subject?.name,
            class: cls?.name,
            room: entry.room,
            subjectColor: getSubjectColor(subject?.name || ""),
          };

          if (entry.session === "morning") {
            morningSchedule[entry.day][entry.period - 1] = data;
          } else {
            afternoonSchedule[entry.day][entry.period - 1] = data;
          }
        });
    });

    return { morningSchedule, afternoonSchedule };
  }, [selectedTeacherId, schedules, days, subjects, classes]);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const renderScheduleGrid = (
    schedule: { [key: string]: any[] },
    session: "morning" | "afternoon"
  ) => {
    const periods = 5;

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 border-2 border-gray-300 text-left font-semibold">
                ម៉ោង
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="px-3 py-2 border-2 border-gray-300 text-center font-semibold"
                >
                  {DAYS_KH[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: periods }, (_, i) => i + 1).map((period) => (
              <tr key={period}>
                <td className="px-3 py-2 border-2 border-gray-300 bg-gray-50 text-center font-medium">
                  {period}
                </td>
                {days.map((day) => {
                  const entry = schedule[day][period - 1];

                  return (
                    <td key={day} className="border-2 border-gray-300 p-2">
                      {entry ? (
                        <div className={`p-3 rounded-lg ${entry.subjectColor}`}>
                          <div className="font-bold text-sm">
                            {entry.subject}
                          </div>
                          <div className="text-xs mt-1">{entry.class}</div>
                          {entry.room && (
                            <div className="text-xs mt-1 opacity-75">
                              🚪 {entry.room}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-20 flex items-center justify-center text-gray-300">
                          Free
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

  return (
    <div className="space-y-6">
      {/* Teacher Selection */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-koulen text-gray-900 mb-4">
          កាលវិភាគគ្រូបង្រៀន Teacher Schedule
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ស្វែងរកគ្រូបង្រៀន..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Teacher List */}
          <div className="max-h-60 overflow-y-auto border-2 border-gray-300 rounded-xl">
            {filteredTeachers.map((teacher) => (
              <button
                key={teacher.id}
                onClick={() => setSelectedTeacherId(teacher.id)}
                className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b last:border-b-0 ${
                  selectedTeacherId === teacher.id
                    ? "bg-indigo-100 font-semibold"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-indigo-600" />
                  <span>{teacher.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Teacher Schedule Display */}
      {teacherSchedule && selectedTeacher && (
        <div className="space-y-6">
          {/* Teacher Info */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-koulen">
                {selectedTeacher.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-koulen">{selectedTeacher.name}</h3>
                <p className="text-white/90">
                  {selectedTeacher.email || "No email"}
                </p>
              </div>
            </div>
          </div>

          {/* Morning Schedule */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4">
              <h3 className="text-xl font-koulen">
                🌅 ពេលព្រឹក Morning (7:00-12:00)
              </h3>
            </div>
            <div className="p-6">
              {renderScheduleGrid(teacherSchedule.morningSchedule, "morning")}
            </div>
          </div>

          {/* Afternoon Schedule */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-6 py-4">
              <h3 className="text-xl font-koulen">
                🌇 ពេលរសៀល Afternoon (12:00-17:00)
              </h3>
            </div>
            <div className="p-6">
              {renderScheduleGrid(
                teacherSchedule.afternoonSchedule,
                "afternoon"
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedTeacherId && (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
          <User className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-2xl font-koulen text-gray-400 mb-2">
            សូមជ្រើសរើសគ្រូបង្រៀន
          </h3>
          <p className="text-gray-500">
            Please select a teacher to view their schedule
          </p>
        </div>
      )}
    </div>
  );
}
