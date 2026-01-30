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
  homeroomTeacher?: {
    id: string;
    firstNameLatin: string;
    lastNameLatin: string;
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
  homeroomTeacherId?: string;
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

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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
  // Backend returns: { success: true, data: [classes] }
  // Frontend expects: { data: { classes: [], pagination: {} } }
  return {
    data: {
      classes: result.data || [],
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
