import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAcademicYearAssignmentScope,
  buildStudentDirectorySummary,
  buildStudentDirectoryBaseScope,
  deriveStunityAccountStatus,
} from './student-directory-scope';

test('student directory lifecycle does not use the imported account flag', () => {
  const where = buildStudentDirectoryBaseScope('school-1');
  assert.deepEqual(where, { schoolId: 'school-1', recordStatus: 'ACTIVE' });
  assert.equal('isAccountActive' in where, false);
});

test('academic-year assignment includes effective enrollment and migration fallback', () => {
  const where = buildAcademicYearAssignmentScope(['class-a', 'class-b']);
  assert.equal(where.OR?.length, 2);
  assert.deepEqual(where.OR?.[1], { classId: { in: ['class-a', 'class-b'] } });
});

test('official account status is derived only from user/link state', () => {
  assert.equal(deriveStunityAccountStatus({ linkedUser: null, hasPendingLink: false }), 'NOT_REGISTERED');
  assert.equal(deriveStunityAccountStatus({ linkedUser: null, hasPendingLink: true }), 'PENDING');
  assert.equal(deriveStunityAccountStatus({ linkedUser: { isActive: true }, hasPendingLink: false }), 'LINKED');
  assert.equal(deriveStunityAccountStatus({ linkedUser: { isActive: false }, hasPendingLink: false }), 'SUSPENDED');
});

test('academic-year summary keeps school-level records outside the census', () => {
  assert.deepEqual(
    buildStudentDirectorySummary({
      academicYearScoped: true,
      assignedCount: 1726,
      outsideScopeCount: 1,
    }),
    {
      total: 1726,
      assigned: 1726,
      unassigned: 0,
      outsideAcademicYear: 1,
      schoolTotal: 1727,
    },
  );
});

test('school-wide summary reports records without a class as unassigned', () => {
  assert.deepEqual(
    buildStudentDirectorySummary({
      academicYearScoped: false,
      assignedCount: 1726,
      outsideScopeCount: 1,
    }),
    {
      total: 1727,
      assigned: 1726,
      unassigned: 1,
      outsideAcademicYear: 0,
      schoolTotal: 1727,
    },
  );
});
