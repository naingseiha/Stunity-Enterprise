// Subjects API Service - Connected to Backend

import { apiClient } from "./client";

export interface Subject {
  id: string;
  name: string;
  nameKh: string;
  nameEn?: string;
  code: string;
  description?: string;
  grade: string;
  track?: string;
  category: "social" | "science";
  weeklyHours: number;
  annualHours: number;
  maxScore: number;
  coefficient: number;
  isActive: boolean;
  teacherAssignments?: SubjectTeacherAssignment[];
  _count?: {
    grades: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectTeacherAssignment {
  id: string;
  subjectId: string;
  teacherId: string;
  teacher: {
    id: string;
    khmerName: string;
    englishName?: string;
    email: string;
    phoneNumber?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubjectData {
  name: string;
  nameKh: string;
  nameEn?: string;
  code: string;
  description?: string;
  grade: string;
  track?: string;
  category: "social" | "science";
  weeklyHours?: number;
  annualHours?: number;
  maxScore?: number;
  coefficient?: number;
  isActive?: boolean;
}

export const subjectsApi = {
  /**
   * Get all subjects (LIGHTWEIGHT - fast loading for dropdowns/lists)
   */
  async getAllLightweight(): Promise<Subject[]> {
    try {
      console.log("⚡ Fetching subjects (lightweight)...");
      const subjects = await apiClient.get<Subject[]>("/subjects/lightweight");

      if (!Array.isArray(subjects)) {
        console.error("❌ Expected array but got:", typeof subjects);
        return [];
      }

      console.log(`⚡ Fetched ${subjects.length} subjects (lightweight)`);
      return subjects;
    } catch (error) {
      console.error("❌ subjectsApi.getAllLightweight error:", error);
      return [];
    }
  },

  /**
   * Get all subjects (FULL DATA - includes teacher assignments)
   */
  async getAll(): Promise<Subject[]> {
    try {
      console.log("📚 Fetching all subjects (full data)...");
      const subjects = await apiClient.get<Subject[]>("/subjects");

      if (!Array.isArray(subjects)) {
        console.error("❌ Expected array but got:", typeof subjects);
        return [];
      }

      console.log(`✅ Fetched ${subjects.length} subjects from database`);
      return subjects;
    } catch (error) {
      console.error("❌ subjectsApi.getAll error:", error);
      return [];
    }
  },

  /**
   * Get subject by ID
   */
  async getById(id: string): Promise<Subject | null> {
    try {
      console.log(`📖 Fetching subject ${id}... `);
      const subject = await apiClient.get<Subject>(`/subjects/${id}`);
      console.log("✅ Subject fetched:", subject?.name);
      return subject;
    } catch (error) {
      console.error("❌ subjectsApi.getById error:", error);
      return null;
    }
  },

  /**
   * Create new subject
   */
  async create(data: CreateSubjectData): Promise<Subject> {
    try {
      console.log("➕ Creating subject:", data);
      const subject = await apiClient.post<Subject>("/subjects", data);

      if (!subject || !subject.id) {
        throw new Error(
          "Invalid response from server - no subject ID returned"
        );
      }

      console.log("✅ Subject created:", subject.id);
      return subject;
    } catch (error: any) {
      console.error("❌ subjectsApi.create error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create subject"
      );
    }
  },

  /**
   * Update existing subject
   */
  async update(id: string, data: Partial<CreateSubjectData>): Promise<Subject> {
    try {
      console.log(`✏️ Updating subject ${id}:`, data);

      // ✅ FIX: Check if id is valid
      if (!id || id.trim() === "") {
        throw new Error("Subject ID is required for update");
      }

      const subject = await apiClient.put<Subject>(`/subjects/${id}`, data);

      // ✅ FIX: Validate response
      if (!subject) {
        throw new Error("No response from server");
      }

      if (!subject.id) {
        console.error("❌ Invalid response structure:", subject);
        throw new Error("Invalid response from server - missing subject ID");
      }

      console.log("✅ Subject updated:", subject.id);
      return subject;
    } catch (error: any) {
      console.error("❌ subjectsApi.update error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update subject"
      );
    }
  },

  /**
   * Delete subject
   */
  async delete(id: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting subject ${id}... `);
      await apiClient.delete(`/subjects/${id}`);
      console.log("✅ Subject deleted");
    } catch (error: any) {
      console.error("❌ subjectsApi.delete error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to delete subject"
      );
    }
  },

  /**
   * Assign teachers to subject
   */
  async assignTeachers(subjectId: string, teacherIds: string[]): Promise<void> {
    try {
      console.log(`🔗 Assigning teachers to subject ${subjectId}:`, teacherIds);
      await apiClient.post(`/subjects/${subjectId}/assign-teachers`, {
        teacherIds,
      });
      console.log("✅ Teachers assigned");
    } catch (error: any) {
      console.error("❌ subjectsApi.assignTeachers error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to assign teachers"
      );
    }
  },

  /**
   * Remove teacher from subject
   */
  async removeTeacher(subjectId: string, teacherId: string): Promise<void> {
    try {
      console.log(
        `🔓 Removing teacher ${teacherId} from subject ${subjectId}... `
      );
      await apiClient.delete(`/subjects/${subjectId}/teachers/${teacherId}`);
      console.log("✅ Teacher removed");
    } catch (error: any) {
      console.error("❌ subjectsApi.removeTeacher error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to remove teacher"
      );
    }
  },
  async getByGrade(grade: string, track?: string): Promise<Subject[]> {
    try {
      const url = track
        ? `/subjects/grade/${grade}?track=${track}`
        : `/subjects/grade/${grade}`;

      console.log(
        `📚 Fetching subjects for grade ${grade}${
          track ? ` (${track})` : ""
        }...`
      );
      const subjects = await apiClient.get<Subject[]>(url);

      if (!Array.isArray(subjects)) {
        console.error("❌ Expected array but got:", typeof subjects);
        return [];
      }

      console.log(`✅ Fetched ${subjects.length} subjects`);
      return subjects;
    } catch (error) {
      console.error("❌ subjectsApi.getByGrade error:", error);
      return [];
    }
  },
};
