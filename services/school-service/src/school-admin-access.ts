const CLAIM_CODE_ADMIN_ROLES = new Set(['ADMIN', 'SCHOOL_ADMIN', 'SUPER_ADMIN']);

/**
 * Claim codes grant access to school identities, so ordinary members and
 * general STAFF must not be able to read, export, generate or revoke them.
 */
export function canManageSchoolClaimCodes(role: string | null | undefined): boolean {
  return Boolean(role && CLAIM_CODE_ADMIN_ROLES.has(role));
}
