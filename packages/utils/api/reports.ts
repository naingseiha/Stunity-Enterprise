import { apiCache } from "../cache";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// ================================
// TYPE DEFINITIONS
// ================================

/**
 * Student Tracking Book Data
 */
export interface StudentTrackingBookData {
  classId: string;
  className: string;
  grade: string;
  year: number;
  month: string | null;
  teacherName: string;
  subjects: Array<{
    id: string;
    nameKh: string;
    nameEn: string;
    code: string;
    maxScore: number;
    coefficient: number;
  }>;
  months: string[];
  students: Array<{
    studentId: string;
    studentName: string;
    gender: string;
    dateOfBirth: string;
    fatherName?: string;
    motherName?: string;
    parentOccupation?: string;
    subjectScores: {
      [subjectId: string]: {
        score: number | null;
        maxScore: number;
        gradeLevel: string;
        gradeLevelKhmer: string;
        percentage: number;
      };
    };
    totalScore: string;
    averageScore: string;
    gradeLevel: string;
    gradeLevelKhmer: string;
    rank: number;
    monthsRecorded: number;
    attendance: {
      totalAbsent: number;
      permission: number;
      withoutPermission: number;
    };
  }>;
}

/**
 * Monthly Report Data
 */
export interface MonthlyReportData {
  classId?: string;
  className?: string;
  grade?: string;
  classNames?: string;
  totalClasses?: number;
  teacherName?: string | null;
  month: string;
  year: number;
  totalCoefficient: number;
  subjects: Array<{
    id: string;
    nameKh: string;
    nameEn: string;
    code: string;
    maxScore: number;
    coefficient: number;
  }>;
  students: Array<{
    studentId: string;
    studentName: string;
    className?: string;
    gender: string;
    grades: { [subjectId: string]: number | null };
    totalScore: string;
    average: string;
    gradeLevel: string;
    rank: number;
    absent: number;
    permission: number;
  }>;
}

/**
 * ✅ NEW: Monthly Statistics Data with Gender Breakdown
 */
export interface MonthlyStatisticsData {
  classId: string;
  className: string;
  grade: string;
  track: string | null;
  month: string;
  year: number;
  teacherName: string | null;
  totalCoefficient: number;
  subjects: Array<{
    id: string;
    nameKh: string;
    nameEn: string;
    code: string;
    maxScore: number;
    coefficient: number;
  }>;
  statistics: {
    // Summary Statistics
    totalStudents: number;
    femaleStudents: number;
    maleStudents: number;

    // Pass/Fail Statistics (Pass = Average >= 25)
    totalPassed: number;
    femalePassed: number;
    malePassed: number;
    totalFailed: number;
    femaleFailed: number;
    maleFailed: number;

    // Overall Grade Distribution (A-F)
    gradeDistribution: {
      A: { total: number; female: number; male: number };
      B: { total: number; female: number; male: number };
      C: { total: number; female: number; male: number };
      D: { total: number; female: number; male: number };
      E: { total: number; female: number; male: number };
      F: { total: number; female: number; male: number };
    };

    // Subject-wise Statistics
    subjectStatistics: {
      [subjectId: string]: {
        subjectId: string;
        subjectName: string;
        subjectCode: string;
        gradeDistribution: {
          A: { total: number; female: number; male: number };
          B: { total: number; female: number; male: number };
          C: { total: number; female: number; male: number };
          D: { total: number; female: number; male: number };
          E: { total: number; female: number; male: number };
          F: { total: number; female: number; male: number };
        };
        averageScore: number;
        femaleAverageScore: number;
        maleAverageScore: number;
        totalScored: number;
        femaleScored: number;
        maleScored: number;
      };
    };
  };
}

/**
 * API Response Wrapper
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Handle API response and extract data
 */
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiResponse<T> = await response.json();
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Invalid API response");
  }

  return result.data;
}

// ================================
// REPORTS API
// ================================

export const reportsApi = {
  /**
   * Get monthly report for a specific class
   * ✅ OPTIMIZED: Added 3-minute cache for better performance
   * @param classId - Class ID
   * @param month - Month name in Khmer (e.g., "មករា", "កុម្ភៈ")
   * @param year - Year (e.g., 2025)
   * @returns Monthly report data
   */
  async getMonthlyReport(
    classId: string,
    month: string,
    year: number
  ): Promise<MonthlyReportData> {
    const cleanMonth = month.trim();
    const cacheKey = `report:monthly:${classId}:${cleanMonth}:${year}`;

    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          const url = `${API_BASE_URL}/reports/monthly/${classId}?month=${encodeURIComponent(
            cleanMonth
          )}&year=${year}`;

          console.log("📡 Fetching monthly report:", {
            classId,
            month: cleanMonth,
            year,
            url,
          });

          const response = await fetch(url, { credentials: "include" }); // ✅ iOS 16 FIX
          const data = await handleApiResponse<MonthlyReportData>(response);

          console.log("✅ Monthly report received:", data);
          return data;
        } catch (error) {
          console.error("❌ Get monthly report error:", error);
          throw error;
        }
      },
      3 * 60 * 1000 // 3 minutes cache
    );
  },

  /**
   * Get grade-wide report (all classes in a grade combined)
   * ✅ OPTIMIZED: Added 3-minute cache for better performance
   * @param grade - Grade level (e.g., "7", "8", "9", "10", "11", "12")
   * @param month - Month name in Khmer
   * @param year - Year
   * @returns Grade-wide monthly report data
   */
  async getGradeWideReport(
    grade: string,
    month: string,
    year: number
  ): Promise<MonthlyReportData> {
    const cleanMonth = month.trim();
    const cacheKey = `report:grade-wide:${grade}:${cleanMonth}:${year}`;

    return apiCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          const url = `${API_BASE_URL}/reports/grade-wide/${grade}?month=${encodeURIComponent(
            cleanMonth
          )}&year=${year}`;

          console.log("📡 Fetching grade-wide report:", {
            grade,
            month: cleanMonth,
            year,
            url,
          });

          const response = await fetch(url, { credentials: "include" }); // ✅ iOS 16 FIX
          const data = await handleApiResponse<MonthlyReportData>(response);

          console.log("✅ Grade-wide report received:", data);
          return data;
        } catch (error) {
          console.error("❌ Get grade-wide report error:", error);
          throw error;
        }
      },
      3 * 60 * 1000 // 3 minutes cache
    );
  },

  /**
   * Get student tracking book (all months combined)
   * @param classId - Class ID
   * @param year - Academic year
   * @param month - Optional:  specific month to filter
   * @param subjectId - Optional: specific subject to filter
   * @returns Student tracking book data
   */
  async getStudentTrackingBook(
    classId: string,
    year: number,
    month?: string,
    subjectId?: string
  ): Promise<StudentTrackingBookData> {
    try {
      let url = `${API_BASE_URL}/reports/tracking-book/${classId}?year=${year}`;

      if (month) {
        url += `&month=${encodeURIComponent(month.trim())}`;
      }

      if (subjectId) {
        url += `&subjectId=${subjectId}`;
      }

      console.log("📡 Fetching tracking book:", {
        classId,
        year,
        month,
        subjectId,
        url,
      });

      const response = await fetch(url, { credentials: "include" }); // ✅ iOS 16 FIX
      const data = await handleApiResponse<StudentTrackingBookData>(response);

      console.log("✅ Tracking book received:", data);
      return data;
    } catch (error) {
      console.error("❌ Get tracking book error:", error);
      throw error;
    }
  },

  /**
   * ✅ NEW: Get monthly statistics with gender breakdown
   * @param classId - Class ID
   * @param month - Month name in Khmer
   * @param year - Year
   * @returns Detailed statistics with gender breakdown
   */
  async getMonthlyStatistics(
    classId: string,
    month: string,
    year: number
  ): Promise<MonthlyStatisticsData> {
    try {
      const cleanMonth = month.trim();
      const url = `${API_BASE_URL}/reports/monthly-statistics/${classId}?month=${encodeURIComponent(
        cleanMonth
      )}&year=${year}`;

      console.log("📡 Fetching monthly statistics:", {
        classId,
        month: cleanMonth,
        year,
        url,
      });

      const response = await fetch(url, { credentials: "include" }); // ✅ iOS 16 FIX
      const data = await handleApiResponse<MonthlyStatisticsData>(response);

      console.log("✅ Monthly statistics received:", data);
      console.log("   📊 Total Students:", data.statistics.totalStudents);
      console.log("   👩 Female Students:", data.statistics.femaleStudents);
      console.log("   ✅ Total Passed:", data.statistics.totalPassed);
      console.log("   ✅ Female Passed:", data.statistics.femalePassed);

      return data;
    } catch (error) {
      console.error("❌ Get monthly statistics error:", error);
      throw error;
    }
  },
};

// ================================
// HELPER CONSTANTS
// ================================

/**
 * Khmer month names
 */
export const KHMER_MONTHS = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

/**
 * Grade level labels (Khmer)
 */
export const GRADE_LEVEL_LABELS_KH: { [key: string]: string } = {
  A: "ល្អប្រសើរ",
  B: "ល្អណាស់",
  C: "ល្អ",
  D: "ល្អបង្គួរ",
  E: "មធ្យម",
  F: "ខ្សោយ",
};

/**
 * Grade level labels (English)
 */
export const GRADE_LEVEL_LABELS_EN: { [key: string]: string } = {
  A: "Excellent",
  B: "Very Good",
  C: "Good",
  D: "Fair",
  E: "Average",
  F: "Weak",
};

/**
 * Grade level colors for UI
 */
export const GRADE_LEVEL_COLORS: { [key: string]: string } = {
  A: "bg-green-600",
  B: "bg-blue-600",
  C: "bg-yellow-600",
  D: "bg-orange-600",
  E: "bg-red-500",
  F: "bg-red-700",
};

/**
 * Grade level text colors
 */
export const GRADE_LEVEL_TEXT_COLORS: { [key: string]: string } = {
  A: "text-green-700",
  B: "text-blue-700",
  C: "text-yellow-700",
  D: "text-orange-700",
  E: "text-red-600",
  F: "text-red-800",
};

/**
 * Grade level background colors (light)
 */
export const GRADE_LEVEL_BG_COLORS: { [key: string]: string } = {
  A: "bg-green-100",
  B: "bg-blue-100",
  C: "bg-yellow-100",
  D: "bg-orange-100",
  E: "bg-red-100",
  F: "bg-red-200",
};

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get grade level label in Khmer
 */
export function getGradeLevelLabelKh(level: string): string {
  return GRADE_LEVEL_LABELS_KH[level] || level;
}

/**
 * Get grade level label in English
 */
export function getGradeLevelLabelEn(level: string): string {
  return GRADE_LEVEL_LABELS_EN[level] || level;
}

/**
 * Get grade level color class
 */
export function getGradeLevelColor(level: string): string {
  return GRADE_LEVEL_COLORS[level] || "bg-gray-600";
}

/**
 * Get grade level text color class
 */
export function getGradeLevelTextColor(level: string): string {
  return GRADE_LEVEL_TEXT_COLORS[level] || "text-gray-700";
}

/**
 * Get grade level background color class (light)
 */
export function getGradeLevelBgColor(level: string): string {
  return GRADE_LEVEL_BG_COLORS[level] || "bg-gray-100";
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat(((value / total) * 100).toFixed(2));
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, total: number): string {
  const percentage = calculatePercentage(value, total);
  return `${percentage.toFixed(1)}%`;
}

/**
 * Get month index from Khmer month name (1-based)
 */
export function getMonthNumber(monthName: string): number {
  const index = KHMER_MONTHS.indexOf(monthName.trim());
  return index >= 0 ? index + 1 : 0;
}

/**
 * Get Khmer month name from month number (1-based)
 */
export function getKhmerMonthName(monthNumber: number): string {
  if (monthNumber < 1 || monthNumber > 12) return "";
  return KHMER_MONTHS[monthNumber - 1];
}

/**
 * Validate month name
 */
export function isValidKhmerMonth(monthName: string): boolean {
  return KHMER_MONTHS.includes(monthName.trim());
}

/**
 * Clear reports cache
 * Call this after updating grades or student data
 */
export function clearReportsCache(): void {
  // Clear all report-related caches
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('report:')) {
      apiCache.delete(key);
    }
  });
  console.log("🧹 Reports cache cleared");
}
