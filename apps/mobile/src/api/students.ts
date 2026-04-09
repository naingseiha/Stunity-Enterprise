import { studentApi } from './client';

export interface StudentRecord {
  id: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  englishFirstName?: string | null;
  englishLastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  classId?: string | null;
  photoUrl?: string | null;
  customFields?: Record<string, any> | null;
}

export interface StudentUpdatePayload {
  firstName?: string;
  lastName?: string;
  khmerName?: string;
  englishFirstName?: string;
  englishLastName?: string;
  gender?: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  phoneNumber?: string;
  email?: string;
  placeOfBirth?: string;
  currentAddress?: string;
  classId?: string;
}

interface StudentResponseEnvelope {
  success?: boolean;
  data?: StudentRecord;
  student?: StudentRecord;
}

const unwrapStudent = (payload: StudentResponseEnvelope | StudentRecord): StudentRecord => {
  if ((payload as StudentResponseEnvelope).data) {
    return (payload as StudentResponseEnvelope).data as StudentRecord;
  }
  if ((payload as StudentResponseEnvelope).student) {
    return (payload as StudentResponseEnvelope).student as StudentRecord;
  }
  return payload as StudentRecord;
};

export const getStudentById = async (studentId: string): Promise<StudentRecord> => {
  const response = await studentApi.get<StudentResponseEnvelope>(`/students/${studentId}`);
  return unwrapStudent(response.data || {});
};

export const updateStudent = async (
  studentId: string,
  payload: StudentUpdatePayload
): Promise<StudentRecord> => {
  const response = await studentApi.put<StudentResponseEnvelope>(`/students/${studentId}`, payload);
  return unwrapStudent(response.data || {});
};
