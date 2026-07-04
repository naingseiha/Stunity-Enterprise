/**
 * Seed: grade-9 Mathematics topic taxonomy (Learn Screen pilot subject).
 *
 * Anchors to the existing MoEYS Subject row by CODE (MATH-G9), never by id,
 * so the same script works on dev/staging/prod. Top-level topics are
 * curriculum units; children are skills inside a unit.
 *
 * ⚠️ Content status: VERIFIED unit list — reconciled 2026-07-04 against the
 * real official MoEYS Grade 9 Math textbook (Ebooks/Grade9/Math, 2013
 * edition, 18 official lesson units/មេរៀន). The original DRAFT here only had
 * 12 units and one fabricated unit ("Trigonometry Basics" — that content
 * actually belongs to Grade 10, ជំពូក៦ "ផលធៀបត្រីកោណមាត្រ", per
 * Ebooks/Grade10/Math). Sub-skill children from the old draft were removed
 * (unverified guesses) — re-add them per-unit once each chapter's real
 * content has been read in a content-authoring pass (Phase B).
 *
 * RENAME_MAP handles renamed/rescoped units so existing rows (and any
 * QuizQuestion/RecallCard already tagged to their topicId) survive the
 * reconciliation instead of being orphaned as new duplicate rows.
 *
 * Safety: DRY-RUN by default, pass --apply to write. Idempotent by
 * (subject, parent, name) natural key. Never deletes — renamed-away rows
 * simply stop matching; deactivated rows are soft-removed (isActive=false),
 * not deleted, so any tagged QuizQuestion/RecallCard content is preserved
 * for later reuse (e.g. Trigonometry Basics once Grade 10 is seeded).
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-topics-math-g9.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-topics-math-g9.ts --apply  # write
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const SUBJECT_CODE = 'MATH-G9';

type TopicSeed = {
  name: string; // English canonical
  nameKh: string;
  children?: TopicSeed[];
};

// Old draft / English name -> new verified official MoEYS Khmer name.
// Lets upsertTopic find the existing row by its old name and rename it in place
// (preserving id + tagged content) instead of creating an orphaned duplicate.
const RENAME_MAP: Record<string, string> = {
  'Irrational Numbers': 'ចំនួនអសនិទាន',
  'Real Numbers': 'ចំនួនអសនិទាន',
  'Proportion': 'សមាមាត្រ',
  'Polynomials & Algebraic Expressions': 'កន្សោមពីជគណិត',
  'Algebraic Expressions': 'កន្សោមពីជគណិត',
  'Linear Equations': 'សមីការដឺក្រេទី១មានមួយអញ្ញាត',
  'Linear Inequalities': 'វិសមីការដឺក្រេទី១មានមួយអញ្ញាត',
  'Frequency Distribution': 'បំណែងចែកប្រេកង់',
  'Statistical Averages': 'ស្ថិតិ',
  'Statistics': 'ស្ថិតិ',
  'Probability': 'ប្រូបាប',
  'Distance Between Two Points': 'ចម្ងាយរវាងពីរចំណុច',
  'Equation of a Line': 'សមីការនៃបន្ទាត់',
  'Functions & Graphs': 'សមីការនៃបន្ទាត់',
  'Systems of Linear Equations': 'ប្រព័ន្ធសមីការដឺក្រេទី១មានពីរអញ្ញាត',
  'Pythagorean Theorem': 'ទ្រឹស្ដីបទពីតាករ',
  'Circle and Line': 'រង្វង់និងបន្ទាត់',
  'Circles': 'រង្វង់និងបន្ទាត់',
  'Angle Properties of a Circle': 'មុំកណ្តាលនិងមុំចារឹកក្នុងរង្វង់',
  "Thales' Theorem": 'ទ្រឹស្ដីបទថាឡែស',
  'Similar Triangles': 'ត្រីកោណប៉ុនគ្នា',
  'Congruent Triangles': 'ត្រីកោណប៉ុនគ្នា',
  'Polygons': 'ពហុកោណ',
  'Solid Geometry & Volume': 'សូលីត',
  'Solids': 'សូលីត',
};

// Draft units with no real counterpart in the official Grade 9 TOC.
// Soft-removed (isActive=false) rather than deleted — their tagged
// QuizQuestion/RecallCard rows are preserved via onDelete:SetNull semantics
// and can be re-pointed at a real unit later (Trigonometry Basics belongs to
// Grade 10, not Grade 9 — see file header).
const DEACTIVATE: string[] = ['Trigonometry Basics'];

// Verified against Ebooks/Grade9/Math/Math Grade 9.pdf (2013 MoEYS edition)
// page 3 (TOC) + spot-checked chapter-opening pages. Order matches the
// book's មេរៀន ១-១៨ sequence exactly.
const UNITS: TopicSeed[] = [
  { name: 'ចំនួនអសនិទាន', nameKh: 'ចំនួនអសនិទាន' }, // ម.១, p1
  { name: 'សមាមាត្រ', nameKh: 'សមាមាត្រ' }, // ម.២, p17
  { name: 'កន្សោមពីជគណិត', nameKh: 'កន្សោមពីជគណិត' }, // ម.៣, p27
  { name: 'សមីការដឺក្រេទី១មានមួយអញ្ញាត', nameKh: 'សមីការដឺក្រេទី១មានមួយអញ្ញាត' }, // ម.៤, p41
  { name: 'វិសមីការដឺក្រេទី១មានមួយអញ្ញាត', nameKh: 'វិសមីការដឺក្រេទី១មានមួយអញ្ញាត' }, // ម.៥, p51
  { name: 'បំណែងចែកប្រេកង់', nameKh: 'បំណែងចែកប្រេកង់' }, // ម.៦, p61
  { name: 'ស្ថិតិ', nameKh: 'ស្ថិតិ' }, // ម.៧, p75
  { name: 'ប្រូបាប', nameKh: 'ប្រូបាប' }, // ម.៨, p85
  { name: 'ចម្ងាយរវាងពីរចំណុច', nameKh: 'ចម្ងាយរវាងពីរចំណុច' }, // ម.៩, p97
  { name: 'សមីការនៃបន្ទាត់', nameKh: 'សមីការនៃបន្ទាត់' }, // ម.១០, p105
  { name: 'ប្រព័ន្ធសមីការដឺក្រេទី១មានពីរអញ្ញាត', nameKh: 'ប្រព័ន្ធសមីការដឺក្រេទី១មានពីរអញ្ញាត' }, // ម.១១, p121
  { name: 'ទ្រឹស្ដីបទពីតាករ', nameKh: 'ទ្រឹស្ដីបទពីតាករ' }, // ម.១២, p135
  { name: 'រង្វង់និងបន្ទាត់', nameKh: 'រង្វង់និងបន្ទាត់' }, // ម.១៣, p143
  { name: 'មុំកណ្តាលនិងមុំចារឹកក្នុងរង្វង់', nameKh: 'មុំកណ្តាលនិងមុំចារឹកក្នុងរង្វង់' }, // ម.១៤, p159
  { name: 'ទ្រឹស្ដីបទថាឡែស', nameKh: 'ទ្រឹស្ដីបទថាឡែស' }, // ម.១៥, p181
  { name: 'ត្រីកោណប៉ុនគ្នា', nameKh: 'ត្រីកោណប៉ុនគ្នា' }, // ម.១៦, p191
  { name: 'ពហុកោណ', nameKh: 'ពហុកោណ' }, // ម.១៧, p213
  { name: 'សូលីត', nameKh: 'សូលីត' }, // ម.១៨, p223
];

let created = 0;
let updated = 0;
let unchanged = 0;
let deactivated = 0;

async function upsertTopic(
  subjectId: string,
  parentId: string | null,
  seed: TopicSeed,
  order: number,
): Promise<string | null> {
  let existing = await prisma.topic.findFirst({
    where: { subjectId, parentId, name: seed.name },
    select: { id: true, nameKh: true, order: true, name: true },
  });

  // Not found under the new name — check if this is a renamed unit whose
  // row still exists under one of its old names.
  if (!existing) {
    const oldNames = Object.entries(RENAME_MAP)
      .filter(([, newName]) => newName === seed.name)
      .map(([oldName]) => oldName);
    if (oldNames.length > 0) {
      existing = await prisma.topic.findFirst({
        where: { subjectId, parentId, name: { in: oldNames } },
        select: { id: true, nameKh: true, order: true, name: true },
      });
    }
  }

  if (existing) {
    const needsUpdate = existing.name !== seed.name || existing.nameKh !== seed.nameKh || existing.order !== order;
    if (needsUpdate) {
      console.log(`  ✏️  update ${parentId ? '  └ ' : ''}${existing.name} -> ${seed.name} (${seed.nameKh})`);
      if (APPLY) {
        await prisma.topic.update({
          where: { id: existing.id },
          data: { name: seed.name, nameKh: seed.nameKh, order },
        });
      }
      updated += 1;
    } else {
      unchanged += 1;
    }
    return existing.id;
  }

  console.log(`  ➕ create ${parentId ? '  └ ' : ''}${seed.name} (${seed.nameKh})`);
  created += 1;
  if (!APPLY) return null;
  const row = await prisma.topic.create({
    data: { subjectId, parentId, name: seed.name, nameKh: seed.nameKh, order },
    select: { id: true },
  });
  return row.id;
}

async function deactivateRemoved(subjectId: string) {
  for (const name of DEACTIVATE) {
    const row = await prisma.topic.findFirst({
      where: { subjectId, parentId: null, name },
      select: { id: true, isActive: true },
    });
    if (!row) continue;
    if (!row.isActive) {
      unchanged += 1;
      continue;
    }
    console.log(`  🚫 deactivate ${name} (not part of the official Grade 9 syllabus)`);
    deactivated += 1;
    if (APPLY) {
      await prisma.topic.update({ where: { id: row.id }, data: { isActive: false } });
    }
  }
}

async function seed() {
  console.log(`🌱 Grade-9 Math topic seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const subject = await prisma.subject.findUnique({
    where: { code: SUBJECT_CODE },
    select: { id: true, name: true, nameEn: true, grade: true },
  });
  if (!subject) {
    throw new Error(`Subject with code ${SUBJECT_CODE} not found — seed subjects first.`);
  }
  console.log(`📚 Subject: ${subject.nameEn ?? subject.name} (grade ${subject.grade}, ${subject.id})\n`);

  for (let u = 0; u < UNITS.length; u++) {
    const unit = UNITS[u];
    const unitId = await upsertTopic(subject.id, null, unit, u);
    if (!unit.children) continue;
    for (let c = 0; c < unit.children.length; c++) {
      // Dry run can't know a not-yet-created parent's id — children of a new
      // unit are reported as creates against a placeholder.
      if (unitId) {
        await upsertTopic(subject.id, unitId, unit.children[c], c);
      } else {
        console.log(`  ➕ create   └ ${unit.children[c].name} (${unit.children[c].nameKh})`);
        created += 1;
      }
    }
  }

  await deactivateRemoved(subject.id);

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${created} created, ${updated} updated, ${deactivated} deactivated, ${unchanged} unchanged.`,
  );
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
