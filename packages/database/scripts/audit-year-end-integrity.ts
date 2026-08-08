import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const [counts] = await prisma.$queryRaw<Array<Record<string, number>>>`
    SELECT
      (SELECT COUNT(*)::int FROM (
        SELECT enrollment."studentId", class_record."academicYearId"
        FROM "student_classes" enrollment
        JOIN "classes" class_record ON class_record."id" = enrollment."classId"
        WHERE enrollment."status" = 'ACTIVE' AND enrollment."endedAt" IS NULL
        GROUP BY enrollment."studentId", class_record."academicYearId" HAVING COUNT(*) > 1
      ) duplicate_rows) AS "duplicateActiveEnrollments",
      (SELECT COUNT(*)::int FROM "student_classes" enrollment
        JOIN "students" student_record ON student_record."id" = enrollment."studentId"
        JOIN "classes" class_record ON class_record."id" = enrollment."classId"
        WHERE student_record."schoolId" <> class_record."schoolId") AS "crossSchoolEnrollments",
      (SELECT COUNT(*)::int FROM "student_classes" enrollment
        JOIN "classes" class_record ON class_record."id" = enrollment."classId"
        WHERE enrollment."academicYearId" IS DISTINCT FROM class_record."academicYearId") AS "enrollmentYearMismatches",
      (SELECT COUNT(*)::int FROM "classes" class_record
        JOIN "academic_years" year_record ON year_record."id" = class_record."academicYearId"
        WHERE class_record."schoolId" <> year_record."schoolId") AS "classYearSchoolMismatches",
      (SELECT COUNT(*)::int FROM "students" student_record
        JOIN "classes" class_record ON class_record."id" = student_record."classId"
        WHERE student_record."schoolId" <> class_record."schoolId") AS "studentCurrentClassSchoolMismatches",
      (SELECT COUNT(*)::int FROM "student_progressions" progression
        JOIN "students" student_record ON student_record."id" = progression."studentId"
        JOIN "academic_years" source_year ON source_year."id" = progression."fromAcademicYearId"
        JOIN "academic_years" target_year ON target_year."id" = progression."toAcademicYearId"
        JOIN "classes" source_class ON source_class."id" = progression."fromClassId"
        LEFT JOIN "classes" target_class ON target_class."id" = progression."toClassId"
        WHERE student_record."schoolId" <> source_year."schoolId"
           OR student_record."schoolId" <> target_year."schoolId"
           OR student_record."schoolId" <> source_class."schoolId"
           OR (target_class."id" IS NOT NULL AND student_record."schoolId" <> target_class."schoolId")
           OR source_class."academicYearId" <> progression."fromAcademicYearId"
           OR (target_class."id" IS NOT NULL AND target_class."academicYearId" <> progression."toAcademicYearId")) AS "progressionOwnershipMismatches"
  `;
  const blockingTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.table({ ...counts, blockingTotal });
  if (blockingTotal) {
    console.error('Year-end migration preflight failed. Resolve integrity issues before deployment.');
    process.exitCode = 2;
  } else {
    console.log('Year-end migration preflight passed. No blocking integrity issues found.');
  }
}

main().catch((error) => {
  console.error('Year-end integrity audit failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
