import type { Store, Options } from "express-rate-limit";
import Redis from "ioredis";

let sharedRedis: Redis | null = null;

export function getSharedAuthRedis(): Redis | null {
  const redisUrl =
    process.env.AUTH_RATE_LIMIT_REDIS_URL || process.env.REDIS_URL;
  if (!redisUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL: AUTH_RATE_LIMIT_REDIS_URL or REDIS_URL is required for shared auth state in production.",
      );
    }
    return null;
  }

  if (!sharedRedis) {
    sharedRedis = new Redis(redisUrl, {
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    sharedRedis.on("error", (error) => {
      console.error("Auth shared rate-limit store error:", error.message);
    });
  }
  return sharedRedis;
}

class RedisRateLimitStore implements Store {
  private windowMs = 60_000;

  constructor(
    private readonly redis: Redis,
    public readonly prefix: string,
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(
    key: string,
  ): Promise<{ totalHits: number; resetTime: Date }> {
    if (this.redis.status === "wait") await this.redis.connect();
    const redisKey = `${this.prefix}${key}`;
    const result = (await this.redis.eval(
      `local count = redis.call('INCR', KEYS[1])
       local ttl = redis.call('PTTL', KEYS[1])
       if ttl < 0 then
         redis.call('PEXPIRE', KEYS[1], ARGV[1])
         ttl = tonumber(ARGV[1])
       end
       return { count, ttl }`,
      1,
      redisKey,
      String(this.windowMs),
    )) as [number, number];

    return {
      totalHits: Number(result[0]),
      resetTime: new Date(Date.now() + Number(result[1])),
    };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(`${this.prefix}${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
}

/**
 * Uses one Redis-backed counter namespace across all auth-service instances.
 * Local development retains express-rate-limit's memory store when Redis is absent.
 */
export function createSharedRateLimitStore(
  namespace: string,
): Store | undefined {
  const redis = getSharedAuthRedis();
  return redis
    ? new RedisRateLimitStore(redis, `stunity:auth:rl:${namespace}:`)
    : undefined;
}
