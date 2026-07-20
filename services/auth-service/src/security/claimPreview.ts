import { maskRosterName } from "./identifiers";

type ClaimPreviewInput = {
  type: string;
  expiresAt: Date | string;
  verificationData?: unknown;
  school: { id: string; name: string };
  student?: {
    firstName: string;
    lastName: string;
    studentClasses?: Array<{
      class?: { name?: string | null; grade?: string | null } | null;
    }>;
  } | null;
  teacher?: { firstName: string; lastName: string } | null;
};

export function buildMaskedClaimPreview(claim: ClaimPreviewInput) {
  const activeClass = claim.student?.studentClasses?.[0]?.class;
  return {
    type: claim.type,
    school: { name: claim.school.name },
    student: claim.student
      ? {
          maskedName: maskRosterName(
            claim.student.firstName,
            claim.student.lastName,
          ),
          className: activeClass?.name || null,
          gradeLevel: activeClass?.grade || null,
        }
      : null,
    teacher: claim.teacher
      ? {
          maskedName: maskRosterName(
            claim.teacher.firstName,
            claim.teacher.lastName,
          ),
        }
      : null,
    expiresAt: claim.expiresAt,
    requiresVerification: !!claim.verificationData,
  };
}
