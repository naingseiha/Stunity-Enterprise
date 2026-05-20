/**
 * Single pooled PrismaClient per Node process.
 * Import this instead of creating extra Prisma clients in route modules.
 */
const { createRequire } = require('module');
const path = require('path');
const { withPrismaPoolParams } = require('./prisma-pool-url');

const globalForPrisma = global;

function loadPrismaClient() {
  const bases = [process.cwd(), '/app', __dirname];

  for (const base of bases) {
    try {
      return createRequire(path.join(base, 'prisma-client-loader.js'))('@prisma/client').PrismaClient;
    } catch (error) {
      if (error?.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  return require('@prisma/client').PrismaClient;
}

function getPooledPrismaClient() {
  if (globalForPrisma.stunityPooledPrisma) {
    return globalForPrisma.stunityPooledPrisma;
  }

  const PrismaClient = loadPrismaClient();
  const client = new PrismaClient({
    datasources: {
      db: { url: withPrismaPoolParams(process.env.DATABASE_URL) },
    },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

  globalForPrisma.stunityPooledPrisma = client;
  return client;
}

module.exports = { getPooledPrismaClient };
