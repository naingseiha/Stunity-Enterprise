import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { Prisma, type PrismaClient } from "@prisma/client";
import { generateUniqueUsername } from "../utils/username";
import { normalizePhone } from "../security/identifiers";
import {
  createOtpChallengeStore,
  newOtpChallengeId,
  type OtpChallenge,
  type OtpChallengeStore,
} from "../passwordless/otpChallengeStore";
import {
  generateOtpCode,
  hashOtp,
  hashOtpDestination,
  safeHashEquals,
} from "../passwordless/otpCrypto";
import {
  createVerificationProviders,
  selectVerificationProvider,
  type PreferredVerificationChannel,
  type VerificationProviders,
} from "../passwordless/verificationProvider";
import {
  createStructuredAuthMetrics,
  type AuthOperationalMetrics,
} from "../observability/authOperationalMetrics";

type PasswordlessRouteOptions = {
  jwtSecret: string;
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
  store?: OtpChallengeStore;
  providers?: VerificationProviders;
  metrics?: AuthOperationalMetrics;
};

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const ENROLLMENT_TTL_MS = 10 * 60 * 1000;

function maskPhone(phone: string): string {
  const visiblePrefix = phone.slice(0, Math.min(6, Math.max(4, phone.length - 6)));
  const visibleSuffix = phone.slice(-3);
  return `${visiblePrefix} ${"*".repeat(Math.max(3, phone.length - visiblePrefix.length - 3))} ${visibleSuffix}`;
}

function requestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, "")}`;
}

function publicPendingLinkData(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  return {
    schoolId: typeof data.schoolId === "string" ? data.schoolId : null,
    schoolName: typeof data.schoolName === "string" ? data.schoolName : null,
    type: typeof data.type === "string" ? data.type : null,
    submittedAt: typeof data.submittedAt === "string" ? data.submittedAt : null,
  };
}

function issueTokens(user: {
  id: string;
  email: string | null;
  role: string;
  schoolId: string | null;
  accountType: string;
  schoolAccessVersion: number;
}, options: PasswordlessRouteOptions) {
  const accessToken = jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId,
    accountType: user.accountType,
    schoolAccessVersion: user.schoolAccessVersion,
  }, options.jwtSecret, { expiresIn: options.accessTokenExpiration } as jwt.SignOptions);
  const refreshToken = jwt.sign(
    { userId: user.id },
    options.jwtSecret,
    { expiresIn: options.refreshTokenExpiration } as jwt.SignOptions,
  );
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
    linkingStatus: user.linkingStatus,
    // The legacy projection can contain a plaintext claim code and roster
    // identifiers. Keep the user-facing response limited to status metadata;
    // claim preview/confirmation must go through the authenticated school-link
    // service instead.
    pendingLinkData: publicPendingLinkData(user.pendingLinkData),
    profilePictureUrl: user.profilePictureUrl,
  };
}

export default function passwordlessRoutes(prisma: PrismaClient, options: PasswordlessRouteOptions) {
  const router = Router();
  const store = options.store || createOtpChallengeStore();
  const providers = options.providers || createVerificationProviders();
  const metrics = options.metrics || createStructuredAuthMetrics();

  const requireEnabled = (_req: Request, res: Response, next: () => void) => {
    if (process.env.PASSWORDLESS_AUTH_ENABLED !== "true") {
      return res.status(503).json({
        success: false,
        code: "PASSWORDLESS_AUTH_DISABLED",
        error: "Passwordless authentication is not enabled for this environment.",
      });
    }
    next();
  };

  router.use("/otp", requireEnabled);
  router.use("/enroll", requireEnabled);

  router.post("/otp/start", async (req: Request, res: Response) => {
    const apiRequestId = requestId();
    const phone = normalizePhone(typeof req.body?.phone === "string" ? req.body.phone : "");
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";
    const preferred = typeof req.body?.preferredChannel === "string"
      ? req.body.preferredChannel.toUpperCase()
      : "AUTO";
    if (!phone) return res.status(400).json({ success: false, code: "PHONE_INVALID", error: "Enter a valid phone number.", requestId: apiRequestId });
    if (deviceId.length < 8 || deviceId.length > 128) {
      return res.status(400).json({ success: false, code: "DEVICE_ID_INVALID", error: "A valid device identifier is required.", requestId: apiRequestId });
    }
    if (!(["AUTO", "TELEGRAM", "SMS"] as string[]).includes(preferred)) {
      return res.status(400).json({ success: false, code: "OTP_CHANNEL_INVALID", error: "Invalid verification channel.", requestId: apiRequestId });
    }

    const destinationHash = hashOtpDestination(phone);
    const ipAddress = req.ip || "unknown";
    // Resolve only an already-verified, active contact for abuse limiting. The
    // response remains enumeration-safe and new-phone enrollment is unaffected.
    let knownUserId: string | undefined;
    try {
      const knownContact = await prisma.verifiedContact.findUnique({
        where: { type_normalizedValue: { type: "PHONE", normalizedValue: phone } },
        select: { userId: true, disabledAt: true, user: { select: { isActive: true } } },
      });
      if (knownContact && !knownContact.disabledAt && knownContact.user.isActive) knownUserId = knownContact.userId;
    } catch {
      // A lookup failure must not turn a generic OTP request into an account
      // existence signal; phone/device/IP limits still apply below.
    }
    try {
      await store.assertStartAllowed({ destinationHash, deviceId, ipAddress, purpose: "SIGN_IN", userId: knownUserId });
    } catch (error: any) {
      metrics.increment("auth_otp_failed_total", {
        channel: "UNKNOWN",
        reason: error.code || "OTP_RATE_LIMITED",
      });
      await prisma.otpAuthAuditEvent.create({
        data: { destinationHash, eventType: "RATE_LIMITED", purpose: "SIGN_IN", reasonCode: error.code || "OTP_RATE_LIMITED", ipAddress },
      }).catch(() => undefined);
      const code = error.code === "OTP_RESEND_TOO_SOON" ? "OTP_RESEND_TOO_SOON" : "OTP_RATE_LIMITED";
      return res.status(429).json({ success: false, code, error: code === "OTP_RESEND_TOO_SOON" ? "Wait before requesting another code." : "Too many verification requests. Try again later.", requestId: apiRequestId });
    }

    let selected;
    try {
      selected = await selectVerificationProvider(providers, phone, preferred as PreferredVerificationChannel);
    } catch (error: any) {
      metrics.increment("auth_otp_failed_total", {
        channel: "UNKNOWN",
        reason: error.code || "OTP_CHANNEL_UNAVAILABLE",
      });
      await prisma.otpAuthAuditEvent.create({
        data: { destinationHash, eventType: "FAILED", purpose: "SIGN_IN", reasonCode: error.code || "OTP_CHANNEL_UNAVAILABLE", ipAddress },
      }).catch(() => undefined);
      return res.status(503).json({ success: false, code: "OTP_CHANNEL_UNAVAILABLE", error: "Verification delivery is temporarily unavailable.", requestId: apiRequestId });
    }

    const now = Date.now();
    const challengeId = newOtpChallengeId();
    const code = generateOtpCode();
    const challenge: OtpChallenge = {
      id: challengeId,
      normalizedDestination: phone,
      destinationHash,
      codeHash: hashOtp(challengeId, phone, code),
      purpose: "SIGN_IN",
      deviceId,
      channel: selected.provider.channel,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
      resendAt: now + OTP_RESEND_MS,
      attempts: 0,
      maxAttempts: 5,
    };
    metrics.increment("auth_otp_started_total", { channel: challenge.channel, purpose: challenge.purpose });
    if (preferred === "AUTO" && challenge.channel === "SMS" && providers.telegram) {
      metrics.increment("auth_otp_fallback_total", { from: "TELEGRAM", to: "SMS" });
    }

    try {
      await prisma.otpAuthAuditEvent.create({
        data: { challengeId, destinationHash, eventType: "REQUESTED", channel: challenge.channel, purpose: challenge.purpose, ipAddress },
      });
      if (challenge.channel !== "TEST") await store.consumeProviderBudget(challenge.channel);
      const receipt = await selected.provider.send({
        destination: phone,
        code,
        ttlSeconds: Math.floor(OTP_TTL_MS / 1000),
        requestId: challengeId,
        providerRequestId: selected.providerRequestId,
      });
      challenge.receiptId = receipt.receiptId;
      await store.save(challenge);
      await prisma.otpAuthAuditEvent.create({
        data: { challengeId, destinationHash, eventType: "SENT", channel: challenge.channel, purpose: challenge.purpose, ipAddress },
      });
      metrics.increment("auth_otp_delivered_total", { channel: challenge.channel });
      return res.status(202).json({
        success: true,
        data: {
          challengeId,
          channel: challenge.channel,
          maskedDestination: maskPhone(phone),
          expiresAt: new Date(challenge.expiresAt).toISOString(),
          resendAt: new Date(challenge.resendAt).toISOString(),
          smsFallbackAvailable: selected.smsFallbackAvailable,
        },
        error: null,
        requestId: apiRequestId,
      });
    } catch (error: any) {
      metrics.increment("auth_otp_failed_total", {
        channel: challenge.channel,
        reason: error?.code || "OTP_DELIVERY_FAILED",
      });
      await store.delete(challengeId).catch(() => undefined);
      await prisma.otpAuthAuditEvent.create({
        data: {
          challengeId,
          destinationHash,
          eventType: error?.code === "OTP_PROVIDER_BUDGET_EXCEEDED" ? "RATE_LIMITED" : "FAILED",
          channel: challenge.channel,
          purpose: challenge.purpose,
          reasonCode: error?.code || "OTP_DELIVERY_FAILED",
          ipAddress,
        },
      }).catch(() => undefined);
      const responseCode = error?.code === "OTP_PROVIDER_BUDGET_EXCEEDED" ? "OTP_PROVIDER_BUDGET_EXCEEDED" : "OTP_DELIVERY_FAILED";
      return res.status(error?.code === "OTP_PROVIDER_BUDGET_EXCEEDED" ? 429 : 503).json({
        success: false,
        code: responseCode,
        error: responseCode === "OTP_PROVIDER_BUDGET_EXCEEDED"
          ? "Verification delivery has reached today's safety limit. Try again later."
          : "Verification delivery is temporarily unavailable.",
        requestId: apiRequestId,
      });
    }
  });

  router.post("/otp/verify", async (req: Request, res: Response) => {
    const apiRequestId = requestId();
    const challengeId = typeof req.body?.challengeId === "string" ? req.body.challengeId.trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";
    if (!challengeId || !/^\d{6}$/.test(code) || !deviceId) {
      metrics.increment("auth_otp_failed_total", { channel: "UNKNOWN", reason: "OTP_INVALID" });
      return res.status(400).json({ success: false, code: "OTP_INVALID", error: "The verification code is invalid or expired.", requestId: apiRequestId });
    }

    const challenge = await store.get(challengeId);
    if (!challenge || challenge.deviceId !== deviceId || challenge.expiresAt <= Date.now()) {
      metrics.increment("auth_otp_failed_total", { channel: challenge?.channel || "UNKNOWN", reason: "OTP_INVALID" });
      return res.status(400).json({ success: false, code: "OTP_INVALID", error: "The verification code is invalid or expired.", requestId: apiRequestId });
    }
    const providedHash = hashOtp(challenge.id, challenge.normalizedDestination, code);
    if (!safeHashEquals(providedHash, challenge.codeHash)) {
      const attempt = await store.failAttempt(challenge.id);
      metrics.increment("auth_otp_failed_total", {
        channel: challenge.channel,
        reason: attempt.locked ? "OTP_ATTEMPTS_EXHAUSTED" : "OTP_CODE_MISMATCH",
      });
      await prisma.otpAuthAuditEvent.create({
        data: {
          challengeId,
          destinationHash: challenge.destinationHash,
          eventType: "FAILED",
          channel: challenge.channel,
          purpose: challenge.purpose,
          reasonCode: attempt.locked ? "OTP_ATTEMPTS_EXHAUSTED" : "OTP_CODE_MISMATCH",
          ipAddress: req.ip,
          metadata: { attempt: attempt.attempts },
        },
      }).catch(() => undefined);
      return res.status(400).json({ success: false, code: "OTP_INVALID", error: "The verification code is invalid or expired.", requestId: apiRequestId });
    }
    const provider = challenge.channel === "TELEGRAM" ? providers.telegram : undefined;
    if (provider?.verify && challenge.receiptId) {
      const providerVerification = await provider.verify({ receiptId: challenge.receiptId, code });
      if (!providerVerification.valid) {
        metrics.increment("auth_otp_failed_total", {
          channel: challenge.channel,
          reason: providerVerification.reasonCode || "TELEGRAM_CODE_INVALID",
        });
        await prisma.otpAuthAuditEvent.create({
          data: {
            challengeId,
            destinationHash: challenge.destinationHash,
            eventType: "FAILED",
            channel: challenge.channel,
            purpose: challenge.purpose,
            reasonCode: providerVerification.reasonCode || "TELEGRAM_CODE_INVALID",
            ipAddress: req.ip,
          },
        }).catch(() => undefined);
        return res.status(400).json({ success: false, code: "OTP_INVALID", error: "The verification code is invalid or expired.", requestId: apiRequestId });
      }
    }
    if (!(await store.consume(challenge.id, challenge.codeHash, deviceId))) {
      metrics.increment("auth_otp_failed_total", { channel: challenge.channel, reason: "OTP_ALREADY_USED" });
      return res.status(409).json({ success: false, code: "OTP_ALREADY_USED", error: "The verification code has already been used.", requestId: apiRequestId });
    }

    const contact = await prisma.verifiedContact.findUnique({
      where: { type_normalizedValue: { type: "PHONE", normalizedValue: challenge.normalizedDestination } },
      include: { user: true },
    });
    const usableContact = contact && !contact.disabledAt && contact.user.isActive ? contact : null;
    await prisma.otpAuthAuditEvent.create({
      data: {
        challengeId,
        userId: usableContact?.userId,
        destinationHash: challenge.destinationHash,
        eventType: "VERIFIED",
        channel: challenge.channel,
        purpose: challenge.purpose,
        ipAddress: req.ip,
      },
    });
    metrics.increment("auth_otp_verified_total", { channel: challenge.channel });

    if (usableContact) {
      const tokens = issueTokens(usableContact.user, options);
      await prisma.user.update({
        where: { id: usableContact.userId },
        data: { lastLogin: new Date(), loginCount: { increment: 1 }, failedAttempts: 0, lockedUntil: null },
      });
      metrics.increment("auth_login_completed_total", { method: "PHONE_OTP", new_or_returning: "RETURNING" });
      metrics.observe("auth_login_duration_ms", Date.now() - challenge.createdAt, { method: "PHONE_OTP" });
      return res.json({
        success: true,
        data: { status: "AUTHENTICATED", user: publicUser(usableContact.user), tokens },
        error: null,
        requestId: apiRequestId,
      });
    }

    const enrollmentNonce = crypto.randomUUID();
    await store.saveEnrollment(enrollmentNonce, challenge.destinationHash, ENROLLMENT_TTL_MS);
    const enrollmentToken = jwt.sign({
      purpose: "passwordless_enrollment",
      phone: challenge.normalizedDestination,
      destinationHash: challenge.destinationHash,
      deviceId,
      nonce: enrollmentNonce,
      startedAt: challenge.createdAt,
    }, options.jwtSecret, { expiresIn: "10m" });
    return res.json({
      success: true,
      data: { status: "ENROLLMENT_REQUIRED", enrollmentToken },
      error: null,
      requestId: apiRequestId,
    });
  });

  router.post("/enroll", async (req: Request, res: Response) => {
    const apiRequestId = requestId();
    const enrollmentToken = typeof req.body?.enrollmentToken === "string" ? req.body.enrollmentToken : "";
    const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
    const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId.trim() : "";
    const acceptedTermsVersion = typeof req.body?.acceptedTermsVersion === "string" ? req.body.acceptedTermsVersion : "";
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80) {
      return res.status(400).json({ success: false, code: "PROFILE_NAME_INVALID", error: "First and last name are required.", requestId: apiRequestId });
    }
    const requiredTermsVersion = process.env.CURRENT_TERMS_VERSION || "2026-07";
    if (acceptedTermsVersion !== requiredTermsVersion) {
      return res.status(400).json({ success: false, code: "TERMS_VERSION_REQUIRED", error: "Accept the current Terms and Privacy Policy.", requestId: apiRequestId });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(enrollmentToken, options.jwtSecret);
    } catch {
      return res.status(401).json({ success: false, code: "ENROLLMENT_TOKEN_INVALID", error: "Enrollment session expired. Verify your phone again.", requestId: apiRequestId });
    }
    if (
      decoded?.purpose !== "passwordless_enrollment" ||
      typeof decoded.phone !== "string" ||
      typeof decoded.destinationHash !== "string" ||
      typeof decoded.nonce !== "string" ||
      decoded.deviceId !== deviceId
    ) {
      return res.status(401).json({ success: false, code: "ENROLLMENT_TOKEN_INVALID", error: "Enrollment session expired. Verify your phone again.", requestId: apiRequestId });
    }
    if (!(await store.consumeEnrollment(decoded.nonce, decoded.destinationHash))) {
      return res.status(409).json({ success: false, code: "ENROLLMENT_ALREADY_USED", error: "Enrollment session was already used. Verify your phone again.", requestId: apiRequestId });
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
        const existingContact = await tx.verifiedContact.findUnique({
          where: { type_normalizedValue: { type: "PHONE", normalizedValue: decoded.phone } },
        });
        if (existingContact) throw Object.assign(new Error("Contact already exists"), { code: "CONTACT_ALREADY_EXISTS" });

        // A legacy User.phone is not treated as verified identity. It must use
        // password recovery/linking instead of being silently merged.
        const legacyPhone = await tx.user.findUnique({ where: { phone: decoded.phone }, select: { id: true } });
        if (legacyPhone) throw Object.assign(new Error("Legacy phone requires recovery"), { code: "CONTACT_RECOVERY_REQUIRED" });

        const username = await generateUniqueUsername(tx, firstName, lastName);
        const created = await tx.user.create({
          data: {
            phone: decoded.phone,
            username,
            password: "",
            firstName,
            lastName,
            role: "STUDENT",
            accountType: "SOCIAL_ONLY",
            socialFeaturesEnabled: true,
            isDefaultPassword: false,
            isActive: true,
            permissions: { canEnterGrades: false, canViewReports: false, canMarkAttendance: false },
          },
        });
        await tx.verifiedContact.create({
          data: {
            userId: created.id,
            type: "PHONE",
            normalizedValue: decoded.phone,
            displayValue: decoded.phone,
            verifiedAt: new Date(),
            isPrimary: true,
          },
        });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      await prisma.otpAuthAuditEvent.create({
        data: {
          userId: user.id,
          destinationHash: decoded.destinationHash,
          eventType: "ENROLLED",
          channel: "PHONE",
          purpose: "SIGN_IN",
          ipAddress: req.ip,
          metadata: { acceptedTermsVersion },
        },
      });
      metrics.increment("auth_login_completed_total", { method: "PHONE_OTP", new_or_returning: "NEW" });
      const loginStartedAt = typeof decoded.startedAt === "number"
        ? decoded.startedAt
        : typeof decoded.iat === "number"
          ? decoded.iat * 1000
          : Date.now();
      metrics.observe("auth_login_duration_ms", Math.max(0, Date.now() - loginStartedAt), { method: "PHONE_OTP" });
      return res.status(201).json({
        success: true,
        data: { user: publicUser(user), tokens: issueTokens(user, options) },
        error: null,
        requestId: apiRequestId,
      });
    } catch (error: any) {
      if (error?.code === "CONTACT_RECOVERY_REQUIRED") {
        return res.status(409).json({ success: false, code: error.code, error: "This phone belongs to a legacy account. Use password sign-in or account recovery, then add phone verification.", requestId: apiRequestId });
      }
      if (error?.code === "CONTACT_ALREADY_EXISTS" || error?.code === "P2002" || error?.code === "P2034") {
        return res.status(409).json({ success: false, code: "ENROLLMENT_CONFLICT", error: "Account state changed. Sign in again.", requestId: apiRequestId });
      }
      console.error("Passwordless enrollment error:", error);
      return res.status(500).json({ success: false, code: "ENROLLMENT_FAILED", error: "Could not create account.", requestId: apiRequestId });
    }
  });

  return router;
}
