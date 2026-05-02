// API client for student service
import { cachedFetch, invalidateCache } from '../cache';

const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

export interface Student {
  id: string;
  studentId: string;
  // Native name (any language — Khmer, Arabic, etc.)
  firstName: string;
  lastName: string;
  // Latin / international name
  englishFirstName?: string | null;
  englishLastName?: string | null;
  gender: string;
  dateOfBirth: string;
  email?: string | null;
  phoneNumber?: string | null;
  classId?: string | null;
  photoUrl?: string | null;
  schoolId: string;
  isActive?: boolean;
  isAccountActive?: boolean;
  createdAt: string;
  updatedAt?: string;
  class?: {
    id: string;
    name: string;
    grade: number;
  };
  // Raw customFields from backend — use extractStudentCustomFields() to unwrap
  customFields?: {
    regional?: Record<string, string | null | undefined>;
  } | null;
}

/**
 * All fields that can be submitted for a student.
 * - Top-level DB columns: firstName, lastName, englishFirstName, englishLastName, gender, dateOfBirth, phoneNumber, email, classId
 * - customFields.regional keys: placeOfBirth, currentAddress, fatherName, motherName, parentPhone, parentOccupation,
 *   previousGrade, previousSchool, repeatingGrade, transferredFrom, grade9/12 exam fields, remarks
 */
export interface CreateStudentInput {
  // ── Core (DB columns) ──────────────────────────────────────────────────
  firstName: string;
  lastName: string;
  englishFirstName?: string;
  englishLastName?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  phoneNumber?: string;
  email?: string;
  classId?: string;

  // ── Regional / Custom (stored in customFields.regional) ───────────────
  placeOfBirth?: string;
  currentAddress?: string;
  fatherName?: string;
  motherName?: string;
  parentPhone?: string;
  parentOccupation?: string;
  previousGrade?: string;
  previousSchool?: string;
  repeatingGrade?: string;
  transferredFrom?: string;
  grade9ExamSession?: string;
  grade9ExamCenter?: string;
  grade9ExamRoom?: string;
  grade9ExamDesk?: string;
  grade9PassStatus?: string;
  grade12ExamSession?: string;
  grade12ExamCenter?: string;
  grade12ExamRoom?: string;
  grade12ExamDesk?: string;
  grade12PassStatus?: string;
  grade12Track?: string;
  remarks?: string;
}

/**
 * Extracts the customFields.regional values from a Student record into a flat
 * object that can be spread directly into StudentModal's formData state.
 */
export function extractStudentCustomFields(student: Student): Partial<CreateStudentInput> {
  const r = student.customFields?.regional ?? {};
  return {
    placeOfBirth: r.placeOfBirth ?? '',
    currentAddress: r.currentAddress ?? '',
    fatherName: r.fatherName ?? '',
    motherName: r.motherName ?? '',
    parentPhone: r.parentPhone ?? '',
    parentOccupation: r.parentOccupation ?? '',
    previousGrade: r.previousGrade ?? '',
    previousSchool: r.previousSchool ?? '',
    repeatingGrade: r.repeatingGrade ?? '',
    transferredFrom: r.transferredFrom ?? '',
    grade9ExamSession: r.grade9ExamSession ?? '',
    grade9ExamCenter: r.grade9ExamCenter ?? '',
    grade9ExamRoom: r.grade9ExamRoom ?? '',
    grade9ExamDesk: r.grade9ExamDesk ?? '',
    grade9PassStatus: r.grade9PassStatus ?? '',
    grade12ExamSession: r.grade12ExamSession ?? '',
    grade12ExamCenter: r.grade12ExamCenter ?? '',
    grade12ExamRoom: r.grade12ExamRoom ?? '',
    grade12ExamDesk: r.grade12ExamDesk ?? '',
    grade12PassStatus: r.grade12PassStatus ?? '',
    grade12Track: r.grade12Track ?? '',
    remarks: r.remarks ?? '',
  };
}

export interface StudentsResponse {
  success: boolean;
  data: {
    students: Student[];
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

export async function getStudents(params?: {
  page?: number;
  limit?: number;
  classId?: string;
  gender?: string;
  search?: string;
  academicYearId?: string;
}): Promise<StudentsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.classId) queryParams.append('classId', params.classId);
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.academicYearId) queryParams.append('academicYearId', params.academicYearId);

  const cacheKey = `students:${queryParams.toString()}`;

  const result = await cachedFetch(
    cacheKey,
    async () => {
      const response = await fetch(
        `${STUDENT_SERVICE_URL}/students/lightweight?${queryParams}`,
        { headers: await getAuthHeaders() }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch students' }));
        throw new Error(error.message || 'Failed to fetch students');
      }
      return response.json();
    },
    2 * 60 * 1000
  );

  const transformedStudents = (result.data || []).map((student: any): Student => ({
    ...student,
    studentId: student.studentId || student.id,
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    englishFirstName: student.englishFirstName || null,
    englishLastName: student.englishLastName || null,
  }));

  return {
    success: result.success,
    data: {
      students: transformedStudents,
      pagination: result.pagination || {
        total: result.data?.length || 0,
        page: params?.page || 1,
        limit: params?.limit || 20,
        totalPages: 1,
      },
    },
  };
}

export async function getStudentById(id: string): Promise<{ success: boolean; data: Student }> {
  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}`, {
    headers: await getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch student' }));
    throw new Error(error.message || 'Failed to fetch student');
  }
  const result = await response.json();
  // Backend wraps in { success, data: student }
  return { success: result.success, data: result.data };
}

/**
 * Builds the backend-compatible payload from CreateStudentInput.
 * - Auto-computes khmerName = lastName + ' ' + firstName for backward compat with reports
 * - Passes all regional fields directly (backend validator accepts them)
 */
function buildStudentPayload(data: Partial<CreateStudentInput>): Record<string, any> {
  const payload: Record<string, any> = {};

  // Core DB columns
  if (data.firstName !== undefined) payload.firstName = data.firstName;
  if (data.lastName !== undefined) payload.lastName = data.lastName;
  if (data.englishFirstName !== undefined) payload.englishFirstName = data.englishFirstName;
  if (data.englishLastName !== undefined) payload.englishLastName = data.englishLastName;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.dateOfBirth !== undefined) payload.dateOfBirth = data.dateOfBirth;
  if (data.phoneNumber !== undefined) payload.phoneNumber = data.phoneNumber;
  if (data.email !== undefined) payload.email = data.email;
  if (data.classId !== undefined) payload.classId = data.classId;

  // Auto-compute khmerName (full native name) for backward compat
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

  // Regional / custom fields (backend validator accepts all via passthrough)
  const regionalKeys: Array<keyof CreateStudentInput> = [
    'placeOfBirth', 'currentAddress', 'fatherName', 'motherName',
    'parentPhone', 'parentOccupation', 'previousGrade', 'previousSchool',
    'repeatingGrade', 'transferredFrom',
    'grade9ExamSession', 'grade9ExamCenter', 'grade9ExamRoom', 'grade9ExamDesk', 'grade9PassStatus',
    'grade12ExamSession', 'grade12ExamCenter', 'grade12ExamRoom', 'grade12ExamDesk', 'grade12PassStatus',
    'grade12Track', 'remarks',
  ];
  for (const key of regionalKeys) {
    if (data[key] !== undefined) payload[key] = data[key];
  }

  return payload;
}

export async function createStudent(data: CreateStudentInput): Promise<{ success: boolean; data: { student: Student } }> {
  const payload = buildStudentPayload(data);

  const response = await fetch(`${STUDENT_SERVICE_URL}/students`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create student' }));
    throw new Error(error.message || 'Failed to create student');
  }

  const result = await response.json();
  invalidateCache('students:');

  // Backend returns { success, data: student } (not nested)
  return {
    success: result.success,
    data: { student: result.data },
  };
}

export async function updateStudent(id: string, data: Partial<CreateStudentInput>): Promise<{ success: boolean; data: { student: Student } }> {
  const payload = buildStudentPayload(data);

  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update student' }));
    throw new Error(error.message || 'Failed to update student');
  }

  const result = await response.json();
  invalidateCache('students:');

  return {
    success: result.success,
    data: { student: result.data },
  };
}

export async function deleteStudent(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete student' }));
    throw new Error(error.message || 'Failed to delete student');
  }

  const result = await response.json();
  invalidateCache('students:');
  return result;
}

export async function uploadStudentPhoto(id: string, file: File): Promise<{ success: boolean; data: { photoUrl: string; student: Student } }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}/photo`, {
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

export async function toggleProfileLock(id: string, isProfileLocked: boolean): Promise<{ success: boolean; data: Student }> {
  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}/lock`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ isProfileLocked }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to toggle profile lock' }));
    throw new Error(error.message || 'Failed to toggle profile lock');
  }

  const result = await response.json();
  invalidateCache('students:');
  return result;
}
