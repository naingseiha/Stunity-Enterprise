// Parent Portal API Client
import { apiClient } from "./client";

export interface ParentProfile {
  id: string;
  parentInfo: {
    id: string;
    parentId: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    englishName?: string;
    gender?: string;
    email?: string;
    phone: string;
    address?: string;
    relationship: string;
    occupation?: string;
    emergencyPhone?: string;
  };
  children: Child[];
  totalChildren: number;
}

export interface Child {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  gender: string;
  dateOfBirth: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
  class?: {
    id: string;
    name: string;
    grade: string;
    section?: string;
    track?: string;
  };
  relationship: string;
  isPrimary: boolean;
}

export interface ChildWithStats extends Child {
  stats: {
    averageScore: number | null;
    attendanceRate: number | null;
    totalGrades: number;
    presentDays: number;
    totalDays: number;
  };
}

export interface ChildGrade {
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
    category: string;
  };
  class: {
    id: string;
    name: string;
    grade: string;
  };
}

export interface ChildGradesResponse {
  student: {
    id: string;
    studentId: string;
    khmerName: string;
    class?: {
      id: string;
      name: string;
      grade: string;
      section?: string;
      track?: string;
    };
  };
  grades: ChildGrade[];
  allSubjects: Array<{
    id: string;
    code: string;
    nameKh: string;
    category: string;
    coefficient: number;
    maxScore: number;
  }>;
  statistics: {
    totalGrades: number;
    totalSubjects: number;
    totalScore: number;
    averageScore: number;
    classRank: number | null;
    gradeLevel: string;
  };
}

export interface ChildAttendance {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "PERMISSION" | "LATE" | "EXCUSED";
  session: "MORNING" | "AFTERNOON";
  remarks?: string;
  class?: {
    id: string;
    name: string;
    grade: string;
  };
}

export interface ChildAttendanceResponse {
  student: {
    id: string;
    studentId: string;
    khmerName: string;
    class?: {
      id: string;
      name: string;
      grade: string;
    };
  };
  attendance: ChildAttendance[];
  statistics: {
    totalDays: number;
    presentCount: number;
    absentCount: number;
    permissionCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;
  };
}

export interface ChildMonthlySummary {
  month: string;
  monthIndex: number;
  averageScore: number | null;
  hasData: boolean;
  subjectCount: number;
  totalSubjects: number;
  isComplete: boolean;
}

export interface ChildMonthlySummariesResponse {
  student: {
    id: string;
    studentId: string;
    khmerName: string;
    class?: {
      id: string;
      name: string;
      grade: string;
      section?: string;
      track?: string;
    };
  };
  academicYear: number;
  summaries: ChildMonthlySummary[];
}

export interface SubjectPerformance {
  subject: {
    id: string;
    code: string;
    nameKh: string;
    category: string;
    coefficient: number;
  };
  studentScore: number;
  maxScore: number;
  percentageScore: number;
  classAverage: number;
  difference: number;
  performanceLevel: "Above Average" | "Average" | "Below Average";
}

export interface ChildPerformanceResponse {
  student: {
    id: string;
    studentId: string;
    khmerName: string;
    class?: {
      id: string;
      name: string;
      grade: string;
    };
  };
  subjectPerformance: SubjectPerformance[];
  categoryPerformance: Array<{
    category: string;
    averagePercentage: number;
    subjectCount: number;
  }>;
}

// Get parent's profile with all children
export const getProfile = async (): Promise<ParentProfile> => {
  const response = await apiClient.get("/parent-portal/profile");
  return response;
};

// Get detailed list of children with stats
export const getChildren = async (): Promise<ChildWithStats[]> => {
  const response = await apiClient.get("/parent-portal/children");
  return response;
};

// Get specific child's grades
export const getChildGrades = async (
  studentId: string,
  filters?: {
    year?: number;
    month?: string;
  }
): Promise<ChildGradesResponse> => {
  const params = new URLSearchParams();
  if (filters?.year) params.append("year", filters.year.toString());
  if (filters?.month) params.append("month", filters.month);

  const response = await apiClient.get(
    `/parent-portal/child/${studentId}/grades${params.toString() ? `?${params.toString()}` : ""}`
  );
  return response;
};

// Get specific child's attendance
export const getChildAttendance = async (
  studentId: string,
  filters?: {
    month?: number;
    year?: number;
  }
): Promise<ChildAttendanceResponse> => {
  const params = new URLSearchParams();
  if (filters?.month) params.append("month", filters.month.toString());
  if (filters?.year) params.append("year", filters.year.toString());

  const response = await apiClient.get(
    `/parent-portal/child/${studentId}/attendance${params.toString() ? `?${params.toString()}` : ""}`
  );
  return response;
};

// Get specific child's monthly summaries
export const getChildMonthlySummaries = async (
  studentId: string,
  filters?: {
    year?: number;
  }
): Promise<ChildMonthlySummariesResponse> => {
  const params = new URLSearchParams();
  if (filters?.year) params.append("year", filters.year.toString());

  const response = await apiClient.get(
    `/parent-portal/child/${studentId}/monthly-summaries${params.toString() ? `?${params.toString()}` : ""}`
  );
  return response;
};

// Get specific child's performance analysis
export const getChildPerformance = async (
  studentId: string,
  filters?: {
    year?: number;
    month?: string;
  }
): Promise<ChildPerformanceResponse> => {
  const params = new URLSearchParams();
  if (filters?.year) params.append("year", filters.year.toString());
  if (filters?.month) params.append("month", filters.month);

  const response = await apiClient.get(
    `/parent-portal/child/${studentId}/performance${params.toString() ? `?${params.toString()}` : ""}`
  );
  return response;
};

// Change password
export const changePassword = async (data: {
  oldPassword: string;
  newPassword: string;
}): Promise<void> => {
  await apiClient.post("/parent-portal/change-password", data);
};

// Update profile
export const updateProfile = async (
  data: Partial<{
    firstName: string;
    lastName: string;
    khmerName: string;
    englishName: string;
    email: string;
    phone: string;
    address: string;
    occupation: string;
    emergencyPhone: string;
  }>
): Promise<void> => {
  await apiClient.put("/parent-portal/profile", data);
};
