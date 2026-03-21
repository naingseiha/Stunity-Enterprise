import { classApi, gradeApi, attendanceApi, timetableApi, teacherApi } from './client';

export interface MyClassSummary {
  id: string;
  classId?: string;
  name: string;
  grade: string;
  section?: string;
  track?: string | null;
  capacity?: number | null;
  studentCount: number;
  myRole: 'STUDENT' | 'TEACHER';
  isHomeroom: boolean;
  linkedStudentId?: string;
  linkedTeacherId?: string;
  homeroomTeacher?: {
    id: string;
    firstName: string;
    lastName: string;
    customFields?: Record<string, unknown>;
  } | null;
  academicYear: {
    id: string;
    name: string;
    isCurrent: boolean;
    status?: string;
  };
}

export interface ClassStudent {
  id: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  gender?: string;
  dateOfBirth?: string;
  photoUrl?: string | null;
  customFields?: Record<string, unknown>;
  nameKh?: string;
  status?: string;
  enrolledAt?: string;
}

export interface TimetableResponse {
  class?: {
    id: string;
    name: string;
    grade?: string;
    section?: string;
    track?: string;
  };
  periods?: Array<{ id: string; name: string; startTime?: string; endTime?: string; order?: number }>;
  entries?: Array<Record<string, unknown>>;
  grid?: Record<string, Record<string, unknown>>;
  days?: string[];
}

export interface ClassAttendanceSummary {
  class?: {
    id: string;
    name: string;
    studentCount: number;
  };
  period?: {
    startDate: string;
    endDate: string;
  };
  totals?: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    permission: number;
  };
  summary?: {
    totalSchoolDays: number;
    totalPossibleSessions: number;
    attendedSessions: number;
    averageAttendanceRate: number;
  };
  dayByDay?: Array<Record<string, unknown>>;
}

export interface ClassGradesReport {
  class?: {
    id: string;
    name: string;
    grade?: string;
    section?: string;
  };
  semester?: number;
  year?: number;
  totalStudents?: number;
  students?: Array<{
    studentId: string;
    average: number;
    rank: number;
    gradeLevel?: string;
    isPassing?: boolean;
    student: {
      id: string;
      firstName: string;
      lastName: string;
      studentId?: string;
      khmerName?: string | null;
      photoUrl?: string | null;
    };
  }>;
  statistics?: {
    classAverage: number;
    highestAverage: number;
    lowestAverage: number;
    passingCount: number;
    failingCount: number;
    passRate: number;
  };
  generatedAt?: string;
}

interface MyClassesResponse {
  success?: boolean;
  data?: MyClassSummary[];
}

const CLASSES_CACHE_TTL = 30_000;
let _myClassesCache: { data: MyClassSummary[]; ts: number; academicYearId?: string } | null = null;

export const getMyClasses = async (options?: { force?: boolean; academicYearId?: string }): Promise<MyClassSummary[]> => {
  const force = options?.force ?? false;
  const academicYearId = options?.academicYearId;
  
  // Cache key includes academicYearId to avoid conflicts
  const cacheKey = academicYearId || 'current';
  
  if (!force && _myClassesCache && (Date.now() - _myClassesCache.ts < CLASSES_CACHE_TTL)) {
    // Basic cache logic — for production, consider a Map based on cacheKey
    if (!_myClassesCache.academicYearId || _myClassesCache.academicYearId === academicYearId) {
       return _myClassesCache.data;
    }
  }

  const response = await classApi.get<MyClassesResponse>('/classes/my', {
    params: { academicYearId }
  });
  const data = Array.isArray(response.data?.data) ? response.data.data : [];
  _myClassesCache = { data, ts: Date.now(), academicYearId } as any;
  return data;
};

export const getAcademicYears = async (): Promise<any[]> => {
  const response = await classApi.get<{ success: boolean; data: any[] }>('/classes/academic-years');
  return response.data?.data || [];
};

export const getClasses = async (params?: Record<string, any>): Promise<MyClassSummary[]> => {
  const response = await classApi.get<{ success: boolean; data: MyClassSummary[] }>('/classes', { params });
  return response.data?.data || [];
};

export const invalidateMyClassesCache = (): void => {
  _myClassesCache = null;
};

export const getClassStudents = async (classId: string): Promise<ClassStudent[]> => {
  const response = await classApi.get<{ success?: boolean; data?: ClassStudent[] }>(`/classes/${classId}/students`);
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const getClassTimetable = async (classId: string): Promise<TimetableResponse> => {
  const response = await timetableApi.get<{ data?: TimetableResponse }>(`/timetable/class/${classId}`);
  return response.data?.data || {};
};

export const getClassAttendanceSummary = async (
  classId: string,
  startDate: string,
  endDate: string
): Promise<ClassAttendanceSummary> => {
  const response = await attendanceApi.get<{ success?: boolean; data?: ClassAttendanceSummary }>(
    `/attendance/class/${classId}/summary`,
    { params: { startDate, endDate } }
  );
  return response.data?.data || {};
};

export const getClassDailyAttendance = async (
  classId: string,
  date: string
): Promise<{ classId: string; date: string; students: any[] }> => {
  const response = await attendanceApi.get<{ success?: boolean; data?: any }>(
    `/attendance/class/${classId}/date/${date}`
  );
  return response.data?.data || { classId, date, students: [] };
};

export const getClassGradesReport = async (
  classId: string,
  options?: { semester?: number; year?: number }
): Promise<ClassGradesReport> => {
  const params: Record<string, string | number> = {};
  if (options?.semester) params.semester = options.semester;
  if (options?.year) params.year = options.year;

  const response = await gradeApi.get<ClassGradesReport>(`/grades/class-report/${classId}`, { params });
  return response.data || {};
};

export const getStudentMonthlySummary = async (
  studentId: string,
  monthLabel: string
): Promise<Record<string, unknown> | null> => {
  try {
    const response = await gradeApi.get(`/grades/summary/${studentId}/${encodeURIComponent(monthLabel)}`);
    return response.data || null;
  } catch (error: any) {
    if (error?.code === 'NOT_FOUND' || error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const getTeacherById = async (teacherId: string): Promise<Record<string, unknown> | null> => {
  try {
    const response = await teacherApi.get<{ success?: boolean; data?: Record<string, unknown> }>(`/teachers/${teacherId}`);
    return response.data?.data || null;
  } catch (error: any) {
    if (error?.code === 'NOT_FOUND' || error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
