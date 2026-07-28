/** Roles that may view the whole-school Reports Dashboard (matches academic-api's /reports/dashboard). */
export const SCHOOL_WIDE_REPORTS_ROLES = ['ADMIN', 'STAFF', 'SUPER_ADMIN', 'SCHOOL_ADMIN'] as const;

export type SchoolWideReportsRole = (typeof SCHOOL_WIDE_REPORTS_ROLES)[number];

export function isSchoolWideReportsRole(role: string | undefined | null): role is SchoolWideReportsRole {
  if (!role) return false;
  return (SCHOOL_WIDE_REPORTS_ROLES as readonly string[]).includes(role);
}

/** TEACHER also has access to the Reports Dashboard, scoped server-side to their own classes. */
export function canViewReportsDashboard(role: string | undefined | null): boolean {
  return isSchoolWideReportsRole(role) || role === 'TEACHER';
}
