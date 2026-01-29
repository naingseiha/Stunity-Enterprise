// API client for teacher service

const TEACHER_SERVICE_URL = process.env.NEXT_PUBLIC_TEACHER_SERVICE_URL || 'http://localhost:3004';

export interface Teacher {
  id: string;
  teacherId: string;
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameKhmer?: string | null;
  lastNameKhmer?: string | null;
  gender: string;
  dateOfBirth: string;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate: string;
  position?: string | null;
  department?: string | null;
  salary?: number | null;
  photoUrl?: string | null;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subjects?: Array<{
    id: string;
    name: string;
  }>;
  classes?: Array<{
    id: string;
    name: string;
    grade: number;
  }>;
}

export interface CreateTeacherInput {
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameKhmer?: string;
  lastNameKhmer?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  hireDate: string;
  position?: string;
  department?: string;
  salary?: number;
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
}): Promise<TeachersResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.gender) queryParams.append('gender', params.gender);
  if (params?.search) queryParams.append('search', params.search);

  const response = await fetch(
    `${TEACHER_SERVICE_URL}/teachers/lightweight?${queryParams}`,
    {
      headers: await getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch teachers' }));
    throw new Error(error.message || 'Failed to fetch teachers');
  }

  const result = await response.json();
  
  // Transform backend field names to frontend expectations
  const transformedTeachers = (result.data || []).map((teacher: any) => ({
    ...teacher,
    teacherId: teacher.employeeId || teacher.id,
    firstNameLatin: teacher.firstName || teacher.englishName || '',
    lastNameLatin: teacher.lastName || '',
    firstNameKhmer: teacher.khmerName || null,
    lastNameKhmer: null,
    phoneNumber: teacher.phone || null,
  }));
  
  // Transform API response to match frontend interface
  // Backend returns: { success: true, data: [teachers], pagination: {...} }
  // Frontend expects: { success: true, data: { teachers: [], pagination: {} } }
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

export async function getTeacherById(id: string): Promise<{ success: boolean; data: { teacher: Teacher } }> {
  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers/${id}`, {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch teacher' }));
    throw new Error(error.message || 'Failed to fetch teacher');
  }

  return response.json();
}

export async function createTeacher(data: CreateTeacherInput): Promise<{ success: boolean; data: { teacher: Teacher } }> {
  // Transform frontend field names to backend expectations
  const backendData = {
    firstName: data.firstNameLatin,
    lastName: data.lastNameLatin,
    khmerName: data.firstNameKhmer || '',
    englishName: data.firstNameLatin + ' ' + data.lastNameLatin,
    email: data.email || '',
    phone: data.phoneNumber || '',
    gender: data.gender,
    dateOfBirth: data.dateOfBirth,
    address: data.address || '',
    hireDate: data.hireDate,
    position: data.position || '',
    department: data.department || '',
    salary: data.salary || null,
  };

  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(backendData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create teacher' }));
    throw new Error(error.message || 'Failed to create teacher');
  }

  return response.json();
}

export async function updateTeacher(id: string, data: Partial<CreateTeacherInput>): Promise<{ success: boolean; data: { teacher: Teacher } }> {
  const response = await fetch(`${TEACHER_SERVICE_URL}/teachers/${id}`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update teacher' }));
    throw new Error(error.message || 'Failed to update teacher');
  }

  return response.json();
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
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to upload photo' }));
    throw new Error(error.message || 'Failed to upload photo');
  }

  return response.json();
}
