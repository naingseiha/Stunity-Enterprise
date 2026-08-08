import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const applyChanges = process.argv.includes('--apply');

async function mismatchCount(client: Prisma.TransactionClient | PrismaClient) {
  const [row] = await client.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS "count" FROM "student_classes" enrollment
    JOIN "classes" class_record ON class_record."id" = enrollment."classId"
    WHERE enrollment."academicYearId" IS DISTINCT FROM class_record."academicYearId"
  `;
  return row.count;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const before = await mismatchCount(prisma);
  console.log(`Enrollment academic-year records requiring normalization: ${before}`);
  if (!before || !applyChanges) {
    if (before) console.log('Dry run only. Re-run with --apply after approval.');
    return;
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('year-end-integrity-repair')) IS NULL AS "lockAcquired"`;
    await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "student_classes_one_active_enrollment_per_year_idx" ON "student_classes"("studentId", "academicYearId") WHERE "status" = 'ACTIVE' AND "endedAt" IS NULL AND "academicYearId" IS NOT NULL`);
    await tx.$executeRawUnsafe('DROP INDEX IF EXISTS "student_classes_studentId_classId_academicYearId_key"');
    const count = await tx.$executeRaw`
      UPDATE "student_classes" enrollment SET "academicYearId" = class_record."academicYearId", "updatedAt" = CURRENT_TIMESTAMP
      FROM "classes" class_record WHERE enrollment."classId" = class_record."id"
        AND enrollment."academicYearId" IS DISTINCT FROM class_record."academicYearId"
    `;
    if (count !== before || await mismatchCount(tx) !== 0) throw new Error('Repair verification failed; transaction rolled back');
    return count;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 30_000, timeout: 120_000 });
  console.log(`Normalized ${updated} enrollment academic-year records successfully.`);
}

main().catch((error) => {
  console.error('Year-end integrity repair failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
