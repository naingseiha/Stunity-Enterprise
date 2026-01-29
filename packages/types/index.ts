// src/types/index.ts

// Main Types
export type Gender = "MALE" | "FEMALE" | "male" | "female";
export type Role = "ADMIN" | "TEACHER" | "CLASS_TEACHER" | "STUDENT";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

// Student Type
export interface Student {
  id: string;
  studentId?: string;
  khmerName?: string;
  englishName?: string;
  firstName?: string;
  lastName?: string;
  gender: "male" | "female" | "MALE" | "FEMALE";
  dateOfBirth: string;
  placeOfBirth?: string;
  currentAddress?: string;
  phoneNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  classId?: string;
  class?: Class;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Teacher Type
export interface Teacher {
  id: string;
  teacherId?: string;
  firstName: string;
  lastName: string;
  name?: string;
  khmerName?: string;
  englishName?: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  employeeId?: string;
  role: "TEACHER" | "INSTRUCTOR";
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  hireDate?: string;
  address?: string;
  position?: string;
  homeroomClassId?: string;
  homeroomClass?: any;
  teachingClassIds?: string[];
  teachingClasses?: any[];
  subjectIds?: string[];
  subjects?: any[];
  subject?: string;
  classes?: any[];
  createdAt?: string;
  updatedAt?: string;
}

// Class Type
export interface Class {
  id: string;
  classId?: string;
  name: string;
  grade: string;
  section?: string;
  academicYear: string;
  capacity?: number;
  classTeacherId?: string;
  classTeacher?: Teacher;
  students?: Student[];
  subjects?: Subject[];
  createdAt?: string;
  updatedAt?: string;
}

// Subject Type
export interface Subject {
  id: string;
  subjectId?: string;
  name: string;
  code: string;
  credits?: number;
  description?: string;
  classId?: string;
  teacherId?: string;
  teacher?: Teacher;
  class?: Class;
  createdAt?: string;
  updatedAt?: string;
}

// Grade Type
export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  semester: number;
  month1Score?: number;
  month2Score?: number;
  month3Score?: number;
  semesterScore?: number;
  finalScore?: number;
  grade?: string;
  teacherId?: string;
  student?: Student;
  subject?: Subject;
  teacher?: Teacher;
  createdAt?: string;
  updatedAt?: string;
}

// ⭐⭐⭐ ADD THESE MISSING TYPES ⭐⭐⭐

/**
 * Grade Import Result
 */
export interface GradeImportResult {
  success: boolean;
  message?: string;
  totalRows: number;
  savedCount: number;
  errorCount: number;
  errors?: Array<{
    row: number;
    studentName?: string;
    subjectName?: string;
    error: string;
  }>;
}

/**
 * Grade Scale for grading system
 */
export interface GradeScale {
  grade: string;
  min: number;
  max: number;
  label?: string;
  labelKhmer?: string;
}

// Attendance Type
export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  student?: Student;
  class?: Class;
  createdAt?: string;
  updatedAt?: string;
}

// Schedule Type
export interface Schedule {
  id: string;
  classId: string;
  day: string;
  periods: SchedulePeriod[];
}

export interface SchedulePeriod {
  time: string;
  subject: string;
  teacher: string;
  room?: string;
}
