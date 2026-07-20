import crypto from "node:crypto";

const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const DEFAULT_MAX_TOKEN_AGE_SECONDS = 10 * 60;

export type OidcAuthorizationRequest = {
  state: string;
  nonce: string;
  codeVerifier: string;
  codeChallenge: string;
  clientId: string;
  redirectUri: string;
  issuer: string;
  createdAt: number;
  expiresAt: number;
};

export interface OidcStateStore {
  save(state: string, request: OidcAuthorizationRequest, ttlMs: number): Promise<void>;
  consume(state: string): Promise<OidcAuthorizationRequest | null>;
}

export type OidcIdTokenClaims = {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  exp?: unknown;
  iat?: unknown;
  nonce?: unknown;
};

export class OidcSecurityError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "OIDC_STATE_INVALID"
      | "OIDC_STATE_EXPIRED"
      | "OIDC_REDIRECT_MISMATCH"
      | "OIDC_ISSUER_MISMATCH"
      | "OIDC_AUDIENCE_MISMATCH"
      | "OIDC_NONCE_MISMATCH"
      | "OIDC_TIMESTAMP_INVALID"
      | "OIDC_SUBJECT_INVALID",
  ) {
    super(message);
  }
}

function randomUrlToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function buildPkceChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier, "ascii").digest("base64url");
}

export function createOidcAuthorizationRequest(input: {
  clientId: string;
  redirectUri: string;
  issuer: string;
  now?: number;
  ttlMs?: number;
}): OidcAuthorizationRequest {
  const createdAt = input.now ?? Date.now();
  const expiresAt = createdAt + (input.ttlMs ?? DEFAULT_STATE_TTL_MS);
  const codeVerifier = randomUrlToken(48);
  return {
    state: randomUrlToken(),
    nonce: randomUrlToken(),
    codeVerifier,
    codeChallenge: buildPkceChallenge(codeVerifier),
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    issuer: input.issuer,
    createdAt,
    expiresAt,
  };
}

export async function consumeOidcAuthorizationRequest(
  store: OidcStateStore,
  state: string,
  expectedRedirectUri: string,
  now = Date.now(),
): Promise<OidcAuthorizationRequest> {
  if (!state || state.length > 256) throw new OidcSecurityError("Invalid OIDC state", "OIDC_STATE_INVALID");
  const request = await store.consume(state);
  if (!request) throw new OidcSecurityError("Invalid or already-used OIDC state", "OIDC_STATE_INVALID");
  if (request.expiresAt <= now) throw new OidcSecurityError("OIDC state expired", "OIDC_STATE_EXPIRED");
  if (request.redirectUri !== expectedRedirectUri) {
    throw new OidcSecurityError("OIDC redirect URI mismatch", "OIDC_REDIRECT_MISMATCH");
  }
  return request;
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateOidcIdTokenClaims(
  claims: OidcIdTokenClaims,
  expected: { issuer: string; clientId: string; nonce: string; now?: number; clockSkewSeconds?: number; maxTokenAgeSeconds?: number },
) {
  if (claims.iss !== expected.issuer) throw new OidcSecurityError("OIDC issuer mismatch", "OIDC_ISSUER_MISMATCH");
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expected.clientId)) {
    throw new OidcSecurityError("OIDC audience mismatch", "OIDC_AUDIENCE_MISMATCH");
  }
  if (typeof claims.sub !== "string" || !claims.sub.trim()) {
    throw new OidcSecurityError("OIDC subject is missing", "OIDC_SUBJECT_INVALID");
  }
  if (typeof claims.nonce !== "string" || !constantTimeEqual(claims.nonce, expected.nonce)) {
    throw new OidcSecurityError("OIDC nonce mismatch", "OIDC_NONCE_MISMATCH");
  }
  const nowSeconds = Math.floor((expected.now ?? Date.now()) / 1000);
  const skew = expected.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS;
  const maxAge = expected.maxTokenAgeSeconds ?? DEFAULT_MAX_TOKEN_AGE_SECONDS;
  if (typeof claims.exp !== "number" || claims.exp < nowSeconds - skew) {
    throw new OidcSecurityError("OIDC token is expired", "OIDC_TIMESTAMP_INVALID");
  }
  if (typeof claims.iat !== "number" || claims.iat > nowSeconds + skew || claims.iat < nowSeconds - maxAge - skew) {
    throw new OidcSecurityError("OIDC token timestamp is invalid", "OIDC_TIMESTAMP_INVALID");
  }
  return { subject: claims.sub, issuer: expected.issuer, audience: expected.clientId };
}

