import { Prisma, StudentRecordStatus } from '@prisma/client';

export type StunityAccountStatus = 'NOT_REGISTERED' | 'PENDING' | 'LINKED' | 'SUSPENDED';

export interface StudentDirectorySummary {
  total: number;
  assigned: number;
  unassigned: number;
  outsideAcademicYear: number;
  schoolTotal: number;
}

export function buildStudentDirectoryBaseScope(schoolId: string): Prisma.StudentWhereInput {
  return {
    schoolId,
    recordStatus: StudentRecordStatus.ACTIVE,
  };
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
      // Temporary V1 migration fallback. Remove after every current student
      // has an effective-dated StudentClass record.
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

export function buildStudentDirectorySummary(input: {
  academicYearScoped: boolean;
  assignedCount: number;
  outsideScopeCount: number;
}): StudentDirectorySummary {
  const schoolTotal = input.assignedCount + input.outsideScopeCount;

  if (input.academicYearScoped) {
    return {
      total: input.assignedCount,
      assigned: input.assignedCount,
      unassigned: 0,
      outsideAcademicYear: input.outsideScopeCount,
      schoolTotal,
    };
  }

  return {
    total: schoolTotal,
    assigned: input.assignedCount,
    unassigned: input.outsideScopeCount,
    outsideAcademicYear: 0,
    schoolTotal,
  };
}
