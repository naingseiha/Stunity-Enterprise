'use strict';

function canAccessTargetSchool(actor, targetSchoolId) {
  if (!actor || !targetSchoolId) return false;
  if (actor.role === 'SUPER_ADMIN') return true;
  return Boolean(actor.schoolId && actor.schoolId === targetSchoolId);
}

function canManageTargetSchool(actor, targetSchoolId, allowedRoles) {
  if (!actor?.role || !targetSchoolId || !allowedRoles.has(actor.role)) return false;
  return canAccessTargetSchool(actor, targetSchoolId);
}

module.exports = { canAccessTargetSchool, canManageTargetSchool };
