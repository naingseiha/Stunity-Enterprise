/**
 * List or delete subjects whose `code` contains a substring (default: stunity).
 * Catches every discipline: PHY-stunity-…, CS-stunity-…, MATH-stunity-… (same SQL for all).
 *
 *   # Report only:
 *   DRY_RUN=1 npx tsx scripts/admin/cleanup-subjects-by-code-substring.ts
 *   CODE_SUBSTRING=stunity DRY_RUN=1 npx tsx ...   # same; override needle if needed
 *
 *   # Delete matches with zero scores (default needle = stunity):
 *   ALLOW_PRODUCTION_DB=1 npx tsx scripts/admin/cleanup-subjects-by-code-substring.ts
 *
 *   # Delete even when scores exist (cascade):
 *   ALLOW_PRODUCTION_DB=1 DELETE_EVEN_WITH_GRADES=1 npx tsx scripts/admin/cleanup-subjects-by-code-substring.ts
 */

import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { runDbSafetyCheck } from '../db-safety-check';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '../../.env') });

/** Default needle is `stunity` so PHY-stunity-qa-school-* and all siblings are matched. */
const NEEDLE = (process.env.CODE_SUBSTRING || process.env.NEEDLE || 'stunity').trim();
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const DELETE_EVEN_WITH_GRADES =
  process.env.DELETE_EVEN_WITH_GRADES === '1' || process.env.DELETE_EVEN_WITH_GRADES === 'true';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

type SubjectRow = {
  id: string;
  code: string;
  name: string;
  nameKh: string;
  grade: string;
};

/** Postgres ILIKE — matches any prefix: PHY-, CS-, KH-, … */
async function subjectsWhereCodeContains(needle: string): Promise<SubjectRow[]> {
  const escaped = needle.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const pattern = `%${escaped}%`;
  return prisma.$queryRaw<SubjectRow[]>`
    SELECT id, code, name, "nameKh", grade
    FROM subjects
    WHERE code ILIKE ${pattern} ESCAPE '\\'
    ORDER BY code ASC
  `;
}

async function main() {
  if (!(process.env.DATABASE_URL || process.env.DIRECT_URL)) {
    console.error('Missing DATABASE_URL.');
    process.exit(1);
  }

  if (!DRY_RUN) runDbSafetyCheck();

  console.log(`Matching subject codes ILIKE '%${NEEDLE}%'\n`);
  const rows = await subjectsWhereCodeContains(NEEDLE);

  console.log(`Subjects matched: ${rows.length}\n`);

  if (!rows.length) {
    console.log('Nothing matched.');
    return;
  }

  let totalGradeRows = 0;
  let totalTimetable = 0;
  const idsToDelete: string[] = [];

  for (const s of rows) {
    const [gradeCount, ttCount] = await Promise.all([
      prisma.grade.count({ where: { subjectId: s.id } }),
      prisma.timetableEntry.count({ where: { subjectId: s.id } }),
    ]);
    totalGradeRows += gradeCount;
    totalTimetable += ttCount;
    const unlinkOk = gradeCount === 0;
    const eligible = unlinkOk || DELETE_EVEN_WITH_GRADES;
    if (eligible) idsToDelete.push(s.id);

    console.log(
      `${s.code} | ${s.nameKh} | subjectGrade=${s.grade} | scoreRows=${gradeCount} | timetable=${ttCount} → ${eligible ? 'DELETE' : 'SKIP (scores); set DELETE_EVEN_WITH_GRADES=1'}`
    );
  }

  console.log('\nTotals: scoreRows(all matched)=', totalGradeRows, 'timetable(all matched)=', totalTimetable);

  if (DRY_RUN) {
    console.log('\nDry run finished. Drop DRY_RUN=1 and set ALLOW_PRODUCTION_DB=1 when ready to delete.');
    return;
  }

  if (!idsToDelete.length) {
    console.log('\nNothing to delete (every match has scores).');
    return;
  }

  const timetable = await prisma.timetableEntry.updateMany({
    where: { subjectId: { in: idsToDelete } },
    data: { subjectId: null },
  });
  console.log(`\nTimetable entries cleared: ${timetable.count}`);

  await prisma.gradeConfirmation.deleteMany({ where: { subjectId: { in: idsToDelete } } });

  await prisma.timetableConflictException.updateMany({
    where: { subjectId: { in: idsToDelete } },
    data: { subjectId: null },
  });

  const deleted = await prisma.subject.deleteMany({ where: { id: { in: idsToDelete } } });
  console.log(`Subjects deleted: ${deleted.count}`);
  console.log('Restart subject-service after bulk DB changes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
