export type TenantActor = {
  role?: string | null;
  schoolId?: string | null;
} | null | undefined;

export function canAccessTargetSchool(
  actor: TenantActor,
  targetSchoolId: string | null | undefined,
): boolean;

export function canManageTargetSchool(
  actor: TenantActor,
  targetSchoolId: string | null | undefined,
  allowedRoles: ReadonlySet<string>,
): boolean;
