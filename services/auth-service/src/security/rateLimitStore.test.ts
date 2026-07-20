import assert from "node:assert/strict";
import test from "node:test";
import { createSharedRateLimitStore } from "./rateLimitStore";

test("production auth refuses process-local rate limiting when Redis is not configured", () => {
  const previous = {
    nodeEnv: process.env.NODE_ENV,
    authRedis: process.env.AUTH_RATE_LIMIT_REDIS_URL,
    redis: process.env.REDIS_URL,
  };

  try {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_RATE_LIMIT_REDIS_URL;
    delete process.env.REDIS_URL;
    assert.throws(
      () => createSharedRateLimitStore("test"),
      /AUTH_RATE_LIMIT_REDIS_URL or REDIS_URL is required/,
    );
  } finally {
    if (previous.nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.nodeEnv;
    if (previous.authRedis === undefined)
      delete process.env.AUTH_RATE_LIMIT_REDIS_URL;
    else process.env.AUTH_RATE_LIMIT_REDIS_URL = previous.authRedis;
    if (previous.redis === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previous.redis;
  }
});
