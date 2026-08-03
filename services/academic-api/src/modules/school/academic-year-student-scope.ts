import { Prisma, StudentRecordStatus } from '@prisma/client';

/**
 * StudentClass is the authoritative enrollment record for an academic year.
 * During the migration period, Student.class is a census fallback for records
 * that have not received a StudentClass row yet. Account activation is not a
 * census criterion: temporarily suspended accounts are still real students.
 */
export function buildAcademicYearStudentScope(
  schoolId: string,
  academicYearId: string
): Prisma.StudentWhereInput {
  return {
    schoolId,
    recordStatus: StudentRecordStatus.ACTIVE,
    OR: [
      {
        studentClasses: {
          some: {
            status: { in: ['ACTIVE', 'INACTIVE'] },
            class: {
              schoolId,
              academicYearId,
            },
          },
        },
      },
      {
        class: {
          schoolId,
          academicYearId,
        },
      },
    ],
  };
}
