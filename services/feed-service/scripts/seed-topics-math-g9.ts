/**
 * Seed: grade-9 Mathematics topic taxonomy (Learn Screen pilot subject).
 *
 * Anchors to the existing MoEYS Subject row by CODE (MATH-G9), never by id,
 * so the same script works on dev/staging/prod. Top-level topics are
 * curriculum units; children are skills inside a unit.
 *
 * ⚠️ Content status: DRAFT unit list following the MoEYS grade-9 syllabus
 * shape. Educators can rename/reorder/deactivate rows freely — the seeder
 * matches existing rows by name and never deletes, so manual edits survive
 * re-runs (a renamed row simply stops matching and a new one is reported;
 * review the dry-run before applying on a curated environment).
 *
 * Safety: DRY-RUN by default, pass --apply to write. Idempotent by
 * (subject, parent, name) natural key.
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

const UNITS: TopicSeed[] = [
  {
    name: 'Real Numbers',
    nameKh: 'ចំនួនពិត',
    children: [
      { name: 'Square & Cube Roots', nameKh: 'ឫសការេ និងឫសគូប' },
      { name: 'Exponents', nameKh: 'និទស្សន្ត' },
      { name: 'Scientific Notation', nameKh: 'កំណត់សម្គាល់វិទ្យាសាស្ត្រ' },
    ],
  },
  {
    name: 'Polynomials & Algebraic Expressions',
    nameKh: 'ពហុធា និងកន្សោមពីជគណិត',
    children: [
      { name: 'Factoring', nameKh: 'ការបំបែកជាផលគុណកត្តា' },
      { name: 'Algebraic Fractions', nameKh: 'ប្រភាគពីជគណិត' },
    ],
  },
  {
    name: 'Linear Equations',
    nameKh: 'សមីការដឺក្រេទី១',
    children: [
      { name: 'Solving One-Variable Equations', nameKh: 'ដោះស្រាយសមីការមួយអញ្ញាត' },
      { name: 'Word Problems', nameKh: 'ចំណោទជាអក្សរ' },
    ],
  },
  {
    name: 'Linear Inequalities',
    nameKh: 'វិសមីការដឺក្រេទី១',
  },
  {
    name: 'Systems of Linear Equations',
    nameKh: 'ប្រព័ន្ធសមីការដឺក្រេទី១ ពីរអញ្ញាត',
    children: [
      { name: 'Substitution & Elimination', nameKh: 'វិធីជំនួស និងវិធីលុប' },
      { name: 'Graphical Solutions', nameKh: 'ដោះស្រាយដោយក្រាហ្វ' },
    ],
  },
  {
    name: 'Functions & Graphs',
    nameKh: 'អនុគមន៍ និងក្រាហ្វ',
    children: [
      { name: 'Linear Functions', nameKh: 'អនុគមន៍លីនេអ៊ែរ' },
      { name: 'Reading Graphs', nameKh: 'អានក្រាហ្វ' },
    ],
  },
  { name: 'Statistics', nameKh: 'ស្ថិតិ' },
  { name: 'Similar Triangles', nameKh: 'ត្រីកោណដូចគ្នា' },
  { name: 'Pythagorean Theorem', nameKh: 'ទ្រឹស្តីបទពីតាករ' },
  { name: 'Circles', nameKh: 'រង្វង់' },
  { name: 'Solid Geometry & Volume', nameKh: 'ធរណីមាត្រសូលីត និងមាឌ' },
  { name: 'Trigonometry Basics', nameKh: 'ត្រីកោណមាត្រមូលដ្ឋាន' },
];

let created = 0;
let updated = 0;
let unchanged = 0;

async function upsertTopic(
  subjectId: string,
  parentId: string | null,
  seed: TopicSeed,
  order: number,
): Promise<string | null> {
  const existing = await prisma.topic.findFirst({
    where: { subjectId, parentId, name: seed.name },
    select: { id: true, nameKh: true, order: true },
  });

  if (existing) {
    if (existing.nameKh !== seed.nameKh || existing.order !== order) {
      console.log(`  ✏️  update ${parentId ? '  └ ' : ''}${seed.name}`);
      if (APPLY) {
        await prisma.topic.update({
          where: { id: existing.id },
          data: { nameKh: seed.nameKh, order },
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

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${created} created, ${updated} updated, ${unchanged} unchanged.`,
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
