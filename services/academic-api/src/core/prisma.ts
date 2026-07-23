import type { PrismaClient } from '@prisma/client';
import { getPooledPrismaClient } from '../../../lib/prisma-client';

/**
 * One PrismaClient (one connection pool) for the whole Academic API process.
 * All merged modules import this instead of creating their own client.
 */
export function getSharedPrisma(): PrismaClient {
  return getPooledPrismaClient();
}
