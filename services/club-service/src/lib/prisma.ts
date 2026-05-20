import { getPooledPrismaClient } from '../../../lib/prisma-client';

/** One Prisma pool per club-service process — shared by all controllers. */
export const prisma = getPooledPrismaClient();
