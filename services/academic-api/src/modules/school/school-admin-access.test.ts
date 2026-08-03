import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canManageSchoolAdministration,
  canManageSchoolClaimCodes,
  isReadOnlyHttpMethod,
} from './school-admin-access';

test('school administration mutations accept only administrative roles', () => {
  for (const role of ['ADMIN', 'STAFF', 'SCHOOL_ADMIN', 'SUPER_ADMIN']) {
    assert.equal(canManageSchoolAdministration(role), true, role);
  }
  for (const role of ['STUDENT', 'TEACHER', 'PARENT', 'ALUMNI', '', undefined]) {
    assert.equal(canManageSchoolAdministration(role), false, String(role));
  }
});

test('read-only academic-year requests remain available to school members', () => {
  assert.equal(isReadOnlyHttpMethod('GET'), true);
  assert.equal(isReadOnlyHttpMethod('head'), true);
  assert.equal(isReadOnlyHttpMethod('OPTIONS'), true);
  assert.equal(isReadOnlyHttpMethod('POST'), false);
  assert.equal(isReadOnlyHttpMethod('PUT'), false);
  assert.equal(isReadOnlyHttpMethod('PATCH'), false);
  assert.equal(isReadOnlyHttpMethod('DELETE'), false);
});

test('claim-code credentials are restricted to explicit administrators', () => {
  for (const role of ['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']) {
    assert.equal(canManageSchoolClaimCodes(role), true, role);
  }
  for (const role of ['STAFF', 'STUDENT', 'TEACHER', 'PARENT', '', undefined]) {
    assert.equal(canManageSchoolClaimCodes(role), false, String(role));
  }
});
