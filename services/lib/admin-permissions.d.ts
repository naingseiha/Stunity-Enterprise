export const PERMISSIONS: Readonly<Record<string, string>>;
export const ALL_PERMISSIONS: readonly string[];

export interface PermissionActor {
  role?: string | null;
  schoolId?: string | null;
  permissions?: unknown;
}

export interface PermissionDocument {
  rbacVersion: 1;
  grants: string[];
}

export function sanitizePermissionGrants(grants: unknown): string[];
export function isExplicitPermissionDocument(value: unknown): boolean;
export function defaultPermissionsForRole(role: string | null | undefined, legacyPermissions?: unknown): string[];
export function resolvePermissions(role: string | null | undefined, storedPermissions?: unknown): string[];
export function hasPermission(actor: PermissionActor | null | undefined, requiredPermission: string): boolean;
export function canManageSchoolResource(
  actor: PermissionActor | null | undefined,
  targetSchoolId: string | null | undefined,
  requiredPermission: string,
): boolean;
export function buildPermissionDocument(grants: unknown): PermissionDocument;
