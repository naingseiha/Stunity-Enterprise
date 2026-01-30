import { TokenManager } from './auth';

const API_BASE_URL = 'http://localhost:3008';

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

/**
 * Attendance API Client
 */
class AttendanceAPI {
  private getHeaders() {
    const token = TokenManager.getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
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
