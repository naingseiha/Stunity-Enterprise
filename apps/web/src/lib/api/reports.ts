import { TokenManager } from "./auth";
import { GRADE_SERVICE_URL } from "./config";
import {
  readPersistentCache,
  writePersistentCache,
} from "@/lib/persistent-cache";

const REPORTS_DASHBOARD_CACHE_TTL_MS = 60 * 1000;

export type ReportPeriodType = "month" | "semester" | "year";
export type PosterScopeType = "class" | "multiClass" | "grade" | "school";
export type PosterGroupBy = "class" | "grade" | "none";

export interface SchoolReportsDashboardParams {
  schoolId: string;
  yearId: string;
  period: ReportPeriodType;
  semester?: "1" | "2";
  monthNumber?: number;
  year?: number;
  classId?: string;
}

export interface DashboardOverview {
  totalStudents: number;
  totalTeachers: number;
  femaleTeachers: number;
  totalClasses: number;
  attendanceRate: number;
  /** null when no TeacherAttendance rows exist yet for the selected period. */
  teacherAttendanceRate: number | null;
}

export interface StudentFlowBucket {
  total: number;
  female: number;
}

export interface StudentFlow {
  repeaters: StudentFlowBucket;
  transferIn: StudentFlowBucket;
  transferOut: StudentFlowBucket;
}

export interface GradeLevelAverage {
  grade: string;
  average: number;
  studentCount: number;
}

export interface SubjectGradeBand {
  grade: "A" | "B" | "C" | "D" | "E" | "F";
  total: number;
  male: number;
  female: number;
}

export interface SubjectAverage {
  subject: string;
  subjectKh: string;
  average: number;
  passCount: number;
  failCount: number;
  passRatePercent: number;
  gradeDistribution: SubjectGradeBand[];
}

export interface HonorRollStudent {
  studentId: string;
  name: string;
  khmerName: string | null;
  average: number;
  rank: number;
}

export interface PosterRecipient {
  studentId: string;
  name: string;
  khmerName: string | null;
  photoUrl: string | null;
  classId: string;
  className: string;
  grade: string;
  average: number;
  rank: number;
}

export interface PosterRecipientGroup {
  id: string;
  label: string;
  type: PosterGroupBy;
  recipients: PosterRecipient[];
}

export interface PosterRecipientsParams {
  schoolId: string;
  yearId: string;
  period: ReportPeriodType;
  semester?: "1" | "2";
  monthNumber?: number;
  year?: number;
  scope: PosterScopeType;
  classIds?: string[];
  grade?: string;
  groupBy: PosterGroupBy;
  limit: number;
  includeTies: boolean;
}

export interface PosterRecipientsResponse {
  period: {
    type: ReportPeriodType;
    label: string;
    khmerLabel: string;
    startDate: string;
    endDate: string;
  };
  scope: {
    type: PosterScopeType;
    groupBy: PosterGroupBy;
    classIds: string[];
    grade: string | null;
  };
  groups: PosterRecipientGroup[];
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    logo: string | null;
  };
  scale: {
    system: "KHM_MOEYS" | "GENERIC";
    maxAverage: number;
    passingMark: number;
  };
  generatedAt: string;
}

export interface GradeLevelHonorRoll {
  grade: string;
  students: HonorRollStudent[];
}

export interface GenderBreakdown {
  male: { count: number; passRatePercent: number };
  female: { count: number; passRatePercent: number };
}

export interface AtRiskStudent {
  studentId: string;
  name: string;
  khmerName: string | null;
  classId: string;
  className: string;
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
  topStudentsByGrade: GradeLevelHonorRoll[];
  topStudentsInClass: HonorRollStudent[] | null;
  atRiskStudents: AtRiskStudent[];
  genderBreakdown: GenderBreakdown;
  studentFlow: StudentFlow;
  trend: DashboardTrendPoint[];
  scale: {
    system: "KHM_MOEYS" | "GENERIC";
    maxAverage: number;
    passingMark: number;
  };
  scope: { schoolWide: boolean; classId: string | null };
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    logo: string | null;
  };
  generatedAt: string;
}

export async function getSchoolReportsDashboard(
  params: SchoolReportsDashboardParams,
): Promise<SchoolReportsDashboardResponse> {
  const token = TokenManager.getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const query = new URLSearchParams({
    yearId: params.yearId,
    period: params.period,
  });
  if (params.semester) query.set("semester", params.semester);
  if (params.monthNumber) query.set("monthNumber", String(params.monthNumber));
  if (params.year) query.set("year", String(params.year));
  if (params.classId) query.set("classId", params.classId);

  const cacheKey = `reports:dashboard:${params.schoolId}:${query.toString()}`;
  const cached = readPersistentCache<SchoolReportsDashboardResponse>(
    cacheKey,
    REPORTS_DASHBOARD_CACHE_TTL_MS,
  );
  if (cached) return cached;

  const res = await fetch(
    `${GRADE_SERVICE_URL}/reports/dashboard?${query.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || `Failed to load reports dashboard (${res.status})`,
    );
  }

  const data: SchoolReportsDashboardResponse = await res.json();
  writePersistentCache(cacheKey, data);
  return data;
}

export async function getPosterRecipients(
  params: PosterRecipientsParams,
): Promise<PosterRecipientsResponse> {
  const token = TokenManager.getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const query = new URLSearchParams({
    yearId: params.yearId,
    period: params.period,
    scope: params.scope,
    groupBy: params.groupBy,
    limit: String(params.limit),
    includeTies: String(params.includeTies),
  });
  if (params.semester) query.set("semester", params.semester);
  if (params.monthNumber) query.set("monthNumber", String(params.monthNumber));
  if (params.year) query.set("year", String(params.year));
  if (params.classIds?.length) query.set("classIds", params.classIds.join(","));
  if (params.grade) query.set("grade", params.grade);

  const cacheKey = `reports:poster-recipients:${params.schoolId}:${query.toString()}`;
  const cached = readPersistentCache<PosterRecipientsResponse>(
    cacheKey,
    REPORTS_DASHBOARD_CACHE_TTL_MS,
  );
  if (cached) return cached;

  const res = await fetch(
    `${GRADE_SERVICE_URL}/reports/poster-recipients?${query.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || `Failed to load poster recipients (${res.status})`,
    );
  }

  const data: PosterRecipientsResponse = await res.json();
  writePersistentCache(cacheKey, data);
  return data;
}
