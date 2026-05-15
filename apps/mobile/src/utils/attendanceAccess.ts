import type { User } from '@/types';

const TEACHER_ATTENDANCE_ROLES = new Set<User['role']>([
  'TEACHER',
  'ADMIN',
  'STAFF',
  'SCHOOL_ADMIN',
  'SUPER_ADMIN',
]);

type AttendanceUser = Pick<User, 'id' | 'role' | 'schoolId' | 'teacherId' | 'teacher'>;

export const getLinkedTeacherRecordId = (user?: Partial<AttendanceUser> | null): string | null =>
  user?.teacherId || user?.teacher?.id || null;

export const canUseTeacherAttendance = (user?: Partial<AttendanceUser> | null): boolean => {
  if (!user?.id || !user.schoolId) return false;
  if (getLinkedTeacherRecordId(user)) return true;
  return Boolean(user.role && TEACHER_ATTENDANCE_ROLES.has(user.role));
};

export const getTeacherAttendanceLookupId = (user?: Partial<AttendanceUser> | null): string | null => {
  const teacherRecordId = getLinkedTeacherRecordId(user);
  if (teacherRecordId) return teacherRecordId;
  return canUseTeacherAttendance(user) ? user?.id || null : null;
};
