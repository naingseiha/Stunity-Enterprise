const SCHOOL_SERVICE_URL = process.env.NEXT_PUBLIC_SCHOOL_SERVICE_URL || 'http://localhost:3002';

export interface SuperAdminSchool {
  id: string;
  name: string;
  slug: string;
  email: string;
  isActive: boolean;
  registrationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  subscriptionTier?: string;
  subscriptionEnd?: string | null;
  createdAt: string;
  _count?: { users: number; classes: number };
}

export interface SuperAdminStats {
  totalSchools: number;
  totalUsers: number;
  totalClasses: number;
  activeSchools: number;
  recentSchools: Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    isActive: boolean;
  }>;
  schoolsByTier?: Array<{ tier: string; count: number }>;
}

export interface SuperAdminUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: string | null;
  isActive: boolean;
  lastLogin: string | null;
  school?: { id: string; name: string; slug: string } | null;
}

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export async function getSuperAdminSchools(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'pending';
}): Promise<{ data: { schools: SuperAdminSchool[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);

  const url = `${SCHOOL_SERVICE_URL}/super-admin/schools${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch schools');
  }

  const data = await response.json();
  return data;
}

export async function getSuperAdminDashboardStats(): Promise<{ data: SuperAdminStats }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch dashboard stats');
  }

  const data = await response.json();
  return data;
}

export interface SuperAdminSchoolDetail extends SuperAdminSchool {
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  logo?: string | null;
  subscriptionStart?: string;
  setupCompleted?: boolean;
  _count?: {
    users: number;
    classes: number;
    students: number;
    teachers: number;
    academicYears: number;
  };
  academicYears?: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: string;
  }>;
}

export async function getSuperAdminSchoolDetail(schoolId: string): Promise<{ data: SuperAdminSchoolDetail }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/schools/${schoolId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) throw new Error('School not found');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch school');
  }

  const data = await response.json();
  return data;
}

export interface UpdateSchoolData {
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  isActive?: boolean;
  subscriptionTier?: string;
  subscriptionEnd?: string | null;
}

export async function updateSuperAdminSchool(schoolId: string, data: UpdateSchoolData): Promise<{ data: SuperAdminSchoolDetail }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/schools/${schoolId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (response.status === 404) throw new Error('School not found');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to update school');
  }

  const result = await response.json();
  return result;
}

export async function getSuperAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  role?: string;
}): Promise<{ data: { users: SuperAdminUser[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.schoolId) searchParams.set('schoolId', params.schoolId);
  if (params?.role) searchParams.set('role', params.role);

  const url = `${SCHOOL_SERVICE_URL}/super-admin/users${searchParams.toString() ? `?${searchParams}` : ''}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch users');
  }
  return response.json();
}

export interface SuperAdminUserDetail extends Omit<SuperAdminUser, 'lastLogin'> {
  phone?: string | null;
  lastLogin?: string | null;
  createdAt?: string;
  school?: { id: string; name: string; slug: string; isActive: boolean } | null;
}

export async function getSuperAdminUserDetail(userId: string): Promise<{ data: SuperAdminUserDetail }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) throw new Error('User not found');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to fetch user');
  }
  return response.json();
}

export async function updateSuperAdminUser(userId: string, data: { isActive?: boolean }): Promise<{ data: SuperAdminUser }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (response.status === 404) throw new Error('User not found');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to update user');
  }
  return response.json();
}

export interface CreateSchoolData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  schoolType?: string;
  subscriptionTier?: string;
  trialMonths?: number;
}

export async function createSuperAdminSchool(data: CreateSchoolData): Promise<{ data: { school: SuperAdminSchool; adminUser: { id: string; email: string } } }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/schools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to create school');
  }
  return response.json();
}

export interface PlatformAuditLog {
  id: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor?: { id: string; firstName: string; lastName: string; email: string | null };
}

export interface AuditLogRetentionPolicy {
  retentionDays: number;
  logsOlderThanRetention: number;
  cutoffDate: string;
}

export async function getSuperAdminAuditLogRetentionPolicy(): Promise<{ data: AuditLogRetentionPolicy }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/audit-logs/retention-policy`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch retention policy');
  }
  return res.json();
}

export async function runSuperAdminAuditLogCleanup(olderThanDays?: number): Promise<{
  data: { deletedCount: number; olderThanDays: number; cutoffDate: string };
}> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const url = olderThanDays
    ? `${SCHOOL_SERVICE_URL}/super-admin/audit-logs/cleanup?olderThanDays=${olderThanDays}`
    : `${SCHOOL_SERVICE_URL}/super-admin/audit-logs/cleanup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to run cleanup');
  }
  return res.json();
}

export async function getSuperAdminAuditLogs(params?: {
  page?: number;
  limit?: number;
  resourceType?: string;
  action?: string;
}): Promise<{ data: { logs: PlatformAuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const sp = new URLSearchParams();
  if (params?.page) sp.set('page', String(params.page));
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.resourceType) sp.set('resourceType', params.resourceType);
  if (params?.action) sp.set('action', params.action);
  const url = `${SCHOOL_SERVICE_URL}/super-admin/audit-logs${sp.toString() ? `?${sp}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch audit logs');
  }
  return res.json();
}

export interface FeatureFlag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  schoolId: string | null;
  school?: { id: string; name: string } | null;
  createdAt: string;
}

export async function getSuperAdminFeatureFlags(scope?: 'platform' | 'school'): Promise<{ data: FeatureFlag[] }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const url = `${SCHOOL_SERVICE_URL}/super-admin/feature-flags${scope ? `?scope=${scope}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch feature flags');
  }
  return res.json();
}

export async function createSuperAdminFeatureFlag(data: {
  key: string;
  description?: string;
  enabled?: boolean;
  schoolId?: string;
}): Promise<{ data: FeatureFlag }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/feature-flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to create feature flag');
  }
  return res.json();
}

export async function updateSuperAdminFeatureFlag(
  id: string,
  data: { enabled?: boolean; description?: string }
): Promise<{ data: FeatureFlag }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/feature-flags/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update feature flag');
  }
  return res.json();
}

export async function deleteSuperAdminFeatureFlag(id: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/feature-flags/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) throw new Error('Feature flag not found');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to delete feature flag');
  }
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'INFO' | 'WARNING' | 'URGENT';
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
}

export async function getSuperAdminAnnouncements(): Promise<{ data: PlatformAnnouncement[] }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/announcements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch announcements');
  }
  return res.json();
}

export async function createSuperAdminAnnouncement(data: {
  title: string;
  content: string;
  priority?: string;
  isActive?: boolean;
  startAt?: string | null;
  endAt?: string | null;
}): Promise<{ data: PlatformAnnouncement }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to create announcement');
  }
  return res.json();
}

export async function updateSuperAdminAnnouncement(
  id: string,
  data: { title?: string; content?: string; priority?: string; isActive?: boolean; startAt?: string | null; endAt?: string | null }
): Promise<{ data: PlatformAnnouncement }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update announcement');
  }
  return res.json();
}

export async function deleteSuperAdminAnnouncement(id: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/announcements/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete announcement');
  }
}

export async function getFeatureFlagCheck(key: string): Promise<{ data: { key: string; enabled: boolean } }> {
  const url = `${SCHOOL_SERVICE_URL}/api/feature-flags/check?key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to check feature flag');
  return res.json();
}

export async function getFeatureFlagsCheck(keys: string[]): Promise<{ data: Record<string, boolean> }> {
  const url = `${SCHOOL_SERVICE_URL}/api/feature-flags/check?keys=${keys.map(encodeURIComponent).join(',')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to check feature flags');
  return res.json();
}

export interface SuperAdminAnalytics {
  schoolsPerMonth: { month: string; count: number }[];
  usersPerMonth: { month: string; count: number }[];
  topSchools: { id: string; name: string; slug: string; currentStudents: number; currentTeachers: number; subscriptionTier: string }[];
  summary: { totalSchools: number; totalUsers: number; activeSchools: number };
}

export async function getSuperAdminAnalytics(months?: number): Promise<{ data: SuperAdminAnalytics }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const url = `${SCHOOL_SERVICE_URL}/super-admin/analytics${months ? `?months=${months}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch analytics');
  }
  return res.json();
}

export async function getActiveAnnouncements(): Promise<{ data: PlatformAnnouncement[] }> {
  const url = `${SCHOOL_SERVICE_URL}/api/announcements/active`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch announcements');
  return res.json();
}

export async function deleteSuperAdminSchool(schoolId: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/schools/${schoolId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) throw new Error('School not found');
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to delete school');
  }
}

export async function approveSuperAdminSchool(schoolId: string): Promise<{ data: SuperAdminSchoolDetail }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/schools/${schoolId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) throw new Error('School not found');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to approve school');
  }
  return res.json();
}

export async function rejectSuperAdminSchool(schoolId: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`${SCHOOL_SERVICE_URL}/super-admin/schools/${schoolId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) throw new Error('School not found');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || 'Failed to reject school');
  }
}
