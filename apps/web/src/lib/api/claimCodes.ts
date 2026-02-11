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
  async generate(schoolId: string, params: GenerateCodesParams): Promise<{ codes: ClaimCode[] }> {
    const response = await fetch(`${API_BASE_URL}/schools/${schoolId}/claim-codes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate claim codes');
    }

    return response.json();
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

    return response.json();
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
    // Get all codes and calculate stats client-side
    const { codes } = await this.list(schoolId, { limit: 1000 });

    const now = new Date();
    const stats: ClaimCodeStats = {
      total: codes.length,
      active: 0,
      claimed: 0,
      expired: 0,
      revoked: 0,
      byType: {
        student: 0,
        teacher: 0,
        staff: 0,
        parent: 0,
      },
    };

    codes.forEach((code) => {
      // Count by type
      stats.byType[code.type.toLowerCase() as keyof typeof stats.byType]++;

      // Count by status
      if (code.revokedAt) {
        stats.revoked++;
      } else if (code.claimedAt) {
        stats.claimed++;
      } else if (new Date(code.expiresAt) < now) {
        stats.expired++;
      } else if (code.isActive) {
        stats.active++;
      }
    });

    return stats;
  }
}

export const claimCodeService = new ClaimCodeService();
