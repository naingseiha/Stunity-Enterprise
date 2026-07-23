import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import oidcTelegramRoutes from "./oidcTelegram.routes";
import { createMemoryOidcStateStoreForTests, createMemoryOidcSessionExchangeStoreForTests } from "../security/oidcStateStore";
import type { TelegramTokenExchange, OidcProviderSettings } from "../oidc/telegramOidc";

const SETTINGS: OidcProviderSettings = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "https://app.example/auth/oidc/telegram/callback",
  issuer: "https://telegram.example",
  authorizationEndpoint: "https://telegram.example/authorize",
  tokenEndpoint: "https://telegram.example/token",
  jwksUri: "https://telegram.example/.well-known/jwks.json",
  scope: "openid",
};

function freshPrisma(onUserCreate?: (data: any) => void) {
  return {
    socialAccount: { findUnique: async () => null },
    user: {
      findFirst: async () => null,
      findUnique: async () => null,
      create: async ({ data }: any) => {
        onUserCreate?.(data);
        return {
          id: "user-1",
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          profilePictureUrl: data.profilePictureUrl,
          schoolId: null,
          schoolAccessVersion: 0,
          school: null,
          isActive: true,
        };
      },
      update: async () => ({}),
    },
    twoFactorSecret: { findUnique: async () => null },
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
  const previous = process.env.AUTH_TELEGRAM_OIDC_ENABLED;
  process.env.AUTH_TELEGRAM_OIDC_ENABLED = "true";
  t.after(() => {
    if (previous === undefined) delete process.env.AUTH_TELEGRAM_OIDC_ENABLED;
    else process.env.AUTH_TELEGRAM_OIDC_ENABLED = previous;
  });
}

test("Telegram OIDC routes are disabled unless the rollout flag is set", async (t) => {
  const previous = process.env.AUTH_TELEGRAM_OIDC_ENABLED;
  delete process.env.AUTH_TELEGRAM_OIDC_ENABLED;
  t.after(() => {
    if (previous !== undefined) process.env.AUTH_TELEGRAM_OIDC_ENABLED = previous;
  });

  const app = express();
  app.use(express.json());
  app.use(
    "/auth/oidc/telegram",
    oidcTelegramRoutes(freshPrisma() as any, {
      settings: SETTINGS,
      stateStore: createMemoryOidcStateStoreForTests(),
      sessionStore: createMemoryOidcSessionExchangeStoreForTests(),
    }),
  );
  const baseUrl = await startServer(app, t);
  const response = await fetch(`${baseUrl}/auth/oidc/telegram/start`, { redirect: "manual" });
  assert.equal(response.status, 503);
  const body: any = await response.json();
  assert.equal(body.code, "TELEGRAM_OIDC_DISABLED");
});

test("GET /start redirects to the provider with PKCE state and nonce", async (t) => {
  withFlag(t);
  const app = express();
  app.use(express.json());
  app.use(
    "/auth/oidc/telegram",
    oidcTelegramRoutes(freshPrisma() as any, {
      settings: SETTINGS,
      stateStore: createMemoryOidcStateStoreForTests(),
      sessionStore: createMemoryOidcSessionExchangeStoreForTests(),
    }),
  );
  const baseUrl = await startServer(app, t);
  const response = await fetch(`${baseUrl}/auth/oidc/telegram/start`, { redirect: "manual" });
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("location")!);
  assert.equal(`${location.origin}${location.pathname}`, SETTINGS.authorizationEndpoint);
  assert.equal(location.searchParams.get("client_id"), SETTINGS.clientId);
  assert.ok(location.searchParams.get("state"));
  assert.ok(location.searchParams.get("nonce"));
  assert.ok(location.searchParams.get("code_challenge"));
  assert.equal(location.searchParams.get("code_challenge_method"), "S256");
});

test("GET /callback resolves a new account and hands the client a one-time session code", async (t) => {
  withFlag(t);
  let capturedNonce = "";
  const tokenExchange: TelegramTokenExchange = {
    exchangeCode: async () => ({ idToken: "fake-id-token" }),
    verifyIdToken: async () => ({
      iss: SETTINGS.issuer,
      aud: SETTINGS.clientId,
      sub: "telegram-user-1",
      nonce: capturedNonce,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      name: "Sokha Chan",
      email: "sokha@example.com",
    }),
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/auth/oidc/telegram",
    oidcTelegramRoutes(freshPrisma() as any, {
      settings: SETTINGS,
      stateStore: createMemoryOidcStateStoreForTests(),
      sessionStore: createMemoryOidcSessionExchangeStoreForTests(),
      tokenExchange,
      webClientUrl: "https://app.example",
    }),
  );
  const baseUrl = await startServer(app, t);

  const startResponse = await fetch(`${baseUrl}/auth/oidc/telegram/start`, { redirect: "manual" });
  const startLocation = new URL(startResponse.headers.get("location")!);
  const state = startLocation.searchParams.get("state")!;
  capturedNonce = startLocation.searchParams.get("nonce")!;

  const callbackResponse = await fetch(
    `${baseUrl}/auth/oidc/telegram/callback?code=auth-code-1&state=${encodeURIComponent(state)}`,
    { redirect: "manual" },
  );
  assert.equal(callbackResponse.status, 302);
  const callbackLocation = new URL(callbackResponse.headers.get("location")!);
  assert.equal(callbackLocation.origin, "https://app.example");
  assert.equal(callbackLocation.pathname, "/auth/oidc/complete");
  assert.equal(callbackLocation.searchParams.get("status"), "ok");
  const sessionCode = callbackLocation.searchParams.get("code")!;
  assert.ok(sessionCode);

  const sessionResponse = await fetch(`${baseUrl}/auth/oidc/telegram/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: sessionCode }),
  });
  assert.equal(sessionResponse.status, 200);
  const sessionBody: any = await sessionResponse.json();
  assert.equal(sessionBody.data.user.email, "sokha@example.com");
  assert.equal(sessionBody.data.user.firstName, "Sokha");
  assert.ok(sessionBody.data.tokens.accessToken);

  const replayResponse = await fetch(`${baseUrl}/auth/oidc/telegram/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: sessionCode }),
  });
  assert.equal(replayResponse.status, 409);
});

test("GET /callback falls back to preferred_username and captures phone_number when Telegram sends no email/name claims", async (t) => {
  // Telegram's real discovery document (verified against
  // https://oauth.telegram.org/.well-known/openid-configuration) lists
  // claims_supported as [aud, preferred_username, phone_number, exp, iat,
  // iss, name, picture, sub] — no email claim, and name is not guaranteed.
  withFlag(t);
  let capturedNonce = "";
  let createdUserData: any = null;
  const tokenExchange: TelegramTokenExchange = {
    exchangeCode: async () => ({ idToken: "fake-id-token" }),
    verifyIdToken: async () => ({
      iss: SETTINGS.issuer,
      aud: SETTINGS.clientId,
      sub: "telegram-user-3",
      nonce: capturedNonce,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      preferred_username: "sokha_tg",
      phone_number: "+85512123456",
    }),
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/auth/oidc/telegram",
    oidcTelegramRoutes(freshPrisma((data) => { createdUserData = data; }) as any, {
      settings: SETTINGS,
      stateStore: createMemoryOidcStateStoreForTests(),
      sessionStore: createMemoryOidcSessionExchangeStoreForTests(),
      tokenExchange,
      webClientUrl: "https://app.example",
    }),
  );
  const baseUrl = await startServer(app, t);

  const startResponse = await fetch(`${baseUrl}/auth/oidc/telegram/start`, { redirect: "manual" });
  const startLocation = new URL(startResponse.headers.get("location")!);
  const state = startLocation.searchParams.get("state")!;
  capturedNonce = startLocation.searchParams.get("nonce")!;

  const callbackResponse = await fetch(
    `${baseUrl}/auth/oidc/telegram/callback?code=auth-code-3&state=${encodeURIComponent(state)}`,
    { redirect: "manual" },
  );
  assert.equal(callbackResponse.status, 302);
  assert.match(new URL(callbackResponse.headers.get("location")!).search, /status=ok/);

  assert.ok(createdUserData);
  assert.equal(createdUserData.email, null);
  assert.equal(createdUserData.firstName, "sokha_tg");
  assert.equal(createdUserData.socialAccounts.create.rawProfile.preferredUsername, "sokha_tg");
  assert.equal(createdUserData.socialAccounts.create.rawProfile.phoneNumber, "+85512123456");
});

test("GET /start?client=mobile carries through to a native deep-link callback redirect", async (t) => {
  withFlag(t);
  let capturedNonce = "";
  const tokenExchange: TelegramTokenExchange = {
    exchangeCode: async () => ({ idToken: "fake-id-token" }),
    verifyIdToken: async () => ({
      iss: SETTINGS.issuer,
      aud: SETTINGS.clientId,
      sub: "telegram-user-2",
      nonce: capturedNonce,
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
      name: "Dara Kim",
      email: "dara@example.com",
    }),
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/auth/oidc/telegram",
    oidcTelegramRoutes(freshPrisma() as any, {
      settings: SETTINGS,
      stateStore: createMemoryOidcStateStoreForTests(),
      sessionStore: createMemoryOidcSessionExchangeStoreForTests(),
      tokenExchange,
      webClientUrl: "https://app.example",
      mobileRedirectUri: "stunity://auth/oidc/complete",
    }),
  );
  const baseUrl = await startServer(app, t);

  const startResponse = await fetch(`${baseUrl}/auth/oidc/telegram/start?client=mobile`, { redirect: "manual" });
  const startLocation = new URL(startResponse.headers.get("location")!);
  const state = startLocation.searchParams.get("state")!;
  capturedNonce = startLocation.searchParams.get("nonce")!;

  const callbackResponse = await fetch(
    `${baseUrl}/auth/oidc/telegram/callback?code=auth-code-mobile&state=${encodeURIComponent(state)}`,
    { redirect: "manual" },
  );
  assert.equal(callbackResponse.status, 302);
  const callbackLocation = new URL(callbackResponse.headers.get("location")!);
  assert.equal(callbackLocation.protocol, "stunity:");
  assert.equal(callbackLocation.pathname, "/oidc/complete");
  assert.equal(callbackLocation.searchParams.get("status"), "ok");
  assert.ok(callbackLocation.searchParams.get("code"));
});

test("GET /callback rejects a replayed or unknown state without exchanging a code", async (t) => {
  withFlag(t);
  let exchangeCalls = 0;
  const tokenExchange: TelegramTokenExchange = {
    exchangeCode: async () => {
      exchangeCalls += 1;
      return { idToken: "unused" };
    },
    verifyIdToken: async () => ({ iss: SETTINGS.issuer, aud: SETTINGS.clientId, sub: "x", nonce: "n", exp: 0, iat: 0 }),
  };
  const app = express();
  app.use(express.json());
  app.use(
    "/auth/oidc/telegram",
    oidcTelegramRoutes(freshPrisma() as any, {
      settings: SETTINGS,
      stateStore: createMemoryOidcStateStoreForTests(),
      sessionStore: createMemoryOidcSessionExchangeStoreForTests(),
      tokenExchange,
      webClientUrl: "https://app.example",
    }),
  );
  const baseUrl = await startServer(app, t);

  const response = await fetch(`${baseUrl}/auth/oidc/telegram/callback?code=auth-code&state=never-issued`, {
    redirect: "manual",
  });
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("location")!);
  assert.equal(location.searchParams.get("status"), "error");
  assert.equal(location.searchParams.get("code"), "OIDC_STATE_INVALID");
  assert.equal(exchangeCalls, 0);
});
