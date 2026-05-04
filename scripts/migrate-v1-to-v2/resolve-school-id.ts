/**
 * Print Stunity school id(s) by name (DATABASE_URL from .env).
 *
 *   npx tsx scripts/migrate-v1-to-v2/resolve-school-id.ts
 *   SCHOOL_NAME="Svaythom High School" npx tsx scripts/migrate-v1-to-v2/resolve-school-id.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const NAME = (process.env.SCHOOL_NAME || 'Svaythom High School').trim();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set. Add it to .env at repo root or packages/database/.env');
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: [] });

  try {
    const schools = await prisma.school.findMany({
      where: { name: { contains: NAME, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, isActive: true },
      orderBy: { name: 'asc' },
    });

    if (schools.length === 0) {
      console.log(`No school matching "${NAME}" in this database.`);
      console.log('Check DATABASE_URL points to the right PostgreSQL instance.');
      process.exit(1);
    }

    console.log('');
    for (const s of schools) {
      console.log(`  name      : ${s.name}`);
      console.log(`  id        : ${s.id}`);
      console.log(`  slug      : ${s.slug}`);
      console.log(`  isActive  : ${s.isActive}`);
      console.log('');
      console.log('  Export for migration scripts:');
      console.log(`    SCHOOL_ID="${s.id}"`);
      console.log('');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
