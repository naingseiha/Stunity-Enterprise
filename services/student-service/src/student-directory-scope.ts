import { Prisma, StudentRecordStatus } from '@prisma/client';

export type StunityAccountStatus = 'NOT_REGISTERED' | 'PENDING' | 'LINKED' | 'SUSPENDED';

export function buildStudentDirectoryBaseScope(schoolId: string): Prisma.StudentWhereInput {
  return { schoolId, recordStatus: StudentRecordStatus.ACTIVE };
}

export function buildAcademicYearAssignmentScope(classIds: string[]): Prisma.StudentWhereInput {
  return {
    OR: [
      {
        studentClasses: {
          some: {
            status: { in: ['ACTIVE', 'INACTIVE'] },
            classId: { in: classIds },
          },
        },
      },
      { classId: { in: classIds } },
    ],
  };
}

export function deriveStunityAccountStatus(input: {
  linkedUser?: { isActive: boolean } | null;
  hasPendingLink: boolean;
}): StunityAccountStatus {
  if (input.linkedUser) return input.linkedUser.isActive ? 'LINKED' : 'SUSPENDED';
  if (input.hasPendingLink) return 'PENDING';
  return 'NOT_REGISTERED';
}
