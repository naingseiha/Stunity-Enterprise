// Schedule/Timetable Types for School Management - Enhanced for Flexible Sessions

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export type SessionType = "morning" | "afternoon" | "both";

export interface TimeSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // HH:mm format
  endTime: string;
  period: number; // Period number
  session: "morning" | "afternoon"; // Individual slot session
}

export interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  timeSlotId: string;
  day: DayOfWeek;
  period: number;
  session: "morning" | "afternoon";
  room?: string;
  notes?: string;
}

export interface Schedule {
  id: string;
  classId: string;
  className: string;
  grade: number;
  section: string;
  level: "អនុវិទ្យាល័យ" | "វិទ្យាល័យ";
  sessionType: SessionType;
  year: number;
  entries: TimetableEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SubjectHours {
  subjectId: string;
  subjectName: string;
  grade: number;
  hoursPerWeek: number;
  level: "អនុវិទ្យាល័យ" | "វិទ្យាល័យ";
  preferredSession?: "morning" | "afternoon" | "any";
}

export interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  totalHours: number;
  morningHours: number;
  afternoonHours: number;
  maxHours: number;
  classes: {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    hours: number;
    session: "morning" | "afternoon";
  }[];
  conflicts: ScheduleConflict[];
}

export interface ScheduleConflict {
  type:
    | "teacher-overlap"
    | "room-overlap"
    | "subject-hours-mismatch"
    | "session-conflict";
  severity: "error" | "warning";
  message: string;
  messageKh: string;
  teacherId?: string;
  classId?: string;
  timeSlotId?: string;
  suggestions?: string[];
}

export const DAYS_KH: Record<DayOfWeek, string> = {
  monday: "ច័ន្ទ",
  tuesday: "អង្គារ",
  wednesday: "ពុធ",
  thursday: "ព្រហស្បតិ៍",
  friday: "សុក្រ",
  saturday: "សៅរ៍",
};

export const DAYS_EN: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

export const MORNING_TIME_SLOTS: Omit<TimeSlot, "id" | "day">[] = [
  { startTime: "07:00", endTime: "08:00", period: 1, session: "morning" },
  { startTime: "08:00", endTime: "09:00", period: 2, session: "morning" },
  { startTime: "09:00", endTime: "10:00", period: 3, session: "morning" },
  { startTime: "10:00", endTime: "11:00", period: 4, session: "morning" },
  { startTime: "11:00", endTime: "12:00", period: 5, session: "morning" },
];

export const AFTERNOON_TIME_SLOTS: Omit<TimeSlot, "id" | "day">[] = [
  { startTime: "12:00", endTime: "13:00", period: 1, session: "afternoon" },
  { startTime: "13:00", endTime: "14:00", period: 2, session: "afternoon" },
  { startTime: "14:00", endTime: "15:00", period: 3, session: "afternoon" },
  { startTime: "15:00", endTime: "16:00", period: 4, session: "afternoon" },
  { startTime: "16:00", endTime: "17:00", period: 5, session: "afternoon" },
];

export const SESSION_NAMES = {
  morning: {
    kh: "ពេលព្រឹក",
    en: "Morning",
    icon: "🌅",
    time: "7:00-12:00",
    color: "from-yellow-400 to-orange-500",
  },
  afternoon: {
    kh: "ពេលរសៀល",
    en: "Afternoon",
    icon: "🌇",
    time: "12:00-17:00",
    color: "from-blue-400 to-indigo-500",
  },
  both: {
    kh: "ទាំងពីរវេន",
    en: "Both Sessions",
    icon: "📚",
    time: "7:00-17:00",
    color: "from-purple-400 to-pink-500",
  },
};

export const DEFAULT_SUBJECT_HOURS: Record<
  number,
  { [subjectNameEn: string]: number }
> = {
  7: {
    Mathematics: 6,
    Physics: 2,
    Khmer: 6,
    History: 2,
    Geography: 2,
    Biology: 2,
    Chemistry: 2,
    English: 4,
    "Physical Education": 2,
    "Moral Education": 1,
    STEM: 1,
  },
  8: {
    Mathematics: 6,
    Physics: 2,
    Khmer: 6,
    History: 2,
    Geography: 2,
    Biology: 2,
    Chemistry: 2,
    English: 4,
    "Physical Education": 2,
    "Moral Education": 1,
    STEM: 1,
  },
  9: {
    Mathematics: 6,
    Physics: 2,
    Khmer: 6,
    History: 2,
    Geography: 2,
    Biology: 2,
    Chemistry: 2,
    English: 4,
    "Physical Education": 2,
    "Moral Education": 1,
    STEM: 1,
  },
  10: {
    Mathematics: 6,
    Physics: 4,
    Khmer: 5,
    History: 2,
    Geography: 2,
    Biology: 3,
    Chemistry: 4,
    English: 4,
    "Physical Education": 2,
    Economics: 2,
  },
  11: {
    Mathematics: 6,
    Physics: 4,
    Khmer: 5,
    History: 2,
    Geography: 2,
    Biology: 3,
    Chemistry: 4,
    English: 4,
    "Physical Education": 2,
    Economics: 2,
  },
  12: {
    Mathematics: 6,
    Physics: 4,
    Khmer: 5,
    History: 2,
    Geography: 2,
    Biology: 3,
    Chemistry: 4,
    English: 4,
    "Physical Education": 2,
    Economics: 2,
  },
};

export const SUBJECT_SESSION_PREFERENCES: {
  [subjectNameEn: string]: "morning" | "afternoon" | "any";
} = {
  Mathematics: "morning",
  Physics: "morning",
  Chemistry: "morning",
  Biology: "any",
  Khmer: "any",
  English: "any",
  History: "afternoon",
  Geography: "afternoon",
  "Physical Education": "afternoon",
  "Moral Education": "any",
  STEM: "afternoon",
  Economics: "any",
};
