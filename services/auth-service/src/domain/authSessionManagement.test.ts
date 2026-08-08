import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthSessionManagementError,
  listActiveAuthSessions,
  revokeOtherOwnedAuthSessions,
  revokeOwnedAuthSession,
} from "./authSessionManagement";

test("session listing is user-scoped and never selects token hashes or IP addresses", async () => {
  let query: any;
  const db = {
    authSession: {
      findMany: async (args: any) => { query = args; return []; },
      updateMany: async () => ({ count: 0 }),
    },
  };
  const now = new Date("2026-07-20T00:00:00.000Z");
  await listActiveAuthSessions(db as any, "user-1", now);

  assert.deepEqual(query.where, { userId: "user-1", revokedAt: null, expiresAt: { gt: now } });
  assert.equal(query.select.refreshTokenHash, undefined);
  assert.equal(query.select.ipAddress, undefined);
  assert.equal(query.select.userId, undefined);
});

test("remote sign-out includes owner id in the mutation predicate", async () => {
  let mutation: any;
  const db = {
    authSession: {
      findMany: async () => [],
      updateMany: async (args: any) => { mutation = args; return { count: 1 }; },
    },
  };
  const result = await revokeOwnedAuthSession(db as any, "user-1", "session-1");
  assert.deepEqual(mutation.where, { id: "session-1", userId: "user-1", revokedAt: null });
  assert.equal(mutation.data.revokeReason, "REMOTE_SIGN_OUT");
  assert.deepEqual(result, { sessionId: "session-1", revoked: true });
});

test("another user's or already-revoked session is indistinguishable from missing", async () => {
  const db = {
    authSession: {
      findMany: async () => [],
      updateMany: async () => ({ count: 0 }),
    },
  };
  await assert.rejects(
    () => revokeOwnedAuthSession(db as any, "user-1", "session-other"),
    (error: any) => error instanceof AuthSessionManagementError
      && error.code === "AUTH_SESSION_NOT_FOUND"
      && error.statusCode === 404,
  );
});

test("revoke-other-sessions keeps the current device family and requires a device id", async () => {
  let mutation: any;
  const db = {
    authSession: {
      findMany: async () => [],
      updateMany: async (args: any) => { mutation = args; return { count: 2 }; },
    },
  };
  const result = await revokeOtherOwnedAuthSessions(db as any, "user-1", "device-a");
  assert.deepEqual(mutation.where, {
    userId: "user-1",
    revokedAt: null,
    NOT: { deviceId: "device-a" },
  });
  assert.equal(mutation.data.revokeReason, "REMOTE_SIGN_OUT_OTHERS");
  assert.deepEqual(result, { revokedCount: 2 });

  await assert.rejects(
    () => revokeOtherOwnedAuthSessions(db as any, "user-1", "  "),
    (error: any) => error instanceof AuthSessionManagementError
      && error.code === "AUTH_DEVICE_ID_REQUIRED"
      && error.statusCode === 400,
  );
});
