import assert from 'node:assert/strict';
import test from 'node:test';

import permissionPolicy from './admin-permissions.js';

const {
  ALL_PERMISSIONS,
  PERMISSIONS,
  buildPermissionDocument,
  canManageSchoolResource,
  hasPermission,
  resolvePermissions,
} = permissionPolicy;

test('legacy administrators retain their previous role-based access', () => {
  assert.equal(hasPermission({ role: 'ADMIN' }, PERMISSIONS.MANAGE_CLAIM_CODES), true);
  assert.equal(hasPermission({ role: 'SCHOOL_ADMIN' }, PERMISSIONS.MANAGE_ACADEMIC_YEARS), true);
  assert.equal(hasPermission({ role: 'STAFF' }, PERMISSIONS.MANAGE_ACADEMIC_YEARS), true);
  assert.equal(hasPermission({ role: 'STAFF' }, PERMISSIONS.MANAGE_CLAIM_CODES), false);
});

test('an explicit versioned grant set restricts an administrator', () => {
  const actor = {
    role: 'ADMIN',
    permissions: buildPermissionDocument([PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_REPORTS]),
  };
  assert.equal(hasPermission(actor, PERMISSIONS.VIEW_REPORTS), true);
  assert.equal(hasPermission(actor, PERMISSIONS.MANAGE_CLAIM_CODES), false);
  assert.equal(hasPermission(actor, PERMISSIONS.APPROVE_SCHOOL_LINKS), false);
  assert.equal(hasPermission(actor, PERMISSIONS.RESET_USER_PASSWORDS), false);
});

test('malformed explicit permission documents deny closed', () => {
  assert.deepEqual(resolvePermissions('ADMIN', { rbacVersion: 1, grants: 'ALL' }), []);
  assert.deepEqual(resolvePermissions('ADMIN', { rbacVersion: 1 }), []);
});

test('unknown grants are discarded and duplicate grants are normalized', () => {
  assert.deepEqual(
    buildPermissionDocument([PERMISSIONS.VIEW_REPORTS, 'UNKNOWN', PERMISSIONS.VIEW_REPORTS]),
    { rbacVersion: 1, grants: [PERMISSIONS.VIEW_REPORTS] },
  );
});

test('super admin remains explicit and tenant-aware school permissions deny cross-school access', () => {
  assert.equal(resolvePermissions('SUPER_ADMIN', { rbacVersion: 1, grants: [] }).length, ALL_PERMISSIONS.length);
  assert.equal(
    canManageSchoolResource(
      { role: 'ADMIN', schoolId: 'school-a', permissions: buildPermissionDocument([PERMISSIONS.MANAGE_CLAIM_CODES]) },
      'school-b',
      PERMISSIONS.MANAGE_CLAIM_CODES,
    ),
    false,
  );
  assert.equal(
    canManageSchoolResource({ role: 'SUPER_ADMIN', schoolId: null }, 'school-b', PERMISSIONS.MANAGE_CLAIM_CODES),
    true,
  );
});
