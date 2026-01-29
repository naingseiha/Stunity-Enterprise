import { apiClient } from "./client";

// Types
export interface AccountStatistics {
  overall: {
    totalStudents: number;
    activeStudents: number;
    inactiveStudents: number;
    activationRate: string;
  };
  byGrade: {
    [grade: string]: {
      total: number;
      active: number;
      inactive: number;
    };
  };
}

export interface DeactivateResponse {
  deactivatedCount: number;
  reason?: string;
  deactivatedAt: string;
}

export interface ActivateResponse {
  activatedCount: number;
  activatedAt: string;
}

export interface StudentAccountResponse {
  userId: string;
  studentId: string;
  studentCode: string;
  defaultPassword: string;
}

// Admin API Client
export const adminApi = {
  /**
   * Get account statistics
   */
  async getAccountStatistics(): Promise<AccountStatistics> {
    try {
      console.log("📊 Fetching account statistics...");
      const data = await apiClient.get<AccountStatistics>(
        "/admin/accounts/statistics"
      );
      console.log("✅ Statistics fetched:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Error fetching statistics:", error);
      throw error;
    }
  },

  /**
   * Deactivate all student accounts
   */
  async deactivateAllStudents(reason?: string): Promise<DeactivateResponse> {
    try {
      console.log("🚨 Deactivating all students...");
      const data = await apiClient.post<DeactivateResponse>(
        "/admin/accounts/deactivate-all",
        { reason }
      );
      console.log("✅ Deactivated:", data.deactivatedCount);
      return data;
    } catch (error: any) {
      console.error("❌ Error deactivating all:", error);
      throw error;
    }
  },

  /**
   * Deactivate students by grade
   */
  async deactivateByGrade(
    grade: string,
    reason?: string
  ): Promise<DeactivateResponse> {
    try {
      console.log(`🚨 Deactivating grade ${grade}...`);
      const data = await apiClient.post<DeactivateResponse>(
        "/admin/accounts/deactivate-by-grade",
        { grade, reason }
      );
      console.log("✅ Deactivated:", data.deactivatedCount);
      return data;
    } catch (error: any) {
      console.error("❌ Error deactivating by grade:", error);
      throw error;
    }
  },

  /**
   * Deactivate students by class
   */
  async deactivateByClass(
    classId: string,
    reason?: string
  ): Promise<DeactivateResponse> {
    try {
      console.log(`🚨 Deactivating class ${classId}...`);
      const data = await apiClient.post<DeactivateResponse>(
        "/admin/accounts/deactivate-by-class",
        { classId, reason }
      );
      console.log("✅ Deactivated:", data.deactivatedCount);
      return data;
    } catch (error: any) {
      console.error("❌ Error deactivating by class:", error);
      throw error;
    }
  },

  /**
   * Activate students (supports multiple modes)
   */
  async activateStudents(options: {
    activateAll?: boolean;
    grade?: string;
    classId?: string;
    studentIds?: string[];
  }): Promise<ActivateResponse> {
    try {
      console.log("✅ Activating students...", options);
      const data = await apiClient.post<ActivateResponse>(
        "/admin/accounts/activate",
        options
      );
      console.log("✅ Activated:", data.activatedCount);
      return data;
    } catch (error: any) {
      console.error("❌ Error activating students:", error);
      throw error;
    }
  },

  /**
   * Create student account
   */
  async createStudentAccount(
    studentId: string
  ): Promise<StudentAccountResponse> {
    try {
      console.log("📝 Creating student account...");
      const data = await apiClient.post<StudentAccountResponse>(
        "/admin/students/create-account",
        { studentId }
      );
      console.log("✅ Account created:", data.studentCode);
      return data;
    } catch (error: any) {
      console.error("❌ Error creating account:", error);
      throw error;
    }
  },

  /**
   * Reset student password
   */
  async resetStudentPassword(
    studentId: string
  ): Promise<{ studentCode: string; defaultPassword: string }> {
    try {
      console.log("🔐 Resetting student password...");
      const data = await apiClient.post<{
        studentCode: string;
        defaultPassword: string;
      }>("/admin/students/reset-password", { studentId });
      console.log("✅ Password reset:", data.studentCode);
      return data;
    } catch (error: any) {
      console.error("❌ Error resetting password:", error);
      throw error;
    }
  },

  /**
   * Update student role
   */
  async updateStudentRole(studentId: string, studentRole: string): Promise<any> {
    try {
      console.log("👑 Updating student role...");
      const data = await apiClient.post("/admin/students/update-role", {
        studentId,
        studentRole,
      });
      console.log("✅ Role updated:", studentRole);
      return data;
    } catch (error: any) {
      console.error("❌ Error updating role:", error);
      throw error;
    }
  },
};
