import { PrismaClient } from '@prisma/client';
import { withPrismaPoolParams } from '../../../lib/prisma-pool-url';

const globalForPrisma = global as unknown as { notificationPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.notificationPrisma ||
  new PrismaClient({
    datasources: { db: { url: withPrismaPoolParams(process.env.DATABASE_URL) } },
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.notificationPrisma = prisma;
}

