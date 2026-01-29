// Teachers API Service - Connected to Backend

import { apiClient } from "./client";

export interface BulkTeacherData {
  firstName: string;
  lastName: string;
  khmerName?: string;
  englishName?: string;
  email: string;
  phone: string;
  gender: "MALE" | "FEMALE";
  role?: "TEACHER" | "INSTRUCTOR";
  dateOfBirth?: string;
  hireDate?: string;
  address?: string;
  position?: string;
  // ✅ CHANGE: Send IDs instead of names
  subjectIds?: string[];
  teachingClassIds?: string[];
  homeroomClassId?: string;
}

export interface Teacher {
  id: string;
  teacherId?: string;
  firstName: string;
  lastName: string;
  name?: string;
  khmerName?: string;
  englishName?: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  employeeId?: string;

  // ✅ NEW FIELDS
  role: "TEACHER" | "INSTRUCTOR";
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  hireDate?: string;
  address?: string;
  position?: string;

  // ✅ Homeroom (for INSTRUCTOR)
  homeroomClassId?: string;
  homeroomClass?: {
    id: string;
    name: string;
    grade: string;
    section?: string;
    track?: string;
    _count?: {
      students: number;
    };
  };

  // ✅ Teaching classes (many-to-many)
  teachingClassIds?: string[];
  teachingClasses?: Array<{
    id: string;
    name: string;
    grade: string;
    section?: string;
    track?: string;
    _count?: {
      students: number;
    };
  }>;

  // ✅ Subjects
  subjectIds?: string[];
  subjects?: Array<{
    id: string;
    name: string;
    nameKh: string;
    code: string;
    grade: string;
    track?: string;
  }>;

  subject?: string;
  classes?: any[];

  createdAt?: string;
  updatedAt?: string;
}

export const teachersApi = {
  /**
   * Get all teachers (LIGHTWEIGHT - fast loading for grids/lists)
   */
  async getAllLightweight(): Promise<Teacher[]> {
    try {
      console.log("⚡ Fetching teachers (lightweight)...");
      const teachers = await apiClient.get<Teacher[]>("/teachers/lightweight");

      if (!Array.isArray(teachers)) {
        console.error("❌ Expected array but got:", typeof teachers);
        return [];
      }

      console.log(`⚡ Fetched ${teachers.length} teachers (lightweight)`);
      return teachers;
    } catch (error) {
      console.error("❌ teachersApi.getAllLightweight error:", error);
      return [];
    }
  },

  /**
   * Get all teachers (FULL DATA - slower but complete)
   */
  async getAll(): Promise<Teacher[]> {
    try {
      console.log("👨‍🏫 Fetching all teachers (full data)...");
      const teachers = await apiClient.get<Teacher[]>("/teachers");

      if (!Array.isArray(teachers)) {
        console.error("❌ Expected array but got:", typeof teachers);
        return [];
      }

      console.log(`✅ Fetched ${teachers.length} teachers from database`);
      return teachers;
    } catch (error) {
      console.error("❌ teachersApi.getAll error:", error);
      return [];
    }
  },

  /**
   * Get teacher by ID
   */
  async getById(id: string): Promise<Teacher | null> {
    try {
      console.log(`👨‍🏫 Fetching teacher ${id}...`);
      const teacher = await apiClient.get<Teacher>(`/teachers/${id}`);
      console.log("✅ Teacher fetched");
      return teacher;
    } catch (error) {
      console.error("❌ teachersApi.getById error:", error);
      return null;
    }
  },

  /**
   * Create new teacher
   */
  async create(teacherData: any): Promise<Teacher> {
    try {
      console.log("➕ Creating teacher:", teacherData);
      const teacher = await apiClient.post<Teacher>("/teachers", teacherData);

      if (!teacher || !teacher.id) {
        throw new Error(
          "Invalid response from server - no teacher ID returned"
        );
      }

      console.log("✅ Teacher created:", teacher.id);
      return teacher;
    } catch (error: any) {
      console.error("❌ teachersApi. create error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to create teacher"
      );
    }
  },

  /**
   * Update existing teacher
   */
  async update(id: string, teacherData: any): Promise<Teacher> {
    try {
      console.log(`✏️ Updating teacher ${id}:`, teacherData);

      if (!id || id.trim() === "") {
        throw new Error("Teacher ID is required for update");
      }

      const teacher = await apiClient.put<Teacher>(
        `/teachers/${id}`,
        teacherData
      );

      if (!teacher) {
        throw new Error("No response from server");
      }

      if (!teacher.id) {
        console.error("❌ Invalid response structure:", teacher);
        throw new Error("Invalid response from server - missing teacher ID");
      }

      console.log("✅ Teacher updated:", teacher.id);
      return teacher;
    } catch (error: any) {
      console.error("❌ teachersApi.update error:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update teacher"
      );
    }
  },

  /**
   * Delete teacher
   */
  async delete(id: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting teacher ${id}...`);
      await apiClient.delete(`/teachers/${id}`);
      console.log("✅ Teacher deleted");
    } catch (error: any) {
      console.error("❌ teachersApi.delete error:", error);
      throw new Error(
        error.response?.data?.message || "Failed to delete teacher"
      );
    }
  },

  /**
   * Search teachers (client-side)
   */
  async search(query: string): Promise<Teacher[]> {
    try {
      const allTeachers = await teachersApi.getAll();
      const lowerQuery = query.toLowerCase();

      return allTeachers.filter(
        (teacher: any) =>
          teacher.firstName?.toLowerCase().includes(lowerQuery) ||
          teacher.lastName?.toLowerCase().includes(lowerQuery) ||
          teacher.khmerName?.toLowerCase().includes(lowerQuery) ||
          teacher.email?.toLowerCase().includes(lowerQuery) ||
          teacher.phoneNumber?.includes(query) ||
          teacher.employeeId?.includes(query)
      );
    } catch (error) {
      console.error("❌ Error searching teachers:", error);
      return [];
    }
  },

  /**
   * ✅ NEW:  Bulk create teachers
   */
  async bulkCreate(teachers: BulkTeacherData[]): Promise<any> {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📤 FRONTEND: Bulk creating teachers");
      console.log("👥 Teachers count:", teachers.length);

      const payload = { teachers };

      console.log("📦 Sending payload.. .");

      const response = await apiClient.post<any>("/teachers/bulk", payload);

      console.log("📥 Raw response:", response);

      // ✅ Handle response structure
      let result;
      if (response.success !== undefined && response.data !== undefined) {
        result = response;
      } else if (response.total !== undefined) {
        result = {
          success: true,
          message: "Bulk import completed",
          data: response,
        };
      } else {
        throw new Error("Invalid response structure");
      }

      console.log("✅ Parsed response:", result);
      console.log(`   - Success: ${result.data.success}/${result.data.total}`);
      console.log(`   - Failed: ${result.data.failed}/${result.data.total}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return result;
    } catch (error: any) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ BULK IMPORT ERROR:", error);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      throw new Error(error.message || "Failed to bulk create teachers");
    }
  },

  /**
   * ✅ NEW: Bulk update teachers (optimized for speed)
   */
  async bulkUpdate(
    teachers: Array<{ id: string } & Partial<BulkTeacherData>>
  ): Promise<any> {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("⚡ FRONTEND: Bulk updating teachers");
      console.log("👥 Teachers count:", teachers.length);

      const payload = { teachers };

      const response = await apiClient.put<any>("/teachers/bulk", payload);

      console.log("📥 Response:", response);
      console.log(`✅ Success: ${response.data?.success || 0}`);
      console.log(`❌ Failed: ${response.data?.failed || 0}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return response;
    } catch (error: any) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ BULK UPDATE ERROR:", error);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      throw new Error(error.message || "Failed to bulk update teachers");
    }
  },
};
