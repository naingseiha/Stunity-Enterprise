import { apiClient } from "./client";
import { apiCache } from "../cache";

export interface DashboardStats {
  overview: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    studentsWithClass: number;
    teachersWithClass: number;
    activeSubjects: number;
    studentEnrollmentRate: number;
    teacherAssignmentRate: number;
    passPercentage: number;
    failPercentage: number;
    passedCount: number;
    failedCount: number;
    totalGradesCount: number;
  };
  recentActivity: {
    recentGradeEntries: number;
    recentAttendanceRecords: number;
  };
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    F: number;
  };
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  classByGrade: Array<{
    grade: string;
    count: number;
  }>;
  studentsByGrade: Array<{
    grade: string;
    male: number;
    female: number;
    total: number;
  }>;
  topPerformingClasses: Array<{
    id: string;
    name: string;
    grade: string;
    section: string;
    averageScore: number | null;
    studentCount: number;
  }>;
}

export interface TeacherDashboard {
  teacher: {
    id: string;
    name: string;
    homeroomClass: {
      id: string;
      name: string;
      studentCount: number;
    } | null;
    totalClasses: number;
    totalStudents: number;
    subjects: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  };
  recentActivity: {
    recentGradeEntries: number;
  };
}

export interface StudentDashboard {
  student: {
    id: string;
    name: string;
    class: {
      id: string;
      name: string;
      grade: string;
    } | null;
    averageGrade: number;
  };
  recentGrades: Array<{
    subject: string;
    score: number | null;
    maxScore: number;
    percentage: number | null;
    month: string;
  }>;
  attendanceStats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  totalAttendanceRecords: number;
}

export interface GradeLevelStats {
  currentMonth: string;
  currentYear: number;
  grades: Array<{
    grade: string;
    totalStudents: number;
    totalClasses: number;
    totalSubjects: number;
    averageScore: number;
    passPercentage: number;
    passCount: number;
    failCount: number;
    gradeDistribution: {
      A: number;
      B: number;
      C: number;
      D: number;
      E: number;
    };
    subjectCompletionPercentage: number;
    classes: Array<{
      id: string;
      name: string;
      section: string;
      studentCount: number;
      totalSubjects: number;
      completedSubjects: number;
      completionPercentage: number;
      averageScore: number;
      teacherName: string;
    }>;
  }>;
}

export interface SubjectStats {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  maxScore: number;
  coefficient: number;
  totalStudentsWithGrades: number;
  gradeDistribution: {
    A: { total: number; male: number; female: number };
    B: { total: number; male: number; female: number };
    C: { total: number; male: number; female: number };
    D: { total: number; male: number; female: number };
    E: { total: number; male: number; female: number };
    F: { total: number; male: number; female: number };
  };
}

export interface ComprehensiveStats {
  month: string;
  year: number;
  grades: Array<{
    grade: string;
    totalStudents: number;
    maleStudents: number;
    femaleStudents: number;
    totalClasses: number;
    averageScore: number;
    maleAverageScore: number;
    femaleAverageScore: number;
    passPercentage: number;
    malePassPercentage: number;
    femalePassPercentage: number;
    passedCount: number;
    passedMale: number;
    passedFemale: number;
    failedCount: number;
    failedMale: number;
    failedFemale: number;
    gradeDistribution: {
      A: { total: number; male: number; female: number };
      B: { total: number; male: number; female: number };
      C: { total: number; male: number; female: number };
      D: { total: number; male: number; female: number };
      E: { total: number; male: number; female: number };
      F: { total: number; male: number; female: number };
    };
    classes: Array<{
      id: string;
      name: string;
      section: string;
      grade: string;
      track: string | null;
      studentCount: number;
      maleCount: number;
      femaleCount: number;
      averageScore: number;
      passPercentage: number;
      malePassPercentage: number;
      femalePassPercentage: number;
      passedCount: number;
      failedCount: number;
      gradeDistribution: {
        A: { total: number; male: number; female: number };
        B: { total: number; male: number; female: number };
        C: { total: number; male: number; female: number };
        D: { total: number; male: number; female: number };
        E: { total: number; male: number; female: number };
        F: { total: number; male: number; female: number };
      };
      subjectStats: SubjectStats[];
      teacherName: string;
    }>;
  }>;
  topPerformingClasses: Array<{
    id: string;
    name: string;
    section: string;
    grade: string;
    track: string | null;
    studentCount: number;
    maleCount: number;
    femaleCount: number;
    averageScore: number;
    passPercentage: number;
    malePassPercentage: number;
    femalePassPercentage: number;
    passedCount: number;
    failedCount: number;
    gradeDistribution: {
      A: { total: number; male: number; female: number };
      B: { total: number; male: number; female: number };
      C: { total: number; male: number; female: number };
      D: { total: number; male: number; female: number };
      E: { total: number; male: number; female: number };
      F: { total: number; male: number; female: number };
    };
    subjectStats: SubjectStats[];
    teacherName: string;
  }>;
}

// ============================================
// Score Progress Dashboard Types
// ============================================

export type ScoreStatus = "COMPLETE" | "PARTIAL" | "STARTED" | "EMPTY";

export interface SubjectProgress {
  id: string;
  code: string;
  nameKh: string;
  nameEn: string;
  maxScore: number;
  coefficient: number;
  scoreStatus: {
    totalStudents: number;
    studentsWithScores: number;
    percentage: number;
    status: ScoreStatus;
  };
  verification: {
    isConfirmed: boolean;
    confirmedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    confirmedAt?: string;
  };
  lastUpdated?: string;
}

export interface ClassProgress {
  id: string;
  name: string;
  grade: string;
  section: string;
  track: string | null;
  studentCount: number;
  homeroomTeacher: {
    id: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    email: string | null;
  } | null;
  subjects: SubjectProgress[];
  completionStats: {
    totalSubjects: number;
    completedSubjects: number;
    completionPercentage: number;
    verifiedSubjects: number;
    verificationPercentage: number;
  };
}

export interface GradeProgress {
  grade: string;
  totalClasses: number;
  avgCompletion: number;
  classes: ClassProgress[];
}

export interface ScoreProgressData {
  month: string;
  year: number;
  overall: {
    totalClasses: number;
    totalSubjects: number;
    completedSubjects: number;
    completionPercentage: number;
    verifiedSubjects: number;
    verificationPercentage: number;
  };
  grades: GradeProgress[];
}

export interface ScoreProgressParams {
  month?: string;
  year?: number;
  grade?: string;
  classId?: string;
}

export const dashboardApi = {
  /**
   * Get general dashboard statistics (cached for 5 minutes)
   * ✅ PERFORMANCE: Increased cache for better performance and reduced API load
   */
  getStats: async (): Promise<DashboardStats> => {
    return apiCache.getOrFetch(
      "dashboard:stats",
      async () => {
        // apiClient.get already unwraps .data, so just return the response directly
        const data = await apiClient.get("/dashboard/stats");
        return data;
      },
      5 * 60 * 1000 // 5 minutes cache (increased from 1 minute for better performance)
    );
  },

  /**
   * Get teacher-specific dashboard (cached for 3 minutes)
   */
  getTeacherDashboard: async (teacherId: string): Promise<TeacherDashboard> => {
    return apiCache.getOrFetch(
      `dashboard:teacher:${teacherId}`,
      async () => {
        // apiClient.get already unwraps .data, so just return the response directly
        const data = await apiClient.get(`/dashboard/teacher/${teacherId}`);
        return data;
      },
      3 * 60 * 1000 // 3 minutes cache
    );
  },

  /**
   * Get student-specific dashboard (cached for 3 minutes)
   */
  getStudentDashboard: async (studentId: string): Promise<StudentDashboard> => {
    return apiCache.getOrFetch(
      `dashboard:student:${studentId}`,
      async () => {
        // apiClient.get already unwraps .data, so just return the response directly
        const data = await apiClient.get(`/dashboard/student/${studentId}`);
        return data;
      },
      3 * 60 * 1000 // 3 minutes cache
    );
  },

  /**
   * Get grade-level statistics (cached for 2 minutes)
   */
  getGradeLevelStats: async (): Promise<GradeLevelStats> => {
    return apiCache.getOrFetch(
      "dashboard:grade-stats",
      async () => {
        // apiClient.get already unwraps .data, so just return the response directly
        const data = await apiClient.get("/dashboard/grade-stats");
        console.log("📊 Dashboard API: Data after unwrapping:", data);
        return data;
      },
      2 * 60 * 1000 // 2 minutes cache
    );
  },

  /**
   * Get comprehensive statistics with month/year filter and gender breakdown
   * ✅ OPTIMIZED: Extended cache for mobile performance
   */
  getComprehensiveStats: async (month?: string, year?: number): Promise<ComprehensiveStats> => {
    const cacheKey = `dashboard:comprehensive-stats:${month || 'current'}:${year || 'current'}`;
    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year.toString());

        const queryString = params.toString();
        const url = `/dashboard/comprehensive-stats${queryString ? `?${queryString}` : ''}`;

        const data = await apiClient.get(url);
        console.log("📊 Comprehensive Stats API: Data received:", data);
        return data;
      },
      5 * 60 * 1000 // ✅ Extended to 5 minutes cache for better mobile performance
    );
  },

  /**
   * Get lightweight mobile dashboard stats (super fast for initial load)
   * ✅ OPTIMIZED: Removed expensive pass/fail queries for 3-5x faster loading
   */
  getMobileStats: async (month?: string, year?: number): Promise<{
    month: string;
    year: number;
    totalTeachers: number;
    totalSubjects: number;
    grades: Array<{
      grade: string;
      totalStudents: number;
      totalClasses: number;
    }>;
  }> => {
    const cacheKey = `dashboard:mobile-stats:${month || 'current'}:${year || 'current'}`;
    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year.toString());

        const queryString = params.toString();
        const url = `/dashboard/mobile-stats${queryString ? `?${queryString}` : ''}`;

        const data = await apiClient.get(url);
        console.log("📱 Mobile Stats API: Lightweight data received:", data);
        return data;
      },
      2 * 60 * 1000 // 2 minutes cache (reduced from 5 minutes for fresher data)
    );
  },

  /**
   * Get score import progress dashboard (cached for 5 minutes)
   * Shows which subjects have scores imported and verified for each class
   * ✅ OPTIMIZED: Extended cache for better mobile performance
   *
   * @param params - Optional filter parameters
   * @param params.month - Filter by month (Khmer month name, e.g., "មករា", "កុម្ភៈ")
   * @param params.year - Filter by year (e.g., 2025, 2026)
   * @param params.grade - Filter by specific grade (7-12)
   * @param params.classId - Filter by specific class ID
   * @returns Score progress data with completion and verification statistics
   */
  getScoreProgress: async (params?: ScoreProgressParams): Promise<ScoreProgressData> => {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append("month", params.month);
    if (params?.year) queryParams.append("year", params.year.toString());
    if (params?.grade) queryParams.append("grade", params.grade);
    if (params?.classId) queryParams.append("classId", params.classId);

    const queryString = queryParams.toString();
    const cacheKey = `dashboard:score-progress:${queryString || 'all'}`;

    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        const url = `/dashboard/score-progress${queryString ? `?${queryString}` : ''}`;
        const data = await apiClient.get(url);
        console.log("📊 Score Progress API: Data received:", data);
        return data;
      },
      5 * 60 * 1000 // ✅ Extended to 5 minutes cache for better mobile performance
    );
  },

  /**
   * Clear dashboard cache (call after data updates)
   */
  clearCache: () => {
    apiCache.delete("dashboard:stats");
    apiCache.delete("dashboard:grade-stats");
    // Clear all comprehensive stats caches
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('dashboard:comprehensive-stats:') ||
          key.startsWith('dashboard:mobile-stats:') ||
          key.startsWith('dashboard:score-progress:')) {
        apiCache.delete(key);
      }
    });
    console.log("🧹 Dashboard cache cleared");
  },

  /**
   * Get comparison statistics between two months
   * @param month1 - First month to compare
   * @param month2 - Second month to compare
   * @param year - Academic year
   */
  getComparisonStats: async (month1: string, month2: string, year: number): Promise<{ month1: ComprehensiveStats; month2: ComprehensiveStats }> => {
    const cacheKey = `dashboard:comparison:${month1}:${month2}:${year}`;
    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        // Fetch both months' data in parallel
        const [stats1, stats2] = await Promise.all([
          apiClient.get(`/dashboard/comprehensive-stats?month=${month1}&year=${year}`),
          apiClient.get(`/dashboard/comprehensive-stats?month=${month2}&year=${year}`)
        ]);

        console.log("🔄 Comparison Stats API: Data received for both months");
        return { month1: stats1, month2: stats2 };
      },
      5 * 60 * 1000
    );
  },
};
