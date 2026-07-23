import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import {
  loadTelegramOidcSettings,
  buildAuthorizationUrl,
  createTelegramTokenExchange,
  TelegramOidcError,
  type OidcProviderSettings,
} from "./telegramOidc";
import { createOidcAuthorizationRequest } from "../security/oidcSecurity";

const ENV_KEYS = [
  "TELEGRAM_OIDC_CLIENT_ID",
  "TELEGRAM_OIDC_CLIENT_SECRET",
  "TELEGRAM_OIDC_REDIRECT_URI",
  "TELEGRAM_OIDC_ISSUER",
  "TELEGRAM_OIDC_AUTHORIZATION_ENDPOINT",
  "TELEGRAM_OIDC_TOKEN_ENDPOINT",
  "TELEGRAM_OIDC_JWKS_URI",
  "TELEGRAM_OIDC_SCOPE",
] as const;

function withEnv(t: any, values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  t.after(() => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key]!;
    }
  });
}

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

test("loadTelegramOidcSettings requires every endpoint before it is considered configured", (t) => {
  withEnv(t, {});
  assert.equal(loadTelegramOidcSettings(), null);

  withEnv(t, { TELEGRAM_OIDC_CLIENT_ID: "client-id" });
  assert.equal(loadTelegramOidcSettings(), null);

  withEnv(t, {
    TELEGRAM_OIDC_CLIENT_ID: SETTINGS.clientId,
    TELEGRAM_OIDC_CLIENT_SECRET: SETTINGS.clientSecret,
    TELEGRAM_OIDC_REDIRECT_URI: SETTINGS.redirectUri,
    TELEGRAM_OIDC_ISSUER: SETTINGS.issuer,
    TELEGRAM_OIDC_AUTHORIZATION_ENDPOINT: SETTINGS.authorizationEndpoint,
    TELEGRAM_OIDC_TOKEN_ENDPOINT: SETTINGS.tokenEndpoint,
    TELEGRAM_OIDC_JWKS_URI: SETTINGS.jwksUri,
  });
  const settings = loadTelegramOidcSettings();
  assert.ok(settings);
  assert.equal(settings?.scope, "openid");
  assert.equal(settings?.clientId, SETTINGS.clientId);
});

test("buildAuthorizationUrl carries PKCE challenge, state and nonce to the provider", () => {
  const request = createOidcAuthorizationRequest({
    clientId: SETTINGS.clientId,
    redirectUri: SETTINGS.redirectUri,
    issuer: SETTINGS.issuer,
  });
  const url = new URL(buildAuthorizationUrl(SETTINGS, request));
  assert.equal(`${url.origin}${url.pathname}`, SETTINGS.authorizationEndpoint);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), SETTINGS.clientId);
  assert.equal(url.searchParams.get("redirect_uri"), SETTINGS.redirectUri);
  assert.equal(url.searchParams.get("state"), request.state);
  assert.equal(url.searchParams.get("nonce"), request.nonce);
  assert.equal(url.searchParams.get("code_challenge"), request.codeChallenge);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});

test("token exchange verifies a correctly signed id_token against the configured JWKS", async (t) => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.kid = "trusted-key";
  jwk.alg = "RS256";

  const idToken = await new SignJWT({ nonce: "expected-nonce", name: "Sokha", email: "sokha@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "trusted-key" })
    .setIssuer(SETTINGS.issuer)
    .setAudience(SETTINGS.clientId)
    .setSubject("telegram-user-1")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  const originalFetch = global.fetch;
  global.fetch = (async (input: any) => {
    const url = typeof input === "string" ? input : input.url;
    if (url === SETTINGS.tokenEndpoint) {
      return new Response(JSON.stringify({ id_token: idToken }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`Unexpected fetch to ${url}`);
  }) as any;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const exchange = createTelegramTokenExchange(() => createLocalJWKSet({ keys: [jwk] }));
  const { idToken: exchanged } = await exchange.exchangeCode(SETTINGS, "auth-code", "code-verifier");
  assert.equal(exchanged, idToken);

  const claims = await exchange.verifyIdToken(SETTINGS, exchanged);
  assert.equal(claims.sub, "telegram-user-1");
  assert.equal(claims.iss, SETTINGS.issuer);
  assert.equal(claims.nonce, "expected-nonce");
});

test("token exchange rejects an id_token signed by an untrusted key", async () => {
  const { privateKey: untrustedKey } = await generateKeyPair("RS256");
  const { publicKey: trustedKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(trustedKey);
  jwk.kid = "trusted-key";
  jwk.alg = "RS256";

  const forgedToken = await new SignJWT({ nonce: "expected-nonce" })
    .setProtectedHeader({ alg: "RS256", kid: "untrusted-key" })
    .setIssuer(SETTINGS.issuer)
    .setAudience(SETTINGS.clientId)
    .setSubject("attacker")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(untrustedKey);

  const exchange = createTelegramTokenExchange(() => createLocalJWKSet({ keys: [jwk] }));
  await assert.rejects(
    () => exchange.verifyIdToken(SETTINGS, forgedToken),
    (error: unknown) => error instanceof TelegramOidcError && error.code === "TELEGRAM_OIDC_SIGNATURE_INVALID",
  );
});

test("token exchange surfaces a stable error when the token endpoint has no id_token", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(JSON.stringify({ access_token: "irrelevant" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as any;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const exchange = createTelegramTokenExchange();
  await assert.rejects(
    () => exchange.exchangeCode(SETTINGS, "auth-code", "code-verifier"),
    (error: unknown) => error instanceof TelegramOidcError && error.code === "TELEGRAM_OIDC_TOKEN_EXCHANGE_FAILED",
  );
});
