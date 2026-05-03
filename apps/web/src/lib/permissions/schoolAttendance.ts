/** Roles that may view school-wide attendance dashboards and export audit CSVs (matches attendance-service). */
export const SCHOOL_ATTENDANCE_ADMIN_ROLES = ['ADMIN', 'STAFF', 'SUPER_ADMIN'] as const;

export type SchoolAttendanceAdminRole = (typeof SCHOOL_ATTENDANCE_ADMIN_ROLES)[number];

export function isSchoolAttendanceAdminRole(role: string | undefined | null): role is SchoolAttendanceAdminRole {
  if (!role) return false;
  return (SCHOOL_ATTENDANCE_ADMIN_ROLES as readonly string[]).includes(role);
}
