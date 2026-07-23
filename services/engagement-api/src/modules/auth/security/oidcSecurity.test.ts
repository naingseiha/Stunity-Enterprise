import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPkceChallenge,
  consumeOidcAuthorizationRequest,
  createOidcAuthorizationRequest,
  OidcSecurityError,
  validateOidcIdTokenClaims,
  type OidcAuthorizationRequest,
  type OidcStateStore,
} from "./oidcSecurity";

function memoryStateStore() {
  const values = new Map<string, OidcAuthorizationRequest>();
  const store: OidcStateStore = {
    save: async (state, request) => { values.set(state, request); },
    consume: async (state) => {
      const request = values.get(state) || null;
      values.delete(state);
      return request;
    },
  };
  return { store, values };
}

test("PKCE authorization requests use S256 and one-time state", async () => {
  const request = createOidcAuthorizationRequest({
    clientId: "telegram-client",
    redirectUri: "https://stunity.app/auth/oidc/telegram/callback",
    issuer: "https://telegram.example",
    now: 1_000,
  });
  assert.equal(request.codeChallenge, buildPkceChallenge(request.codeVerifier));
  assert.notEqual(request.state, request.nonce);

  const { store, values } = memoryStateStore();
  await store.save(request.state, request, request.expiresAt - request.createdAt);
  const consumed = await consumeOidcAuthorizationRequest(
    store,
    request.state,
    request.redirectUri,
    request.createdAt + 1,
  );
  assert.equal(consumed.codeVerifier, request.codeVerifier);
  assert.equal(values.size, 0);
  await assert.rejects(
    () => consumeOidcAuthorizationRequest(store, request.state, request.redirectUri, request.createdAt + 1),
    (error: any) => error instanceof OidcSecurityError && error.code === "OIDC_STATE_INVALID",
  );
});

test("OIDC callback rejects expired state and redirect substitution", async () => {
  const request = createOidcAuthorizationRequest({
    clientId: "client",
    redirectUri: "https://stunity.app/callback",
    issuer: "https://issuer.example",
    now: 1_000,
    ttlMs: 10,
  });
  const { store } = memoryStateStore();
  await store.save(request.state, request, 10);
  await assert.rejects(
    () => consumeOidcAuthorizationRequest(store, request.state, request.redirectUri, 1_011),
    (error: any) => error.code === "OIDC_STATE_EXPIRED",
  );

  const second = createOidcAuthorizationRequest({
    clientId: "client",
    redirectUri: "https://stunity.app/callback",
    issuer: "https://issuer.example",
  });
  await store.save(second.state, second, 1_000);
  await assert.rejects(
    () => consumeOidcAuthorizationRequest(store, second.state, "https://attacker.example/callback"),
    (error: any) => error.code === "OIDC_REDIRECT_MISMATCH",
  );
});

test("OIDC claims require issuer, audience, nonce and bounded timestamps", () => {
  const now = 1_700_000_000_000;
  const claims = {
    iss: "https://issuer.example",
    aud: ["client", "other"],
    sub: "telegram-subject-1",
    nonce: "nonce-1",
    iat: 1_700_000_000,
    exp: 1_700_000_300,
  };
  assert.deepEqual(
    validateOidcIdTokenClaims(claims, {
      issuer: "https://issuer.example",
      clientId: "client",
      nonce: "nonce-1",
      now,
    }),
    { subject: "telegram-subject-1", issuer: "https://issuer.example", audience: "client" },
  );

  for (const [field, value, code] of [
    ["iss", "https://other.example", "OIDC_ISSUER_MISMATCH"],
    ["aud", "other", "OIDC_AUDIENCE_MISMATCH"],
    ["nonce", "wrong", "OIDC_NONCE_MISMATCH"],
    ["exp", 1_699_999_000, "OIDC_TIMESTAMP_INVALID"],
  ] as const) {
    const altered = { ...claims, [field]: value };
    assert.throws(
      () => validateOidcIdTokenClaims(altered, {
        issuer: "https://issuer.example",
        clientId: "client",
        nonce: "nonce-1",
        now,
      }),
      (error: any) => error.code === code,
    );
  }
});

