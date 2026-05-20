import type { PrismaClient } from '@prisma/client';

export function getPooledPrismaClient(): PrismaClient;
