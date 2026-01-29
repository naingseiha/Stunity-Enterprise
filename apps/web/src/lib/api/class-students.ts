// API client for class-student assignment operations

const CLASS_SERVICE_URL = process.env.NEXT_PUBLIC_CLASS_SERVICE_URL || 'http://localhost:3005';

export interface StudentInClass {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  nameKh?: string;
  gender: string;
  dateOfBirth: string;
  photoUrl?: string;
  status: string;
  enrolledAt: string;
  studentClassId: string;
}

export interface AssignStudentRequest {
  studentId: string;
  academicYearId?: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

// Get all students in a specific class
export async function getClassStudents(classId: string): Promise<StudentInClass[]> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${classId}/students`, {
    method: 'GET',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch class students' }));
    throw new Error(error.message || 'Failed to fetch class students');
  }

  const result = await response.json();
  return result.data || [];
}

// Assign a student to a class
export async function assignStudentToClass(
  classId: string,
  data: AssignStudentRequest
): Promise<void> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${classId}/students`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to assign student' }));
    throw new Error(error.message || 'Failed to assign student');
  }

  return response.json();
}

// Remove a student from a class
export async function removeStudentFromClass(
  classId: string,
  studentId: string
): Promise<void> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove student' }));
    throw new Error(error.message || 'Failed to remove student');
  }

  return response.json();
}
