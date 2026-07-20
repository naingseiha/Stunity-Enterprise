import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryOtpChallengeStoreForTests, type OtpChallenge } from "./otpChallengeStore";

function challenge(overrides: Partial<OtpChallenge> = {}): OtpChallenge {
  return {
    id: "otp-1",
    normalizedDestination: "+85512123456",
    destinationHash: "destination-hash",
    codeHash: "code-hash",
    purpose: "SIGN_IN",
    deviceId: "device-12345",
    channel: "TEST",
    createdAt: Date.now(),
    expiresAt: Date.now() + 300_000,
    resendAt: Date.now() + 60_000,
    attempts: 0,
    maxAttempts: 5,
    ...overrides,
  };
}

test("a replacement challenge invalidates the prior challenge", async () => {
  const store = createMemoryOtpChallengeStoreForTests();
  await store.save(challenge());
  await store.save(challenge({ id: "otp-2" }));
  assert.equal(await store.get("otp-1"), null);
  assert.equal((await store.get("otp-2"))?.id, "otp-2");
});

test("OTP challenges are one-time and device bound", async () => {
  const store = createMemoryOtpChallengeStoreForTests();
  await store.save(challenge());
  assert.equal(await store.consume("otp-1", "code-hash", "wrong-device"), false);
  assert.equal(await store.consume("otp-1", "code-hash", "device-12345"), true);
  assert.equal(await store.consume("otp-1", "code-hash", "device-12345"), false);
});

test("five failed attempts lock a challenge", async () => {
  const store = createMemoryOtpChallengeStoreForTests();
  await store.save(challenge());
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const result = await store.failAttempt("otp-1");
    assert.equal(result.locked, attempt === 5);
  }
  assert.equal(await store.get("otp-1"), null);
});

test("enrollment nonce can be consumed only once", async () => {
  const store = createMemoryOtpChallengeStoreForTests();
  await store.saveEnrollment("nonce-1", "destination-hash", 60_000);
  assert.equal(await store.consumeEnrollment("nonce-1", "wrong-hash"), false);
  await store.saveEnrollment("nonce-2", "destination-hash", 60_000);
  assert.equal(await store.consumeEnrollment("nonce-2", "destination-hash"), true);
  assert.equal(await store.consumeEnrollment("nonce-2", "destination-hash"), false);
});

test("provider budgets stop paid sends after the configured daily limit", async () => {
  const previous = process.env.OTP_DAILY_SMS_LIMIT;
  process.env.OTP_DAILY_SMS_LIMIT = "2";
  try {
    const store = createMemoryOtpChallengeStoreForTests();
    await store.consumeProviderBudget("SMS");
    await store.consumeProviderBudget("SMS");
    await assert.rejects(() => store.consumeProviderBudget("SMS"), { code: "OTP_PROVIDER_BUDGET_EXCEEDED" });
  } finally {
    if (previous === undefined) delete process.env.OTP_DAILY_SMS_LIMIT;
    else process.env.OTP_DAILY_SMS_LIMIT = previous;
  }
});

test("known users are rate limited across changing phone destinations", async () => {
  const store = createMemoryOtpChallengeStoreForTests();
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await store.assertStartAllowed({
      destinationHash: `phone-${attempt}`,
      deviceId: `device-${attempt}-1234`,
      ipAddress: `192.0.2.${attempt}`,
      purpose: "SIGN_IN",
      userId: "user-known-1",
    });
  }
  await assert.rejects(
    () => store.assertStartAllowed({
      destinationHash: "phone-6",
      deviceId: "device-6-1234",
      ipAddress: "192.0.2.6",
      purpose: "SIGN_IN",
      userId: "user-known-1",
    }),
    { code: "OTP_RATE_LIMITED" },
  );
});
