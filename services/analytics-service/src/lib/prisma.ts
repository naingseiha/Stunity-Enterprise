import { getPooledPrismaClient } from '../../../lib/prisma-client';

/** One Prisma pool per analytics-service process — shared by gamification modules. */
export const prisma = getPooledPrismaClient();
