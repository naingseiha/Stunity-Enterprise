import { getPooledPrismaClient } from '../../../../../lib/prisma-client';

/** One process-wide pooled client, shared with every other engagement module. */
export const prisma = getPooledPrismaClient();
