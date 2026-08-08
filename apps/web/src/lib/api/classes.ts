import { TokenManager } from '@/lib/api/auth';
// API client for class service

const CLASS_SERVICE_URL = process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';

export interface Class {
  id: string;
  name: string;
  grade: number;
  section?: string | null;
  track?: string | null;
  academicYearId: string;
  schoolId: string;
  capacity?: number | null;
  room?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  homeroomTeacherId?: string | null;
  homeroomTeacher?: {
    id: string;
    firstName?: string;
    lastName?: string;
    englishFirstName?: string | null;
    englishLastName?: string | null;
    firstNameLatin: string;
    lastNameLatin: string;
    email?: string | null;
    customFields?: Record<string, unknown> | null;
  } | null;
  _count?: {
    students: number;
  };
}

export interface CreateClassInput {
  name: string;
  grade: number;
  section?: string;
  track?: string;
  academicYearId: string;
  capacity?: number;
  room?: string;
  homeroomTeacherId?: string | null;
}

export interface ClassesResponse {
  data: {
    classes: Class[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
    };
  };
}

export type PlacementStrategy = 'RANDOM_BALANCED' | 'ACADEMIC_BALANCED' | 'MULTI_FACTOR_BALANCED';

export interface PlacementCandidate {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  englishFirstName?: string | null;
  englishLastName?: string | null;
  gender: string;
  photoUrl?: string | null;
  plannedGrade: string | null;
  academicAverage: number | null;
  attendanceRate: number | null;
  academicRank: number;
  previousClass: { id: string; name: string; grade: string; section: string | null };
}

export interface PlacementClass {
  id: string;
  name: string;
  grade: string;
  section: string | null;
  capacity: number | null;
  currentCount: number;
}

export interface PlacementWorkspace {
  academicYear: { id: string; name: string; startDate: string; status: string };
  grade: string;
  classes: PlacementClass[];
  candidates: PlacementCandidate[];
}

export interface PlacementPreview extends PlacementWorkspace {
  strategy: PlacementStrategy;
  seed: string;
  assignments: Array<{ studentId: string; classId: string; pinned: boolean }>;
  unassignedStudentIds: string[];
  classSummaries: Array<PlacementClass & {
    assignedCount: number;
    projectedCount: number;
    femaleCount: number;
    maleCount: number;
    averageScore: number | null;
    assignments: Array<{ studentId: string; classId: string; pinned: boolean; student: PlacementCandidate }>;
  }>;
}

export type PlacementBatchStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'APPLIED' | 'REVERSED' | 'CANCELLED';

export interface PlacementBatchVersion {
  id: string;
  batchId: string;
  version: number;
  strategy: PlacementStrategy;
  seed: string;
  classIds: string[];
  assignments: Array<{ studentId: string; classId: string; pinned: boolean }>;
  summary?: Record<string, unknown> | null;
  sourceFingerprint?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface PlacementBatch {
  id: string;
  schoolId: string;
  academicYearId: string;
  grade: string;
  status: PlacementBatchStatus;
  currentVersion: number;
  createdBy: string;
  submittedBy?: string | null;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  appliedBy?: string | null;
  appliedAt?: string | null;
  reversedBy?: string | null;
  reversedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  latestVersion: PlacementBatchVersion | null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = TokenManager.getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export async function getClasses(params?: {
  page?: number;
  limit?: number;
  grade?: number;
  academicYearId?: string;
}): Promise<ClassesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.grade) queryParams.append('grade', params.grade.toString());
  if (params?.academicYearId) queryParams.append('academicYearId', params.academicYearId);

  const response = await fetch(
    `${CLASS_SERVICE_URL}/classes/lightweight?${queryParams}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch classes' }));
    throw new Error(error.message || 'Failed to fetch classes');
  }

  const result = await response.json();
  
  // Transform API response to match frontend interface
  // Backend returns: { success: true, data: [classes] } with different field names
  // Frontend expects: { data: { classes: [], pagination: {} } }
  const transformedClasses = (result.data || []).map((c: any) => ({
    ...c,
    grade: typeof c.grade === 'string' ? parseInt(c.grade, 10) : c.grade,
    academicYearId: c.academicYear?.id || c.academicYearId,
    homeroomTeacher: c.homeroomTeacher ? {
      ...c.homeroomTeacher,
      firstNameLatin: c.homeroomTeacher.englishFirstName || c.homeroomTeacher.firstName || c.homeroomTeacher.firstNameLatin || '',
      lastNameLatin: c.homeroomTeacher.englishLastName || c.homeroomTeacher.lastName || c.homeroomTeacher.lastNameLatin || '',
    } : null,
    _count: c._count ? {
      students: c._count.studentClasses ?? c._count.students ?? 0
    } : undefined
  }));
  
  return {
    data: {
      classes: transformedClasses,
      pagination: {
        currentPage: params?.page || 1,
        totalPages: 1, // lightweight endpoint doesn't paginate
        totalCount: result.data?.length || 0,
      },
    },
  };
}

export async function getClassById(id: string): Promise<{ success: boolean; data: { class: Class } }> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch class' }));
    throw new Error(error.message || 'Failed to fetch class');
  }

  return response.json();
}

export async function createClass(data: CreateClassInput): Promise<{ success: boolean; data: { class: Class } }> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create class' }));
    throw new Error(error.message || 'Failed to create class');
  }

  return response.json();
}

export async function updateClass(id: string, data: Partial<CreateClassInput>): Promise<{ success: boolean; data: { class: Class } }> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update class' }));
    throw new Error(error.message || 'Failed to update class');
  }

  return response.json();
}

export async function deleteClass(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete class' }));
    throw new Error(error.message || 'Failed to delete class');
  }

  return response.json();
}

// Alias for consistency with roster page
export const getClass = getClassById;

export async function assignStudentsToClass(classId: string, studentIds: string[]): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${classId}/assign-students`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ studentIds }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to assign students' }));
    throw new Error(error.message || 'Failed to assign students');
  }

  return response.json();
}

async function placementRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CLASS_SERVICE_URL}${path}`, { ...init, headers: await getAuthHeaders() });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.message || 'Class placement request failed');
  return payload.data as T;
}

export const classPlacementApi = {
  getWorkspace(academicYearId: string, grade: string) {
    return placementRequest<PlacementWorkspace>(`/classes/placement/${encodeURIComponent(academicYearId)}/${encodeURIComponent(grade)}`);
  },
  generateClasses(input: { academicYearId: string; grade: string; capacity: number; classCount?: number }) {
    return placementRequest<PlacementWorkspace>('/classes/placement/generate-classes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  preview(input: {
    academicYearId: string;
    grade: string;
    classIds: string[];
    strategy: PlacementStrategy;
    seed: string;
    pinned: Array<{ studentId: string; classId: string }>;
  }) {
    return placementRequest<PlacementPreview>('/classes/placement/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  listBatches(academicYearId: string, grade: string) {
    return placementRequest<PlacementBatch[]>(`/classes/placement/batches/${encodeURIComponent(academicYearId)}/${encodeURIComponent(grade)}`);
  },
  saveDraft(input: {
    batchId?: string;
    expectedVersion?: number;
    academicYearId: string;
    grade: string;
    strategy: PlacementStrategy;
    seed: string;
    assignments: Array<{ studentId: string; classId: string; pinned: boolean }>;
    summary?: Record<string, unknown>;
    notes?: string;
  }) {
    return placementRequest<PlacementBatch>('/classes/placement/batches', { method: 'POST', body: JSON.stringify(input) });
  },
  submitBatch(batchId: string) {
    return placementRequest<PlacementBatch>(`/classes/placement/batches/${encodeURIComponent(batchId)}/submit`, { method: 'POST' });
  },
  approveBatch(batchId: string) {
    return placementRequest<PlacementBatch>(`/classes/placement/batches/${encodeURIComponent(batchId)}/approve`, { method: 'POST' });
  },
  applyBatch(batchId: string) {
    return placementRequest<{ batchId: string; assigned: number; classCounts: Record<string, number> }>(`/classes/placement/batches/${encodeURIComponent(batchId)}/apply`, { method: 'POST' });
  },
  undoBatch(batchId: string, reason: string) {
    return placementRequest<{ batchId: string; reversed: number }>(`/classes/placement/batches/${encodeURIComponent(batchId)}/undo`, { method: 'POST', body: JSON.stringify({ reason }) });
  },
};
