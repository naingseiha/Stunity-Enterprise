import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import passkeyRoutes, { type WebAuthnCeremonyProvider } from "./passkey.routes";
import { createMemoryPasskeyChallengeStoreForTests } from "../webauthn/passkeyChallengeStore";
import type { WebAuthnSettings } from "../webauthn/webauthnConfig";

const SETTINGS: WebAuthnSettings = {
  rpId: "stunity.example",
  rpName: "Stunity",
  origins: ["https://app.stunity.example"],
};

function fakeAuth(userId: string) {
  return (req: any, _res: any, next: any) => {
    req.user = { id: userId, email: "sokha@example.com", role: "STUDENT", schoolId: "" };
    next();
  };
}

function signedToken(iatSecondsAgo: number): string {
  const iat = Math.floor(Date.now() / 1000) - iatSecondsAgo;
  return jwt.sign({ userId: "user-1", iat }, "throwaway-secret");
}

function baseCeremonies(overrides: Partial<WebAuthnCeremonyProvider> = {}): WebAuthnCeremonyProvider {
  return {
    generateRegistrationOptions: (async (opts: any) => ({
      challenge: "reg-challenge",
      rp: { id: opts.rpID, name: opts.rpName },
      user: { id: "user-handle", name: opts.userName, displayName: opts.userDisplayName },
      pubKeyCredParams: [],
      excludeCredentials: opts.excludeCredentials,
    })) as any,
    verifyRegistrationResponse: (async () => ({
      verified: true,
      registrationInfo: {
        credential: { id: "cred-1", publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ["internal"] },
        credentialBackedUp: true,
      },
    })) as any,
    generateAuthenticationOptions: (async (opts: any) => ({
      challenge: "auth-challenge",
      rpId: opts.rpID,
      allowCredentials: opts.allowCredentials,
    })) as any,
    verifyAuthenticationResponse: (async () => ({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    })) as any,
    ...overrides,
  };
}

function freshPrisma(overrides: Partial<Record<string, any>> = {}) {
  const passkeys = new Map<string, any>();
  return {
    user: {
      findUnique: async ({ where }: any) => ({
        id: where.id,
        email: "sokha@example.com",
        phone: null,
        username: "sokha",
        firstName: "Sokha",
        lastName: "Chan",
        role: "STUDENT",
        accountType: "SOCIAL_ONLY",
        schoolId: null,
        schoolAccessVersion: 0,
        profilePictureUrl: null,
        password: "hashed",
        isActive: true,
      }),
      update: async () => ({}),
    },
    passkeyCredential: {
      findMany: async () => [],
      create: async ({ data }: any) => {
        const row = { id: `row-${passkeys.size + 1}`, ...data, revokedAt: null };
        passkeys.set(row.credentialId, row);
        return row;
      },
      findUnique: async ({ where }: any) => passkeys.get(where.credentialId) || null,
      update: async ({ where, data }: any) => {
        const row = [...passkeys.values()].find((p) => p.id === where.id);
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        const row = [...passkeys.values()].find((p) => p.id === where.id && p.userId === where.userId && !p.revokedAt);
        if (!row) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      },
      count: async () => passkeys.size,
    },
    verifiedContact: { count: async () => 1 },
    socialAccount: { groupBy: async () => [] },
    $transaction: async (ops: Promise<any>[]) => Promise.all(ops),
    __passkeys: passkeys,
    ...overrides,
  };
}

async function startServer(app: express.Express, t: any): Promise<string> {
  let server: ReturnType<typeof app.listen>;
  try {
    server = app.listen(0);
  } catch (error: any) {
    if (error?.code === "EPERM") {
      t.skip("sandbox does not permit binding a local test server");
      throw error;
    }
    throw error;
  }
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${(address as any).port}`;
}

function withFlag(t: any) {
  const previous = process.env.AUTH_PASSKEYS_ENABLED;
  process.env.AUTH_PASSKEYS_ENABLED = "true";
  t.after(() => {
    if (previous === undefined) delete process.env.AUTH_PASSKEYS_ENABLED;
    else process.env.AUTH_PASSKEYS_ENABLED = previous;
  });
}

test("passkey routes are disabled unless the rollout flag is set", async (t) => {
  const app = express();
  app.use(express.json());
  app.use(passkeyRoutes(freshPrisma() as any, fakeAuth("user-1"), {
    jwtSecret: "s",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    settings: SETTINGS,
    challengeStore: createMemoryPasskeyChallengeStoreForTests(),
    ceremonies: baseCeremonies(),
  }));
  const baseUrl = await startServer(app, t);
  const response = await fetch(`${baseUrl}/passkeys/register/options`, { method: "POST" });
  assert.equal(response.status, 503);
});

test("registration issues options then persists a verified credential", async (t) => {
  withFlag(t);
  const prisma = freshPrisma();
  const app = express();
  app.use(express.json());
  app.use(passkeyRoutes(prisma as any, fakeAuth("user-1"), {
    jwtSecret: "s",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    settings: SETTINGS,
    challengeStore: createMemoryPasskeyChallengeStoreForTests(),
    ceremonies: baseCeremonies(),
  }));
  const baseUrl = await startServer(app, t);

  const optionsResponse = await fetch(`${baseUrl}/passkeys/register/options`, { method: "POST" });
  assert.equal(optionsResponse.status, 200);
  const optionsBody: any = await optionsResponse.json();
  assert.equal(optionsBody.data.challenge, "reg-challenge");

  const verifyResponse = await fetch(`${baseUrl}/passkeys/register/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ response: { id: "cred-1" }, deviceLabel: "iPhone" }),
  });
  assert.equal(verifyResponse.status, 201);
  assert.equal(prisma.__passkeys.size, 1);
  assert.equal(prisma.__passkeys.get("cred-1").deviceLabel, "iPhone");
});

test("authentication issues options then signs in on a verified response", async (t) => {
  withFlag(t);
  const prisma = freshPrisma();
  prisma.__passkeys.set("cred-1", {
    id: "row-1",
    userId: "user-1",
    credentialId: "cred-1",
    publicKey: Buffer.from([1, 2, 3]),
    counter: BigInt(0),
    transports: ["internal"],
    revokedAt: null,
  });
  const app = express();
  app.use(express.json());
  app.use(passkeyRoutes(prisma as any, fakeAuth("user-1"), {
    jwtSecret: "s",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    settings: SETTINGS,
    challengeStore: createMemoryPasskeyChallengeStoreForTests(),
    ceremonies: baseCeremonies(),
  }));
  const baseUrl = await startServer(app, t);

  const optionsResponse = await fetch(`${baseUrl}/passkeys/authenticate/options`, { method: "POST" });
  const optionsBody: any = await optionsResponse.json();
  assert.ok(optionsBody.data.challengeId);

  const verifyResponse = await fetch(`${baseUrl}/passkeys/authenticate/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: optionsBody.data.challengeId, response: { id: "cred-1" } }),
  });
  assert.equal(verifyResponse.status, 200);
  const verifyBody: any = await verifyResponse.json();
  assert.equal(verifyBody.data.user.email, "sokha@example.com");
  assert.ok(verifyBody.data.tokens.accessToken);
  assert.equal(prisma.__passkeys.get("cred-1").counter, BigInt(1));
});

test("a counter that fails to advance revokes the credential instead of signing in", async (t) => {
  withFlag(t);
  const prisma = freshPrisma();
  prisma.__passkeys.set("cred-1", {
    id: "row-1",
    userId: "user-1",
    credentialId: "cred-1",
    publicKey: Buffer.from([1, 2, 3]),
    counter: BigInt(5),
    transports: ["internal"],
    revokedAt: null,
  });
  const app = express();
  app.use(express.json());
  app.use(passkeyRoutes(prisma as any, fakeAuth("user-1"), {
    jwtSecret: "s",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    settings: SETTINGS,
    challengeStore: createMemoryPasskeyChallengeStoreForTests(),
    ceremonies: baseCeremonies({
      verifyAuthenticationResponse: (async () => ({
        verified: true,
        authenticationInfo: { newCounter: 5 },
      })) as any,
    }),
  }));
  const baseUrl = await startServer(app, t);

  const optionsResponse = await fetch(`${baseUrl}/passkeys/authenticate/options`, { method: "POST" });
  const optionsBody: any = await optionsResponse.json();

  const verifyResponse = await fetch(`${baseUrl}/passkeys/authenticate/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: optionsBody.data.challengeId, response: { id: "cred-1" } }),
  });
  assert.equal(verifyResponse.status, 401);
  const verifyBody: any = await verifyResponse.json();
  assert.equal(verifyBody.code, "PASSKEY_REUSE_DETECTED");
  assert.ok(prisma.__passkeys.get("cred-1").revokedAt);
});

test("DELETE requires a recently issued token (step-up) before removing a passkey", async (t) => {
  withFlag(t);
  const prisma = freshPrisma();
  prisma.__passkeys.set("cred-1", { id: "row-1", userId: "user-1", credentialId: "cred-1", revokedAt: null });
  prisma.__passkeys.set("cred-2", { id: "row-2", userId: "user-1", credentialId: "cred-2", revokedAt: null });
  const app = express();
  app.use(express.json());
  app.use(passkeyRoutes(prisma as any, fakeAuth("user-1"), {
    jwtSecret: "s",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    settings: SETTINGS,
    challengeStore: createMemoryPasskeyChallengeStoreForTests(),
    ceremonies: baseCeremonies(),
  }));
  const baseUrl = await startServer(app, t);

  const staleResponse = await fetch(`${baseUrl}/me/passkeys/row-1`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${signedToken(600)}` },
  });
  assert.equal(staleResponse.status, 403);

  const freshResponse = await fetch(`${baseUrl}/me/passkeys/row-1`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${signedToken(10)}` },
  });
  assert.equal(freshResponse.status, 200);
  assert.ok(prisma.__passkeys.get("cred-1").revokedAt);
});

test("DELETE refuses to remove the last usable sign-in method", async (t) => {
  withFlag(t);
  const prisma = freshPrisma({
    verifiedContact: { count: async () => 0 },
    user: {
      findUnique: async () => ({ password: "" }),
      update: async () => ({}),
    },
  });
  prisma.__passkeys.set("cred-1", { id: "row-1", userId: "user-1", credentialId: "cred-1", revokedAt: null });
  const app = express();
  app.use(express.json());
  app.use(passkeyRoutes(prisma as any, fakeAuth("user-1"), {
    jwtSecret: "s",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    settings: SETTINGS,
    challengeStore: createMemoryPasskeyChallengeStoreForTests(),
    ceremonies: baseCeremonies(),
  }));
  const baseUrl = await startServer(app, t);

  const response = await fetch(`${baseUrl}/me/passkeys/row-1`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${signedToken(10)}` },
  });
  assert.equal(response.status, 409);
  const body: any = await response.json();
  assert.equal(body.code, "LAST_METHOD_REQUIRED");
  assert.equal(prisma.__passkeys.get("cred-1").revokedAt, null);
});
