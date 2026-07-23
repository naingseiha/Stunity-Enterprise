import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { OidcAuthorizationRequest, OidcIdTokenClaims } from "../security/oidcSecurity";

/**
 * Deliberately provider-agnostic: every endpoint is env-configured rather
 * than hard-coded, so ops can point this at whichever OIDC-compatible
 * Telegram authorization surface is contracted for a given environment
 * without a code change.
 */
export type OidcProviderSettings = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  scope: string;
};

export function loadTelegramOidcSettings(): OidcProviderSettings | null {
  const clientId = process.env.TELEGRAM_OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.TELEGRAM_OIDC_CLIENT_SECRET?.trim();
  const redirectUri = process.env.TELEGRAM_OIDC_REDIRECT_URI?.trim();
  const issuer = process.env.TELEGRAM_OIDC_ISSUER?.trim();
  const authorizationEndpoint = process.env.TELEGRAM_OIDC_AUTHORIZATION_ENDPOINT?.trim();
  const tokenEndpoint = process.env.TELEGRAM_OIDC_TOKEN_ENDPOINT?.trim();
  const jwksUri = process.env.TELEGRAM_OIDC_JWKS_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri || !issuer || !authorizationEndpoint || !tokenEndpoint || !jwksUri) {
    return null;
  }
  return {
    clientId,
    clientSecret,
    redirectUri,
    issuer,
    authorizationEndpoint,
    tokenEndpoint,
    jwksUri,
    scope: process.env.TELEGRAM_OIDC_SCOPE?.trim() || "openid",
  };
}

export function buildAuthorizationUrl(settings: OidcProviderSettings, request: OidcAuthorizationRequest): string {
  const url = new URL(settings.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", settings.clientId);
  url.searchParams.set("redirect_uri", settings.redirectUri);
  url.searchParams.set("scope", settings.scope);
  url.searchParams.set("state", request.state);
  url.searchParams.set("nonce", request.nonce);
  url.searchParams.set("code_challenge", request.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export class TelegramOidcError extends Error {
  constructor(message: string, public readonly code = "TELEGRAM_OIDC_FAILED") {
    super(message);
  }
}

export interface TelegramTokenExchange {
  exchangeCode(settings: OidcProviderSettings, code: string, codeVerifier: string): Promise<{ idToken: string }>;
  verifyIdToken(settings: OidcProviderSettings, idToken: string): Promise<OidcIdTokenClaims & Record<string, unknown>>;
}

export class HttpTelegramTokenExchange implements TelegramTokenExchange {
  private jwksCache = new Map<string, JWTVerifyGetKey>();

  constructor(private readonly jwksFactory: (jwksUri: string) => JWTVerifyGetKey = (uri) => createRemoteJWKSet(new URL(uri))) {}

  private getJwks(jwksUri: string): JWTVerifyGetKey {
    let jwks = this.jwksCache.get(jwksUri);
    if (!jwks) {
      jwks = this.jwksFactory(jwksUri);
      this.jwksCache.set(jwksUri, jwks);
    }
    return jwks;
  }

  async exchangeCode(settings: OidcProviderSettings, code: string, codeVerifier: string): Promise<{ idToken: string }> {
    let response: Response;
    try {
      response = await fetch(settings.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: settings.redirectUri,
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          code_verifier: codeVerifier,
        }),
      });
    } catch {
      throw new TelegramOidcError("Could not reach the Telegram token endpoint", "TELEGRAM_OIDC_UNREACHABLE");
    }
    if (!response.ok) {
      throw new TelegramOidcError(`Telegram token endpoint returned ${response.status}`, "TELEGRAM_OIDC_TOKEN_EXCHANGE_FAILED");
    }
    const body = await response.json().catch(() => null);
    if (!body || typeof body.id_token !== "string" || !body.id_token) {
      throw new TelegramOidcError("Telegram token endpoint did not return an id_token", "TELEGRAM_OIDC_TOKEN_EXCHANGE_FAILED");
    }
    return { idToken: body.id_token };
  }

  async verifyIdToken(settings: OidcProviderSettings, idToken: string): Promise<OidcIdTokenClaims & Record<string, unknown>> {
    try {
      const { payload } = await jwtVerify(idToken, this.getJwks(settings.jwksUri));
      return payload as OidcIdTokenClaims & Record<string, unknown>;
    } catch {
      throw new TelegramOidcError("Telegram id_token signature is invalid", "TELEGRAM_OIDC_SIGNATURE_INVALID");
    }
  }
}

export function createTelegramTokenExchange(
  jwksFactory?: (jwksUri: string) => JWTVerifyGetKey,
): TelegramTokenExchange {
  return new HttpTelegramTokenExchange(jwksFactory);
}
