import crypto from "node:crypto";
import type Redis from "ioredis";
import { getSharedAuthRedis } from "../security/rateLimitStore";
import { hashLimitKey } from "./otpCrypto";
import type { VerificationChannel } from "./verificationProvider";

export type OtpChallenge = {
  id: string;
  normalizedDestination: string;
  destinationHash: string;
  codeHash: string;
  purpose: "SIGN_IN";
  deviceId: string;
  channel: VerificationChannel;
  receiptId?: string;
  createdAt: number;
  expiresAt: number;
  resendAt: number;
  attempts: number;
  maxAttempts: number;
};

export type OtpStartLimitInput = { destinationHash: string; deviceId: string; ipAddress: string; purpose: "SIGN_IN" };

export interface OtpChallengeStore {
  assertStartAllowed(input: OtpStartLimitInput): Promise<void>;
  consumeProviderBudget(channel: Exclude<VerificationChannel, "TEST">): Promise<void>;
  save(challenge: OtpChallenge): Promise<void>;
  get(challengeId: string): Promise<OtpChallenge | null>;
  failAttempt(challengeId: string): Promise<{ attempts: number; locked: boolean }>;
  consume(challengeId: string, expectedCodeHash: string, deviceId: string): Promise<boolean>;
  delete(challengeId: string): Promise<void>;
  saveEnrollment(nonce: string, destinationHash: string, ttlMs: number): Promise<void>;
  consumeEnrollment(nonce: string, destinationHash: string): Promise<boolean>;
}

const challengeKey = (id: string) => `stunity:auth:otp:challenge:${id}`;
const currentKey = (challenge: OtpChallenge) =>
  `stunity:auth:otp:current:${challenge.destinationHash}:${hashLimitKey(challenge.deviceId)}:${challenge.purpose}`;
const currentKeyForStart = (input: Pick<OtpStartLimitInput, "destinationHash" | "deviceId" | "purpose">) =>
  `stunity:auth:otp:current:${input.destinationHash}:${hashLimitKey(input.deviceId)}:${input.purpose}`;
const providerBudgetKey = (channel: Exclude<VerificationChannel, "TEST">) =>
  `stunity:auth:otp:budget:${new Date().toISOString().slice(0, 10)}:${channel}`;
const providerBudgetLimit = (channel: Exclude<VerificationChannel, "TEST">): number => {
  const value = Number(process.env[`OTP_DAILY_${channel}_LIMIT`]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

class RedisOtpChallengeStore implements OtpChallengeStore {
  constructor(private readonly redis: Redis) {}

  private async connect() {
    if (this.redis.status === "wait") await this.redis.connect();
  }

  async assertStartAllowed(input: OtpStartLimitInput): Promise<void> {
    await this.connect();
    const previousId = await this.redis.get(currentKeyForStart(input));
    if (previousId) {
      const previousRaw = await this.redis.get(challengeKey(previousId));
      if (previousRaw) {
        const previous = JSON.parse(previousRaw) as OtpChallenge;
        if (previous.resendAt > Date.now()) {
          throw Object.assign(new Error("Wait before requesting another code"), {
            code: "OTP_RESEND_TOO_SOON",
            retryAfterMs: previous.resendAt - Date.now(),
          });
        }
      }
    }
    const limits = [
      [`phone:${input.destinationHash}`, 5, 60 * 60],
      [`device:${hashLimitKey(input.deviceId)}`, 10, 60 * 60],
      [`ip:${hashLimitKey(input.ipAddress)}`, 20, 60 * 60],
    ] as const;
    for (const [key, max, ttlSeconds] of limits) {
      const count = Number(await this.redis.eval(
        `local count = redis.call('INCR', KEYS[1])
         if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
         return count`,
        1,
        `stunity:auth:otp:limit:${key}`,
        String(ttlSeconds),
      ));
      if (count > max) throw Object.assign(new Error("Too many verification requests"), { code: "OTP_RATE_LIMITED" });
    }
  }

  async consumeProviderBudget(channel: Exclude<VerificationChannel, "TEST">): Promise<void> {
    const limit = providerBudgetLimit(channel);
    if (!limit) return;
    await this.connect();
    const result = await this.redis.eval(
      `local count = redis.call('INCR', KEYS[1])
       if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       if count > tonumber(ARGV[2]) then return 0 end
       return count`,
      1,
      providerBudgetKey(channel),
      String(24 * 60 * 60 + 3600),
      String(limit),
    );
    if (Number(result) === 0) {
      throw Object.assign(new Error("Daily verification provider budget reached"), { code: "OTP_PROVIDER_BUDGET_EXCEEDED" });
    }
  }

  async save(challenge: OtpChallenge): Promise<void> {
    await this.connect();
    const pointer = currentKey(challenge);
    const previousId = await this.redis.get(pointer);
    const transaction = this.redis.multi();
    if (previousId) transaction.del(challengeKey(previousId));
    const ttlMs = Math.max(1, challenge.expiresAt - Date.now());
    transaction.set(challengeKey(challenge.id), JSON.stringify(challenge), "PX", ttlMs);
    transaction.set(pointer, challenge.id, "PX", ttlMs);
    await transaction.exec();
  }

  async get(challengeId: string): Promise<OtpChallenge | null> {
    await this.connect();
    const raw = await this.redis.get(challengeKey(challengeId));
    return raw ? JSON.parse(raw) as OtpChallenge : null;
  }

  async failAttempt(challengeId: string): Promise<{ attempts: number; locked: boolean }> {
    await this.connect();
    const result = await this.redis.eval(
      `local raw = redis.call('GET', KEYS[1])
       if not raw then return {-1, 1} end
       local value = cjson.decode(raw)
       value.attempts = value.attempts + 1
       local locked = value.attempts >= value.maxAttempts and 1 or 0
       if locked == 1 then
         redis.call('DEL', KEYS[1])
       else
         local ttl = redis.call('PTTL', KEYS[1])
         redis.call('SET', KEYS[1], cjson.encode(value), 'PX', ttl)
       end
       return {value.attempts, locked}`,
      1,
      challengeKey(challengeId),
    ) as [number, number];
    return { attempts: Number(result[0]), locked: Number(result[1]) === 1 };
  }

  async consume(challengeId: string, expectedCodeHash: string, deviceId: string): Promise<boolean> {
    await this.connect();
    const consumed = await this.redis.eval(
      `local raw = redis.call('GET', KEYS[1])
       if not raw then return 0 end
       local value = cjson.decode(raw)
       if value.codeHash ~= ARGV[1] or value.deviceId ~= ARGV[2] then return 0 end
       redis.call('DEL', KEYS[1])
       return 1`,
      1,
      challengeKey(challengeId),
      expectedCodeHash,
      deviceId,
    );
    return Number(consumed) === 1;
  }

  async delete(challengeId: string): Promise<void> {
    await this.connect();
    await this.redis.del(challengeKey(challengeId));
  }

  async saveEnrollment(nonce: string, destinationHash: string, ttlMs: number): Promise<void> {
    await this.connect();
    await this.redis.set(`stunity:auth:otp:enrollment:${nonce}`, destinationHash, "PX", ttlMs, "NX");
  }

  async consumeEnrollment(nonce: string, destinationHash: string): Promise<boolean> {
    await this.connect();
    const result = await this.redis.eval(
      `local value = redis.call('GET', KEYS[1])
       if not value or value ~= ARGV[1] then return 0 end
       redis.call('DEL', KEYS[1])
       return 1`,
      1,
      `stunity:auth:otp:enrollment:${nonce}`,
      destinationHash,
    );
    return Number(result) === 1;
  }
}

class MemoryOtpChallengeStore implements OtpChallengeStore {
  private challenges = new Map<string, OtpChallenge>();
  private current = new Map<string, string>();
  private limits = new Map<string, { count: number; resetsAt: number }>();
  private enrollments = new Map<string, { destinationHash: string; expiresAt: number }>();
  private providerBudgets = new Map<string, { count: number; day: string }>();

  async assertStartAllowed(input: OtpStartLimitInput): Promise<void> {
    const previousId = this.current.get(currentKeyForStart(input));
    const previous = previousId ? this.challenges.get(previousId) : null;
    if (previous && previous.resendAt > Date.now()) {
      throw Object.assign(new Error("Wait before requesting another code"), {
        code: "OTP_RESEND_TOO_SOON",
        retryAfterMs: previous.resendAt - Date.now(),
      });
    }
    const entries: Array<[string, number]> = [
      [`phone:${input.destinationHash}`, 5],
      [`device:${hashLimitKey(input.deviceId)}`, 10],
      [`ip:${hashLimitKey(input.ipAddress)}`, 20],
    ];
    for (const [key, max] of entries) {
      const now = Date.now();
      const current = this.limits.get(key);
      const next = !current || current.resetsAt <= now ? { count: 1, resetsAt: now + 3_600_000 } : { ...current, count: current.count + 1 };
      this.limits.set(key, next);
      if (next.count > max) throw Object.assign(new Error("Too many verification requests"), { code: "OTP_RATE_LIMITED" });
    }
  }

  async consumeProviderBudget(channel: Exclude<VerificationChannel, "TEST">): Promise<void> {
    const limit = providerBudgetLimit(channel);
    if (!limit) return;
    const day = new Date().toISOString().slice(0, 10);
    const current = this.providerBudgets.get(channel);
    const next = !current || current.day !== day ? { count: 1, day } : { count: current.count + 1, day };
    this.providerBudgets.set(channel, next);
    if (next.count > limit) {
      throw Object.assign(new Error("Daily verification provider budget reached"), { code: "OTP_PROVIDER_BUDGET_EXCEEDED" });
    }
  }

  async save(challenge: OtpChallenge): Promise<void> {
    const pointer = currentKey(challenge);
    const previousId = this.current.get(pointer);
    if (previousId) this.challenges.delete(previousId);
    this.current.set(pointer, challenge.id);
    this.challenges.set(challenge.id, { ...challenge });
  }

  async get(challengeId: string): Promise<OtpChallenge | null> {
    const value = this.challenges.get(challengeId);
    if (!value || value.expiresAt <= Date.now()) {
      this.challenges.delete(challengeId);
      return null;
    }
    return { ...value };
  }

  async failAttempt(challengeId: string): Promise<{ attempts: number; locked: boolean }> {
    const value = await this.get(challengeId);
    if (!value) return { attempts: -1, locked: true };
    value.attempts += 1;
    const locked = value.attempts >= value.maxAttempts;
    if (locked) this.challenges.delete(challengeId);
    else this.challenges.set(challengeId, value);
    return { attempts: value.attempts, locked };
  }

  async consume(challengeId: string, expectedCodeHash: string, deviceId: string): Promise<boolean> {
    const value = await this.get(challengeId);
    if (!value || value.codeHash !== expectedCodeHash || value.deviceId !== deviceId) return false;
    this.challenges.delete(challengeId);
    return true;
  }

  async delete(challengeId: string): Promise<void> {
    this.challenges.delete(challengeId);
  }

  async saveEnrollment(nonce: string, destinationHash: string, ttlMs: number): Promise<void> {
    this.enrollments.set(nonce, { destinationHash, expiresAt: Date.now() + ttlMs });
  }

  async consumeEnrollment(nonce: string, destinationHash: string): Promise<boolean> {
    const value = this.enrollments.get(nonce);
    if (!value || value.expiresAt <= Date.now() || value.destinationHash !== destinationHash) {
      if (value && value.expiresAt <= Date.now()) this.enrollments.delete(nonce);
      return false;
    }
    this.enrollments.delete(nonce);
    return true;
  }
}

export function createOtpChallengeStore(): OtpChallengeStore {
  const redis = getSharedAuthRedis();
  return redis ? new RedisOtpChallengeStore(redis) : new MemoryOtpChallengeStore();
}

export function createMemoryOtpChallengeStoreForTests(): OtpChallengeStore {
  return new MemoryOtpChallengeStore();
}

export function newOtpChallengeId(): string {
  return `otp_${crypto.randomUUID().replace(/-/g, "")}`;
}
