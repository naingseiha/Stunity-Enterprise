// API client for teacher service

const TEACHER_SERVICE_URL = process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004';

export interface Teacher {
  id: string;
  teacherId?: string;
  employeeId?: string;
  // Native name (any language)
  firstName: string;
  lastName: string;
  // Latin / international name
  englishFirstName?: string | null;
  englishLastName?: string | null;
  gender: string;
  dateOfBirth: string;
  phoneNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate: string;
  position?: string | null;
  department?: string | null;
  salary?: number | null;
  photoUrl?: string | null;
  schoolId: string;
  isActive?: boolean;
  homeroomClassId?: string | null;
  createdAt: string;
  updatedAt?: string;
  subjects?: Array<{ id: string; name: string }>;
  classes?: Array<{ id: string; name: string; grade: number }>;
  // Raw customFields from backend — use extractTeacherCustomFields() to unwrap
  customFields?: {
    regional?: Record<string, string | null | undefined>;
  } | null;
}

/**
 * All fields that can be submitted for a teacher.
 * - Top-level DB columns: firstName, lastName, englishFirstName, englishLastName, gender,
 *   dateOfBirth, phoneNumber, email, address, hireDate, homeroomClassId
 * - customFields.regional keys: position, degree, major1, major2, idCard, passport,
 *   nationality, workingLevel, salaryRange, emergencyContact, emergencyPhone
 */
export interface CreateTeacherInput {
  // ── Core (DB columns) ──────────────────────────────────────────────────
  firstName: string;
  lastName: string;
  englishFirstName?: string;
  englishLastName?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  hireDate: string;
  homeroomClassId?: string;
  subjectIds?: string[];
  classIds?: string[];

  // ── Regional / Custom (stored in customFields.regional) ───────────────
  position?: string;
  degree?: string;
  major1?: string;
  major2?: string;
  idCard?: string;
  passport?: string;
  nationality?: string;
  workingLevel?: string;
  salaryRange?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  customFields?: {
    regional?: Record<string, string | null | undefined>;
  };
  [key: string]: any;
}

/**
 * Extracts the customFields.regional values from a Teacher record into a flat
 * object that can be spread directly into TeacherModal's formData state.
 */
export function extractTeacherCustomFields(teacher: Teacher): Partial<CreateTeacherInput> {
  const r = teacher.customFields?.regional ?? {};
  return {
    position: r.position ?? '',
    degree: r.degree ?? '',
    major1: r.major1 ?? '',
    major2: r.major2 ?? '',
    idCard: r.idCard ?? '',
    passport: r.passport ?? '',
    nationality: r.nationality ?? '',
    workingLevel: r.workingLevel ?? '',
    salaryRange: r.salaryRange ?? '',
    emergencyContact: r.emergencyContact ?? '',
    emergencyPhone: r.emergencyPhone ?? '',
  };
}

export interface TeachersResponse {
  success: boolean;
  data: {
    teachers: Teacher[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export async function getTeachers(params?: {
  page?: number;
  limit?: number;
  gender?: string;
  search?: string;
  academicYearId?: string;
  includeRelations?: boolean;
}): Promise<TeachersResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.academicYearId) queryParams.append('academicYearId', params.academicYearId);
  queryParams.append('includeRelations', params?.includeRelations ? '1' : '0');

  const response = await fetch(
    `${TEACHER_SERVICE_URL}/teachers/lightweight?${queryParams}`,
    { headers: await getAuthHeaders() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch teachers' }));
    throw new Error(error.message || 'Failed to fetch teachers');
  }

  const result = await response.json();

  const transformedTeachers = (result.data || []).map((teacher: any): Teacher => ({
    ...teacher,
    teacherId: teacher.employeeId || teacher.teacherId || teacher.id,
    firstName: teacher.firstName || '',
    lastName: teacher.lastName || '',
    englishFirstName: teacher.englishFirstName || null,
    englishLastName: teacher.englishLastName || null,
    // Normalize phone field (backend uses "phone", interface uses "phoneNumber")
    phoneNumber: teacher.phone || teacher.phoneNumber || null,
    phone: teacher.phone || teacher.phoneNumber || null,
  }));

  return {
    success: result.success,
    data: {
      teachers: transformedTeachers,
      pagination: result.pagination || {
        total: result.data?.length || 0,
        page: params?.page || 1,
        limit: params?.limit || 20,
        totalPages: 1,
      },
    },
  };
}

export async function getTeacherById(id: string): Promise<{ success: boolean; data: Teacher }> {
  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers/${id}`, {
    headers: await getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch teacher' }));
    throw new Error(error.message || 'Failed to fetch teacher');
  }
  const result = await response.json();
  return { success: result.success, data: result.data };
}

/**
 * Builds the backend-compatible payload from CreateTeacherInput.
 * - Auto-computes khmerName = lastName + ' ' + firstName for backward compat
 * - phoneNumber → phone (backend field name)
 * - Regional fields passed directly (backend validator accepts them)
 */
function buildTeacherPayload(data: Partial<CreateTeacherInput>): Record<string, any> {
  const payload: Record<string, any> = {};

  // Core DB columns
  if (data.firstName !== undefined) payload.firstName = data.firstName;
  if (data.lastName !== undefined) payload.lastName = data.lastName;
  if (data.englishFirstName !== undefined) payload.englishFirstName = data.englishFirstName;
  if (data.englishLastName !== undefined) payload.englishLastName = data.englishLastName;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.dateOfBirth !== undefined) payload.dateOfBirth = data.dateOfBirth;
  // phoneNumber → phone (backend field name)
  if (data.phoneNumber !== undefined) payload.phone = data.phoneNumber;
  if (data.email !== undefined) payload.email = data.email;
  if (data.address !== undefined) payload.address = data.address;
  if (data.hireDate !== undefined) payload.hireDate = data.hireDate;
  if (data.homeroomClassId !== undefined) payload.homeroomClassId = data.homeroomClassId;
  if (data.subjectIds !== undefined) payload.subjectIds = data.subjectIds;
  if (data.classIds !== undefined) payload.classIds = data.classIds;

  // Auto-compute khmerName (full native name) for backward compat with reports
  const lastName = data.lastName ?? '';
  const firstName = data.firstName ?? '';
  if (lastName || firstName) {
    payload.khmerName = `${lastName} ${firstName}`.trim();
  }

  // englishName computed from latin fields
  const engFirst = data.englishFirstName ?? '';
  const engLast = data.englishLastName ?? '';
  if (engFirst || engLast) {
    payload.englishName = `${engFirst} ${engLast}`.trim();
  }

  // Regional / custom fields (backend validator accepts via passthrough)
  const regionalKeys: string[] = [
    'position', 'degree', 'major1', 'major2',
    'idCard', 'passport', 'nationality',
    'workingLevel', 'salaryRange',
    'emergencyContact', 'emergencyPhone',
  ];
  for (const key of regionalKeys) {
    if (data[key] !== undefined) payload[key] = data[key];
  }

  if (data.customFields?.regional) {
    payload.customFields = { regional: data.customFields.regional };
  }

  const knownKeys = new Set<string>([
    'firstName', 'lastName', 'englishFirstName', 'englishLastName',
    'gender', 'dateOfBirth', 'phoneNumber', 'email', 'address', 'hireDate',
    'homeroomClassId', 'subjectIds', 'classIds', 'customFields',
    ...regionalKeys,
  ]);
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key) && value !== undefined) payload[key] = value;
  }

  return payload;
}

export async function createTeacher(data: CreateTeacherInput): Promise<{ success: boolean; data: { teacher: Teacher } }> {
  const payload = buildTeacherPayload(data);

  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create teacher' }));
    throw new Error(error.message || 'Failed to create teacher');
  }

  const result = await response.json();
  return { success: result.success, data: { teacher: result.data } };
}

export async function updateTeacher(id: string, data: Partial<CreateTeacherInput>): Promise<{ success: boolean; data: { teacher: Teacher } }> {
  const payload = buildTeacherPayload(data);

  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update teacher' }));
    throw new Error(error.message || 'Failed to update teacher');
  }

  const result = await response.json();
  return { success: result.success, data: { teacher: result.data } };
}

export async function deleteTeacher(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete teacher' }));
    throw new Error(error.message || 'Failed to delete teacher');
  }

  return response.json();
}

export async function uploadTeacherPhoto(id: string, file: File): Promise<{ success: boolean; data: { photoUrl: string; teacher: Teacher } }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers/${id}/photo`, {
    method: 'POST',
    headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload photo' }));
    throw new Error(error.message || 'Failed to upload photo');
  }

  return response.json();
}

export async function toggleProfileLock(id: string, isProfileLocked: boolean): Promise<{ success: boolean; data: Teacher }> {
  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers/${id}/lock`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ isProfileLocked }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to toggle profile lock' }));
    throw new Error(error.message || 'Failed to toggle profile lock');
  }

  return response.json();
}
