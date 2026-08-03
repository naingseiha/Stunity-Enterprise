'use strict';

const PERMISSIONS = Object.freeze({
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  MANAGE_STUDENTS: 'MANAGE_STUDENTS',
  MANAGE_TEACHERS: 'MANAGE_TEACHERS',
  MANAGE_CLASSES: 'MANAGE_CLASSES',
  MANAGE_SUBJECTS: 'MANAGE_SUBJECTS',
  MANAGE_GRADES: 'MANAGE_GRADES',
  MANAGE_ATTENDANCE: 'MANAGE_ATTENDANCE',
  VIEW_REPORTS: 'VIEW_REPORTS',
  VIEW_AWARD_REPORT: 'VIEW_AWARD_REPORT',
  VIEW_TRACKING_BOOK: 'VIEW_TRACKING_BOOK',
  VIEW_SETTINGS: 'VIEW_SETTINGS',
  MANAGE_ADMINS: 'MANAGE_ADMINS',
  MANAGE_SCHOOL_SETTINGS: 'MANAGE_SCHOOL_SETTINGS',
  MANAGE_ACADEMIC_YEARS: 'MANAGE_ACADEMIC_YEARS',
  MANAGE_CLAIM_CODES: 'MANAGE_CLAIM_CODES',
  APPROVE_SCHOOL_LINKS: 'APPROVE_SCHOOL_LINKS',
  RESET_USER_PASSWORDS: 'RESET_USER_PASSWORDS',
  EXPORT_STUDENT_DATA: 'EXPORT_STUDENT_DATA',
});

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));
const KNOWN_PERMISSIONS = new Set(ALL_PERMISSIONS);

const SCHOOL_ADMIN_DEFAULTS = ALL_PERMISSIONS;
const STAFF_DEFAULTS = Object.freeze([
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.MANAGE_STUDENTS,
  PERMISSIONS.MANAGE_TEACHERS,
  PERMISSIONS.MANAGE_CLASSES,
  PERMISSIONS.MANAGE_SUBJECTS,
  PERMISSIONS.MANAGE_GRADES,
  PERMISSIONS.MANAGE_ATTENDANCE,
  PERMISSIONS.VIEW_REPORTS,
  PERMISSIONS.VIEW_AWARD_REPORT,
  PERMISSIONS.VIEW_TRACKING_BOOK,
  PERMISSIONS.VIEW_SETTINGS,
  PERMISSIONS.MANAGE_SCHOOL_SETTINGS,
  PERMISSIONS.MANAGE_ACADEMIC_YEARS,
  PERMISSIONS.EXPORT_STUDENT_DATA,
]);

function sanitizePermissionGrants(grants) {
  if (!Array.isArray(grants)) return [];
  return [...new Set(grants.filter((permission) => typeof permission === 'string' && KNOWN_PERMISSIONS.has(permission)))];
}

function isExplicitPermissionDocument(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && value.rbacVersion === 1);
}

function defaultPermissionsForRole(role, legacyPermissions) {
  if (role === 'SUPER_ADMIN') return [...ALL_PERMISSIONS];
  if (role === 'ADMIN' || role === 'SCHOOL_ADMIN') return [...SCHOOL_ADMIN_DEFAULTS];
  if (role === 'STAFF') return [...STAFF_DEFAULTS];

  const legacy = legacyPermissions && typeof legacyPermissions === 'object' && !Array.isArray(legacyPermissions)
    ? legacyPermissions
    : {};
  const grants = [];
  if (legacy.canEnterGrades === true) grants.push(PERMISSIONS.MANAGE_GRADES);
  if (legacy.canViewReports === true) grants.push(PERMISSIONS.VIEW_REPORTS);
  if (legacy.canMarkAttendance === true) grants.push(PERMISSIONS.MANAGE_ATTENDANCE);
  return grants;
}

function resolvePermissions(role, storedPermissions) {
  if (role === 'SUPER_ADMIN') return [...ALL_PERMISSIONS];
  if (isExplicitPermissionDocument(storedPermissions)) {
    return sanitizePermissionGrants(storedPermissions.grants);
  }
  return defaultPermissionsForRole(role, storedPermissions);
}

function hasPermission(actor, requiredPermission) {
  if (!actor || !KNOWN_PERMISSIONS.has(requiredPermission)) return false;
  return resolvePermissions(actor.role, actor.permissions).includes(requiredPermission);
}

function canManageSchoolResource(actor, targetSchoolId, requiredPermission) {
  if (!actor || !targetSchoolId || !hasPermission(actor, requiredPermission)) return false;
  if (actor.role === 'SUPER_ADMIN') return true;
  return Boolean(actor.schoolId && actor.schoolId === targetSchoolId);
}

function buildPermissionDocument(grants) {
  return {
    rbacVersion: 1,
    grants: sanitizePermissionGrants(grants),
  };
}

module.exports = {
  ALL_PERMISSIONS,
  PERMISSIONS,
  buildPermissionDocument,
  canManageSchoolResource,
  defaultPermissionsForRole,
  hasPermission,
  isExplicitPermissionDocument,
  resolvePermissions,
  sanitizePermissionGrants,
};
