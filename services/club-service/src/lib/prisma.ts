import { getPooledPrismaClient } from '../../../lib/prisma-client';
import { PrismaClient } from '@prisma/client';
import { withPrismaPoolParams, normalizePrismaUrlForComparison } from '../../../lib/prisma-pool-url';

/** One Prisma pool per club-service process — shared by all controllers. */
export const prisma = getPooledPrismaClient();

// ─── Read replica — read-only queries ──────────────────────────────
// Mirrors feed-service / learn-service. Honors DATABASE_READ_URL; falls back
// to primary when unset so single-DB dev environments keep working.
const databaseUrl = process.env.DATABASE_URL || '';
const readUrlRaw = process.env.DATABASE_READ_URL?.trim();
const useDedicatedReadReplica = Boolean(
  readUrlRaw &&
    normalizePrismaUrlForComparison(readUrlRaw) !==
      normalizePrismaUrlForComparison(databaseUrl),
);
const readUrl = withPrismaPoolParams(readUrlRaw || databaseUrl) ?? databaseUrl;

export const prismaRead = useDedicatedReadReplica
  ? new PrismaClient({
      datasources: { db: { url: readUrl } },
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    })
  : prisma;
