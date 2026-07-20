/**
 * Claim Code API Service
 * 
 * Handles all claim code operations with the school service
 */

import { TokenManager } from './auth';
import { AUTH_SERVICE_URL } from './config';

export interface ClaimCode {
  id: string;
  code: string;
  type: 'STUDENT' | 'TEACHER' | 'STAFF' | 'PARENT';
  schoolId: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  claimedAt?: string;
  claimedByUserId?: string;
  revokedAt?: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  claimedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface PendingLink {
  id: string;
  requestId: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string;
  pendingLinkData: {
    code: string;
    schoolId: string;
    schoolName: string;
    type: 'STUDENT' | 'TEACHER';
    submittedAt: string;
    verificationData?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedSchoolLink {
  id: string;
  userId: string;
  schoolId: string;
  studentId?: string | null;
  teacherId?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  user: {
    firstName: string;
    lastName: string;
    email?: string | null;
  };
  claimCode: { code: string; type: string };
}

export interface GenerateCodesParams {
  type: 'STUDENT' | 'TEACHER' | 'STAFF' | 'PARENT';
  count?: number; // Backend uses count, not quantity
  studentIds?: string[]; // Specifically requested by backend
  teacherIds?: string[]; // Specifically requested by backend
  expiresInDays?: number;
  requiresVerification?: boolean;
}

export interface ListCodesParams {
  type?: 'STUDENT' | 'TEACHER' | 'STAFF' | 'PARENT';
  status?: 'active' | 'claimed' | 'expired' | 'revoked';
  page?: number;
  limit?: number;
  search?: string;
}

export interface ClaimCodeStats {
  total: number;
  active: number;
  claimed: number;
  expired: number;
  revoked: number;
  byType: {
    student: number;
    teacher: number;
    staff: number;
    parent: number;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL;

class ClaimCodeService {
  private getHeaders(isFormData = false): Record<string, string> {
    const token = TokenManager.getAccessToken();
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Generate claim codes
   * Returns full claim code objects for detailed display or string codes fallback
   */
  async generate(schoolId: string, params: GenerateCodesParams): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/claim-codes/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate claim codes');
    }

    const result = await response.json();
    return result.data.codes;
  }

  /**
   * List claim codes
   */
  async list(schoolId: string, params: ListCodesParams = {}): Promise<{
    codes: ClaimCode[];
    total: number;
    pages: number;
    page: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const response = await fetch(
      `${API_BASE_URL}/schools/${schoolId}/claim-codes?${queryParams.toString()}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch claim codes');
    }

    const result = await response.json();
    return {
      codes: result.data.codes,
      total: result.data.pagination.total,
      pages: result.data.pagination.totalPages,
      page: result.data.pagination.page,
    };
  }

  /**
   * Get claim code details
   */
  async get(schoolId: string, codeId: string): Promise<ClaimCode> {
    const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/claim-codes/${codeId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch claim code details');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Revoke claim code
   */
  async revoke(schoolId: string, codeId: string, reason?: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/schools/${schoolId}/claim-codes/${codeId}/revoke`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to revoke claim code');
    }
  }

  /**
   * Export claim codes as CSV
   */
  async export(schoolId: string, params: { type?: string; status?: string } = {}): Promise<Blob> {
    const queryParams = new URLSearchParams();
    if (params.type) queryParams.append('type', params.type);
    if (params.status) queryParams.append('status', params.status);

    const response = await fetch(
      `${API_BASE_URL}/schools/${schoolId}/claim-codes/export?${queryParams.toString()}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export claim codes');
    }

    return response.blob();
  }

  /**
   * Get statistics
   */
  async getStats(schoolId: string): Promise<ClaimCodeStats> {
    const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/claim-codes/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch claim code statistics');
    }

    const result = await response.json();
    const data = result.data;

    return {
      total: data.total,
      active: data.active,
      claimed: data.claimed,
      expired: data.expired,
      revoked: data.revoked,
      byType: {
        student: data.byType.STUDENT || 0,
        teacher: data.byType.TEACHER || 0,
        staff: data.byType.STAFF || 0,
        parent: data.byType.PARENT || 0,
      },
    };
  }

  /**
   * Bulk upload students from CSV and generate claim codes
   * Returns distribution summary with email and manual lists
   */
  async bulkUpload(
    schoolId: string,
    file: File,
    options: {
      type?: 'STUDENT' | 'TEACHER';
      expiresInDays?: number;
      sendEmails?: boolean;
    } = {}
  ): Promise<{
    total: number;
    distribution: {
      emailSent: number;
      manualRequired: number;
      failed: number;
    };
    codes: any[];
    emailList: Array<{
      name: string;
      email: string;
      code: string;
      grade?: string;
    }>;
    manualList: Array<{
      name: string;
      phone: string;
      code: string;
      grade?: string;
    }>;
    errors?: Array<{
      row: number;
      error: string;
      name?: string;
    }>;
    emailNote?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', options.type || 'STUDENT');
    formData.append('expiresInDays', String(options.expiresInDays || 30));
    formData.append('sendEmails', String(options.sendEmails !== false));

    const response = await fetch(
      `${API_BASE_URL}/schools/${schoolId}/claim-codes/bulk-upload`,
      {
        method: 'POST',
        body: formData,
        headers: this.getHeaders(true),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Bulk upload failed');
    }

    const result = await response.json();
    return result.data.data;
  }

  /**
   * Get all pending school link requests
   */
  async getPendingLinks(schoolId?: string): Promise<PendingLink[]> {
    const params = new URLSearchParams({ status: 'PENDING' });
    if (schoolId) params.set('schoolId', schoolId);
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/school-links?${params.toString()}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pending links');
    }

    const result = await response.json();
    return result.data.map((request: any) => ({
      id: request.user.id,
      requestId: request.id,
      firstName: request.user.firstName,
      lastName: request.user.lastName,
      email: request.user.email || '',
      profilePictureUrl: request.user.profilePictureUrl,
      pendingLinkData: {
        code: request.claimCode.code,
        schoolId: request.schoolId,
        schoolName: request.school.name,
        type: request.claimCode.type,
        submittedAt: request.submittedAt,
        studentId: request.studentId,
        teacherId: request.teacherId,
      },
      createdAt: request.user.createdAt,
      updatedAt: request.user.updatedAt,
    }));
  }

  /**
   * Approve a pending school link request
   */
  async approveLink(requestId: string): Promise<void> {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/school-links/${requestId}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve link');
    }
  }

  /**
   * Reject a pending school link request
   */
  async rejectLink(requestId: string, reason?: string): Promise<void> {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/school-links/${requestId}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject link');
    }
  }

  async getApprovedLinks(schoolId?: string): Promise<ApprovedSchoolLink[]> {
    const params = new URLSearchParams({ status: 'APPROVED' });
    if (schoolId) params.set('schoolId', schoolId);
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/school-links?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch linked accounts');
    const result = await response.json();
    return result.data;
  }

  async unlinkLink(
    requestId: string,
    input: {
      adminPassword: string;
      reason: string;
      expectedUserId: string;
      expectedStudentId?: string | null;
      expectedTeacherId?: string | null;
      reissueClaimCode?: boolean;
    },
  ): Promise<any> {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/admin/school-links/${requestId}/unlink`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Failed to unlink account');
    return result.data;
  }
}

export const claimCodeService = new ClaimCodeService();
