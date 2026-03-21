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
  myRole: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | 'SCHOOL_ADMIN';
  isHomeroom: boolean;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
  linkedTeacherId?: string;
  linkedChildren?: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
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

export interface GetClassDetailBundleOptions {
  classId: string;
  myRole: 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'STAFF' | 'SUPER_ADMIN' | 'SCHOOL_ADMIN';
  linkedStudentId?: string;
  linkedTeacherId?: string;
  startDate: string;
  endDate: string;
  semester?: number;
  year?: number;
  monthLabel?: string;
}

export interface ClassDetailBundle {
  students: ClassStudent[];
  timetable: TimetableResponse | null;
  attendanceSummary: ClassAttendanceSummary | null;
  classGradesReport: ClassGradesReport | null;
  monthlySummary: Record<string, unknown> | null;
  teacherInfo: Record<string, unknown> | null;
}

interface MyClassesResponse {
  success?: boolean;
  data?: MyClassSummary[];
}

const CLASSES_CACHE_TTL = 30_000;
let _myClassesCache: { data: MyClassSummary[]; ts: number; academicYearId?: string } | null = null;
const _myClassesInFlight = new Map<string, Promise<MyClassSummary[]>>();
const CLASS_DETAIL_CACHE_TTL = 60_000;
const _classDetailCache = new Map<string, { data: ClassDetailBundle; ts: number }>();
const _classDetailInFlight = new Map<string, Promise<ClassDetailBundle>>();
const ACADEMIC_YEARS_CACHE_TTL = 60_000;
let _academicYearsCache: { data: any[]; ts: number } | null = null;
let _academicYearsInFlight: Promise<any[]> | null = null;

const getMyClassesCacheKey = (academicYearId?: string) => academicYearId || 'current';

export const getCachedMyClasses = (options?: { academicYearId?: string }): MyClassSummary[] | null => {
  if (!_myClassesCache) return null;

  if (Date.now() - _myClassesCache.ts >= CLASSES_CACHE_TTL) {
    _myClassesCache = null;
    return null;
  }

  if ((_myClassesCache.academicYearId || 'current') !== getMyClassesCacheKey(options?.academicYearId)) {
    return null;
  }

  return _myClassesCache.data;
};

export const getCachedAcademicYears = (): any[] | null => {
  if (!_academicYearsCache) return null;

  if (Date.now() - _academicYearsCache.ts >= ACADEMIC_YEARS_CACHE_TTL) {
    _academicYearsCache = null;
    return null;
  }

  return _academicYearsCache.data;
};

export const getMyClasses = async (options?: { force?: boolean; academicYearId?: string }): Promise<MyClassSummary[]> => {
  const force = options?.force ?? false;
  const academicYearId = options?.academicYearId;

  const cacheKey = getMyClassesCacheKey(academicYearId);

  if (!force) {
    const cached = getCachedMyClasses({ academicYearId });
    if (cached) {
      return cached;
    }

    const inFlight = _myClassesInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const request = classApi.get<MyClassesResponse>('/classes/my', {
    params: { academicYearId }
  }).then((response) => {
    const data = Array.isArray(response.data?.data) ? response.data.data : [];
    _myClassesCache = { data, ts: Date.now(), academicYearId } as any;
    return data;
  }).finally(() => {
    _myClassesInFlight.delete(cacheKey);
  });

  _myClassesInFlight.set(cacheKey, request);
  return request;
};

export const getAcademicYears = async (): Promise<any[]> => {
  const cached = getCachedAcademicYears();
  if (cached) {
    return cached;
  }

  if (_academicYearsInFlight) {
    return _academicYearsInFlight;
  }

  _academicYearsInFlight = classApi.get<{ success: boolean; data: any[] }>('/classes/academic-years')
    .then((response) => {
      const data = response.data?.data || [];
      _academicYearsCache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => {
      _academicYearsInFlight = null;
    });

  return _academicYearsInFlight;
};

export const getClasses = async (params?: Record<string, any>): Promise<MyClassSummary[]> => {
  const response = await classApi.get<{ success: boolean; data: MyClassSummary[] }>('/classes', { params });
  return response.data?.data || [];
};

export const invalidateMyClassesCache = (): void => {
  _myClassesCache = null;
  _myClassesInFlight.clear();
  _academicYearsCache = null;
  _academicYearsInFlight = null;
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

const getClassDetailCacheKey = (options: GetClassDetailBundleOptions): string =>
  JSON.stringify({
    classId: options.classId,
    myRole: options.myRole,
    linkedStudentId: options.linkedStudentId || null,
    linkedTeacherId: options.linkedTeacherId || null,
    startDate: options.startDate,
    endDate: options.endDate,
    semester: options.semester ?? 1,
    year: options.year ?? null,
    monthLabel: options.monthLabel || null,
  });

export const getCachedClassDetailBundle = (
  options: GetClassDetailBundleOptions
): ClassDetailBundle | null => {
  const cacheKey = getClassDetailCacheKey(options);
  const cached = _classDetailCache.get(cacheKey);

  if (!cached) return null;

  if (Date.now() - cached.ts >= CLASS_DETAIL_CACHE_TTL) {
    _classDetailCache.delete(cacheKey);
    return null;
  }

  return cached.data;
};

export const getClassDetailBundle = async (
  options: GetClassDetailBundleOptions,
  force = false
): Promise<ClassDetailBundle> => {
  const cacheKey = getClassDetailCacheKey(options);

  if (!force) {
    const cached = getCachedClassDetailBundle(options);
    if (cached) {
      return cached;
    }

    const inFlight = _classDetailInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const request = Promise.all([
    getClassStudents(options.classId),
    getClassTimetable(options.classId),
    getClassAttendanceSummary(options.classId, options.startDate, options.endDate),
    getClassGradesReport(options.classId, {
      semester: options.semester,
      year: options.year,
    }),
    (options.myRole === 'STUDENT' || options.myRole === 'PARENT') && options.linkedStudentId && options.monthLabel
      ? getStudentMonthlySummary(options.linkedStudentId, options.monthLabel)
      : Promise.resolve(null),
    options.myRole === 'TEACHER' && options.linkedTeacherId
      ? getTeacherById(options.linkedTeacherId)
      : Promise.resolve(null),
  ]).then((result) => {
    const bundle: ClassDetailBundle = {
      students: Array.isArray(result[0]) ? result[0] : [],
      timetable: (result[1] || null) as TimetableResponse | null,
      attendanceSummary: (result[2] || null) as ClassAttendanceSummary | null,
      classGradesReport: (result[3] || null) as ClassGradesReport | null,
      monthlySummary: (result[4] || null) as Record<string, unknown> | null,
      teacherInfo: (result[5] || null) as Record<string, unknown> | null,
    };

    _classDetailCache.set(cacheKey, { data: bundle, ts: Date.now() });
    return bundle;
  }).finally(() => {
    _classDetailInFlight.delete(cacheKey);
  });

  _classDetailInFlight.set(cacheKey, request);
  return request;
};

export const prefetchClassDetailBundle = async (options: GetClassDetailBundleOptions): Promise<void> => {
  try {
    await getClassDetailBundle(options);
  } catch {
    // Ignore prefetch failures; the detail screen will fetch normally.
  }
};

export const invalidateClassDetailBundleCache = (classId?: string): void => {
  if (!classId) {
    _classDetailCache.clear();
    _classDetailInFlight.clear();
    return;
  }

  for (const key of _classDetailCache.keys()) {
    if (key.includes(`"classId":"${classId}"`)) {
      _classDetailCache.delete(key);
    }
  }

  for (const key of _classDetailInFlight.keys()) {
    if (key.includes(`"classId":"${classId}"`)) {
      _classDetailInFlight.delete(key);
    }
  }
};
