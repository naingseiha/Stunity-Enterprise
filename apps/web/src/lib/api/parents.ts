import { TokenManager } from './auth';

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:3001';

export interface ParentLinkedStudent {
  relationship: string;
  isPrimary: boolean;
  student: {
    id: string;
    studentId?: string | null;
    firstName: string;
    lastName: string;
    fullName: string;
    class?: {
      id: string;
      name: string;
      grade: string;
      section?: string | null;
    } | null;
  };
}

export interface ParentAccountSummary {
  userId: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  failedAttempts: number;
  lockedUntil?: string | null;
  isDefaultPassword: boolean;
}

export interface ParentDirectoryEntry {
  id: string;
  parentId?: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  englishName?: string | null;
  email?: string | null;
  phone: string;
  relationship: string;
  isAccountActive: boolean;
  createdAt: string;
  updatedAt: string;
  account: ParentAccountSummary | null;
  linkedStudents: ParentLinkedStudent[];
}

export interface ParentDirectoryResponse {
  success: boolean;
  data: ParentDirectoryEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetParentsParams {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
}

function buildQuery(params?: GetParentsParams) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.search) query.append('search', params.search);
  if (params?.schoolId) query.append('schoolId', params.schoolId);
  return query.toString();
}

export async function getAdminParents(params?: GetParentsParams): Promise<ParentDirectoryResponse> {
  const query = buildQuery(params);
  const response = await TokenManager.fetchWithAuth(
    `${AUTH_SERVICE_URL}/auth/admin/parents${query ? `?${query}` : ''}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch parents' }));
    throw new Error(error.message || error.error || 'Failed to fetch parents');
  }

  return response.json();
}
