import type Redis from "ioredis";
import { getSharedAuthRedis } from "./rateLimitStore";
import type { OidcAuthorizationRequest, OidcStateStore } from "./oidcSecurity";

const stateKey = (state: string) => `stunity:auth:oidc:state:${state}`;

class RedisOidcStateStore implements OidcStateStore {
  constructor(private readonly redis: Redis) {}

  private async connect() {
    if (this.redis.status === "wait") await this.redis.connect();
  }

  async save(state: string, request: OidcAuthorizationRequest, ttlMs: number): Promise<void> {
    await this.connect();
    await this.redis.set(stateKey(state), JSON.stringify(request), "PX", Math.max(1, ttlMs), "NX");
  }

  async consume(state: string): Promise<OidcAuthorizationRequest | null> {
    await this.connect();
    const result = await this.redis.eval(
      `local raw = redis.call('GET', KEYS[1])
       if not raw then return false end
       redis.call('DEL', KEYS[1])
       return raw`,
      1,
      stateKey(state),
    ) as string | null;
    return result ? (JSON.parse(result) as OidcAuthorizationRequest) : null;
  }
}

class MemoryOidcStateStore implements OidcStateStore {
  private states = new Map<string, { request: OidcAuthorizationRequest; expiresAt: number }>();

  async save(state: string, request: OidcAuthorizationRequest, ttlMs: number): Promise<void> {
    if (this.states.has(state)) return;
    this.states.set(state, { request, expiresAt: Date.now() + Math.max(1, ttlMs) });
  }

  async consume(state: string): Promise<OidcAuthorizationRequest | null> {
    const entry = this.states.get(state);
    this.states.delete(state);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.request;
  }
}

export function createOidcStateStore(): OidcStateStore {
  const redis = getSharedAuthRedis();
  return redis ? new RedisOidcStateStore(redis) : new MemoryOidcStateStore();
}

export function createMemoryOidcStateStoreForTests(): OidcStateStore {
  return new MemoryOidcStateStore();
}

/**
 * A one-time exchange code handed to the browser via redirect after the
 * server-side OIDC callback completes. The client trades it for the actual
 * session payload over POST so tokens never travel in a URL/referrer.
 */
export interface OidcSessionExchangeStore {
  save(code: string, payload: unknown, ttlMs: number): Promise<void>;
  consume(code: string): Promise<unknown | null>;
}

const sessionKey = (code: string) => `stunity:auth:oidc:session:${code}`;

class RedisOidcSessionExchangeStore implements OidcSessionExchangeStore {
  constructor(private readonly redis: Redis) {}

  private async connect() {
    if (this.redis.status === "wait") await this.redis.connect();
  }

  async save(code: string, payload: unknown, ttlMs: number): Promise<void> {
    await this.connect();
    await this.redis.set(sessionKey(code), JSON.stringify(payload), "PX", Math.max(1, ttlMs), "NX");
  }

  async consume(code: string): Promise<unknown | null> {
    await this.connect();
    const result = await this.redis.eval(
      `local raw = redis.call('GET', KEYS[1])
       if not raw then return false end
       redis.call('DEL', KEYS[1])
       return raw`,
      1,
      sessionKey(code),
    ) as string | null;
    return result ? JSON.parse(result) : null;
  }
}

class MemoryOidcSessionExchangeStore implements OidcSessionExchangeStore {
  private sessions = new Map<string, { payload: unknown; expiresAt: number }>();

  async save(code: string, payload: unknown, ttlMs: number): Promise<void> {
    if (this.sessions.has(code)) return;
    this.sessions.set(code, { payload, expiresAt: Date.now() + Math.max(1, ttlMs) });
  }

  async consume(code: string): Promise<unknown | null> {
    const entry = this.sessions.get(code);
    this.sessions.delete(code);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.payload;
  }
}

export function createOidcSessionExchangeStore(): OidcSessionExchangeStore {
  const redis = getSharedAuthRedis();
  return redis ? new RedisOidcSessionExchangeStore(redis) : new MemoryOidcSessionExchangeStore();
}

export function createMemoryOidcSessionExchangeStoreForTests(): OidcSessionExchangeStore {
  return new MemoryOidcSessionExchangeStore();
}
