import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPasswordlessProductionConfig,
  buildPasswordlessReadiness,
  readPasswordlessConfig,
} from "./providerConfig";

test("disabled passwordless config does not require provider secrets", () => {
  const config = readPasswordlessConfig({ NODE_ENV: "production", PASSWORDLESS_AUTH_ENABLED: "false" });
  assert.deepEqual(config.errors, []);
  assert.equal(config.telegramMode, "NONE");
});

test("production passwordless config requires HMAC, Redis, and a provider", () => {
  assert.throws(
    () => assertPasswordlessProductionConfig({ NODE_ENV: "production", PASSWORDLESS_AUTH_ENABLED: "true" }),
    /OTP_HMAC_SECRET.*REDIS_URL.*provider/,
  );
});

test("direct Telegram plus Redis is production-ready but warns about rollout gaps", () => {
  const config = readPasswordlessConfig({
    NODE_ENV: "production",
    PASSWORDLESS_AUTH_ENABLED: "true",
    OTP_HMAC_SECRET: "x".repeat(32),
    REDIS_URL: "redis://redis:6379",
    TELEGRAM_GATEWAY_ACCESS_TOKEN: "telegram-secret",
    OTP_DAILY_TELEGRAM_LIMIT: "1000",
  });
  assert.deepEqual(config.errors, []);
  assert.equal(config.telegramMode, "DIRECT");
  assert.equal(config.smsMode, "NONE");
  assert.equal(config.warnings.length, 2);
});

test("local test code is recognized only outside production", () => {
  assert.equal(readPasswordlessConfig({ NODE_ENV: "development", OTP_LOCAL_TEST_CODE: "123456" }).localTestConfigured, true);
  assert.equal(readPasswordlessConfig({ NODE_ENV: "production", OTP_LOCAL_TEST_CODE: "123456" }).localTestConfigured, false);
});

test("disabled passwordless remains ready for legacy password traffic", () => {
  assert.deepEqual(buildPasswordlessReadiness({ NODE_ENV: "production", PASSWORDLESS_AUTH_ENABLED: "false" }), {
    ready: true,
    status: "disabled",
    sharedState: false,
    hmac: false,
    observability: false,
    providers: { telegram: "NONE", sms: "NONE", localTest: false },
    errors: [],
    warnings: [],
  });
});

test("enabled local QA requires a delivery path", () => {
  const unavailable = buildPasswordlessReadiness({
    NODE_ENV: "development",
    PASSWORDLESS_AUTH_ENABLED: "true",
  });
  assert.equal(unavailable.ready, false);
  assert.equal(unavailable.status, "not_ready");

  const localTest = buildPasswordlessReadiness({
    NODE_ENV: "development",
    PASSWORDLESS_AUTH_ENABLED: "true",
    OTP_LOCAL_TEST_CODE: "123456",
  });
  assert.equal(localTest.ready, true);
  assert.equal(localTest.providers.localTest, true);
});

test("production rollout readiness requires bounded operational metrics", () => {
  const env = {
    NODE_ENV: "production",
    PASSWORDLESS_AUTH_ENABLED: "true",
    OTP_HMAC_SECRET: "x".repeat(32),
    REDIS_URL: "redis://redis:6379",
    TELEGRAM_GATEWAY_ACCESS_TOKEN: "telegram-secret",
    OTP_DAILY_TELEGRAM_LIMIT: "1000",
  };
  const withoutMetrics = buildPasswordlessReadiness(env);
  assert.equal(withoutMetrics.ready, false);
  assert.equal(withoutMetrics.observability, false);

  const withMetrics = buildPasswordlessReadiness({ ...env, AUTH_STRUCTURED_METRICS_ENABLED: "true" });
  assert.equal(withMetrics.ready, true);
  assert.equal(withMetrics.observability, true);
});
