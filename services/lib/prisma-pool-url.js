/**
 * Shared Prisma -> Supabase pooler URL helpers (all microservices).
 * Runtime services should use the Transaction pooler, not direct db.*:5432.
 */

const DEFAULT_CONNECTION_LIMIT = '3';
const DEFAULT_POOL_TIMEOUT = '10';

function withPrismaPoolParams(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) return rawUrl;

  const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT?.trim() || DEFAULT_CONNECTION_LIMIT;
  const poolTimeout = process.env.PRISMA_POOL_TIMEOUT?.trim() || DEFAULT_POOL_TIMEOUT;

  try {
    const parsed = new URL(rawUrl);
    if (connectionLimit && !parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', connectionLimit);
    }
    if (poolTimeout && !parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', poolTimeout);
    }
    // libpq TCP keepalive — reduces cold reconnect cost after idle PgBouncer slots
    if (!parsed.searchParams.has('keepalives')) {
      parsed.searchParams.set('keepalives', '1');
      parsed.searchParams.set('keepalives_idle', '60');
      parsed.searchParams.set('keepalives_interval', '10');
      parsed.searchParams.set('keepalives_count', '5');
    }
    return parsed.toString();
  } catch {
    let url = rawUrl;
    const append = (key, value) => {
      if (!value || new RegExp(`[?&]${key}=`).test(url)) return;
      url += `${url.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(value)}`;
    };
    append('connection_limit', connectionLimit);
    append('pool_timeout', poolTimeout);
    return url;
  }
}

function normalizePrismaUrlForComparison(rawUrl) {
  const pooledUrl = withPrismaPoolParams(rawUrl) || '';
  if (!pooledUrl) return '';

  try {
    const parsed = new URL(pooledUrl);
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return pooledUrl;
  }
}

function shouldRunDbKeepalive() {
  const flag = process.env.DISABLE_DB_KEEPALIVE?.trim().toLowerCase();
  return flag !== '1' && flag !== 'true';
}

function shouldRunDbStartupWarmup() {
  const flag = process.env.DISABLE_DB_STARTUP_WARMUP?.trim().toLowerCase();
  return flag !== '1' && flag !== 'true';
}

function getDbKeepaliveIntervalMs() {
  const raw = process.env.DB_KEEPALIVE_INTERVAL_MS?.trim();
  if (raw === '0') return 0;
  const parsed = Number(raw || 4 * 60 * 1000);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function scheduleDbKeepalive(tick) {
  if (!shouldRunDbKeepalive()) return;
  const intervalMs = getDbKeepaliveIntervalMs();
  if (intervalMs <= 0) return;
  setInterval(() => {
    void tick();
  }, intervalMs);
}

module.exports = {
  withPrismaPoolParams,
  normalizePrismaUrlForComparison,
  shouldRunDbKeepalive,
  shouldRunDbStartupWarmup,
  getDbKeepaliveIntervalMs,
  scheduleDbKeepalive,
};
