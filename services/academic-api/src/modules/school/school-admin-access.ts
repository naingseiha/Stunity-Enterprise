const SCHOOL_ADMIN_ROLES = new Set(['ADMIN', 'STAFF', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);
const CLAIM_CODE_ADMIN_ROLES = new Set(['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);

export function canManageSchoolAdministration(role: string | null | undefined): boolean {
  return Boolean(role && SCHOOL_ADMIN_ROLES.has(role));
}

export function isReadOnlyHttpMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

/**
 * Claim codes are authentication credentials, not ordinary school data.
 * Until granular permissions are enforced, only explicit administrators may
 * view, export, generate, revoke or email them. STAFF is intentionally denied.
 */
export function canManageSchoolClaimCodes(role: string | null | undefined): boolean {
  return Boolean(role && CLAIM_CODE_ADMIN_ROLES.has(role));
}
