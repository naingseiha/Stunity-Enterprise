import crypto from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import type { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifyRegistrationResponseOpts,
  type VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import { loadWebAuthnSettings, type WebAuthnSettings } from "../webauthn/webauthnConfig";
import { createPasskeyChallengeStore, type PasskeyChallengeStore } from "../webauthn/passkeyChallengeStore";
import { canRemoveIdentity, type IdentityInventory } from "../security/identityPolicy";
import {
  createStructuredAuthMetrics,
  type AuthOperationalMetrics,
} from "../observability/authOperationalMetrics";
import { issueRefreshCredential } from "../security/refreshCredential";
import { signAccessToken } from "../security/tokenClaims";

const REGISTRATION_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const AUTHENTICATION_CHALLENGE_TTL_MS = 2 * 60 * 1000;
const DEFAULT_STEP_UP_WINDOW_MS = 5 * 60 * 1000;

export interface WebAuthnCeremonyProvider {
  generateRegistrationOptions: typeof generateRegistrationOptions;
  verifyRegistrationResponse: (opts: VerifyRegistrationResponseOpts) => ReturnType<typeof verifyRegistrationResponse>;
  generateAuthenticationOptions: typeof generateAuthenticationOptions;
  verifyAuthenticationResponse: (opts: VerifyAuthenticationResponseOpts) => ReturnType<typeof verifyAuthenticationResponse>;
}

const defaultCeremonyProvider: WebAuthnCeremonyProvider = {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
};

type AuthenticatedRequest = Request & { user?: { id: string; email: string; role: string; schoolId: string } };
type AuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => unknown;

type PasskeyRouteOptions = {
  jwtSecret: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
  settings?: WebAuthnSettings | null;
  challengeStore?: PasskeyChallengeStore;
  ceremonies?: WebAuthnCeremonyProvider;
  metrics?: AuthOperationalMetrics;
  stepUpWindowMs?: number;
};

function requestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function issueTokens(user: {
  id: string;
  email: string | null;
  role: string;
  schoolId: string | null;
  accountType: string;
  schoolAccessVersion: number;
}, options: PasskeyRouteOptions, prisma: PrismaClient, req: Request) {
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    accountType: user.accountType,
    schoolAccessVersion: user.schoolAccessVersion,
  }, options.jwtSecret, options.accessTokenExpiration);
  const refreshToken = await issueRefreshCredential({
    prisma,
    userId: user.id,
    schoolAccessVersion: user.schoolAccessVersion,
    jwtSecret: options.jwtSecret,
    refreshTokenExpiration: options.refreshTokenExpiration,
    req,
  });
  return { accessToken, refreshToken, expiresIn: options.accessTokenExpiration };
}

function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    accountType: user.accountType,
    schoolId: user.schoolId,
    profilePictureUrl: user.profilePictureUrl,
  };
}

async function buildIdentityInventory(prisma: PrismaClient, userId: string): Promise<IdentityInventory> {
  const [user, verifiedPhoneCount, verifiedEmailCount, socialAccounts, activePasskeyCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { password: true } }),
    prisma.verifiedContact.count({ where: { userId, type: "PHONE", disabledAt: null } }),
    prisma.verifiedContact.count({ where: { userId, type: "EMAIL", disabledAt: null } }),
    prisma.socialAccount.groupBy({ by: ["provider"], where: { userId }, _count: { _all: true } }),
    prisma.passkeyCredential.count({ where: { userId, revokedAt: null } }),
  ]);
  const linkedTelegramCount = socialAccounts.find((row) => row.provider === "TELEGRAM")?._count._all ?? 0;
  const linkedSocialCount = socialAccounts
    .filter((row) => row.provider !== "TELEGRAM")
    .reduce((sum, row) => sum + row._count._all, 0);
  return {
    hasUsablePassword: Boolean(user?.password && user.password.length > 0),
    verifiedPhoneCount,
    verifiedEmailCount,
    linkedTelegramCount,
    linkedSocialCount,
    activePasskeyCount,
  };
}

export default function passkeyRoutes(
  prisma: PrismaClient,
  authenticateToken: AuthMiddleware,
  options: PasskeyRouteOptions,
) {
  const router = Router();
  const challengeStore = options.challengeStore || createPasskeyChallengeStore();
  const ceremonies = options.ceremonies || defaultCeremonyProvider;
  const metrics = options.metrics || createStructuredAuthMetrics();
  const stepUpWindowMs = options.stepUpWindowMs ?? DEFAULT_STEP_UP_WINDOW_MS;

  const resolveSettings = (): WebAuthnSettings | null =>
    options.settings !== undefined ? options.settings : loadWebAuthnSettings();

  const requireEnabled = (_req: Request, res: Response, next: NextFunction) => {
    if (process.env.AUTH_PASSKEYS_ENABLED !== "true") {
      return res.status(503).json({ success: false, code: "PASSKEYS_DISABLED", error: "Passkeys are not enabled for this environment." });
    }
    const settings = resolveSettings();
    if (!settings) {
      return res.status(503).json({ success: false, code: "PASSKEYS_NOT_CONFIGURED", error: "Passkeys are not configured for this environment." });
    }
    (res.locals as any).webAuthnSettings = settings;
    next();
  };

  // This router is mounted at `/auth` (not a dedicated `/auth/passkeys`
  // prefix) so it can serve both `/auth/passkeys/...` and `/auth/me/passkeys`
  // without colliding with the other `/auth/me/...` routes defined in
  // index.ts. requireEnabled is therefore applied per-route rather than via
  // router.use(), which would otherwise intercept every unrelated `/auth/*`
  // request that also passes through this router instance.

  router.post("/passkeys/register/options", requireEnabled, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const apiRequestId = requestId();
    const settings = (res.locals as any).webAuthnSettings as WebAuthnSettings;
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, code: "USER_NOT_FOUND", error: "User not found.", requestId: apiRequestId });

    const existing = await prisma.passkeyCredential.findMany({
      where: { userId, revokedAt: null },
      select: { credentialId: true, transports: true },
    });

    const registrationOptions = await ceremonies.generateRegistrationOptions({
      rpName: settings.rpName,
      rpID: settings.rpId,
      userName: user.email || user.phone || user.username,
      userID: new TextEncoder().encode(user.id),
      userDisplayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username,
      attestationType: "none",
      excludeCredentials: existing.map((credential) => ({
        id: credential.credentialId,
        transports: credential.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    });

    await challengeStore.saveRegistrationChallenge(userId, registrationOptions.challenge, REGISTRATION_CHALLENGE_TTL_MS);
    return res.json({ success: true, data: registrationOptions, error: null, requestId: apiRequestId });
  });

  router.post("/passkeys/register/verify", requireEnabled, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const apiRequestId = requestId();
    const settings = (res.locals as any).webAuthnSettings as WebAuthnSettings;
    const userId = req.user!.id;
    const response = req.body?.response as RegistrationResponseJSON | undefined;
    const deviceLabel = typeof req.body?.deviceLabel === "string" ? req.body.deviceLabel.slice(0, 80) : null;
    if (!response) {
      return res.status(400).json({ success: false, code: "PASSKEY_RESPONSE_REQUIRED", error: "A registration response is required.", requestId: apiRequestId });
    }

    const challenge = await challengeStore.consumeRegistrationChallenge(userId);
    if (!challenge) {
      return res.status(409).json({ success: false, code: "PASSKEY_CHALLENGE_EXPIRED", error: "Registration session expired. Try again.", requestId: apiRequestId });
    }

    try {
      const verification = await ceremonies.verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: settings.origins,
        expectedRPID: settings.rpId,
      });
      if (!verification.verified || !verification.registrationInfo) {
        metrics.increment("auth_passkey_enrollment_total", { result: "FAILURE" });
        return res.status(400).json({ success: false, code: "PASSKEY_VERIFICATION_FAILED", error: "Could not verify the passkey.", requestId: apiRequestId });
      }
      const { credential, credentialBackedUp } = verification.registrationInfo;
      await prisma.passkeyCredential.create({
        data: {
          userId,
          credentialId: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: credential.transports || [],
          deviceLabel,
          backedUp: credentialBackedUp,
        },
      });
      metrics.increment("auth_passkey_enrollment_total", { result: "SUCCESS" });
      return res.status(201).json({ success: true, data: { registered: true }, error: null, requestId: apiRequestId });
    } catch (error: any) {
      metrics.increment("auth_passkey_enrollment_total", { result: "FAILURE" });
      if (error?.code === "P2002") {
        return res.status(409).json({ success: false, code: "PASSKEY_ALREADY_REGISTERED", error: "This passkey is already registered.", requestId: apiRequestId });
      }
      console.error("Passkey registration verify error:", error?.message);
      return res.status(400).json({ success: false, code: "PASSKEY_VERIFICATION_FAILED", error: "Could not verify the passkey.", requestId: apiRequestId });
    }
  });

  router.post("/passkeys/authenticate/options", requireEnabled, async (_req: Request, res: Response) => {
    const apiRequestId = requestId();
    const settings = (res.locals as any).webAuthnSettings as WebAuthnSettings;
    const authenticationOptions = await ceremonies.generateAuthenticationOptions({
      rpID: settings.rpId,
      userVerification: "preferred",
    });
    const challengeId = crypto.randomUUID();
    await challengeStore.saveAuthenticationChallenge(challengeId, authenticationOptions.challenge, AUTHENTICATION_CHALLENGE_TTL_MS);
    return res.json({ success: true, data: { challengeId, options: authenticationOptions }, error: null, requestId: apiRequestId });
  });

  router.post("/passkeys/authenticate/verify", requireEnabled, async (req: Request, res: Response) => {
    const apiRequestId = requestId();
    const settings = (res.locals as any).webAuthnSettings as WebAuthnSettings;
    const challengeId = typeof req.body?.challengeId === "string" ? req.body.challengeId.trim() : "";
    const response = req.body?.response as AuthenticationResponseJSON | undefined;
    if (!challengeId || !response) {
      return res.status(400).json({ success: false, code: "PASSKEY_RESPONSE_REQUIRED", error: "An authentication response is required.", requestId: apiRequestId });
    }
    const challenge = await challengeStore.consumeAuthenticationChallenge(challengeId);
    if (!challenge) {
      metrics.increment("auth_passkey_login_total", { result: "FAILURE" });
      return res.status(409).json({ success: false, code: "PASSKEY_CHALLENGE_EXPIRED", error: "This sign-in attempt expired. Try again.", requestId: apiRequestId });
    }

    const stored = await prisma.passkeyCredential.findUnique({ where: { credentialId: response.id } });
    if (!stored || stored.revokedAt) {
      metrics.increment("auth_passkey_login_total", { result: "FAILURE" });
      return res.status(401).json({ success: false, code: "PASSKEY_UNKNOWN", error: "This passkey is not recognized.", requestId: apiRequestId });
    }

    const credential: WebAuthnCredential = {
      id: stored.credentialId,
      publicKey: new Uint8Array(stored.publicKey),
      counter: Number(stored.counter),
      transports: stored.transports as AuthenticatorTransportFuture[],
    };

    try {
      const verification = await ceremonies.verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: settings.origins,
        expectedRPID: settings.rpId,
        credential,
      });
      if (!verification.verified) {
        metrics.increment("auth_passkey_login_total", { result: "FAILURE" });
        return res.status(401).json({ success: false, code: "PASSKEY_VERIFICATION_FAILED", error: "Could not verify the passkey.", requestId: apiRequestId });
      }

      const { newCounter } = verification.authenticationInfo;
      // Most platform authenticators (Face ID/Touch ID/Windows Hello) never
      // increment the counter and always report 0 — that is normal, not a
      // clone signal. Only a *used* counter that fails to advance indicates a
      // cloned authenticator.
      const counterLooksReused = (newCounter > 0 || credential.counter > 0) && newCounter <= credential.counter;
      if (counterLooksReused) {
        await prisma.passkeyCredential.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
        metrics.increment("auth_passkey_login_total", { result: "REUSE_DETECTED" });
        return res.status(401).json({ success: false, code: "PASSKEY_REUSE_DETECTED", error: "This passkey was revoked for safety. Sign in with another method.", requestId: apiRequestId });
      }

      const user = await prisma.user.findUnique({ where: { id: stored.userId } });
      if (!user || !user.isActive) {
        metrics.increment("auth_passkey_login_total", { result: "FAILURE" });
        return res.status(401).json({ success: false, code: "ACCOUNT_INACTIVE", error: "This account is not available.", requestId: apiRequestId });
      }

      await prisma.$transaction([
        prisma.passkeyCredential.update({
          where: { id: stored.id },
          data: { counter: BigInt(newCounter), lastUsedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date(), loginCount: { increment: 1 }, failedAttempts: 0, lockedUntil: null },
        }),
      ]);

      metrics.increment("auth_passkey_login_total", { result: "SUCCESS" });
      metrics.increment("auth_login_completed_total", { method: "PASSKEY", new_or_returning: "RETURNING" });
      const tokens = await issueTokens(user, options, prisma, req);
      return res.json({ success: true, data: { user: publicUser(user), tokens }, error: null, requestId: apiRequestId });
    } catch (error: any) {
      metrics.increment("auth_passkey_login_total", { result: "FAILURE" });
      console.error("Passkey authenticate verify error:", error?.message);
      return res.status(401).json({ success: false, code: "PASSKEY_VERIFICATION_FAILED", error: "Could not verify the passkey.", requestId: apiRequestId });
    }
  });

  router.get("/me/passkeys", requireEnabled, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const apiRequestId = requestId();
    const credentials = await prisma.passkeyCredential.findMany({
      where: { userId: req.user!.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, deviceLabel: true, transports: true, backedUp: true, createdAt: true, lastUsedAt: true },
    });
    return res.json({ success: true, data: { passkeys: credentials }, error: null, requestId: apiRequestId });
  });

  router.delete("/me/passkeys/:credentialId", requireEnabled, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    const apiRequestId = requestId();
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    const decoded = token ? (jwt.decode(token) as { iat?: number } | null) : null;
    const issuedAt = typeof decoded?.iat === "number" ? decoded.iat * 1000 : 0;
    if (!issuedAt || Date.now() - issuedAt > stepUpWindowMs) {
      return res.status(403).json({ success: false, code: "STEP_UP_REQUIRED", error: "Sign in again to remove a passkey.", requestId: apiRequestId });
    }

    const rowId = req.params.credentialId;
    const inventory = await buildIdentityInventory(prisma, req.user!.id);
    const decision = canRemoveIdentity(inventory, "PASSKEY");
    if (decision.allowed === false) {
      return res.status(409).json({ success: false, code: decision.code, error: "This is your only sign-in method. Add another before removing it.", requestId: apiRequestId });
    }

    const result = await prisma.passkeyCredential.updateMany({
      where: { id: rowId, userId: req.user!.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      return res.status(404).json({ success: false, code: "PASSKEY_NOT_FOUND", error: "Passkey not found.", requestId: apiRequestId });
    }
    return res.json({ success: true, data: { removed: true }, error: null, requestId: apiRequestId });
  });

  return router;
}
