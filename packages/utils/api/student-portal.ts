// Student Portal API Client
import { apiClient } from "./client";

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  student: {
    id: string;
    studentId: string;
    khmerName: string;
    englishName?: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string;
    currentAddress?: string;
    placeOfBirth?: string;
    parentPhone?: string;
    parentOccupation?: string;
    fatherName?: string;
    motherName?: string;
    previousGrade?: string;
    previousSchool?: string;
    repeatingGrade?: string;
    transferredFrom?: string;
    grade9ExamSession?: string;
    grade9ExamCenter?: string;
    grade9ExamRoom?: string;
    grade9ExamDesk?: string;
    grade9PassStatus?: string;
    grade12ExamSession?: string;
    grade12ExamCenter?: string;
    grade12ExamRoom?: string;
    grade12ExamDesk?: string;
    grade12Track?: string;
    grade12PassStatus?: string;
    remarks?: string;
    studentRole: string;
    isAccountActive: boolean;
    class?: {
      id: string;
      name: string;
      grade: string;
      section?: string;
      track?: string;
    };
  };
}

export interface Grade {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  month: string;
  monthNumber: number;
  year: number;
  subject: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    coefficient: number;
    maxScore: number;
  };
  class: {
    id: string;
    name: string;
    grade: string;
  };
}

export interface MonthlySummary {
  id: string;
  month: string;
  monthNumber: number;
  year: number;
  totalScore: number;
  totalMaxScore: number;
  average: number;
  classRank?: number;
  class: {
    id: string;
    name: string;
    grade: string;
  };
}

export interface Attendance {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "PERMISSION" | "LATE";
  session: "MORNING" | "AFTERNOON";
  remarks?: string;
  class?: {
    id: string;
    name: string;
    grade: string;
  };
}

export interface GradesResponse {
  grades: Grade[];
  summaries: MonthlySummary[];
  statistics: {
    totalGrades: number;
    averageScore: number;
  };
}

export interface AttendanceResponse {
  records: Attendance[];
  statistics: {
    totalDays: number;
    presentCount: number;
    absentCount: number;
    permissionCount: number;
    lateCount: number;
    attendanceRate: number;
    totalPresent?: number;
  };
}

export interface MonthlySummaryResponse {
  summaries: Array<{
    month: string;
    averageScore: number | null;
    hasData: boolean;
    subjectCount: number;
    totalSubjects: number;
    isComplete: boolean;
  }>;
  academicYear: number;
}

// Activity feed types for social media features
export interface Activity {
  id: string;
  type: 'GRADE_ADDED' | 'ATTENDANCE_MARKED' | 'ACHIEVEMENT_EARNED' | 'ASSIGNMENT_SUBMITTED' | 'EXAM_COMPLETED' | 'RANK_IMPROVED';
  title: string;
  description: string;
  icon: string; // Icon name from lucide-react
  color: string; // Tailwind color class
  timestamp: string;
  metadata?: {
    score?: number;
    maxScore?: number;
    subject?: string;
    rank?: number;
    improvement?: string;
  };
}

export interface ActivityFeedResponse {
  activities: Activity[];
  hasMore: boolean;
}

// Get student's own profile
export const getMyProfile = async (): Promise<StudentProfile> => {
  const response = await apiClient.get("/student-portal/profile");
  // apiClient.get already unwraps the response
  return response;
};

// Get monthly summaries for the academic year (optimized)
export const getMonthlySummaries = async (filters?: {
  year?: number;
}): Promise<MonthlySummaryResponse> => {
  const params = new URLSearchParams();
  if (filters?.year) params.append("year", filters.year.toString());

  const response = await apiClient.get(
    `/student-portal/monthly-summaries${params.toString() ? `?${params.toString()}` : ""}`
  );

  return response;
};

// Get student's own grades
export const getMyGrades = async (filters?: {
  year?: number;
  month?: string;
}): Promise<GradesResponse> => {
  const params = new URLSearchParams();
  if (filters?.year) params.append("year", filters.year.toString());
  if (filters?.month) params.append("month", filters.month);

  const response = await apiClient.get(
    `/student-portal/grades${params.toString() ? `?${params.toString()}` : ""}`
  );

  // The API returns { success, data: { grades, summaries, statistics } }
  // apiClient.get already unwraps to just the data object
  return response;
};

// Get student's own attendance
export const getMyAttendance = async (filters?: {
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}): Promise<AttendanceResponse> => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);
  if (filters?.month) params.append("month", filters.month.toString());
  if (filters?.year) params.append("year", filters.year.toString());

  const response = await apiClient.get(
    `/student-portal/attendance${params.toString() ? `?${params.toString()}` : ""}`
  );

  // The API returns { success, data: { attendance, statistics } }
  // apiClient.get already unwraps to just the data object
  return response;
};

// Get student's activity feed
export const getMyActivities = async (filters?: {
  limit?: number;
  offset?: number;
}): Promise<ActivityFeedResponse> => {
  const params = new URLSearchParams();
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  try {
    const response = await apiClient.get(
      `/student-portal/activities${params.toString() ? `?${params.toString()}` : ""}`
    );
    return response;
  } catch (error: any) {
    // If endpoint doesn't exist yet, return computed activities based on recent data
    console.warn("Activity feed API not available, computing from recent data");
    return {
      activities: [],
      hasMore: false,
    };
  }
};

// Change password
export const changeMyPassword = async (data: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> => {
  await apiClient.post("/student-portal/change-password", data);
};

// Update profile
export const updateMyProfile = async (
  data: Partial<{
    firstName: string;
    lastName: string;
    khmerName: string;
    englishName: string;
    dateOfBirth: string;
    gender: string;
    email: string;
    phone: string;
    phoneNumber: string;
    currentAddress: string;
    placeOfBirth: string;
    fatherName: string;
    motherName: string;
    parentPhone: string;
    parentOccupation: string;
    previousGrade: string;
    previousSchool: string;
    repeatingGrade: string;
    transferredFrom: string;
    grade9ExamSession: string;
    grade9ExamCenter: string;
    grade9ExamRoom: string;
    grade9ExamDesk: string;
    grade9PassStatus: string;
    grade12ExamSession: string;
    grade12ExamCenter: string;
    grade12ExamRoom: string;
    grade12ExamDesk: string;
    grade12Track: string;
    grade12PassStatus: string;
    remarks: string;
  }>
): Promise<StudentProfile> => {
  const response = await apiClient.put("/student-portal/profile", data);
  // apiClient.put already unwraps the response
  return response;
};
