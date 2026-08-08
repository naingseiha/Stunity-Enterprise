export type AuthSessionManagementStore = {
  authSession: {
    findMany(args: Record<string, unknown>): Promise<Array<{
      id: string;
      deviceId: string | null;
      deviceName: string | null;
      userAgent: string | null;
      createdAt: Date;
      lastUsedAt: Date;
      expiresAt: Date;
    }>>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
};

export class AuthSessionManagementError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 404,
    public readonly code = "AUTH_SESSION_NOT_FOUND",
  ) {
    super(message);
  }
}

export async function listActiveAuthSessions(
  db: AuthSessionManagementStore,
  userId: string,
  now = new Date(),
) {
  return db.authSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
    orderBy: { lastUsedAt: "desc" },
  });
}

export async function revokeOwnedAuthSession(
  db: AuthSessionManagementStore,
  userId: string,
  sessionId: string,
  now = new Date(),
) {
  const changed = await db.authSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: now, revokeReason: "REMOTE_SIGN_OUT", lastUsedAt: now },
  });
  if (changed.count !== 1) {
    throw new AuthSessionManagementError("Session not found or already revoked");
  }
  return { sessionId, revoked: true as const };
}

/**
 * Revoke every active session for the user except those bound to keepDeviceId.
 * keepDeviceId is required so a misconfigured client cannot wipe its own
 * session family by accident.
 */
export async function revokeOtherOwnedAuthSessions(
  db: AuthSessionManagementStore,
  userId: string,
  keepDeviceId: string,
  now = new Date(),
) {
  const trimmed = keepDeviceId.trim();
  if (!trimmed || trimmed.length > 200) {
    throw new AuthSessionManagementError("A valid device id is required to keep the current session", 400, "AUTH_DEVICE_ID_REQUIRED");
  }
  const changed = await db.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      NOT: { deviceId: trimmed },
    },
    data: { revokedAt: now, revokeReason: "REMOTE_SIGN_OUT_OTHERS", lastUsedAt: now },
  });
  return { revokedCount: changed.count };
}

