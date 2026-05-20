import { PrismaClient } from '@prisma/client';
import {
  withPrismaPoolParams,
  shouldRunDbKeepalive,
  shouldRunDbStartupWarmup,
  getDbKeepaliveIntervalMs,
} from '../../../services/lib/prisma-pool-url';

const pooledDatabaseUrl =
  withPrismaPoolParams(process.env.DATABASE_URL) ?? process.env.DATABASE_URL;

// ✅ Singleton pattern to prevent multiple Prisma instances (critical for performance!)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: pooledDatabaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Keep database connection warm
let isWarm = false;
export const warmupDb = async () => {
  if (isWarm) return;
  try {
    await prisma.$queryRaw`SELECT 1`;
    isWarm = true;
    console.log('✅ Database connection ready');
  } catch (e) {
    console.error('⚠️ Database warmup failed');
  }
};

// Run warmup on import only when enabled. Cloud Run can disable this to keep liveness checks cheap.
if (shouldRunDbStartupWarmup()) {
  warmupDb();
}

if (shouldRunDbKeepalive()) {
  const keepaliveMs = getDbKeepaliveIntervalMs();
  if (keepaliveMs > 0) {
    setInterval(() => {
      isWarm = false;
      warmupDb();
    }, keepaliveMs);
  }
}

export default prisma;
