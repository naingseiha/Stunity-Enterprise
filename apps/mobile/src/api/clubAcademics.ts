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

export const getClubSubjects = async (clubId: string): Promise<ClubSubject[]> => {
  const response = await api.get(`/subjects/clubs/${clubId}/subjects`);
  return unwrapArray<ClubSubject>(response.data);
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
  return unwrapEntity<ClubSubject>(response.data, ['subject', 'data']);
};

export const getClubGrades = async (
  clubId: string,
  params?: { term?: string; subjectId?: string; assessmentType?: string; memberId?: string }
): Promise<ClubGrade[]> => {
  const response = await api.get(`/grades/clubs/${clubId}/grades`, { params });
  return unwrapArray<ClubGrade>(response.data);
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
  return unwrapEntity<ClubGrade>(response.data, ['grade', 'data']);
};

export const getClubGradeStatistics = async (
  clubId: string,
  params?: { term?: string; subjectId?: string }
): Promise<ClubGradeStatistics> => {
  const response = await api.get(`/grades/clubs/${clubId}/grades/statistics`, { params });
  return unwrapEntity<ClubGradeStatistics>(response.data, ['statistics', 'data']);
};

export const getClubSessions = async (clubId: string): Promise<ClubSession[]> => {
  const response = await api.get(`/sessions/clubs/${clubId}/sessions`);
  return unwrapArray<ClubSession>(response.data);
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
  return unwrapEntity<ClubSession>(response.data, ['session', 'data']);
};

export const getSessionAttendance = async (sessionId: string): Promise<ClubAttendanceRecord[]> => {
  const response = await api.get(`/attendance/sessions/${sessionId}/attendance`);
  return unwrapArray<ClubAttendanceRecord>(response.data);
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
  return unwrapEntity<ClubAttendanceRecord>(response.data, ['attendance', 'record', 'data']);
};

export const getClubAttendanceStatistics = async (clubId: string): Promise<ClubAttendanceStatistics> => {
  const response = await api.get(`/attendance/clubs/${clubId}/attendance/statistics`);
  return unwrapEntity<ClubAttendanceStatistics>(response.data, ['statistics', 'data']);
};

export const getClubReport = async (clubId: string): Promise<any> => {
  const response = await api.get(`/reports/clubs/${clubId}/report`);
  return unwrapEntity<any>(response.data, ['report', 'data']);
};
