import assert from "node:assert/strict";
import test from "node:test";
import { assertPasswordlessProductionConfig, readPasswordlessConfig } from "./providerConfig";

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

test("direct Telegram plus Redis is production-ready but warns without SMS fallback", () => {
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
  assert.equal(config.warnings.length, 1);
});

test("local test code is recognized only outside production", () => {
  assert.equal(readPasswordlessConfig({ NODE_ENV: "development", OTP_LOCAL_TEST_CODE: "123456" }).localTestConfigured, true);
  assert.equal(readPasswordlessConfig({ NODE_ENV: "production", OTP_LOCAL_TEST_CODE: "123456" }).localTestConfigured, false);
});
