import { TokenManager } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:3008';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  PERMISSION = 'PERMISSION',
}

export enum AttendanceSession {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string | null;
  date: string;
  status: AttendanceStatus;
  session: AttendanceSession;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    photoUrl?: string;
    gender: string;
  };
}

export interface StudentDailyAttendance {
  student: {
    id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    photoUrl?: string;
    gender: string;
  };
  morning: Attendance | null;
  afternoon: Attendance | null;
}

export interface BulkAttendanceItem {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface MonthlyAttendanceGrid {
  students: Array<{
    student: {
      id: string;
      studentId?: string;
      firstName: string;
      lastName: string;
      khmerName: string;
      photoUrl?: string;
      gender: string;
    };
    attendance: {
      [date: string]: {
        morning: Attendance | null;
        afternoon: Attendance | null;
      };
    };
    summary: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      permission: number;
      total: number;
    };
  }>;
  daysInMonth: number;
}

export interface StudentAttendanceSummary {
  studentId: string;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  permission: number;
  attendancePercentage: number;
}

export interface ClassAttendanceSummary {
  classId: string;
  totalStudents: number;
  averageAttendanceRate: number;
  dailyBreakdown: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    permission: number;
  }>;
}

export type DelegationScopeType = 'CLASS' | 'GRADE' | 'SCHOOL';
export type DisciplineCapabilityProfile = 'ATTENDANCE_APL' | 'DISCIPLINE_E' | 'FULL_ATTENDANCE';
export type DisciplineResponsibilityType = 'CLASS_LEADER' | 'DISCIPLINE_COUNCIL' | 'DISCIPLINE_TEACHER' | 'CUSTOM';

export interface AttendanceDelegation {
  id: string;
  schoolId: string;
  assigneeUserId: string;
  grantedByUserId: string;
  responsibilityType: DisciplineResponsibilityType;
  capabilityProfile: DisciplineCapabilityProfile;
  scopeType: DelegationScopeType;
  classId?: string | null;
  grade?: string | null;
  notes?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assigneeUser?: { id: string; firstName: string; lastName: string; email?: string; role: string };
  class?: { id: string; name: string; grade?: string };
}

export interface DisciplinePolicy {
  id: string;
  schoolId: string;
  allowedExcusedReasonTemplates: string[];
  mandatoryExcusedReasonMinLength: number;
  requireEscalationForExcused: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Attendance API Client
 */
class AttendanceAPI {
  private getHeaders(): Record<string, string> {
    const token = TokenManager.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Get daily attendance for a class
   */
  async getDailyAttendance(classId: string, date: string): Promise<StudentDailyAttendance[]> {
    const response = await fetch(
      `${API_BASE_URL}/attendance/class/${classId}/date/${date}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch daily attendance');
    }

    return response.json();
  }

  /**
   * Get monthly attendance grid
   */
  async getMonthlyAttendance(
    classId: string,
    month: number,
    year: number
  ): Promise<MonthlyAttendanceGrid> {
    const response = await fetch(
      `${API_BASE_URL}/attendance/class/${classId}/month/${month}/year/${year}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch monthly attendance');
    }

    return response.json();
  }

  /**
   * Bulk mark attendance
   */
  async bulkMarkAttendance(
    classId: string,
    date: string,
    session: AttendanceSession,
    attendance: BulkAttendanceItem[]
  ): Promise<{ message: string; savedCount: number }> {
    const response = await fetch(`${API_BASE_URL}/attendance/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ classId, date, session, attendance }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save attendance');
    }

    return response.json();
  }

  /**
   * Update single attendance record
   */
  async updateAttendance(
    id: string,
    data: { status?: AttendanceStatus; remarks?: string }
  ): Promise<Attendance> {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update attendance');
    }

    return response.json();
  }

  /**
   * Delete attendance record
   */
  async deleteAttendance(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete attendance');
    }
  }

  /**
   * Get student attendance summary
   */
  async getStudentSummary(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<StudentAttendanceSummary> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const url = `${API_BASE_URL}/attendance/student/${studentId}/summary${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch student summary');
    }

    return response.json();
  }

  /**
   * Get class attendance summary
   */
  async getClassSummary(
    classId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ClassAttendanceSummary> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const url = `${API_BASE_URL}/attendance/class/${classId}/summary${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch class summary');
    }

    return response.json();
  }

  async getDelegations(params?: { classId?: string; grade?: string; assigneeUserId?: string }): Promise<AttendanceDelegation[]> {
    const query = new URLSearchParams();
    if (params?.classId) query.append('classId', params.classId);
    if (params?.grade) query.append('grade', params.grade);
    if (params?.assigneeUserId) query.append('assigneeUserId', params.assigneeUserId);
    const response = await fetch(`${API_BASE_URL}/attendance/delegations${query.toString() ? `?${query.toString()}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const debugRole = payload?.normalizedRole || payload?.role;
      throw new Error(`${payload.message || 'Failed to fetch delegations'}${debugRole ? ` (role: ${debugRole})` : ''}`);
    }
    return payload.data || [];
  }

  async createDelegation(input: Partial<AttendanceDelegation>): Promise<AttendanceDelegation> {
    const response = await fetch(`${API_BASE_URL}/attendance/delegations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Failed to create delegation');
    return payload.data;
  }

  async updateDelegation(id: string, patch: Partial<AttendanceDelegation>): Promise<AttendanceDelegation> {
    const response = await fetch(`${API_BASE_URL}/attendance/delegations/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(patch),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Failed to update delegation');
    return payload.data;
  }

  async getDelegationUsers(search?: string): Promise<Array<{ id: string; firstName: string; lastName: string; email?: string; role: string }>> {
    const query = new URLSearchParams();
    if (search) query.append('search', search);
    const response = await fetch(`${API_BASE_URL}/attendance/delegations/users${query.toString() ? `?${query.toString()}` : ''}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const debugRole = payload?.normalizedRole || payload?.role;
      throw new Error(`${payload.message || 'Failed to fetch users'}${debugRole ? ` (role: ${debugRole})` : ''}`);
    }
    return payload.data || [];
  }

  async getDisciplinePolicy(): Promise<DisciplinePolicy | null> {
    const response = await fetch(`${API_BASE_URL}/attendance/discipline-policy`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Failed to fetch discipline policy');
    return payload.data || null;
  }

  async saveDisciplinePolicy(input: Partial<DisciplinePolicy>): Promise<DisciplinePolicy> {
    const response = await fetch(`${API_BASE_URL}/attendance/discipline-policy`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Failed to save discipline policy');
    return payload.data;
  }

  async getDelegationRollout(): Promise<{ enabled: boolean }> {
    const response = await fetch(`${API_BASE_URL}/attendance/delegations/rollout`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const debugRole = payload?.normalizedRole || payload?.role;
      throw new Error(`${payload.message || 'Failed to fetch rollout'}${debugRole ? ` (role: ${debugRole})` : ''}`);
    }
    return payload.data || { enabled: true };
  }

  async setDelegationRollout(enabled: boolean): Promise<{ enabled: boolean }> {
    const response = await fetch(`${API_BASE_URL}/attendance/delegations/rollout`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ enabled }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || 'Failed to update rollout');
    return payload.data || { enabled };
  }
}

export const attendanceAPI = new AttendanceAPI();

/**
 * Helper: Get status display info
 */
export const getStatusInfo = (
  status: AttendanceStatus
): {
  label: string;
  labelKh: string;
  color: string;
  bgColor: string;
  icon: string;
  shortLabel: string;
} => {
  switch (status) {
    case AttendanceStatus.PRESENT:
      return {
        label: 'Present',
        labelKh: 'មាន',
        color: 'text-green-700',
        bgColor: 'bg-green-100 hover:bg-green-200 border-green-300',
        icon: '✓',
        shortLabel: 'P',
      };
    case AttendanceStatus.ABSENT:
      return {
        label: 'Absent',
        labelKh: 'អវត្តមាន',
        color: 'text-red-700',
        bgColor: 'bg-red-100 hover:bg-red-200 border-red-300',
        icon: '✗',
        shortLabel: 'A',
      };
    case AttendanceStatus.LATE:
      return {
        label: 'Late',
        labelKh: 'យឺត',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100 hover:bg-orange-200 border-orange-300',
        icon: '⏰',
        shortLabel: 'L',
      };
    case AttendanceStatus.EXCUSED:
      return {
        label: 'Excused',
        labelKh: 'មានហេតុផល',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
        icon: '📝',
        shortLabel: 'E',
      };
    case AttendanceStatus.PERMISSION:
      return {
        label: 'Permission',
        labelKh: 'ច្បាប់',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
        icon: '📋',
        shortLabel: 'S',
      };
  }
};

/**
 * Helper: Get all status options
 */
export const getAllStatusOptions = () => [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE,
  AttendanceStatus.EXCUSED,
  AttendanceStatus.PERMISSION,
];

/**
 * Helper: Format date for API
 */
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Helper: Get session label
 */
export const getSessionLabel = (session: AttendanceSession): { en: string; kh: string } => {
  return session === AttendanceSession.MORNING
    ? { en: 'Morning', kh: 'ព្រឹក' }
    : { en: 'Afternoon', kh: 'ល្ងាច' };
};
