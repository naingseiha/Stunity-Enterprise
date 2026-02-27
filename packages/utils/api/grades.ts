import type { Grade, GradeImportResult } from "@/types";
import { apiClient } from "./client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || localStorage.getItem("token")
      : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export interface GradeFormData {
  studentId: string;
  subjectId: string;
  classId: string;
  score: number;
  maxScore: number;
  month: string;
  monthNumber: number;
  year: number;
}

export interface StudentSummary {
  id: string;
  student: {
    id: string;
    khmerName: string;
    firstName: string;
    lastName: string;
    gender: string;
  };
  totalScore: number;
  totalMaxScore: number;
  totalWeightedScore: number;
  totalCoefficient: number;
  average: number;
  classRank: number;
  gradeLevel: string;
}

// Update the GradeGridData interface

// Update GradeGridData interface

export interface GradeGridData {
  classId: string;
  className: string;
  grade: string;
  month: string;
  year: number;
  totalCoefficient: number;
  subjects: Array<{
    id: string;
    nameKh: string;
    nameEn: string;
    code: string;
    shortCode: string;
    maxScore: number;
    coefficient: number;
    order: number;
    isEditable?: boolean;
  }>;
  students: Array<{
    studentId: string;
    studentName: string;
    gender: string;
    grades: {
      [subjectId: string]: {
        id: string | null;
        score: number | null;
        maxScore: number;
        coefficient: number;
        isSaved: boolean;
      };
    };
    totalScore: string;
    totalMaxScore: number;
    totalCoefficient: string;
    average: string;
    gradeLevel: string;
    rank: number;
    absent: number; // ✅ From attendance
    permission: number; // ✅ From attendance
  }>;
}

export interface BulkSaveGradeItem {
  studentId: string;
  subjectId: string;
  score: number | null;
}

export const gradeApi = {
  /**
   * Get grades by class and month
   */
  async getGradesByMonth(
    classId: string,
    month: string,
    year: number
  ): Promise<Grade[]> {
    const response = await fetch(
      `${API_BASE_URL}/grades/month/${classId}?month=${month}&year=${year}`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch grades");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Get monthly summary for class
   */
  async getMonthlySummary(
    classId: string,
    month: string,
    year: number
  ): Promise<StudentSummary[]> {
    const response = await fetch(
      `${API_BASE_URL}/grades/summary/${classId}?month=${month}&year=${year}`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch summary");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Get grades in grid format for editing
   */
  async getGradesGrid(
    classId: string,
    month: string,
    year: number
  ): Promise<GradeGridData> {
    const response = await fetch(
      `${API_BASE_URL}/grades/grid/${classId}?month=${month}&year=${year}`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch grid data");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Bulk save grades
   */
  async bulkSaveGrades(
    classId: string,
    month: string,
    year: number,
    grades: BulkSaveGradeItem[]
  ): Promise<{ savedCount: number; errorCount: number; errors?: any[] }> {
    const response = await fetch(`${API_BASE_URL}/grades/bulk-save`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ classId, month, year, grades }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save grades");
    }

    const data = await response.json();
    // ✅ ENSURE result has savedCount and errorCount
    return {
      savedCount: data.savedCount ?? data.saved ?? grades.length,
      errorCount: data.errorCount ?? data.errors ?? 0,
    };
  },

  /**
   * Create or update grade
   */
  async saveGrade(gradeData: GradeFormData): Promise<Grade> {
    const response = await fetch(`${API_BASE_URL}/grades`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(gradeData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to save grade");
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Import grades from Excel
   */
  async importGrades(classId: string, file: File): Promise<GradeImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken") || localStorage.getItem("token")
        : null;
    const importHeaders: Record<string, string> = {};
    if (token) {
      importHeaders["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/grades/import/${classId}`, {
      method: "POST",
      headers: importHeaders,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to import grades");
    }

    return response.json();
  },

  /**
   * Export grades to Excel (placeholder - implement on backend)
   */
  async exportGrades(
    classId: string,
    month: string,
    year: number
  ): Promise<Blob> {
    const response = await fetch(
      `${API_BASE_URL}/grades/export/${classId}?month=${month}&year=${year}`,
      { headers: getAuthHeaders() }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to export grades");
    }

    return response.blob();
  },

  /**
   * Confirm grades for a subject
   */
  async confirmGrades(
    classId: string,
    subjectId: string,
    month: string,
    year: number,
    userId: string
  ): Promise<{
    id: string;
    classId: string;
    subjectId: string;
    month: string;
    year: number;
    isConfirmed: boolean;
    confirmedBy: string;
    confirmedAt: Date;
  }> {
    const response = await apiClient.post("/grades/confirm", {
      classId,
      subjectId,
      month,
      year,
      userId,
    });

    return response;
  },

  /**
   * Get confirmations for a class
   */
  async getConfirmations(
    classId: string,
    month: string,
    year: number
  ): Promise<
    Array<{
      id: string;
      classId: string;
      subjectId: string;
      month: string;
      year: number;
      isConfirmed: boolean;
      confirmedBy: string;
      confirmedAt: Date;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      };
    }>
  > {
    const response = await apiClient.get(
      `/grades/confirmations/${classId}?month=${encodeURIComponent(
        month
      )}&year=${year}`
    );

    return response;
  },
};
