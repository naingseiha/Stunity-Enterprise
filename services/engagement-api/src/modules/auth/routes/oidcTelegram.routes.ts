import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  createOidcAuthorizationRequest,
  consumeOidcAuthorizationRequest,
  validateOidcIdTokenClaims,
  OidcSecurityError,
  type OidcStateStore,
} from "../security/oidcSecurity";
import {
  createOidcStateStore,
  createOidcSessionExchangeStore,
  type OidcSessionExchangeStore,
} from "../security/oidcStateStore";
import {
  loadTelegramOidcSettings,
  buildAuthorizationUrl,
  createTelegramTokenExchange,
  TelegramOidcError,
  type TelegramTokenExchange,
  type OidcProviderSettings,
} from "../oidc/telegramOidc";
import { normalizeEmail } from "../security/identifiers";
import { handleSocialLogin, type ProviderProfile } from "./socialAuth.routes";
import {
  createStructuredAuthMetrics,
  type AuthOperationalMetrics,
} from "../observability/authOperationalMetrics";

const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_EXCHANGE_TTL_MS = 2 * 60 * 1000;

type OidcTelegramRouteOptions = {
  stateStore?: OidcStateStore;
  sessionStore?: OidcSessionExchangeStore;
  tokenExchange?: TelegramTokenExchange;
  settings?: OidcProviderSettings | null;
  webClientUrl?: string;
  mobileRedirectUri?: string;
  metrics?: AuthOperationalMetrics;
};

function requestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}

export default function oidcTelegramRoutes(prisma: PrismaClient, options: OidcTelegramRouteOptions = {}) {
  const router = Router();
  const stateStore = options.stateStore || createOidcStateStore();
  const sessionStore = options.sessionStore || createOidcSessionExchangeStore();
  const tokenExchange = options.tokenExchange || createTelegramTokenExchange();
  const webClientUrl = (options.webClientUrl || process.env.WEB_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const mobileRedirectUri = (options.mobileRedirectUri || process.env.MOBILE_APP_OIDC_REDIRECT_URI || "stunity://auth/oidc/complete").replace(/\/+$/, "");
  const metrics = options.metrics || createStructuredAuthMetrics();

  const completionUrl = (clientKind: "web" | "mobile" | undefined, params: Record<string, string>) => {
    const base = clientKind === "mobile" ? mobileRedirectUri : `${webClientUrl}/auth/oidc/complete`;
    const query = new URLSearchParams(params).toString();
    return `${base}?${query}`;
  };

  const resolveSettings = (): OidcProviderSettings | null =>
    options.settings !== undefined ? options.settings : loadTelegramOidcSettings();

  const requireEnabled = (req: Request, res: Response, next: () => void) => {
    if (process.env.AUTH_TELEGRAM_OIDC_ENABLED !== "true") {
      return res.status(503).json({
        success: false,
        code: "TELEGRAM_OIDC_DISABLED",
        error: "Continue with Telegram is not enabled for this environment.",
      });
    }
    const settings = resolveSettings();
    if (!settings) {
      return res.status(503).json({
        success: false,
        code: "TELEGRAM_OIDC_NOT_CONFIGURED",
        error: "Continue with Telegram is not configured for this environment.",
      });
    }
    (res.locals as any).telegramOidcSettings = settings;
    next();
  };

  router.use(requireEnabled);

  // GET /auth/oidc/telegram/start — browser navigation kicks off the
  // Authorization Code + PKCE flow. This is a full redirect, not a token
  // POST, because OIDC authorization requests require the user agent itself
  // to visit the provider.
  router.get("/start", async (req: Request, res: Response) => {
    const settings = (res.locals as any).telegramOidcSettings as OidcProviderSettings;
    const clientKind: "web" | "mobile" = req.query.client === "mobile" ? "mobile" : "web";
    const request = createOidcAuthorizationRequest({
      clientId: settings.clientId,
      redirectUri: settings.redirectUri,
      issuer: settings.issuer,
      ttlMs: STATE_TTL_MS,
      clientKind,
    });
    await stateStore.save(request.state, request, STATE_TTL_MS);
    return res.redirect(302, buildAuthorizationUrl(settings, request));
  });

  // GET /auth/oidc/telegram/callback — Telegram redirects the browser back
  // here with ?code&state. Tokens are never placed in this redirect: the
  // callback hands the client a one-time exchange code instead, which is
  // traded for the real session over POST /session.
  router.get("/callback", async (req: Request, res: Response) => {
    const settings = (res.locals as any).telegramOidcSettings as OidcProviderSettings;
    // Before the state is consumed we don't yet know which client started the
    // flow (tampered/expired/replayed link), so these early failures always
    // land on the web error page.
    const failure = (reasonCode: string, clientKind?: "web" | "mobile") =>
      res.redirect(302, completionUrl(clientKind, { status: "error", code: reasonCode }));

    if (typeof req.query.error === "string" && req.query.error) {
      return failure("TELEGRAM_AUTHORIZATION_DENIED");
    }
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state) return failure("OIDC_CALLBACK_INVALID");

    let authorizationRequest;
    try {
      authorizationRequest = await consumeOidcAuthorizationRequest(stateStore, state, settings.redirectUri);
    } catch (error) {
      return failure(error instanceof OidcSecurityError ? error.code : "OIDC_STATE_INVALID");
    }
    const clientKind = authorizationRequest.clientKind;

    const loginStartedAt = authorizationRequest.createdAt;
    try {
      const { idToken } = await tokenExchange.exchangeCode(settings, code, authorizationRequest.codeVerifier);
      const claims = await tokenExchange.verifyIdToken(settings, idToken);
      const validated = validateOidcIdTokenClaims(claims, {
        issuer: settings.issuer,
        clientId: settings.clientId,
        nonce: authorizationRequest.nonce,
      });

      // Telegram's real OIDC claims_supported is
      // [aud, preferred_username, phone_number, exp, iat, iss, name, picture,
      // sub] — there is no email claim, unlike Google/Apple/etc. `email`
      // stays empty rather than guessed, which is also what keeps this a
      // "brand new user" path in handleSocialLogin instead of accidentally
      // matching an existing account by a fabricated identifier.
      const preferredUsername = typeof claims.preferred_username === "string" ? claims.preferred_username : "";
      const phoneNumber = typeof claims.phone_number === "string" ? claims.phone_number : "";
      const profile: ProviderProfile = {
        provider: "TELEGRAM",
        providerUserId: validated.subject,
        email: typeof claims.email === "string" ? normalizeEmail(claims.email) || "" : "",
        displayName: typeof claims.name === "string" && claims.name ? claims.name : preferredUsername,
        avatarUrl: typeof claims.picture === "string" ? claims.picture : "",
        verifiedClaims: {
          issuer: validated.issuer,
          audience: validated.audience,
          subject: validated.subject,
          ...(preferredUsername ? { preferredUsername } : {}),
          // Informational only — not wired into User.phone/VerifiedContact.
          // Doing that safely needs the same E.164 normalization and
          // duplicate-resolution path phone OTP already goes through
          // (services/auth-service/src/security/identifiers.ts), which a
          // federated login claim shouldn't bypass.
          ...(phoneNumber ? { phoneNumber } : {}),
        },
      };

      const result = await handleSocialLogin(prisma, profile);
      metrics.increment("auth_login_completed_total", {
        method: "TELEGRAM_OIDC",
        new_or_returning: result.isNewUser ? "NEW" : "RETURNING",
      });
      metrics.observe("auth_login_duration_ms", Date.now() - loginStartedAt, { method: "TELEGRAM_OIDC" });

      const sessionCode = crypto.randomUUID();
      await sessionStore.save(sessionCode, result, SESSION_EXCHANGE_TTL_MS);
      return res.redirect(302, completionUrl(clientKind, { status: "ok", code: sessionCode }));
    } catch (error: any) {
      console.error("Telegram OIDC callback error:", error?.message);
      const reasonCode = error instanceof OidcSecurityError || error instanceof TelegramOidcError
        ? error.code
        : "TELEGRAM_OIDC_FAILED";
      return failure(reasonCode, clientKind);
    }
  });

  // POST /auth/oidc/telegram/session — client-side exchange of the one-time
  // code from the callback redirect for the actual tokens/user payload.
  router.post("/session", async (req: Request, res: Response) => {
    const apiRequestId = requestId();
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!code) {
      return res.status(400).json({ success: false, code: "OIDC_SESSION_CODE_REQUIRED", error: "A session code is required.", requestId: apiRequestId });
    }
    const payload = await sessionStore.consume(code);
    if (!payload) {
      return res.status(409).json({
        success: false,
        code: "OIDC_SESSION_EXPIRED",
        error: "This sign-in link has expired or was already used. Try Continue with Telegram again.",
        requestId: apiRequestId,
      });
    }
    return res.json({ success: true, data: payload, error: null, requestId: apiRequestId });
  });

  return router;
}
