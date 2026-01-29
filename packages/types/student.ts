export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
  classId: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  profileImage?: string;
}