// Timetable System Types

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
export type ShiftType = 'MORNING' | 'AFTERNOON';
export type GradeLevel = 'SECONDARY' | 'HIGH_SCHOOL';

export const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export const DAY_LABELS: Record<DayOfWeek, { en: string; kh: string; short: string }> = {
  MONDAY: { en: 'Monday', kh: 'ច័ន្ទ', short: 'Mon' },
  TUESDAY: { en: 'Tuesday', kh: 'អង្គារ', short: 'Tue' },
  WEDNESDAY: { en: 'Wednesday', kh: 'ពុធ', short: 'Wed' },
  THURSDAY: { en: 'Thursday', kh: 'ព្រហស្បតិ៍', short: 'Thu' },
  FRIDAY: { en: 'Friday', kh: 'សុក្រ', short: 'Fri' },
  SATURDAY: { en: 'Saturday', kh: 'សៅរ៍', short: 'Sat' },
};

export const SHIFT_CONFIG: Record<ShiftType, { 
  name: string; 
  nameKh: string;
  startTime: string; 
  endTime: string; 
  periods: number;
  color: string;
}> = {
  MORNING: { 
    name: 'Morning', 
    nameKh: 'ពេលព្រឹក',
    startTime: '07:00', 
    endTime: '12:00', 
    periods: 5,
    color: 'from-amber-400 to-orange-500'
  },
  AFTERNOON: { 
    name: 'Afternoon', 
    nameKh: 'ពេលរសៀល',
    startTime: '12:00', 
    endTime: '17:00', 
    periods: 5,
    color: 'from-blue-400 to-indigo-500'
  },
};

// Period times for each shift (5 periods of 50 mins with breaks)
export const PERIOD_TIMES: Record<ShiftType, Array<{ period: number; start: string; end: string }>> = {
  MORNING: [
    { period: 1, start: '07:00', end: '07:50' },
    { period: 2, start: '07:50', end: '08:40' },
    { period: 3, start: '09:00', end: '09:50' }, // After 20 min break
    { period: 4, start: '09:50', end: '10:40' },
    { period: 5, start: '11:00', end: '11:50' }, // After 20 min break
  ],
  AFTERNOON: [
    { period: 1, start: '12:00', end: '12:50' },
    { period: 2, start: '12:50', end: '13:40' },
    { period: 3, start: '14:00', end: '14:50' }, // After 20 min break
    { period: 4, start: '14:50', end: '15:40' },
    { period: 5, start: '16:00', end: '16:50' }, // After 20 min break
  ],
};

// Interfaces
export interface Teacher {
  id: string;
  firstName?: string;
  lastName?: string;
  firstNameLatin?: string;
  lastNameLatin?: string;
  khmerName?: string;
  email?: string;
  subjects: TeacherSubject[];
  totalHoursAssigned: number;
  maxHoursPerWeek: number;
  // Extended info for timetable display
  assignedClasses?: AssignedClass[];
}

export interface AssignedClass {
  classId: string;
  className: string;
  hoursPerWeek: number;
  subjectName?: string;
}

export interface TeacherSubject {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isPrimary: boolean;
  grades: number[]; // Which grades this teacher can teach this subject
}

export interface Subject {
  id: string;
  name: string;
  nameKh?: string;
  code: string;
  category: string;
  color?: string;
}

export interface SubjectGradeHours {
  id: string;
  subjectId: string;
  subjectName: string;
  grade: number;
  hoursPerWeek: number;
}

export interface ClassInfo {
  id: string;
  name: string;
  grade: number;
  section: string;
  gradeLevel: GradeLevel;
  academicYearId: string;
  shiftSchedule: ClassShiftSchedule[];
  entryCount: number;
  totalSlots: number;
  coverage: number;
}

export interface ClassShiftSchedule {
  id?: string;
  classId: string;
  dayOfWeek: DayOfWeek;
  shiftType: ShiftType;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  className?: string;
  subjectId: string | null;
  subjectName?: string;
  subjectCode?: string;
  subjectCategory?: string;
  teacherId: string | null;
  teacherName?: string;
  periodNumber: number;
  periodId?: string; // Added for API compatibility
  dayOfWeek: DayOfWeek;
  room?: string;
  academicYearId: string;
}

export interface TimetableSlot {
  day: DayOfWeek;
  period: number;
  shiftType: ShiftType;
  entry: TimetableEntry | null;
  isAvailable: boolean;
}

export interface TeacherAvailability {
  teacherId: string;
  dayOfWeek: DayOfWeek;
  period: number;
  shiftType: ShiftType;
  isAvailable: boolean;
  busyWith?: {
    classId: string;
    className: string;
    subjectName: string;
  };
}

export interface ConflictInfo {
  type: 'TEACHER_DOUBLE_BOOKING' | 'CLASS_DOUBLE_BOOKING' | 'HOURS_EXCEEDED' | 'SUBJECT_INCOMPLETE';
  message: string;
  severity: 'error' | 'warning';
  entryId?: string;
  teacherId?: string;
  classId?: string;
}

export interface TimetableStats {
  totalClasses: number;
  totalTeachers: number;
  totalAssignments: number;
  totalSlots: number;
  coverage: number;
  conflicts: ConflictInfo[];
  teacherWorkload: Array<{
    teacherId: string;
    teacherName: string;
    assignedHours: number;
    maxHours: number;
    percentage: number;
  }>;
  subjectCompletion: Array<{
    classId: string;
    className: string;
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      required: number;
      assigned: number;
      complete: boolean;
    }>;
  }>;
}

// Drag & Drop Types
export interface DragItem {
  type: 'TEACHER' | 'ENTRY';
  id: string;
  teacherId?: string;
  subjectId?: string;
  fromSlot?: { day: DayOfWeek; period: number; classId: string };
}

export interface DropTarget {
  day: DayOfWeek;
  period: number;
  classId: string;
  shiftType: ShiftType;
}

// Subject category colors
export const SUBJECT_CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Languages': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  'Mathematics': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  'Sciences': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
  'Social Sciences': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
  'Arts & Culture': { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
  'Physical Education': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  'Technology': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' },
  'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' },
};

export function getSubjectColors(category?: string) {
  return SUBJECT_CATEGORY_COLORS[category || 'default'] || SUBJECT_CATEGORY_COLORS.default;
}

// Helper to get teacher display name
export function getTeacherDisplayName(teacher: Teacher | { firstName?: string; lastName?: string; firstNameLatin?: string; lastNameLatin?: string; khmerName?: string }): string {
  if (teacher.firstNameLatin && teacher.lastNameLatin) {
    return `${teacher.firstNameLatin} ${teacher.lastNameLatin}`;
  }
  if (teacher.firstName && teacher.lastName) {
    return `${teacher.firstName} ${teacher.lastName}`;
  }
  if (teacher.khmerName) {
    return teacher.khmerName;
  }
  return 'Unknown Teacher';
}

// Helper to calculate period time for a shift
export function getPeriodTime(shiftType: ShiftType, period: number): { start: string; end: string } {
  const times = PERIOD_TIMES[shiftType];
  const periodInfo = times.find(t => t.period === period);
  return periodInfo || { start: '', end: '' };
}

// Grade to GradeLevel mapping
export function getGradeLevel(grade: number): GradeLevel {
  return grade >= 7 && grade <= 9 ? 'SECONDARY' : 'HIGH_SCHOOL';
}

// Default shift schedule (Secondary: Afternoon, High School: Morning normally)
export function getDefaultShift(gradeLevel: GradeLevel, day: DayOfWeek): ShiftType {
  // Default: Secondary = Afternoon, High School = Morning
  // This can be overridden per class/day
  return gradeLevel === 'SECONDARY' ? 'AFTERNOON' : 'MORNING';
}
