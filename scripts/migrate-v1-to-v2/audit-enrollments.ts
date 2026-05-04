/**
 * Find students with multiple ACTIVE StudentClass rows for the same academic year
 * (usually indicates stale enrollment after a class move).
 *
 * Usage:
 *   SCHOOL_ID=<v2-school-cuid> npx tsx scripts/migrate-v1-to-v2/audit-enrollments.ts
 *
 * Optional:
 *   ACADEMIC_YEAR_ID=<cuid>   limit to one academic year
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const SCHOOL_ID = process.env.SCHOOL_ID;
const ACADEMIC_YEAR_ID = process.env.ACADEMIC_YEAR_ID?.trim();

async function main() {
  if (!SCHOOL_ID) {
    console.error('❌  SCHOOL_ID is required.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ['error', 'warn'] });

  try {
    const allActive = await prisma.studentClass.findMany({
      where: {
        status: 'ACTIVE',
        student: { schoolId: SCHOOL_ID },
        ...(ACADEMIC_YEAR_ID ? { academicYearId: ACADEMIC_YEAR_ID } : {}),
      },
      select: {
        studentId: true,
        academicYearId: true,
        classId: true,
        id: true,
      },
    });

    const byKey = new Map<string, typeof allActive>();
    for (const sc of allActive) {
      const k = `${sc.studentId}::${sc.academicYearId}`;
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k)!.push(sc);
    }

    const duplicates: { studentId: string; academicYearId: string; rows: typeof allActive }[] = [];
    for (const [, rows] of byKey) {
      if (rows.length > 1 && rows[0]) {
        duplicates.push({
          studentId: rows[0].studentId,
          academicYearId: rows[0].academicYearId,
          rows,
        });
      }
    }

    duplicates.sort((a, b) => b.rows.length - a.rows.length);

    console.log('');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  Duplicate ACTIVE StudentClass (same student + year)     │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`  School: ${SCHOOL_ID}`);
    if (ACADEMIC_YEAR_ID) console.log(`  Academic year filter: ${ACADEMIC_YEAR_ID}`);
    console.log('');

    if (duplicates.length === 0) {
      console.log('  ✅ None found.');
      console.log('');
      process.exit(0);
      return;
    }

    console.log(`  ❌ Found ${duplicates.length} student-year group(s) with multiple ACTIVE enrollments.\n`);

    const classCache = new Map<string, string>();
    for (const d of duplicates) {
      const st = await prisma.student.findUnique({
        where: { id: d.studentId },
        select: { firstName: true, lastName: true, studentId: true },
      });
      const ay = await prisma.academicYear.findUnique({
        where: { id: d.academicYearId },
        select: { name: true },
      });
      console.log(`  Student ${d.studentId}${st ? ` — ${st.lastName} ${st.firstName} (${st.studentId ?? 'no code'})` : ''}`);
      console.log(`    Year: ${ay?.name ?? d.academicYearId}`);
      for (const r of d.rows) {
        let cn = classCache.get(r.classId);
        if (!cn) {
          const c = await prisma.class.findUnique({ where: { id: r.classId }, select: { name: true, grade: true } });
          cn = c ? `${c.name} (${c.grade})` : r.classId;
          classCache.set(r.classId, cn);
        }
        console.log(`    — class ${cn}  [studentClass ${r.id}]`);
      }
      console.log('');
    }

    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
