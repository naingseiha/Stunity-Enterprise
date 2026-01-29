import {
  Schedule,
  TimetableEntry,
  TeacherWorkload,
  ScheduleConflict,
  DayOfWeek,
  DAYS_KH,
  DEFAULT_SUBJECT_HOURS,
  SessionType,
} from "@/types/schedule";
import { Teacher, Subject, Class } from "@/types";

/**
 * Generate all time slots for a week
 */
export function generateWeekTimeSlots(
  session: SessionType,
  days: DayOfWeek[]
): string[] {
  const slots: string[] = [];
  const periods = session === "morning" ? 5 : 5;

  days.forEach((day) => {
    for (let period = 1; period <= periods; period++) {
      slots.push(`${day}-${period}`);
    }
  });

  return slots;
}

/**
 * Check if a teacher has a conflict at a specific time slot
 */
export function checkTeacherConflict(
  teacherId: string,
  day: DayOfWeek,
  period: number,
  session: SessionType,
  allSchedules: Schedule[],
  excludeEntryId?: string
): boolean {
  return allSchedules.some((schedule) =>
    schedule.entries.some(
      (entry) =>
        entry.teacherId === teacherId &&
        entry.day === day &&
        entry.period === period &&
        entry.session === session &&
        entry.id !== excludeEntryId
    )
  );
}

/**
 * Calculate teacher workload across all schedules
 */
export function calculateTeacherWorkload(
  teacherId: string,
  allSchedules: Schedule[],
  teachers: Teacher[],
  subjects: Subject[],
  classes: Class[]
): TeacherWorkload {
  const teacher = teachers.find((t) => t.id === teacherId);
  if (!teacher) {
    return {
      teacherId,
      teacherName: "Unknown",
      totalHours: 0,
      maxHours: 18,
      classes: [],
      conflicts: [],
    };
  }

  const classHours: {
    [key: string]: {
      classId: string;
      className: string;
      subjectId: string;
      subjectName: string;
      hours: number;
    };
  } = {};

  allSchedules.forEach((schedule) => {
    schedule.entries
      .filter((entry) => entry.teacherId === teacherId)
      .forEach((entry) => {
        const subject = subjects.find((s) => s.id === entry.subjectId);
        const cls = classes.find((c) => c.id === entry.classId);
        const key = `${entry.classId}-${entry.subjectId}`;

        if (!classHours[key]) {
          classHours[key] = {
            classId: entry.classId,
            className: cls?.name || "Unknown",
            subjectId: entry.subjectId,
            subjectName: subject?.name || "Unknown",
            hours: 0,
          };
        }
        classHours[key].hours += 1;
      });
  });

  const classesList = Object.values(classHours);
  const totalHours = classesList.reduce((sum, c) => sum + c.hours, 0);

  const conflicts: ScheduleConflict[] = [];

  // Check if teacher exceeds max hours
  if (totalHours > 18) {
    conflicts.push({
      type: "teacher-overlap",
      severity: "error",
      message: `Teacher exceeds maximum weekly hours (${totalHours}/18)`,
      messageKh: `គ្រូលើសម៉ោងបង្រៀនអតិបរមាក្នុងមួយសប្តាហ៍ (${totalHours}/18)`,
      teacherId,
    });
  } else if (totalHours < 8) {
    conflicts.push({
      type: "teacher-overlap",
      severity: "warning",
      message: `Teacher has fewer than minimum weekly hours (${totalHours}/8)`,
      messageKh: `គ្រូមានម៉ោងបង្រៀនតិចជាងអប្បបរមា (${totalHours}/8)`,
      teacherId,
    });
  }

  return {
    teacherId,
    teacherName: teacher.name,
    totalHours,
    maxHours: 18,
    classes: classesList,
    conflicts,
  };
}

/**
 * Validate schedule for conflicts
 */
export function validateSchedule(
  schedule: Schedule,
  allSchedules: Schedule[],
  teachers: Teacher[],
  subjects: Subject[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Check for teacher conflicts
  schedule.entries.forEach((entry) => {
    const hasConflict = checkTeacherConflict(
      entry.teacherId,
      entry.day,
      entry.period,
      entry.session,
      allSchedules,
      entry.id
    );

    if (hasConflict) {
      const teacher = teachers.find((t) => t.id === entry.teacherId);
      conflicts.push({
        type: "teacher-overlap",
        severity: "error",
        message: `Teacher ${
          teacher?.name || "Unknown"
        } is already scheduled at this time`,
        messageKh: `គ្រូ ${
          teacher?.name || "Unknown"
        } បានកំណត់ពេលវេលានេះរួចហើយ`,
        teacherId: entry.teacherId,
        timeSlotId: `${entry.day}-${entry.period}`,
      });
    }
  });

  // Check subject hours per week
  const subjectHours: { [subjectId: string]: number } = {};
  schedule.entries.forEach((entry) => {
    subjectHours[entry.subjectId] = (subjectHours[entry.subjectId] || 0) + 1;
  });

  Object.entries(subjectHours).forEach(([subjectId, hours]) => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) {
      const expectedHours =
        DEFAULT_SUBJECT_HOURS[schedule.grade]?.[subject.nameEn || ""];
      if (expectedHours && hours !== expectedHours) {
        conflicts.push({
          type: "subject-hours-mismatch",
          severity: hours < expectedHours ? "error" : "warning",
          message: `${subject.name} has ${hours} hours, expected ${expectedHours}`,
          messageKh: `${subject.name} មាន ${hours} ម៉ោង, ត្រូវការ ${expectedHours} ម៉ោង`,
        });
      }
    }
  });

  return conflicts;
}

/**
 * Export schedule to printable format
 */
export function formatScheduleForPrint(
  schedule: Schedule,
  teachers: Teacher[],
  subjects: Subject[]
): {
  [day: string]: { [period: number]: { subject: string; teacher: string } };
} {
  const formatted: {
    [day: string]: { [period: number]: { subject: string; teacher: string } };
  } = {};

  const days: DayOfWeek[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const periods = schedule.session === "morning" ? 5 : 5;

  days.forEach((day) => {
    formatted[day] = {};
    for (let period = 1; period <= periods; period++) {
      const entry = schedule.entries.find(
        (e) => e.day === day && e.period === period
      );
      if (entry) {
        const subject = subjects.find((s) => s.id === entry.subjectId);
        const teacher = teachers.find((t) => t.id === entry.teacherId);
        formatted[day][period] = {
          subject: subject?.name || "Unknown",
          teacher: teacher?.name || "Unknown",
        };
      } else {
        formatted[day][period] = { subject: "", teacher: "" };
      }
    }
  });

  return formatted;
}

/**
 * Get color for subject (for UI visualization)
 */
export function getSubjectColor(subjectName: string): string {
  const colors: { [key: string]: string } = {
    គណិតវិទ្យា: "bg-blue-100 text-blue-700 border-blue-300",
    រូបវិទ្យា: "bg-purple-100 text-purple-700 border-purple-300",
    គីមីវិទ្យា: "bg-green-100 text-green-700 border-green-300",
    ជីវវិទ្យា: "bg-teal-100 text-teal-700 border-teal-300",
    ភាសាខ្មែរ: "bg-red-100 text-red-700 border-red-300",
    ភាសាអង់គ្លេស: "bg-indigo-100 text-indigo-700 border-indigo-300",
    ប្រវត្តិសាស្ត្រ: "bg-yellow-100 text-yellow-700 border-yellow-300",
    ភូមិសាស្ត្រ: "bg-orange-100 text-orange-700 border-orange-300",
    កីឡា: "bg-pink-100 text-pink-700 border-pink-300",
  };

  return colors[subjectName] || "bg-gray-100 text-gray-700 border-gray-300";
}
