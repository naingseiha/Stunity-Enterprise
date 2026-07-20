import crypto from "node:crypto";

export type AuthSessionStore = {
  authSession: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string; expiresAt: Date }>;
    findUnique(args: { where: { refreshTokenHash: string } }): Promise<AuthSessionRecord | null>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
  $transaction?<T>(callback: (tx: AuthSessionStore) => Promise<T>): Promise<T>;
};

export type AuthSessionRecord = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceId?: string | null;
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  schoolAccessVersion: number;
  expiresAt: Date;
  revokedAt?: Date | null;
};

export class AuthSessionError extends Error {
  constructor(
    message: string,
    public readonly code: "SESSION_INVALID" | "SESSION_EXPIRED" | "SESSION_REUSE_DETECTED" | "SESSION_CONFLICT",
  ) {
    super(message);
  }
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

function createOpaqueRefreshToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createAuthSession(
  db: AuthSessionStore,
  input: {
    userId: string;
    schoolAccessVersion: number;
    expiresAt: Date;
    deviceId?: string | null;
    deviceName?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
) {
  const refreshToken = createOpaqueRefreshToken();
  const session = await db.authSession.create({
    data: {
      userId: input.userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      schoolAccessVersion: input.schoolAccessVersion,
      expiresAt: input.expiresAt,
      deviceId: input.deviceId ?? null,
      deviceName: input.deviceName ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
  return { sessionId: session.id, refreshToken, expiresAt: session.expiresAt };
}

export async function rotateAuthSession(
  db: AuthSessionStore,
  refreshToken: string,
  input: {
    now?: Date;
    expiresAt: Date;
  },
) {
  const now = input.now ?? new Date();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const current = await db.authSession.findUnique({ where: { refreshTokenHash } });

  if (!current) throw new AuthSessionError("Invalid refresh session", "SESSION_INVALID");
  if (current.revokedAt) {
    throw new AuthSessionError("Refresh session reuse detected", "SESSION_REUSE_DETECTED");
  }
  if (current.expiresAt <= now) {
    throw new AuthSessionError("Refresh session expired", "SESSION_EXPIRED");
  }

  const operation = async (tx: AuthSessionStore) => {
    const revoked = await tx.authSession.updateMany({
      where: {
        id: current.id,
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now, revokeReason: "ROTATED", lastUsedAt: now },
    });
    if (revoked.count !== 1) {
      throw new AuthSessionError("Refresh session changed while rotating", "SESSION_CONFLICT");
    }
    return createAuthSession(tx, {
      userId: current.userId,
      schoolAccessVersion: current.schoolAccessVersion,
      expiresAt: input.expiresAt,
      deviceId: current.deviceId,
      deviceName: current.deviceName,
      ipAddress: current.ipAddress,
      userAgent: current.userAgent,
    });
  };

  return db.$transaction ? db.$transaction(operation) : operation(db);
}

export async function revokeAuthSession(db: AuthSessionStore, refreshToken: string, reason: string, now = new Date()) {
  const result = await db.authSession.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: now, revokeReason: reason, lastUsedAt: now },
  });
  return result.count === 1;
}

export function isSessionAccessCurrent(sessionSchoolAccessVersion: number, userSchoolAccessVersion: number): boolean {
  return sessionSchoolAccessVersion === userSchoolAccessVersion;
}
