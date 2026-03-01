/**
 * Claim Code API Service
 * 
 * Handles all claim code operations with the school service
 */

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

export interface GenerateCodesParams {
  type: 'STUDENT' | 'TEACHER' | 'STAFF' | 'PARENT';
  quantity?: number;
  specificRecords?: {
    studentId?: string;
    teacherId?: string;
  }[];
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

class ClaimCodeService {
  /**
   * Generate claim codes
   */
  async generate(schoolId: string, params: GenerateCodesParams): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/claim-codes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate claim codes');
    }

    const result = await response.json();
    // Extract just the code strings from the response
    return result.data.codes.map((c: any) => typeof c === 'string' ? c : c.code);
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
      `${API_BASE_URL}/schools/${schoolId}/claim-codes?${queryParams.toString()}`
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
    const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/claim-codes/${codeId}`);

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
        headers: { 'Content-Type': 'application/json' },
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
      `${API_BASE_URL}/schools/${schoolId}/claim-codes/export?${queryParams.toString()}`
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
    const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/claim-codes/stats`);

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
        headers: {},
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Bulk upload failed');
    }

    const result = await response.json();
    return result.data.data;
  }
}

export const claimCodeService = new ClaimCodeService();
