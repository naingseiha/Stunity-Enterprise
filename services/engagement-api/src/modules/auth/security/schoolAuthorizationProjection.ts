export type LegacySchoolProjection = {
  schoolId: string | null;
  studentId: string | null;
  teacherId: string | null;
  role: string;
};

export type MembershipProjection = {
  schoolId: string;
  studentId: string | null;
  teacherId: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "UNLINKED";
} | null;

export type SchoolProjectionComparisonCode =
  | "MATCH"
  | "MATCH_UNLINKED"
  | "MATCH_INACTIVE"
  | "MISSING_MEMBERSHIP"
  | "MISSING_LEGACY_PROJECTION"
  | "STALE_LEGACY_LINK"
  | "SCHOOL_MISMATCH"
  | "ROLE_MISMATCH"
  | "ROSTER_MISMATCH";

export type SchoolAuthorizationProjection = {
  legacyAllowed: boolean;
  membershipAllowed: boolean;
  comparisonCode: SchoolProjectionComparisonCode;
  migrationSafe: boolean;
};

function sameNullable(left: string | null, right: string | null): boolean {
  return left === right;
}

export function compareSchoolAuthorizationProjection(
  legacy: LegacySchoolProjection,
  membership: MembershipProjection,
): SchoolAuthorizationProjection {
  const legacyAllowed = !!legacy.schoolId;
  const membershipAllowed = membership?.status === "ACTIVE";

  if (!legacyAllowed && !membership) {
    return { legacyAllowed, membershipAllowed: false, comparisonCode: "MATCH_UNLINKED", migrationSafe: true };
  }
  if (!legacyAllowed && membership && membership.status !== "ACTIVE") {
    return { legacyAllowed, membershipAllowed: false, comparisonCode: "MATCH_INACTIVE", migrationSafe: true };
  }
  if (legacyAllowed && !membership) {
    return { legacyAllowed, membershipAllowed: false, comparisonCode: "MISSING_MEMBERSHIP", migrationSafe: false };
  }
  if (!membershipAllowed && legacyAllowed) {
    return { legacyAllowed, membershipAllowed: false, comparisonCode: "STALE_LEGACY_LINK", migrationSafe: false };
  }
  if (membershipAllowed && !legacyAllowed) {
    return { legacyAllowed, membershipAllowed, comparisonCode: "MISSING_LEGACY_PROJECTION", migrationSafe: false };
  }
  if (!membership) {
    return { legacyAllowed, membershipAllowed: false, comparisonCode: "MATCH_UNLINKED", migrationSafe: true };
  }
  if (legacy.schoolId !== membership.schoolId) {
    return { legacyAllowed, membershipAllowed, comparisonCode: "SCHOOL_MISMATCH", migrationSafe: false };
  }
  if (legacy.role !== membership.role) {
    return { legacyAllowed, membershipAllowed, comparisonCode: "ROLE_MISMATCH", migrationSafe: false };
  }
  if (!sameNullable(legacy.studentId, membership.studentId) || !sameNullable(legacy.teacherId, membership.teacherId)) {
    return { legacyAllowed, membershipAllowed, comparisonCode: "ROSTER_MISMATCH", migrationSafe: false };
  }
  return { legacyAllowed, membershipAllowed, comparisonCode: "MATCH", migrationSafe: true };
}
