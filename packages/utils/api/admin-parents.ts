import { apiClient } from "./client";

// Types
export interface Parent {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  khmerName: string;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  relationship: string;
  occupation?: string;
  emergencyPhone?: string;
  isAccountActive: boolean;
  user?: {
    id: string;
    isActive: boolean;
  };
  studentParents: Array<{
    student: {
      id: string;
      studentCode: string;
      khmerName: string;
      grade: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParentData {
  firstName: string;
  lastName: string;
  khmerName: string;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  relationship: string;
  occupation?: string;
  emergencyPhone?: string;
}

export interface UpdateParentData {
  firstName?: string;
  lastName?: string;
  khmerName?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  relationship?: string;
  occupation?: string;
  emergencyPhone?: string;
}

export interface ParentAccountResponse {
  userId: string;
  parentId: string;
  username: string;
  defaultPassword: string;
}

export interface LinkStudentData {
  parentId: string;
  studentId: string;
  relationship: string;
  isPrimaryContact?: boolean;
}

export interface PaginatedParentsResponse {
  parents: Parent[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
}

// Admin Parents API Client
export const adminParentsApi = {
  /**
   * Get all parents (optimized - single query with high limit)
   */
  async getAll(): Promise<Parent[]> {
    try {
      console.log("📊 Fetching all parents (optimized)...");
      
      // Fetch all parents in single request with high limit
      const response = await apiClient.get<PaginatedParentsResponse | Parent[]>("/admin/parents?limit=10000");
      
      // Check if response is paginated or flat array
      if (Array.isArray(response)) {
        console.log("✅ Parents fetched (flat array):", response.length);
        return response;
      }
      
      // Handle paginated response - extract parents array
      const paginatedData = response as PaginatedParentsResponse;
      console.log("✅ Total parents fetched:", paginatedData.parents.length);
      return paginatedData.parents;
    } catch (error: any) {
      console.error("❌ Error fetching parents:", error);
      throw error;
    }
  },

  /**
   * Create new parent
   */
  async create(parentData: CreateParentData): Promise<Parent> {
    try {
      console.log("📝 Creating new parent...");
      const data = await apiClient.post<Parent>("/admin/parents/create", parentData);
      console.log("✅ Parent created:", data.parentId);
      return data;
    } catch (error: any) {
      console.error("❌ Error creating parent:", error);
      throw error;
    }
  },

  /**
   * Update parent
   */
  async update(parentId: string, parentData: UpdateParentData): Promise<Parent> {
    try {
      console.log("📝 Updating parent:", parentId);
      const data = await apiClient.put<Parent>(`/admin/parents/${parentId}`, parentData);
      console.log("✅ Parent updated:", data.parentId);
      return data;
    } catch (error: any) {
      console.error("❌ Error updating parent:", error);
      throw error;
    }
  },

  /**
   * Delete parent
   */
  async delete(parentId: string): Promise<{ success: boolean }> {
    try {
      console.log("🗑️ Deleting parent:", parentId);
      const data = await apiClient.delete<{ success: boolean }>(`/admin/parents/${parentId}`);
      console.log("✅ Parent deleted");
      return data;
    } catch (error: any) {
      console.error("❌ Error deleting parent:", error);
      throw error;
    }
  },

  /**
   * Create parent account
   */
  async createAccount(parentId: string): Promise<ParentAccountResponse> {
    try {
      console.log("📝 Creating parent account...");
      const data = await apiClient.post<ParentAccountResponse>(
        "/admin/parents/create-account",
        { parentId }
      );
      console.log("✅ Account created:", data.username);
      return data;
    } catch (error: any) {
      console.error("❌ Error creating account:", error);
      throw error;
    }
  },

  /**
   * Reset parent password
   */
  async resetPassword(
    parentId: string
  ): Promise<{ username: string; defaultPassword: string }> {
    try {
      console.log("🔐 Resetting parent password...");
      const data = await apiClient.post<{
        username: string;
        defaultPassword: string;
      }>("/admin/parents/reset-password", { parentId });
      console.log("✅ Password reset:", data.username);
      return data;
    } catch (error: any) {
      console.error("❌ Error resetting password:", error);
      throw error;
    }
  },

  /**
   * Toggle parent account status (activate/deactivate)
   */
  async toggleStatus(parentId: string): Promise<{ isActive: boolean }> {
    try {
      console.log("🔄 Toggling parent account status...");
      const data = await apiClient.put<{ isActive: boolean }>(
        `/admin/parents/${parentId}/toggle-status`,
        {}
      );
      console.log("✅ Status toggled:", data.isActive ? "Active" : "Inactive");
      return data;
    } catch (error: any) {
      console.error("❌ Error toggling status:", error);
      throw error;
    }
  },

  /**
   * Link parent to student
   */
  async linkStudent(linkData: LinkStudentData): Promise<{ success: boolean }> {
    try {
      console.log("🔗 Linking parent to student...");
      const data = await apiClient.post<{ success: boolean }>(
        "/admin/parents/link-student",
        linkData
      );
      console.log("✅ Parent linked to student");
      return data;
    } catch (error: any) {
      console.error("❌ Error linking student:", error);
      throw error;
    }
  },

  /**
   * Unlink parent from student
   */
  async unlinkStudent(parentId: string, studentId: string): Promise<{ success: boolean }> {
    try {
      console.log("🔓 Unlinking parent from student...");
      const data = await apiClient.delete<{ success: boolean }>(
        `/admin/parents/unlink-student?parentId=${parentId}&studentId=${studentId}`
      );
      console.log("✅ Parent unlinked from student");
      return data;
    } catch (error: any) {
      console.error("❌ Error unlinking student:", error);
      throw error;
    }
  },
};
