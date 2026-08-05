/**
 * Shared access-token claim shape for school-linked identities.
 * Messaging and other school APIs expect teacherId/parentId/studentId on the JWT
 * so they do not need a DB hydration round-trip for every request.
 */

export type AccessTokenUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  schoolId?: string | null;
  schoolAccessVersion?: number | null;
  teacherId?: string | null;
  parentId?: string | null;
  studentId?: string | null;
  accountType?: string | null;
};

export type AccessTokenExtras = {
  school?: unknown;
  schoolAccessScope?: string;
  isSuperAdmin?: boolean;
  children?: string[];
  accountType?: string | null;
};

export function buildAccessTokenClaims(
  user: AccessTokenUser,
  extras: AccessTokenExtras = {},
) {
  const claims: Record<string, unknown> = {
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId ?? null,
    schoolAccessVersion: user.schoolAccessVersion ?? 0,
    teacherId: user.teacherId ?? null,
    parentId: user.parentId ?? null,
    studentId: user.studentId ?? null,
  };

  if (user.email !== undefined) {
    claims.email = user.email;
  }
  if (user.phone !== undefined && user.phone !== null) {
    claims.phone = user.phone;
  }

  const accountType = extras.accountType ?? user.accountType;
  if (accountType !== undefined && accountType !== null) {
    claims.accountType = accountType;
  }
  if (extras.isSuperAdmin !== undefined) {
    claims.isSuperAdmin = extras.isSuperAdmin;
  }
  if (extras.schoolAccessScope !== undefined) {
    claims.schoolAccessScope = extras.schoolAccessScope;
  }
  if (extras.school !== undefined) {
    claims.school = extras.school;
  }
  if (extras.children) {
    claims.children = extras.children;
  }

  return claims;
}
