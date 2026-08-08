import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthSessionError,
  createAuthSession,
  hashRefreshToken,
  isSessionAccessCurrent,
  revokeAuthSession,
  rotateAuthSession,
} from "./authSessionService";

function createMemoryStore() {
  const sessions = new Map<string, any>();
  const store: any = {
    authSession: {
      create: async ({ data }: any) => {
        const id = `session-${sessions.size + 1}`;
        const row = {
          id,
          ...data,
          createdAt: new Date(),
          lastUsedAt: new Date(),
          revokedAt: null,
        };
        sessions.set(data.refreshTokenHash, row);
        return row;
      },
      findUnique: async ({ where }: any) => sessions.get(where.refreshTokenHash) || null,
      updateMany: async ({ where, data }: any) => {
        const rows = [...sessions.values()].filter((candidate) => (
          (!where.id || candidate.id === where.id)
          && (!where.userId || candidate.userId === where.userId)
          && (!where.deviceId || candidate.deviceId === where.deviceId)
          && (!where.refreshTokenHash || candidate.refreshTokenHash === where.refreshTokenHash)
          && (where.revokedAt !== null || candidate.revokedAt === null)
          && (!where.expiresAt?.gt || candidate.expiresAt > where.expiresAt.gt)
        ));
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
    },
  };
  store.$transaction = async (callback: any) => callback(store);
  return { store, sessions };
}

test("auth sessions store opaque refresh tokens as hashes", async () => {
  const { store, sessions } = createMemoryStore();
  const refresh = await createAuthSession(store, {
    userId: "user-1",
    schoolAccessVersion: 3,
    expiresAt: new Date(Date.now() + 60_000),
    deviceId: "device-1",
  });

  assert.ok(refresh.refreshToken.length >= 40);
  assert.equal(refresh.refreshToken.includes("."), false);
  assert.equal(sessions.has(refresh.refreshToken), false);
  assert.equal(sessions.has(hashRefreshToken(refresh.refreshToken)), true);
});

test("rotation revokes the old token and preserves device/access metadata", async () => {
  const { store, sessions } = createMemoryStore();
  const now = new Date();
  const first = await createAuthSession(store, {
    userId: "user-1",
    schoolAccessVersion: 7,
    expiresAt: new Date(now.getTime() + 60_000),
    deviceId: "device-1",
    deviceName: "iPhone",
  });
  const second = await rotateAuthSession(store, first.refreshToken, {
    now,
    expiresAt: new Date(now.getTime() + 120_000),
  });

  const old = sessions.get(hashRefreshToken(first.refreshToken));
  assert.equal(old.revokeReason, "ROTATED");
  assert.equal(sessions.get(hashRefreshToken(second.refreshToken)).schoolAccessVersion, 7);
  assert.equal(sessions.get(hashRefreshToken(second.refreshToken)).deviceName, "iPhone");
});

test("near-simultaneous rotation loses safely without revoking the active family", async () => {
  const { store, sessions } = createMemoryStore();
  const now = new Date();
  const first = await createAuthSession(store, {
    userId: "user-1",
    schoolAccessVersion: 0,
    expiresAt: new Date(Date.now() + 60_000),
  });
  const second = await rotateAuthSession(store, first.refreshToken, { now, expiresAt: new Date(now.getTime() + 120_000) });

  await assert.rejects(
    () => rotateAuthSession(store, first.refreshToken, { now: new Date(now.getTime() + 1_000), expiresAt: new Date(now.getTime() + 120_000) }),
    (error: any) => error instanceof AuthSessionError && error.code === "SESSION_CONFLICT",
  );
  assert.equal(sessions.size, 2);
  assert.equal(sessions.get(hashRefreshToken(second.refreshToken)).revokedAt, null);
});

test("delayed reuse of a rotated token revokes its active device family", async () => {
  const { store, sessions } = createMemoryStore();
  const now = new Date();
  const first = await createAuthSession(store, {
    userId: "user-1",
    schoolAccessVersion: 0,
    expiresAt: new Date(now.getTime() + 60_000),
  });
  const second = await rotateAuthSession(store, first.refreshToken, { now, expiresAt: new Date(now.getTime() + 120_000) });

  await assert.rejects(
    () => rotateAuthSession(store, first.refreshToken, { now: new Date(now.getTime() + 11_000), expiresAt: new Date(now.getTime() + 120_000) }),
    (error: any) => error instanceof AuthSessionError && error.code === "SESSION_REUSE_DETECTED",
  );
  assert.equal(sessions.get(hashRefreshToken(second.refreshToken)).revokeReason, "TOKEN_REUSE_DETECTED");
});

test("revocation and school access version checks are explicit", async () => {
  const { store } = createMemoryStore();
  const session = await createAuthSession(store, {
    userId: "user-1",
    schoolAccessVersion: 2,
    expiresAt: new Date(Date.now() + 60_000),
  });
  assert.equal(await revokeAuthSession(store, session.refreshToken, "REMOTE_SIGN_OUT"), true);
  assert.equal(await revokeAuthSession(store, session.refreshToken, "REMOTE_SIGN_OUT"), false);
  assert.equal(isSessionAccessCurrent(2, 2), true);
  assert.equal(isSessionAccessCurrent(2, 3), false);
});
