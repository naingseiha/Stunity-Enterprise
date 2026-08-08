import { SCHOOL_SERVICE_URL } from './config';
import { TokenManager } from './auth';

export type YearEndOutcome =
  | 'PENDING'
  | 'PROMOTE'
  | 'CONDITIONAL_PROMOTE'
  | 'REPEAT'
  | 'GRADUATE'
  | 'WITHDRAWN';

export type YearEndCycleStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'FINALIZED' | 'CANCELLED';

export interface PromotionPolicy {
  passAverage: number;
  minAttendanceRate: number;
  terminalGrade: number;
  maxUnexcusedAbsences: number | null;
  maxDisciplineIncidents: number | null;
  requireCompleteGrades: boolean;
  allowConditionalPromotion: boolean;
  allowSupplementaryExam: boolean;
  requireReasonForOverride: boolean;
  requireSecondApproval: boolean;
  additionalRules: Record<string, unknown>;
}

export interface YearEndDecision {
  id: string;
  studentId: string;
  fromClassId: string;
  targetClassId: string | null;
  recommendedOutcome: YearEndOutcome;
  finalOutcome: YearEndOutcome;
  decisionSource: 'SYSTEM' | 'MANUAL' | 'OVERRIDE';
  reasonCode: string | null;
  reasonDetails: string | null;
  academicAverage: number | null;
  attendanceRate: number | null;
  totalAttendanceSessions: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  disciplineIncidentCount: number | null;
  evidence: {
    flags?: string[];
    gradeRecordCount?: number;
    academicCalculationMethod?: 'TWO_SEMESTER_AVERAGE';
    semester1Average?: number | null;
    semester2Average?: number | null;
    annualAverage?: number | null;
    annualResultComplete?: boolean;
    academicStatus?: 'PASS' | 'FAIL' | 'INCOMPLETE';
  } | null;
  interventions: string[] | null;
  interventionStatus: string | null;
  reviewedAt: string | null;
  version: number;
  student: {
    id: string;
    studentId: string | null;
    firstName: string;
    lastName: string;
    englishFirstName: string | null;
    englishLastName: string | null;
    gender: string;
    photoUrl: string | null;
  };
  fromClass: { id: string; name: string; grade: string; section: string | null };
  targetClass: { id: string; name: string; grade: string; section: string | null; capacity: number | null } | null;
}

export interface YearEndCycle {
  id: string;
  schoolId: string;
  fromAcademicYearId: string;
  toAcademicYearId: string;
  status: YearEndCycleStatus;
  policySnapshot: PromotionPolicy;
  generatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  finalizedAt: string | null;
  notes: string | null;
  fromAcademicYear: { id: string; name: string; startDate: string; endDate: string; status: string };
  toAcademicYear: { id: string; name: string; startDate: string; endDate: string; status: string };
  decisions: YearEndDecision[];
  summary: Record<YearEndOutcome, number> & { total: number; reviewed: number; overrides: number };
}

const authHeaders = () => {
  const token = TokenManager.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...authHeaders(), ...(init?.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const details = payload.details
      ? ` (${Object.entries(payload.details).map(([key, value]) => `${key}: ${value}`).join(', ')})`
      : '';
    throw new Error(`${payload.error || payload.message || response.statusText}${details}`);
  }
  return payload.data as T;
}

export const yearEndApi = {
  getPolicy(schoolId: string) {
    return request<PromotionPolicy>(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/promotion-policy`);
  },

  savePolicy(schoolId: string, policy: PromotionPolicy) {
    return request<PromotionPolicy>(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/promotion-policy`, {
      method: 'PUT',
      body: JSON.stringify(policy),
    });
  },

  getCycle(schoolId: string, fromYearId: string, toYearId?: string) {
    const query = toYearId ? `?toAcademicYearId=${encodeURIComponent(toYearId)}` : '';
    return request<YearEndCycle | null>(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/year-end-cycle${query}`);
  },

  generate(schoolId: string, fromYearId: string, toAcademicYearId: string, recalculate = false) {
    return request<YearEndCycle>(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/year-end-cycle/generate`, {
      method: 'POST',
      body: JSON.stringify({ toAcademicYearId, recalculate }),
    });
  },

  updateDecision(
    schoolId: string,
    fromYearId: string,
    decisionId: string,
    update: Partial<Pick<YearEndDecision, 'finalOutcome' | 'targetClassId' | 'reasonCode' | 'reasonDetails' | 'interventions' | 'interventionStatus' | 'disciplineIncidentCount'>> & Pick<YearEndDecision, 'version'>,
  ) {
    return request<YearEndDecision>(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/year-end-cycle/decisions/${decisionId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  },

  acceptRecommendations(schoolId: string, fromYearId: string, cycleId: string) {
    return request<YearEndCycle & { acceptedCount: number }>(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/year-end-cycle/accept-recommendations`, {
      method: 'POST',
      body: JSON.stringify({ cycleId }),
    });
  },

  transition(schoolId: string, fromYearId: string, cycleId: string, action: 'submit' | 'approve' | 'finalize', notes?: string) {
    return request<unknown>(`${SCHOOL_SERVICE_URL}/schools/${schoolId}/academic-years/${fromYearId}/year-end-cycle/${action}`, {
      method: 'POST',
      body: JSON.stringify({ cycleId, notes }),
    });
  },
};
