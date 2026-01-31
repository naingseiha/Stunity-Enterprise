import { PrismaClient } from '@prisma/client';

// ✅ Singleton pattern to prevent multiple Prisma instances (critical for performance!)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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

// Run warmup on import
warmupDb();

// Keep alive every 4 minutes
setInterval(() => {
  isWarm = false;
  warmupDb();
}, 4 * 60 * 1000);

export default prisma;
