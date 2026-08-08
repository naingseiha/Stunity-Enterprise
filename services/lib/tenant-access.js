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

/**
 * Access tokens issued before schoolId became a mandatory claim can remain
 * valid for the lifetime of the browser session. In that case, use the active
 * persisted user record as the authority instead of denying a legitimate
 * school member. A conflicting or inactive persisted actor is still denied.
 */
function canAccessTargetSchoolWithPersistedActor(tokenActor, persistedActor, targetSchoolId) {
  if (canAccessTargetSchool(tokenActor, targetSchoolId)) return true;
  if (!persistedActor?.isActive) return false;
  return canAccessTargetSchool(persistedActor, targetSchoolId);
}

module.exports = {
  canAccessTargetSchool,
  canManageTargetSchool,
  canAccessTargetSchoolWithPersistedActor,
};
