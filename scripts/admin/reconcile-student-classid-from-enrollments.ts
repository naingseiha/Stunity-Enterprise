/**
 * One-way heal: set each student's `classId` to their latest ACTIVE StudentClass row.
 * Use after importing enrollments from V1 or when `students.classId` drifted from rosters.
 *
 *   SCHOOL_ID=<cuid> npx tsx scripts/admin/reconcile-student-classid-from-enrollments.ts
 *
 * Omit SCHOOL_ID to process all schools (slower).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });
const SCHOOL_ID = process.env.SCHOOL_ID?.trim();

async function main() {
  const students = await prisma.student.findMany({
    where: SCHOOL_ID ? { schoolId: SCHOOL_ID } : undefined,
    select: { id: true, schoolId: true, classId: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const s of students) {
    const active = await prisma.studentClass.findMany({
      where: {
        studentId: s.id,
        status: 'ACTIVE',
        student: { schoolId: s.schoolId },
      },
      orderBy: { updatedAt: 'desc' },
      select: { classId: true },
    });

    if (active.length === 0) {
      skipped++;
      continue;
    }

    const desired = active[0]!.classId;
    if (s.classId === desired) {
      skipped++;
      continue;
    }

    await prisma.student.update({
      where: { id: s.id },
      data: { classId: desired },
    });
    updated++;
  }

  console.log(`Done. Updated: ${updated}, unchanged / no active enrollment: ${skipped}, scanned: ${students.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
