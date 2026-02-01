import { TokenManager } from './auth';

const API_BASE_URL = 'http://localhost:3007';

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

/**
 * Grade API Client
 */
class GradeAPI {
  private getHeaders() {
    const token = TokenManager.getAccessToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
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
  async getStudentReportCard(studentId: string, semester: number = 1, year?: number): Promise<StudentReportCard> {
    const params = new URLSearchParams();
    params.append('semester', semester.toString());
    if (year) params.append('year', year.toString());

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

    return response.json();
  }

  /**
   * Get class report (all students' report cards summary)
   */
  async getClassReport(classId: string, semester: number = 1, year?: number): Promise<ClassReportSummary> {
    const params = new URLSearchParams();
    params.append('semester', semester.toString());
    if (year) params.append('year', year.toString());

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

    return response.json();
  }

  /**
   * Get semester summary
   */
  async getSemesterSummary(classId: string, semester: number, year?: number): Promise<SemesterSummary> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());

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

    return response.json();
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
