import { teacherApi } from './client';

export interface TeacherRecord {
  id: string;
  teacherId?: string;
  firstName: string;
  lastName: string;
  englishFirstName?: string | null;
  englishLastName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate?: string | null;
  customFields?: Record<string, any> | null;
}

export interface TeacherUpdatePayload {
  firstName?: string;
  lastName?: string;
  khmerName?: string;
  englishFirstName?: string;
  englishLastName?: string;
  gender?: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  hireDate?: string;
  position?: string;
  degree?: string;
}

interface TeacherResponseEnvelope {
  success?: boolean;
  data?: TeacherRecord;
  teacher?: TeacherRecord;
}

const unwrapTeacher = (payload: TeacherResponseEnvelope | TeacherRecord): TeacherRecord => {
  if ((payload as TeacherResponseEnvelope).data) {
    return (payload as TeacherResponseEnvelope).data as TeacherRecord;
  }
  if ((payload as TeacherResponseEnvelope).teacher) {
    return (payload as TeacherResponseEnvelope).teacher as TeacherRecord;
  }
  return payload as TeacherRecord;
};

export const getTeacherById = async (teacherId: string): Promise<TeacherRecord> => {
  const response = await teacherApi.get<TeacherResponseEnvelope>(`/teachers/${teacherId}`);
  return unwrapTeacher(response.data || {});
};

export const updateTeacher = async (
  teacherId: string,
  payload: TeacherUpdatePayload
): Promise<TeacherRecord> => {
  const response = await teacherApi.put<TeacherResponseEnvelope>(`/teachers/${teacherId}`, payload);
  return unwrapTeacher(response.data || {});
};
