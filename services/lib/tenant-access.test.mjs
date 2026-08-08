import assert from 'node:assert/strict';
import test from 'node:test';

import tenantAccess from './tenant-access.js';

const {
  canAccessTargetSchool,
  canManageTargetSchool,
  canAccessTargetSchoolWithPersistedActor,
} = tenantAccess;
const ADMIN_ROLES = new Set(['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);

test('school A credentials cannot access school B', () => {
  assert.equal(canAccessTargetSchool({ role: 'ADMIN', schoolId: 'school-a' }, 'school-b'), false);
  assert.equal(canAccessTargetSchool({ role: 'STUDENT', schoolId: 'school-a' }, 'school-b'), false);
});

test('same-school and explicit super-admin cross-school access are allowed', () => {
  assert.equal(canAccessTargetSchool({ role: 'STUDENT', schoolId: 'school-a' }, 'school-a'), true);
  assert.equal(canAccessTargetSchool({ role: 'SUPER_ADMIN', schoolId: null }, 'school-b'), true);
});

test('school management requires both an allowed role and tenant access', () => {
  assert.equal(canManageTargetSchool({ role: 'ADMIN', schoolId: 'school-a' }, 'school-a', ADMIN_ROLES), true);
  assert.equal(canManageTargetSchool({ role: 'ADMIN', schoolId: 'school-a' }, 'school-b', ADMIN_ROLES), false);
  assert.equal(canManageTargetSchool({ role: 'STAFF', schoolId: 'school-a' }, 'school-a', ADMIN_ROLES), false);
  assert.equal(canManageTargetSchool({ role: 'SUPER_ADMIN', schoolId: null }, 'school-b', ADMIN_ROLES), true);
});

test('missing actor or target context is denied closed', () => {
  assert.equal(canAccessTargetSchool(null, 'school-a'), false);
  assert.equal(canAccessTargetSchool({ role: 'ADMIN', schoolId: 'school-a' }, ''), false);
  assert.equal(canManageTargetSchool(undefined, 'school-a', ADMIN_ROLES), false);
});

test('legacy token without schoolId can use an active persisted school membership', () => {
  assert.equal(
    canAccessTargetSchoolWithPersistedActor(
      { role: 'ADMIN', schoolId: null },
      { role: 'ADMIN', schoolId: 'school-a', isActive: true },
      'school-a',
    ),
    true,
  );
});

test('persisted membership fallback rejects inactive or cross-school actors', () => {
  assert.equal(
    canAccessTargetSchoolWithPersistedActor(
      { role: 'ADMIN', schoolId: null },
      { role: 'ADMIN', schoolId: 'school-a', isActive: false },
      'school-a',
    ),
    false,
  );
  assert.equal(
    canAccessTargetSchoolWithPersistedActor(
      { role: 'ADMIN', schoolId: null },
      { role: 'ADMIN', schoolId: 'school-b', isActive: true },
      'school-a',
    ),
    false,
  );
});
