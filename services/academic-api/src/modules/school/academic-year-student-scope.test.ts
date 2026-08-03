import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAcademicYearStudentScope } from './academic-year-student-scope';

test('academic-year student totals use authoritative enrollment records', () => {
  const where = buildAcademicYearStudentScope('school-1', 'year-2026');

  assert.deepEqual(where, {
    schoolId: 'school-1',
    recordStatus: 'ACTIVE',
    OR: [
      {
        studentClasses: {
          some: {
            status: { in: ['ACTIVE', 'INACTIVE'] },
            class: {
              schoolId: 'school-1',
              academicYearId: 'year-2026',
            },
          },
        },
      },
      {
        class: {
          schoolId: 'school-1',
          academicYearId: 'year-2026',
        },
      },
    ],
  });
  assert.equal('classId' in where, false);
  assert.equal('isAccountActive' in where, false);
});

test('academic-year student scope always carries both tenant and year boundaries', () => {
  const firstSchool = buildAcademicYearStudentScope('school-a', 'year-a');
  const secondSchool = buildAcademicYearStudentScope('school-b', 'year-b');

  assert.equal(firstSchool.schoolId, 'school-a');
  assert.equal(firstSchool.OR?.length, 2);
  assert.equal(secondSchool.schoolId, 'school-b');
  assert.notDeepEqual(firstSchool, secondSchool);
});
