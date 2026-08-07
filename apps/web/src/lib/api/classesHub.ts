/**
 * Class hub APIs — mirrors apps/mobile/src/api/classes.ts (my classes + hub data).
 */

import { TokenManager } from "@/lib/api/auth";
import {
  CLASS_SERVICE_URL,
  ATTENDANCE_SERVICE_URL,
  ANALYTICS_SERVICE_URL,
} from "@/lib/api/config";

export interface MyClassSummary {
  id: string;
  classId?: string;
  name: string;
  grade: string;
  section?: string;
  track?: string | null;
  capacity?: number | null;
  studentCount: number;
  myRole: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" | "STAFF" | "SUPER_ADMIN" | "SCHOOL_ADMIN";
  isHomeroom: boolean;
  hasTimetableAssignment?: boolean;
  linkedStudentId?: string;
  linkedTeacherId?: string;
  homeroomTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    englishFirstName?: string;
    englishLastName?: string;
  } | null;
  academicYear?: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
}

export interface ClassStudent {
  id: string;
  firstName: string;
  lastName: string;
  gender?: string;
  photoUrl?: string | null;
}

export interface ClassAttendanceSummary {
  summary?: {
    averageAttendanceRate?: number;
  };
}

export interface HubStats {
  xp: number;
  level: number;
  currentStreak: number;
}

async function authJson<T>(url: string): Promise<T | null> {
  try {
    const res = await TokenManager.fetchWithAuth(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const classesHubApi = {
  async getMyClasses(academicYearId?: string): Promise<MyClassSummary[]> {
    const qs = academicYearId ? `?academicYearId=${encodeURIComponent(academicYearId)}` : "";
    const data = await authJson<{ success?: boolean; data?: MyClassSummary[] }>(
      `${CLASS_SERVICE_URL}/classes/my${qs}`
    );
    return Array.isArray(data?.data) ? data!.data! : [];
  },

  async getAcademicYears(): Promise<Array<{ id: string; name: string; isCurrent?: boolean }>> {
    const data = await authJson<{ success?: boolean; data?: any[] }>(
      `${CLASS_SERVICE_URL}/classes/academic-years`
    );
    return Array.isArray(data?.data) ? data!.data! : [];
  },

  async getClassesLightweight(options?: {
    academicYearId?: string;
    search?: string;
    limit?: number;
  }): Promise<MyClassSummary[]> {
    const params = new URLSearchParams();
    if (options?.academicYearId) params.set("academicYearId", options.academicYearId);
    if (options?.search) params.set("search", options.search);
    if (options?.limit) params.set("limit", String(options.limit));
    const qs = params.toString() ? `?${params}` : "";
    const data = await authJson<{ success?: boolean; data?: MyClassSummary[] }>(
      `${CLASS_SERVICE_URL}/classes/lightweight${qs}`
    );
    return Array.isArray(data?.data) ? data!.data! : [];
  },

  async getStudents(classId: string): Promise<ClassStudent[]> {
    const data = await authJson<{ success?: boolean; data?: ClassStudent[] }>(
      `${CLASS_SERVICE_URL}/classes/${classId}/students`
    );
    return Array.isArray(data?.data) ? data!.data! : [];
  },

  async getAttendanceSummary(classId: string): Promise<ClassAttendanceSummary | null> {
    // Prefer month range like native
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const data = await authJson<any>(
      `${ATTENDANCE_SERVICE_URL}/attendance/class/${classId}/summary?startDate=${start}&endDate=${end}`
    );
    return data?.data ?? data ?? null;
  },

  async getStats(userId: string): Promise<HubStats | null> {
    const data = await authJson<any>(`${ANALYTICS_SERVICE_URL}/stats/${userId}/summary`);
    const raw = data?.data ?? data;
    if (!raw) return null;
    return {
      xp: Number(raw.xp ?? 0),
      level: Number(raw.level ?? 1),
      currentStreak: Number(raw.currentStreak ?? 0),
    };
  },
};

export function genderCounts(students: ClassStudent[], fallbackTotal = 0) {
  let male = 0;
  let female = 0;
  students.forEach((s) => {
    const g = (s.gender || "").toUpperCase();
    if (g === "MALE" || g === "M") male++;
    else if (g === "FEMALE" || g === "F") female++;
  });
  return { total: students.length || fallbackTotal, male, female };
}
