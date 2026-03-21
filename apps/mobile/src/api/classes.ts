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

export interface ClassDailyAttendanceResponse {
  classId: string;
  date: string;
  students: any[];
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
const CLASS_RESOURCE_CACHE_TTL = 60_000;
const _classStudentsCache = new Map<string, { data: ClassStudent[]; ts: number }>();
const _classStudentsInFlight = new Map<string, Promise<ClassStudent[]>>();
const _classTimetableCache = new Map<string, { data: TimetableResponse; ts: number }>();
const _classTimetableInFlight = new Map<string, Promise<TimetableResponse>>();
const _classAttendanceSummaryCache = new Map<string, { data: ClassAttendanceSummary; ts: number }>();
const _classAttendanceSummaryInFlight = new Map<string, Promise<ClassAttendanceSummary>>();
const _classDailyAttendanceCache = new Map<string, { data: ClassDailyAttendanceResponse; ts: number }>();
const _classDailyAttendanceInFlight = new Map<string, Promise<ClassDailyAttendanceResponse>>();
const _classGradesReportCache = new Map<string, { data: ClassGradesReport; ts: number }>();
const _classGradesReportInFlight = new Map<string, Promise<ClassGradesReport>>();
const EMPTY_CLASS_DETAIL_BUNDLE: ClassDetailBundle = {
  students: [],
  timetable: null,
  attendanceSummary: null,
  classGradesReport: null,
  monthlySummary: null,
  teacherInfo: null,
};

const getMyClassesCacheKey = (academicYearId?: string) => academicYearId || 'current';
const getCachedResource = <T>(
  map: Map<string, { data: T; ts: number }>,
  key: string,
  ttl = CLASS_RESOURCE_CACHE_TTL
): T | null => {
  const cached = map.get(key);
  if (!cached) return null;

  if (Date.now() - cached.ts >= ttl) {
    map.delete(key);
    return null;
  }

  return cached.data;
};
const getAttendanceSummaryCacheKey = (classId: string, startDate: string, endDate: string) =>
  `${classId}:${startDate}:${endDate}`;
const getDailyAttendanceCacheKey = (classId: string, date: string) => `${classId}:${date}`;
const getGradesReportCacheKey = (classId: string, options?: { semester?: number; year?: number }) =>
  `${classId}:${options?.semester ?? 1}:${options?.year ?? 'current'}`;

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

export const getCachedClassStudents = (classId: string): ClassStudent[] | null =>
  getCachedResource(_classStudentsCache, classId);

export const getClassStudents = async (classId: string, force = false): Promise<ClassStudent[]> => {
  if (!force) {
    const cached = getCachedClassStudents(classId);
    if (cached) return cached;

    const inFlight = _classStudentsInFlight.get(classId);
    if (inFlight) return inFlight;
  }

  const request = classApi.get<{ success?: boolean; data?: ClassStudent[] }>(`/classes/${classId}/students`)
    .then((response) => {
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      _classStudentsCache.set(classId, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      _classStudentsInFlight.delete(classId);
    });

  _classStudentsInFlight.set(classId, request);
  return request;
};

export const getCachedClassTimetable = (classId: string): TimetableResponse | null =>
  getCachedResource(_classTimetableCache, classId);

export const getClassTimetable = async (classId: string, force = false): Promise<TimetableResponse> => {
  if (!force) {
    const cached = getCachedClassTimetable(classId);
    if (cached) return cached;

    const inFlight = _classTimetableInFlight.get(classId);
    if (inFlight) return inFlight;
  }

  const request = timetableApi.get<{ data?: TimetableResponse }>(`/timetable/class/${classId}`)
    .then((response) => {
      const data = response.data?.data || {};
      _classTimetableCache.set(classId, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      _classTimetableInFlight.delete(classId);
    });

  _classTimetableInFlight.set(classId, request);
  return request;
};

export const getCachedClassAttendanceSummary = (
  classId: string,
  startDate: string,
  endDate: string
): ClassAttendanceSummary | null =>
  getCachedResource(_classAttendanceSummaryCache, getAttendanceSummaryCacheKey(classId, startDate, endDate));

export const getClassAttendanceSummary = async (
  classId: string,
  startDate: string,
  endDate: string,
  force = false
): Promise<ClassAttendanceSummary> => {
  const cacheKey = getAttendanceSummaryCacheKey(classId, startDate, endDate);
  if (!force) {
    const cached = getCachedClassAttendanceSummary(classId, startDate, endDate);
    if (cached) return cached;

    const inFlight = _classAttendanceSummaryInFlight.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const request = attendanceApi.get<{ success?: boolean; data?: ClassAttendanceSummary }>(
    `/attendance/class/${classId}/summary`,
    { params: { startDate, endDate } }
  ).then((response) => {
    const data = response.data?.data || {};
    _classAttendanceSummaryCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  }).finally(() => {
    _classAttendanceSummaryInFlight.delete(cacheKey);
  });

  _classAttendanceSummaryInFlight.set(cacheKey, request);
  return request;
};

export const getCachedClassDailyAttendance = (
  classId: string,
  date: string
): ClassDailyAttendanceResponse | null =>
  getCachedResource(_classDailyAttendanceCache, getDailyAttendanceCacheKey(classId, date));

export const getClassDailyAttendance = async (
  classId: string,
  date: string,
  force = false
): Promise<ClassDailyAttendanceResponse> => {
  const cacheKey = getDailyAttendanceCacheKey(classId, date);
  if (!force) {
    const cached = getCachedClassDailyAttendance(classId, date);
    if (cached) return cached;

    const inFlight = _classDailyAttendanceInFlight.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const request = attendanceApi.get<{ success?: boolean; data?: any }>(
    `/attendance/class/${classId}/date/${date}`
  ).then((response) => {
    const data = response.data?.data || { classId, date, students: [] };
    _classDailyAttendanceCache.set(cacheKey, { data, ts: Date.now() });
    return data;
  }).finally(() => {
    _classDailyAttendanceInFlight.delete(cacheKey);
  });

  _classDailyAttendanceInFlight.set(cacheKey, request);
  return request;
};

export const prefetchClassDailyAttendance = async (classId: string, date: string): Promise<void> => {
  try {
    await getClassDailyAttendance(classId, date);
  } catch {
    // Ignore prefetch failures.
  }
};

export const getCachedClassGradesReport = (
  classId: string,
  options?: { semester?: number; year?: number }
): ClassGradesReport | null =>
  getCachedResource(_classGradesReportCache, getGradesReportCacheKey(classId, options));

export const getClassGradesReport = async (
  classId: string,
  options?: { semester?: number; year?: number },
  force = false
): Promise<ClassGradesReport> => {
  const cacheKey = getGradesReportCacheKey(classId, options);
  if (!force) {
    const cached = getCachedClassGradesReport(classId, options);
    if (cached) return cached;

    const inFlight = _classGradesReportInFlight.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const params: Record<string, string | number> = {};
  if (options?.semester) params.semester = options.semester;
  if (options?.year) params.year = options.year;

  const request = gradeApi.get<ClassGradesReport>(`/grades/class-report/${classId}`, { params })
    .then((response) => {
      const data = response.data || {};
      _classGradesReportCache.set(cacheKey, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      _classGradesReportInFlight.delete(cacheKey);
    });

  _classGradesReportInFlight.set(cacheKey, request);
  return request;
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

export const getLatestCachedClassDetailBundle = (
  classId: string,
  options?: { allowStale?: boolean }
): ClassDetailBundle | null => {
  const allowStale = options?.allowStale ?? false;
  let latest: { data: ClassDetailBundle; ts: number } | null = null;

  for (const [key, cached] of _classDetailCache.entries()) {
    if (!key.includes(`"classId":"${classId}"`)) continue;

    const isExpired = Date.now() - cached.ts >= CLASS_DETAIL_CACHE_TTL;
    if (isExpired && !allowStale) {
      _classDetailCache.delete(key);
      continue;
    }

    if (!latest || cached.ts > latest.ts) {
      latest = cached;
    }
  }

  return latest?.data || null;
};

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

export const primeClassDetailBundleCache = (
  options: GetClassDetailBundleOptions,
  bundle: ClassDetailBundle
): ClassDetailBundle => {
  const normalizedBundle: ClassDetailBundle = {
    students: Array.isArray(bundle.students) ? bundle.students : [],
    timetable: bundle.timetable || null,
    attendanceSummary: bundle.attendanceSummary || null,
    classGradesReport: bundle.classGradesReport || null,
    monthlySummary: bundle.monthlySummary || null,
    teacherInfo: bundle.teacherInfo || null,
  };

  _classDetailCache.set(getClassDetailCacheKey(options), {
    data: normalizedBundle,
    ts: Date.now(),
  });

  _classStudentsCache.set(options.classId, {
    data: normalizedBundle.students,
    ts: Date.now(),
  });

  if (normalizedBundle.timetable) {
    _classTimetableCache.set(options.classId, {
      data: normalizedBundle.timetable,
      ts: Date.now(),
    });
  }

  if (normalizedBundle.attendanceSummary) {
    _classAttendanceSummaryCache.set(
      getAttendanceSummaryCacheKey(options.classId, options.startDate, options.endDate),
      { data: normalizedBundle.attendanceSummary, ts: Date.now() }
    );
  }

  if (normalizedBundle.classGradesReport) {
    _classGradesReportCache.set(
      getGradesReportCacheKey(options.classId, { semester: options.semester, year: options.year }),
      { data: normalizedBundle.classGradesReport, ts: Date.now() }
    );
  }

  return normalizedBundle;
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

  const previousBundle = getLatestCachedClassDetailBundle(options.classId, { allowStale: true }) || EMPTY_CLASS_DETAIL_BUNDLE;

  const request = Promise.allSettled([
    getClassStudents(options.classId, force),
    getClassTimetable(options.classId, force),
    getClassAttendanceSummary(options.classId, options.startDate, options.endDate, force),
    getClassGradesReport(options.classId, {
      semester: options.semester,
      year: options.year,
    }, force),
    (options.myRole === 'STUDENT' || options.myRole === 'PARENT') && options.linkedStudentId && options.monthLabel
      ? getStudentMonthlySummary(options.linkedStudentId, options.monthLabel)
      : Promise.resolve(null),
    options.myRole === 'TEACHER' && options.linkedTeacherId
      ? getTeacherById(options.linkedTeacherId)
      : Promise.resolve(null),
  ]).then((result) => {
    const fulfilledCount = result.filter((entry) => entry.status === 'fulfilled').length;
    if (fulfilledCount === 0 && !getLatestCachedClassDetailBundle(options.classId, { allowStale: true })) {
      const firstRejected = result.find(
        (entry): entry is PromiseRejectedResult => entry.status === 'rejected'
      );
      throw firstRejected?.reason || new Error('Failed to load class details');
    }

    const bundle: ClassDetailBundle = {
      students: result[0].status === 'fulfilled'
        ? (Array.isArray(result[0].value) ? result[0].value : [])
        : previousBundle.students,
      timetable: result[1].status === 'fulfilled'
        ? ((result[1].value || null) as TimetableResponse | null)
        : previousBundle.timetable,
      attendanceSummary: result[2].status === 'fulfilled'
        ? ((result[2].value || null) as ClassAttendanceSummary | null)
        : previousBundle.attendanceSummary,
      classGradesReport: result[3].status === 'fulfilled'
        ? ((result[3].value || null) as ClassGradesReport | null)
        : previousBundle.classGradesReport,
      monthlySummary: result[4].status === 'fulfilled'
        ? ((result[4].value || null) as Record<string, unknown> | null)
        : previousBundle.monthlySummary,
      teacherInfo: result[5].status === 'fulfilled'
        ? ((result[5].value || null) as Record<string, unknown> | null)
        : previousBundle.teacherInfo,
    };

    return primeClassDetailBundleCache(options, bundle);
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
    _classStudentsCache.clear();
    _classStudentsInFlight.clear();
    _classTimetableCache.clear();
    _classTimetableInFlight.clear();
    _classAttendanceSummaryCache.clear();
    _classAttendanceSummaryInFlight.clear();
    _classDailyAttendanceCache.clear();
    _classDailyAttendanceInFlight.clear();
    _classGradesReportCache.clear();
    _classGradesReportInFlight.clear();
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

  _classStudentsCache.delete(classId);
  _classStudentsInFlight.delete(classId);
  _classTimetableCache.delete(classId);
  _classTimetableInFlight.delete(classId);

  for (const key of _classAttendanceSummaryCache.keys()) {
    if (key.startsWith(`${classId}:`)) {
      _classAttendanceSummaryCache.delete(key);
    }
  }
  for (const key of _classAttendanceSummaryInFlight.keys()) {
    if (key.startsWith(`${classId}:`)) {
      _classAttendanceSummaryInFlight.delete(key);
    }
  }
  for (const key of _classDailyAttendanceCache.keys()) {
    if (key.startsWith(`${classId}:`)) {
      _classDailyAttendanceCache.delete(key);
    }
  }
  for (const key of _classDailyAttendanceInFlight.keys()) {
    if (key.startsWith(`${classId}:`)) {
      _classDailyAttendanceInFlight.delete(key);
    }
  }
  for (const key of _classGradesReportCache.keys()) {
    if (key.startsWith(`${classId}:`)) {
      _classGradesReportCache.delete(key);
    }
  }
  for (const key of _classGradesReportInFlight.keys()) {
    if (key.startsWith(`${classId}:`)) {
      _classGradesReportInFlight.delete(key);
    }
  }
};
