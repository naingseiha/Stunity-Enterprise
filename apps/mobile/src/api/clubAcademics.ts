import { clubsApi as api } from './client';

export type ClubAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface ClubSubject {
  id: string;
  clubId: string;
  name: string;
  code: string;
  description?: string;
  weight: number;
  maxScore?: number;
  passingScore?: number;
}

export interface ClubGrade {
  id: string;
  clubId: string;
  memberId: string;
  subjectId: string;
  assessmentType: string;
  assessmentName?: string;
  score: number;
  maxScore: number;
  percentage: number;
  weightedScore?: number;
  term?: string;
  remarks?: string;
  gradedDate?: string;
  member?: {
    id: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  subject?: ClubSubject;
}

export interface ClubSession {
  id: string;
  clubId: string;
  title: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  location?: string;
  description?: string;
}

export interface ClubAttendanceRecord {
  id: string;
  sessionId: string;
  memberId: string;
  status: ClubAttendanceStatus;
  notes?: string;
  member?: {
    id: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface ClubGradeStatistics {
  totalGrades: number;
  averagePercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  passingRate: number;
  byAssessmentType?: Record<string, { count: number; averagePercentage: number }>;
}

export interface ClubAttendanceStatistics {
  totalSessions: number;
  totalRecords: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

const unwrapArray = <T>(data: any): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  if (Array.isArray(data?.items)) return data.items as T[];
  return [];
};

const unwrapEntity = <T>(data: any, keys: string[]): T => {
  for (const key of keys) {
    if (data?.[key]) return data[key] as T;
  }
  return data as T;
};

const CLUB_ACADEMICS_CACHE_TTL = 60_000;
const _cache = new Map<string, { data: unknown; ts: number }>();
const _inFlight = new Map<string, Promise<unknown>>();

const getCached = <T>(key: string): T | null => {
  const cached = _cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.ts >= CLUB_ACADEMICS_CACHE_TTL) {
    _cache.delete(key);
    return null;
  }

  return cached.data as T;
};

const withCache = async <T>(key: string, force: boolean, loader: () => Promise<T>): Promise<T> => {
  if (!force) {
    const cached = getCached<T>(key);
    if (cached) return cached;

    const inFlight = _inFlight.get(key);
    if (inFlight) return inFlight as Promise<T>;
  }

  const request = loader()
    .then((data) => {
      _cache.set(key, { data, ts: Date.now() });
      return data;
    })
    .finally(() => {
      _inFlight.delete(key);
    });

  _inFlight.set(key, request);
  return request;
};

const deleteCachePrefix = (prefix: string) => {
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) {
      _cache.delete(key);
    }
  }
  for (const key of _inFlight.keys()) {
    if (key.startsWith(prefix)) {
      _inFlight.delete(key);
    }
  }
};

const paramsKey = (params?: Record<string, unknown>) => JSON.stringify(params || {});

export const getCachedClubSubjects = (clubId: string): ClubSubject[] | null =>
  getCached<ClubSubject[]>(`subjects:${clubId}`);

export const getCachedClubGrades = (
  clubId: string,
  params?: { term?: string; subjectId?: string; assessmentType?: string; memberId?: string }
): ClubGrade[] | null => getCached<ClubGrade[]>(`grades:${clubId}:${paramsKey(params)}`);

export const getCachedClubSessions = (clubId: string): ClubSession[] | null =>
  getCached<ClubSession[]>(`sessions:${clubId}`);

export const getCachedSessionAttendance = (sessionId: string): ClubAttendanceRecord[] | null =>
  getCached<ClubAttendanceRecord[]>(`session-attendance:${sessionId}`);

export const getCachedClubAttendanceStatistics = (clubId: string): ClubAttendanceStatistics | null =>
  getCached<ClubAttendanceStatistics>(`attendance-stats:${clubId}`);

export const getCachedClubReport = (clubId: string): any | null =>
  getCached<any>(`report:${clubId}`);

export const invalidateClubAcademicsCache = (clubId?: string, sessionId?: string): void => {
  if (!clubId) {
    _cache.clear();
    _inFlight.clear();
    return;
  }

  deleteCachePrefix(`subjects:${clubId}`);
  deleteCachePrefix(`grades:${clubId}`);
  deleteCachePrefix(`grade-stats:${clubId}`);
  deleteCachePrefix(`sessions:${clubId}`);
  deleteCachePrefix(`attendance-stats:${clubId}`);
  deleteCachePrefix(`report:${clubId}`);

  if (sessionId) {
    deleteCachePrefix(`session-attendance:${sessionId}`);
  }
};

export const getClubSubjects = async (clubId: string, force = false): Promise<ClubSubject[]> => {
  return withCache(`subjects:${clubId}`, force, async () => {
    const response = await api.get(`/subjects/clubs/${clubId}/subjects`);
    return unwrapArray<ClubSubject>(response.data);
  });
};

export const createClubSubject = async (
  clubId: string,
  payload: {
    name: string;
    code: string;
    description?: string;
    weight?: number;
    maxScore?: number;
    passingScore?: number;
  }
): Promise<ClubSubject> => {
  const response = await api.post(`/subjects/clubs/${clubId}/subjects`, payload);
  invalidateClubAcademicsCache(clubId);
  return unwrapEntity<ClubSubject>(response.data, ['subject', 'data']);
};

export const getClubGrades = async (
  clubId: string,
  params?: { term?: string; subjectId?: string; assessmentType?: string; memberId?: string },
  force = false
): Promise<ClubGrade[]> => {
  return withCache(`grades:${clubId}:${paramsKey(params)}`, force, async () => {
    const response = await api.get(`/grades/clubs/${clubId}/grades`, { params });
    return unwrapArray<ClubGrade>(response.data);
  });
};

export const createClubGrade = async (
  clubId: string,
  payload: {
    memberId: string;
    subjectId: string;
    assessmentType?: string;
    assessmentName?: string;
    score: number;
    maxScore: number;
    remarks?: string;
    term?: string;
  }
): Promise<ClubGrade> => {
  const response = await api.post(`/grades/clubs/${clubId}/grades`, payload);
  invalidateClubAcademicsCache(clubId);
  return unwrapEntity<ClubGrade>(response.data, ['grade', 'data']);
};

export const getClubGradeStatistics = async (
  clubId: string,
  params?: { term?: string; subjectId?: string },
  force = false
): Promise<ClubGradeStatistics> => {
  return withCache(`grade-stats:${clubId}:${paramsKey(params)}`, force, async () => {
    const response = await api.get(`/grades/clubs/${clubId}/grades/statistics`, { params });
    return unwrapEntity<ClubGradeStatistics>(response.data, ['statistics', 'data']);
  });
};

export const getClubSessions = async (clubId: string, force = false): Promise<ClubSession[]> => {
  return withCache(`sessions:${clubId}`, force, async () => {
    const response = await api.get(`/sessions/clubs/${clubId}/sessions`);
    return unwrapArray<ClubSession>(response.data);
  });
};

export const createClubSession = async (
  clubId: string,
  payload: {
    title: string;
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
  }
): Promise<ClubSession> => {
  const response = await api.post(`/sessions/clubs/${clubId}/sessions`, payload);
  invalidateClubAcademicsCache(clubId);
  return unwrapEntity<ClubSession>(response.data, ['session', 'data']);
};

export const getSessionAttendance = async (sessionId: string, force = false): Promise<ClubAttendanceRecord[]> => {
  return withCache(`session-attendance:${sessionId}`, force, async () => {
    const response = await api.get(`/attendance/sessions/${sessionId}/attendance`);
    return unwrapArray<ClubAttendanceRecord>(response.data);
  });
};

export const markSessionAttendance = async (
  sessionId: string,
  payload: {
    memberId: string;
    status: ClubAttendanceStatus;
    notes?: string;
  }
): Promise<ClubAttendanceRecord> => {
  const response = await api.post(`/attendance/sessions/${sessionId}/attendance`, payload);
  deleteCachePrefix(`session-attendance:${sessionId}`);
  return unwrapEntity<ClubAttendanceRecord>(response.data, ['attendance', 'record', 'data']);
};

export const getClubAttendanceStatistics = async (clubId: string, force = false): Promise<ClubAttendanceStatistics> => {
  return withCache(`attendance-stats:${clubId}`, force, async () => {
    const response = await api.get(`/attendance/clubs/${clubId}/attendance/statistics`);
    return unwrapEntity<ClubAttendanceStatistics>(response.data, ['statistics', 'data']);
  });
};

export const getClubReport = async (clubId: string, force = false): Promise<any> => {
  return withCache(`report:${clubId}`, force, async () => {
    const response = await api.get(`/reports/clubs/${clubId}/report`);
    return unwrapEntity<any>(response.data, ['report', 'data']);
  });
};
