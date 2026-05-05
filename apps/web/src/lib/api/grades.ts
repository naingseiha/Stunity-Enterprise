import { TokenManager } from './auth';
import { readPersistentCache, writePersistentCache } from '@/lib/persistent-cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_GRADE_SERVICE_URL || 'http://localhost:3007';
const GRADE_REPORT_CACHE_TTL_MS = 60 * 1000;

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  classId: string;
  score: number;
  maxScore: number;
  month: string;
  monthNumber: number;
  year: number;
  percentage: number;
  weightedScore: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    photoUrl?: string;
  };
  subject?: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    coefficient: number;
    maxScore: number;
  };
  class?: {
    id: string;
    name: string;
    grade: string;
  };
}

export interface GradeGridItem {
  student: {
    id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    photoUrl?: string;
  };
  grade: Grade | null;
  subject: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    coefficient: number;
    maxScore: number;
  };
}

export interface StudentAverage {
  studentId: string;
  totalScore: number;
  totalMaxScore: number;
  totalWeightedScore: number;
  totalCoefficient: number;
  average: number;
  percentage: number;
  gradeLevel: string;
  rank: number;
}

export interface StudentMonthlySummary {
  id: string;
  studentId: string;
  classId: string;
  month: string;
  monthNumber: number;
  year: number;
  totalScore: number;
  totalMaxScore: number;
  totalWeightedScore: number;
  totalCoefficient: number;
  average: number;
  classRank?: number;
  gradeLevel?: string;
  createdAt: string;
  updatedAt: string;
  student?: any;
  class?: any;
}

export interface KhmerMonthlyReportSubject {
  id: string;
  name: string;
  nameKh: string;
  nameEn?: string | null;
  nameKhShort?: string | null;
  nameEnShort?: string | null;
  code: string;
  maxScore: number;
  coefficient: number;
  track?: string | null;
  category?: string | null;
}

export interface MonthlyReportSemesterOne {
  preSemesterAverage: number;
  preSemesterRank: number;
  examTotal: number;
  examAverage: number;
  examRank: number;
  finalAverage: number;
  finalRank: number;
  finalGrade: string;
}

export type MonthlyReportFormat = 'summary' | 'detailed' | 'semester-1';

export interface KhmerMonthlyReportStudent {
  studentId: string;
  studentCode?: string | null;
  studentName: string;
  firstName: string;
  lastName: string;
  gender: string;
  classId?: string | null;
  className?: string | null;
  classTrack?: string | null;
  grades: Record<string, number | null>;
  totalScore: number;
  totalCoefficient: number;
  average: number;
  gradeLevel: string;
  rank: number;
  absent: number;
  permission: number;
  /** Present when API `format` is `semester-1` */
  semesterOne?: MonthlyReportSemesterOne;
}

export interface KhmerMonthlyReportData {
  template: 'KHM_MOEYS_MONTHLY' | string;
  format?: MonthlyReportFormat;
  scope: 'class' | 'grade';
  school?: {
    id: string;
    name: string;
    address?: string | null;
    countryCode?: string | null;
    defaultLanguage?: string | null;
    educationModel?: string | null;
  } | null;
  academicYear: {
    startYear: number;
    label: string;
    id?: string | null;
  };
  period: {
    month: string;
    monthNumber: number;
    academicStartYear: number;
    year: number;
  };
  /** Calendar periods included (single month, or semester-1 bundle) */
  monthsIncluded?: Array<{ monthNumber: number; label: string; year: number }>;
  class?: {
    id: string;
    name: string;
    grade: string;
    track?: string | null;
  } | null;
  grade: string;
  classNames: string[];
  totalClasses: number;
  teacherName?: string;
  subjects: KhmerMonthlyReportSubject[];
  students: KhmerMonthlyReportStudent[];
  statistics: {
    totalStudents: number;
    femaleStudents: number;
    passedStudents: number;
    passedFemaleStudents: number;
    failedStudents: number;
    failedFemaleStudents: number;
  };
  rules: {
    system: string;
    passingAverage: number;
    semesterOneEnglishBaseline: number;
    usesSemesterOneEnglishRule: boolean;
  };
  generatedAt: string;
}

/**
 * Grade API Client
 */
class GradeAPI {
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

  private readCache<T>(cacheKey: string, forceFresh?: boolean): T | undefined {
    if (forceFresh) return undefined;
    return readPersistentCache<T>(cacheKey, GRADE_REPORT_CACHE_TTL_MS);
  }

  private writeCache<T>(cacheKey: string, data: T): T {
    writePersistentCache(cacheKey, data);
    return data;
  }

  /**
   * Get all grades for a class
   */
  async getClassGrades(classId: string, month?: string, subjectId?: string): Promise<Grade[]> {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (subjectId) params.append('subjectId', subjectId);

    const url = `${API_BASE_URL}/grades/class/${classId}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch grades');
    }

    return response.json();
  }

  /**
   * Get grades for grid view (specific class, subject, month)
   */
  async getGradeGrid(
    classId: string,
    subjectId: string,
    month: string
  ): Promise<GradeGridItem[]> {
    const response = await fetch(
      `${API_BASE_URL}/grades/class/${classId}/subject/${subjectId}/month/${month}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch grade grid');
    }

    return response.json();
  }

  /**
   * Get all grades for a student
   */
  async getStudentGrades(studentId: string, month?: string, year?: number): Promise<Grade[]> {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year.toString());

    const url = `${API_BASE_URL}/grades/student/${studentId}${params.toString() ? `?${params.toString()}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch student grades');
    }

    return response.json();
  }

  /**
   * Batch create/update grades
   */
  async batchGrades(grades: Partial<Grade>[]): Promise<{
    message: string;
    created: number;
    updated: number;
    errors: any[];
  }> {
    const response = await fetch(`${API_BASE_URL}/grades/batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ grades }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to batch update grades');
    }

    return response.json();
  }

  /**
   * Update a single grade
   */
  async updateGrade(
    id: string,
    data: { score?: number; maxScore?: number; remarks?: string }
  ): Promise<Grade> {
    const response = await fetch(`${API_BASE_URL}/grades/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update grade');
    }

    return response.json();
  }

  /**
   * Delete a grade
   */
  async deleteGrade(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/grades/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete grade');
    }
  }

  /**
   * Calculate averages for a class
   */
  async calculateAverages(classId: string, month: string): Promise<StudentAverage[]> {
    const response = await fetch(`${API_BASE_URL}/grades/calculate/average`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ classId, month }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to calculate averages');
    }

    return response.json();
  }

  /**
   * Get student monthly summary
   */
  async getStudentSummary(studentId: string, month: string): Promise<StudentMonthlySummary> {
    const response = await fetch(`${API_BASE_URL}/grades/summary/${studentId}/${month}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch summary');
    }

    return response.json();
  }

  /**
   * Generate/update monthly summary
   */
  async generateMonthlySummary(
    studentId: string,
    classId: string,
    month: string,
    monthNumber: number
  ): Promise<StudentMonthlySummary> {
    const response = await fetch(`${API_BASE_URL}/grades/monthly-summary`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ studentId, classId, month, monthNumber }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate summary');
    }

    return response.json();
  }

  async getMonthlyReport(params: {
    scope: 'class' | 'grade';
    classId?: string;
    grade?: string | number;
    month?: string;
    monthNumber: number;
    year?: number;
    periodYear?: number;
    academicYearId?: string;
    format?: MonthlyReportFormat;
    /** Override when school uses CUSTOM — e.g. KHM_MOEYS */
    template?: string;
    options?: { forceFresh?: boolean };
  }): Promise<KhmerMonthlyReportData> {
    const query = new URLSearchParams();
    query.append('scope', params.scope);
    query.append('monthNumber', params.monthNumber.toString());
    if (params.classId) query.append('classId', params.classId);
    if (params.grade) query.append('grade', params.grade.toString());
    if (params.month) query.append('month', params.month);
    if (params.year) query.append('year', params.year.toString());
    if (params.periodYear) query.append('periodYear', params.periodYear.toString());
    if (params.academicYearId) query.append('academicYearId', params.academicYearId);
    if (params.format) query.append('format', params.format);
    if (params.template) query.append('template', params.template);

    const cacheKey = `grades:monthly-report:${query.toString()}`;
    const cached = this.readCache<KhmerMonthlyReportData>(cacheKey, params.options?.forceFresh);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/grades/monthly-report?${query.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch monthly report');
    }

    const data = await response.json();
    return this.writeCache(cacheKey, data);
  }

  /** @deprecated Use getMonthlyReport */
  async getKhmerMonthlyReport(params: {
    scope: 'class' | 'grade';
    classId?: string;
    grade?: string | number;
    month?: string;
    monthNumber: number;
    year?: number;
    periodYear?: number;
    academicYearId?: string;
    format?: MonthlyReportFormat;
    template?: string;
    options?: { forceFresh?: boolean };
  }): Promise<KhmerMonthlyReportData> {
    return this.getMonthlyReport(params);
  }

  /**
   * Download Excel template
   */
  async downloadTemplate(classId: string, subjectId: string): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/grades/export/template?classId=${classId}&subjectId=${subjectId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${TokenManager.getAccessToken()}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    return response.blob();
  }

  /**
   * Get student report card
   */
  async getStudentReportCard(
    studentId: string,
    semester: number = 1,
    year?: number,
    options?: { forceFresh?: boolean }
  ): Promise<StudentReportCard> {
    const params = new URLSearchParams();
    params.append('semester', semester.toString());
    if (year) params.append('year', year.toString());
    const cacheKey = `grades:report-card:${studentId}:${semester}:${year || 'current'}`;
    const cached = this.readCache<StudentReportCard>(cacheKey, options?.forceFresh);

    if (cached) {
      return cached;
    }

    const response = await fetch(
      `${API_BASE_URL}/grades/report-card/${studentId}?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch report card');
    }

    const data = await response.json();
    return this.writeCache(cacheKey, data);
  }

  /**
   * Get class report (all students' report cards summary)
   */
  async getClassReport(
    classId: string,
    semester: number = 1,
    year?: number,
    options?: { forceFresh?: boolean }
  ): Promise<ClassReportSummary> {
    const params = new URLSearchParams();
    params.append('semester', semester.toString());
    if (year) params.append('year', year.toString());
    const cacheKey = `grades:class-report:${classId}:${semester}:${year || 'current'}`;
    const cached = this.readCache<ClassReportSummary>(cacheKey, options?.forceFresh);

    if (cached) {
      return cached;
    }

    const response = await fetch(
      `${API_BASE_URL}/grades/class-report/${classId}?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch class report');
    }

    const data = await response.json();
    return this.writeCache(cacheKey, data);
  }

  /**
   * Get semester summary
   */
  async getSemesterSummary(
    classId: string,
    semester: number,
    year?: number,
    options?: { forceFresh?: boolean }
  ): Promise<SemesterSummary> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    const cacheKey = `grades:semester-summary:${classId}:${semester}:${year || 'current'}`;
    const cached = this.readCache<SemesterSummary>(cacheKey, options?.forceFresh);

    if (cached) {
      return cached;
    }

    const response = await fetch(
      `${API_BASE_URL}/grades/semester-summary/${classId}/${semester}?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch semester summary');
    }

    const data = await response.json();
    return this.writeCache(cacheKey, data);
  }

  async getGradeAnalytics(
    classId: string,
    semester: number,
    year?: number,
    options?: { forceFresh?: boolean }
  ): Promise<GradeAnalyticsData> {
    const params = new URLSearchParams();
    params.append('semester', semester.toString());
    if (year) params.append('year', year.toString());
    const cacheKey = `grades:analytics:${classId}:${semester}:${year || 'current'}`;
    const cached = this.readCache<GradeAnalyticsData>(cacheKey, options?.forceFresh);

    if (cached) {
      return cached;
    }

    const response = await fetch(
      `${API_BASE_URL}/grades/analytics/${classId}?${params.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch grade analytics');
    }

    const data = await response.json();
    return this.writeCache(cacheKey, data);
  }
}

export const gradeAPI = new GradeAPI();

// ========================================
// Report Card Types
// ========================================

export interface SubjectGradeResult {
  subject: {
    id: string;
    name: string;
    nameKh: string;
    code: string;
    coefficient: number;
    maxScore: number;
    category?: string;
  };
  monthlyGrades: Array<{
    month: string;
    monthNumber: number;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
  semesterAverage: number;
  percentage: number;
  gradeLevel: string;
  coefficient: number;
  weightedScore: number;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  permission: number;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
}

export interface ReportTermPeriod {
  year: number;
  monthNumber: number;
  label: string;
}

export interface ReportTerm {
  name: string;
  startDate: string;
  endDate: string;
  months?: ReportTermPeriod[];
}

export interface StudentReportCard {
  student: {
    id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    photoUrl?: string;
    gender: string;
    dateOfBirth?: string;
  };
  class: {
    id: string;
    name: string;
    grade: string;
  };
  semester: number;
  year: number;
  term?: ReportTerm;
  subjects: SubjectGradeResult[];
  summary: {
    totalSubjects: number;
    overallAverage: number;
    overallPercentage: number;
    overallGradeLevel: string;
    classRank: number;
    totalStudents: number;
    isPassing: boolean;
  };
  attendance: AttendanceSummary;
  generatedAt: string;
}

export interface ClassReportStudent {
  studentId: string;
  average: number;
  rank: number;
  gradeLevel: string;
  isPassing: boolean;
  student: {
    id: string;
    studentId?: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    photoUrl?: string;
  };
}

export interface ClassReportSummary {
  class: {
    id: string;
    name: string;
    grade: string;
  };
  semester: number;
  year: number;
  term?: ReportTerm;
  totalStudents: number;
  students: ClassReportStudent[];
  statistics: {
    classAverage: number;
    highestAverage: number;
    lowestAverage: number;
    passingCount: number;
    failingCount: number;
    passRate: number;
  };
  generatedAt: string;
}

export interface SemesterSummary {
  class: any;
  semester: number;
  year: number;
  term?: ReportTerm;
  months: string[];
  subjects: Array<{
    subject: {
      id: string;
      name: string;
      nameKh: string;
      code: string;
      category?: string;
    };
    gradesCount: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  }>;
  totalSubjects: number;
  studentCount: number;
}

export interface GradeAnalyticsData {
  class: {
    id: string;
    name: string;
    grade: string;
  } | null;
  semester: number;
  year: number;
  term?: ReportTerm;
  totalStudents: number;
  students: ClassReportStudent[];
  statistics: {
    classAverage: number;
    highestAverage: number;
    lowestAverage: number;
    passingCount: number;
    failingCount: number;
    passRate: number;
  };
  charts: {
    monthlyTrend: Array<{
      month: string;
      monthNumber: number;
      year?: number;
      average: number;
    }>;
    subjectPerformance: Array<{
      subject: string;
      fullName: string;
      average: number;
    }>;
    gradeDistribution: Array<{
      name: string;
      value: number;
      grade: string;
    }>;
    categoryPerformance: Array<{
      category: string;
      score: number;
      fullMark: number;
    }>;
  };
  generatedAt: string;
}

/**
 * Helper to get grade level color
 */
export const getGradeLevelColor = (gradeLevel: string): string => {
  switch (gradeLevel) {
    case 'A':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'B':
      return 'bg-green-50 text-green-600 border-green-200';
    case 'C':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'D':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'E':
      return 'bg-red-50 text-red-600 border-red-200';
    case 'F':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
};

/**
 * Helper to get score color
 */
export const getScoreColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 80) return 'text-green-500';
  if (percentage >= 70) return 'text-yellow-600';
  if (percentage >= 60) return 'text-orange-600';
  if (percentage >= 50) return 'text-red-500';
  return 'text-red-600';
};
