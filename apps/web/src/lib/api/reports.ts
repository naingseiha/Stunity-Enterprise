import { TokenManager } from './auth';
import { GRADE_SERVICE_URL } from './config';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const REPORTS_DASHBOARD_CACHE_TTL_MS = 60 * 1000;

export type ReportPeriodType = 'month' | 'semester' | 'year';

export interface SchoolReportsDashboardParams {
  schoolId: string;
  yearId: string;
  period: ReportPeriodType;
  semester?: '1' | '2';
  monthNumber?: number;
  year?: number;
  classId?: string;
}

export interface DashboardOverview {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceRate: number;
}

export interface GradeLevelAverage {
  grade: string;
  average: number;
  studentCount: number;
}

export interface SubjectAverage {
  subject: string;
  subjectKh: string;
  average: number;
}

export interface ClassAverage {
  classId: string;
  className: string;
  grade: string;
  average: number;
  studentCount: number;
  rank: number;
}

export interface DashboardTrendPoint {
  label: string;
  khmerLabel: string;
  average: number;
  attendanceRate: number;
}

export interface SchoolReportsDashboardResponse {
  period: {
    type: ReportPeriodType;
    label: string;
    khmerLabel: string;
    startDate: string;
    endDate: string;
  };
  overview: DashboardOverview;
  averageScoreByGradeLevel: GradeLevelAverage[];
  averageScoreBySubject: SubjectAverage[];
  averageScoreByClass: ClassAverage[];
  passRate: { passing: number; failing: number; passRatePercent: number };
  topPerformingClasses: ClassAverage[];
  bottomPerformingClasses: ClassAverage[];
  trend: DashboardTrendPoint[];
  scale: { system: 'KHM_MOEYS' | 'GENERIC'; maxAverage: number; passingMark: number };
  scope: { schoolWide: boolean; classId: string | null };
  generatedAt: string;
}

export async function getSchoolReportsDashboard(
  params: SchoolReportsDashboardParams
): Promise<SchoolReportsDashboardResponse> {
  const token = TokenManager.getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const query = new URLSearchParams({
    yearId: params.yearId,
    period: params.period,
  });
  if (params.semester) query.set('semester', params.semester);
  if (params.monthNumber) query.set('monthNumber', String(params.monthNumber));
  if (params.year) query.set('year', String(params.year));
  if (params.classId) query.set('classId', params.classId);

  const cacheKey = `reports:dashboard:${params.schoolId}:${query.toString()}`;
  const cached = readPersistentCache<SchoolReportsDashboardResponse>(cacheKey, REPORTS_DASHBOARD_CACHE_TTL_MS);
  if (cached) return cached;

  const res = await fetch(`${GRADE_SERVICE_URL}/reports/dashboard?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Failed to load reports dashboard (${res.status})`);
  }

  const data: SchoolReportsDashboardResponse = await res.json();
  writePersistentCache(cacheKey, data);
  return data;
}
