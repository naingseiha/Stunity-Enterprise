/**
 * Hard-delete Subject rows by Khmer display name (all grades / tracks).
 * Clears timetable slots and grade confirmations that reference those subjects.
 *
 *   # Preview only (no writes):
 *   DRY_RUN=1 npx tsx scripts/admin/delete-subjects-by-name-kh.ts
 *
 *   # Apply (required on Supabase):
 *   ALLOW_PRODUCTION_DB=1 npx tsx scripts/admin/delete-subjects-by-name-kh.ts
 */

import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { runDbSafetyCheck } from '../db-safety-check';

// Same load order as scripts/db-safety-check.ts (run from repo root or scripts/*)
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../.env') });
config({ path: resolve(process.cwd(), '../../.env') });

type SubjectRow = {
  id: string;
  code: string;
  nameKh: string;
  name: string;
  grade: string;
  track: string | null;
};

/**
 * PostgreSQL match for Arts & Culture + Music across seeds and spelling drift.
 * Raw SQL avoids Prisma `mode: insensitive` quirks on Khmer text.
 */
async function findArtsMusicSubjects(prisma: PrismaClient): Promise<SubjectRow[]> {
  return prisma.$queryRaw<SubjectRow[]>`
    SELECT s.id, s.code, s."nameKh", s.name, s.grade, s.track
    FROM subjects s
    WHERE
      s."nameKh" LIKE ${'%តន្ត្រី%'}
      OR (s."nameKh" LIKE ${'%សិល្បៈ%'} AND s."nameKh" LIKE ${'%វប្បធម៌%'})
      /* Short Khmer label "សិល្បៈ" / variants still keyed as ART in many seeds */
      OR (s."nameKh" LIKE ${'%សិល្បៈ%'} AND s.code ~* ${'^ART(-|$)'})
      OR s."nameKh" LIKE ${'%Arts & Culture%'}
      OR (s.name ILIKE ${'%Arts%'} AND s.name ILIKE ${'%Culture%'})
      OR s.name ILIKE 'Music'
      OR s.code ~* ${'^ART(-|$)'}
      OR s.code ~* ${'^MUS(-|$)'}
    ORDER BY s.grade ASC, s.code ASC
  `;
}

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!dbUrl) {
    console.error('Missing DATABASE_URL (or DIRECT_URL). Run from repo root with .env present.');
    process.exit(1);
  }
  try {
    const u = new URL(dbUrl.replace(/^postgresql:\/\//, 'postgres://'));
    console.log(`DB: ${u.hostname}${u.pathname ? u.pathname : ''} (user=${u.username || '?'})`);
  } catch {
    console.log('DB: (connected via DATABASE_URL)');
  }

  if (!DRY_RUN) runDbSafetyCheck();

  const subjects = await findArtsMusicSubjects(prisma);

  console.log(`Matched ${subjects.length} subject row(s):`);
  for (const s of subjects)
    console.log(
      `  - ${s.nameKh} | ${s.name} | ${s.code} | grade=${s.grade} track=${s.track ?? '(none)'}`
    );
  
  if (!subjects.length) {
    console.log('Nothing to do.');
    return;
  }

  const ids = subjects.map((s) => s.id);

  if (DRY_RUN) {
    const tt = await prisma.timetableEntry.count({ where: { subjectId: { in: ids } } });
    const gc = await prisma.gradeConfirmation.count({ where: { subjectId: { in: ids } } });
    const tce = await prisma.timetableConflictException.count({ where: { subjectId: { in: ids } } });
    const grades = await prisma.grade.count({ where: { subjectId: { in: ids } } });
    console.log('\nDRY_RUN counts:', { timetableEntries: tt, gradeConfirmations: gc, conflictExceptions: tce, gradeRows: grades });
    return;
  }

  const timetable = await prisma.timetableEntry.updateMany({
    where: { subjectId: { in: ids } },
    data: { subjectId: null },
  });
  console.log(`Cleared subject on ${timetable.count} timetable entr(y/ies).`);

  const confirmations = await prisma.gradeConfirmation.deleteMany({
    where: { subjectId: { in: ids } },
  });
  console.log(`Deleted ${confirmations.count} grade confirmation row(s).`);

  const exceptions = await prisma.timetableConflictException.updateMany({
    where: { subjectId: { in: ids } },
    data: { subjectId: null },
  });
  console.log(`Nulled subjectId on ${exceptions.count} timetable conflict exception row(s).`);

  const deleted = await prisma.subject.deleteMany({ where: { id: { in: ids } } });
  console.log(`Deleted ${deleted.count} subject row(s) (grades / teacher links cascade).`);
  console.log('If the web app still shows them: hard-refresh, clear sessionStorage, restart subject-service (5m list cache).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
