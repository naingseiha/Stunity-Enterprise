// API client for student service

const STUDENT_SERVICE_URL = process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:3003';

export interface Student {
  id: string;
  studentId: string;
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameKhmer?: string | null;
  lastNameKhmer?: string | null;
  gender: string;
  dateOfBirth: string;
  placeOfBirth?: string | null;
  currentAddress?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  classId?: string | null;
  photoUrl?: string | null;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  class?: {
    id: string;
    name: string;
    grade: number;
  };
}

export interface CreateStudentInput {
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameKhmer?: string;
  lastNameKhmer?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  placeOfBirth?: string;
  currentAddress?: string;
  phoneNumber?: string;
  email?: string;
  classId?: string;
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
}): Promise<StudentsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.classId) queryParams.append('classId', params.classId);
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.search) queryParams.append('search', params.search);

  const response = await fetch(
    `${STUDENT_SERVICE_URL}/students/lightweight?${queryParams}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch students' }));
    throw new Error(error.message || 'Failed to fetch students');
  }

  const result = await response.json();
  
  // Transform API response to match frontend interface
  // Backend returns: { success: true, data: [students] }
  // Frontend expects: { success: true, data: { students: [], pagination: {} } }
  return {
    success: result.success,
    data: {
      students: result.data || [],
      pagination: {
        total: result.data?.length || 0,
        page: params?.page || 1,
        limit: params?.limit || 20,
        totalPages: 1,
      },
    },
  };
}

export async function getStudentById(id: string): Promise<{ success: boolean; data: { student: Student } }> {
  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch student' }));
    throw new Error(error.message || 'Failed to fetch student');
  }

  return response.json();
}

export async function createStudent(data: CreateStudentInput): Promise<{ success: boolean; data: { student: Student } }> {
  const response = await fetch(`${STUDENT_SERVICE_URL}/students`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create student' }));
    throw new Error(error.message || 'Failed to create student');
  }

  return response.json();
}

export async function updateStudent(id: string, data: Partial<CreateStudentInput>): Promise<{ success: boolean; data: { student: Student } }> {
  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update student' }));
    throw new Error(error.message || 'Failed to update student');
  }

  return response.json();
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

  return response.json();
}

export async function uploadStudentPhoto(id: string, file: File): Promise<{ success: boolean; data: { photoUrl: string; student: Student } }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`${STUDENT_SERVICE_URL}/students/${id}/photo`, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      // Don't set Content-Type - browser will set it with boundary for multipart
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload photo' }));
    throw new Error(error.message || 'Failed to upload photo');
  }

  return response.json();
}
