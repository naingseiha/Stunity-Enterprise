import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import passwordlessRoutes from "./passwordless.routes";
import { createMemoryOtpChallengeStoreForTests } from "../passwordless/otpChallengeStore";
import type { VerificationChannelProvider } from "../passwordless/verificationProvider";

test("new phone is verified before enrollment and no empty User is created", async (t) => {
  const previousFlag = process.env.PASSWORDLESS_AUTH_ENABLED;
  process.env.PASSWORDLESS_AUTH_ENABLED = "true";
  t.after(() => {
    if (previousFlag === undefined) delete process.env.PASSWORDLESS_AUTH_ENABLED;
    else process.env.PASSWORDLESS_AUTH_ENABLED = previousFlag;
  });

  let deliveredCode = "";
  let userCreateCalls = 0;
  const auditEvents: any[] = [];
  const telegram: VerificationChannelProvider = {
    channel: "TELEGRAM",
    canSend: async () => ({ available: true }),
    send: async (input) => {
      deliveredCode = input.code;
      return { receiptId: "receipt-1", acceptedAt: new Date() };
    },
  };
  const prisma = {
    otpAuthAuditEvent: { create: async ({ data }: any) => { auditEvents.push(data); return { id: "audit", ...data }; } },
    verifiedContact: { findUnique: async () => null },
    user: { create: async () => { userCreateCalls += 1; return {}; } },
  };
  const app = express();
  app.use(express.json());
  app.use(passwordlessRoutes(prisma as any, {
    jwtSecret: "test-secret",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    store: createMemoryOtpChallengeStoreForTests(),
    providers: { telegram },
  }));
  let server: ReturnType<typeof app.listen>;
  try {
    server = app.listen(0);
  } catch (error: any) {
    if (error?.code === "EPERM") {
      t.skip("sandbox does not permit binding a local test server");
      return;
    }
    throw error;
  }
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const startResponse = await fetch(`${baseUrl}/otp/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "012123456", preferredChannel: "AUTO", deviceId: "device-12345" }),
  });
  const started: any = await startResponse.json();
  assert.equal(startResponse.status, 202);
  assert.equal(started.data.channel, "TELEGRAM");
  assert.match(deliveredCode, /^\d{6}$/);
  assert.equal(userCreateCalls, 0);
  assert.deepEqual(auditEvents.map((event) => event.eventType), ["REQUESTED", "SENT"]);
  assert.ok(auditEvents.every((event) => !JSON.stringify(event).includes(deliveredCode)));
  assert.ok(auditEvents.every((event) => event.destinationHash !== "+85512123456"));

  const verifyResponse = await fetch(`${baseUrl}/otp/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: started.data.challengeId, code: deliveredCode, deviceId: "device-12345" }),
  });
  const verified: any = await verifyResponse.json();
  assert.equal(verifyResponse.status, 200);
  assert.equal(verified.data.status, "ENROLLMENT_REQUIRED");
  assert.ok(verified.data.enrollmentToken);
  assert.equal(userCreateCalls, 0);
  assert.equal(auditEvents[auditEvents.length - 1]?.eventType, "VERIFIED");
});

test("existing-user OTP response redacts plaintext legacy claim data", async (t) => {
  const previousFlag = process.env.PASSWORDLESS_AUTH_ENABLED;
  process.env.PASSWORDLESS_AUTH_ENABLED = "true";
  t.after(() => {
    if (previousFlag === undefined) delete process.env.PASSWORDLESS_AUTH_ENABLED;
    else process.env.PASSWORDLESS_AUTH_ENABLED = previousFlag;
  });

  let deliveredCode = "";
  const user = {
    id: "user-1",
    email: null,
    phone: "+85512123456",
    username: "sokha",
    firstName: "Sokha",
    lastName: "Chan",
    role: "STUDENT",
    accountType: "SOCIAL_ONLY",
    schoolId: "school-1",
    schoolAccessVersion: 0,
    linkingStatus: "PENDING",
    pendingLinkData: {
      code: "SECRET-CLAIM-CODE",
      schoolId: "school-1",
      schoolName: "Example School",
      type: "STUDENT",
      studentId: "student-1",
      submittedAt: "2026-07-20T00:00:00.000Z",
    },
    profilePictureUrl: null,
    isActive: true,
  };
  const telegram: VerificationChannelProvider = {
    channel: "TELEGRAM",
    canSend: async () => ({ available: true }),
    send: async (input) => {
      deliveredCode = input.code;
      return { receiptId: "receipt-1", acceptedAt: new Date() };
    },
  };
  const prisma = {
    otpAuthAuditEvent: { create: async () => ({ id: "audit" }) },
    verifiedContact: { findUnique: async () => ({ userId: user.id, disabledAt: null, user }) },
    user: { update: async () => user },
  };
  const app = express();
  app.use(express.json());
  app.use(passwordlessRoutes(prisma as any, {
    jwtSecret: "test-secret",
    accessTokenExpiration: "15m",
    refreshTokenExpiration: "90d",
    store: createMemoryOtpChallengeStoreForTests(),
    providers: { telegram },
  }));
  let server: ReturnType<typeof app.listen>;
  try {
    server = app.listen(0);
  } catch (error: any) {
    if (error?.code === "EPERM") {
      t.skip("sandbox does not permit binding a local test server");
      return;
    }
    throw error;
  }
  t.after(() => server.close());
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const startResponse = await fetch(`${baseUrl}/otp/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "012123456", preferredChannel: "AUTO", deviceId: "device-12345" }),
  });
  const started: any = await startResponse.json();
  const verifyResponse = await fetch(`${baseUrl}/otp/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeId: started.data.challengeId, code: deliveredCode, deviceId: "device-12345" }),
  });
  const verified: any = await verifyResponse.json();
  assert.equal(verifyResponse.status, 200);
  assert.equal(verified.data.user.pendingLinkData.code, undefined);
  assert.equal(verified.data.user.pendingLinkData.studentId, undefined);
  assert.deepEqual(verified.data.user.pendingLinkData, {
    schoolId: "school-1",
    schoolName: "Example School",
    type: "STUDENT",
    submittedAt: "2026-07-20T00:00:00.000Z",
  });
  assert.ok(!JSON.stringify(verified).includes("SECRET-CLAIM-CODE"));
});
