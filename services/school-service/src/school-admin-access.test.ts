import assert from 'node:assert/strict';
import test from 'node:test';

import { canManageSchoolClaimCodes } from './school-admin-access';

test('legacy claim-code routes accept only explicit administrators', () => {
  for (const role of ['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']) {
    assert.equal(canManageSchoolClaimCodes(role), true, role);
  }
  for (const role of ['STAFF', 'STUDENT', 'TEACHER', 'PARENT', '', undefined]) {
    assert.equal(canManageSchoolClaimCodes(role), false, String(role));
  }
});
