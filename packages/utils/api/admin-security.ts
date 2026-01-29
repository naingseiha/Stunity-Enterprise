import { apiClient } from "./client";

export interface SecurityDashboard {
  totalTeachers: number;
  activeTeachers: number;
  defaultPasswordCount: number;
  expiredCount: number;
  expiringInDay: number;
  expiringIn3Days: number;
  suspendedCount: number;
  suspendedAccounts: number;
  totalParents: number;
  activeParents: number;
  securityScore: number;
}

export interface TeacherSecurity {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isDefaultPassword: boolean;
  passwordExpiresAt: string | null;
  passwordChangedAt: string | null;
  accountSuspendedAt: string | null;
  suspensionReason: string | null;
  lastLogin: string | null;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  alertLevel: "none" | "info" | "warning" | "danger" | "expired";
  teacher: {
    teacherId: string;
    firstName: string;
    lastName: string;
    khmerName: string;
    phone: string;
    position: string;
  } | null;
}

export interface AuditLog {
  id: string;
  action: string;
  reason: string | null;
  createdAt: string;
  details: any;
  admin: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
  teacher: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export const adminSecurityApi = {
  async getDashboard(): Promise<SecurityDashboard> {
    const response = await apiClient.get("/admin/security/dashboard");
    return response;
  },

  async getTeacherList(params: {
    page?: number;
    limit?: number;
    filter?: "all" | "default" | "expired" | "expiring" | "suspended";
  }): Promise<{
    teachers: TeacherSecurity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.filter) queryParams.append("filter", params.filter);
    
    const response = await apiClient.get(
      `/admin/security/teachers?${queryParams.toString()}`
    );
    return response;
  },

  async forcePasswordReset(teacherId: string, reason: string): Promise<{
    tempPassword: string;
    teacherName: string;
    expiresAt: string;
  }> {
    const response = await apiClient.post("/admin/security/force-reset", {
      teacherId,
      reason,
    });
    return response;
  },

  async extendExpiration(
    teacherId: string,
    days: number,
    reason: string
  ): Promise<{ newExpiresAt: string }> {
    const response = await apiClient.post("/admin/security/extend-expiration", {
      teacherId,
      days,
      reason,
    });
    return response;
  },

  async toggleSuspension(
    teacherId: string,
    suspend: boolean,
    reason: string
  ): Promise<void> {
    await apiClient.post("/admin/security/toggle-suspension", {
      teacherId,
      suspend,
      reason,
    });
  },

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    teacherId?: string;
  }): Promise<{
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.teacherId) queryParams.append("teacherId", params.teacherId);
    
    const response = await apiClient.get(
      `/admin/security/audit-logs?${queryParams.toString()}`
    );
    return response;
  },
};
