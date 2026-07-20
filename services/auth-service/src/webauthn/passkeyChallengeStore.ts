import type Redis from "ioredis";
import { getSharedAuthRedis } from "../security/rateLimitStore";
import { hashLimitKey } from "../passwordless/otpCrypto";

export interface PasskeyChallengeStore {
  // Registration is authenticated, so one in-flight challenge per user is
  // enough and keying by userId lets a stale challenge be silently replaced.
  saveRegistrationChallenge(userId: string, challenge: string, ttlMs: number): Promise<void>;
  consumeRegistrationChallenge(userId: string): Promise<string | null>;
  // Authentication is unauthenticated/usernameless (discoverable credentials),
  // so the client only has a random challengeId to hand back on verify.
  saveAuthenticationChallenge(challengeId: string, challenge: string, ttlMs: number): Promise<void>;
  consumeAuthenticationChallenge(challengeId: string): Promise<string | null>;
}

const registrationKey = (userId: string) => `stunity:auth:passkey:reg:${hashLimitKey(userId)}`;
const authenticationKey = (challengeId: string) => `stunity:auth:passkey:auth:${challengeId}`;

class RedisPasskeyChallengeStore implements PasskeyChallengeStore {
  constructor(private readonly redis: Redis) {}

  private async connect() {
    if (this.redis.status === "wait") await this.redis.connect();
  }

  async saveRegistrationChallenge(userId: string, challenge: string, ttlMs: number): Promise<void> {
    await this.connect();
    await this.redis.set(registrationKey(userId), challenge, "PX", Math.max(1, ttlMs));
  }

  async consumeRegistrationChallenge(userId: string): Promise<string | null> {
    await this.connect();
    const result = await this.redis.eval(
      `local raw = redis.call('GET', KEYS[1])
       if not raw then return false end
       redis.call('DEL', KEYS[1])
       return raw`,
      1,
      registrationKey(userId),
    ) as string | null;
    return result || null;
  }

  async saveAuthenticationChallenge(challengeId: string, challenge: string, ttlMs: number): Promise<void> {
    await this.connect();
    await this.redis.set(authenticationKey(challengeId), challenge, "PX", Math.max(1, ttlMs), "NX");
  }

  async consumeAuthenticationChallenge(challengeId: string): Promise<string | null> {
    await this.connect();
    const result = await this.redis.eval(
      `local raw = redis.call('GET', KEYS[1])
       if not raw then return false end
       redis.call('DEL', KEYS[1])
       return raw`,
      1,
      authenticationKey(challengeId),
    ) as string | null;
    return result || null;
  }
}

class MemoryPasskeyChallengeStore implements PasskeyChallengeStore {
  private registration = new Map<string, { challenge: string; expiresAt: number }>();
  private authentication = new Map<string, { challenge: string; expiresAt: number }>();

  async saveRegistrationChallenge(userId: string, challenge: string, ttlMs: number): Promise<void> {
    this.registration.set(registrationKey(userId), { challenge, expiresAt: Date.now() + Math.max(1, ttlMs) });
  }

  async consumeRegistrationChallenge(userId: string): Promise<string | null> {
    const key = registrationKey(userId);
    const entry = this.registration.get(key);
    this.registration.delete(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.challenge;
  }

  async saveAuthenticationChallenge(challengeId: string, challenge: string, ttlMs: number): Promise<void> {
    const key = authenticationKey(challengeId);
    if (this.authentication.has(key)) return;
    this.authentication.set(key, { challenge, expiresAt: Date.now() + Math.max(1, ttlMs) });
  }

  async consumeAuthenticationChallenge(challengeId: string): Promise<string | null> {
    const key = authenticationKey(challengeId);
    const entry = this.authentication.get(key);
    this.authentication.delete(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.challenge;
  }
}

export function createPasskeyChallengeStore(): PasskeyChallengeStore {
  const redis = getSharedAuthRedis();
  return redis ? new RedisPasskeyChallengeStore(redis) : new MemoryPasskeyChallengeStore();
}

export function createMemoryPasskeyChallengeStoreForTests(): PasskeyChallengeStore {
  return new MemoryPasskeyChallengeStore();
}
