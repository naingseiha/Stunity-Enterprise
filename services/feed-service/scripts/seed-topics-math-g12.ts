/**
 * Seed: grade-12 Mathematics topic taxonomy (Bac II national exam preparation).
 *
 * Anchors to the existing MoEYS Subject rows by CODE:
 *   - MATH-G12-SCIENCE (Science Track / ថ្នាក់វិទ្យាសាស្ត្រ - Math Grade 12 Advanced.pdf)
 *   - MATH-G12-SOCIAL  (Social Science Track / ថ្នាក់វិទ្យាសាស្ត្រសង្គម - Math Grade 12 Basic.pdf)
 *
 * Automatically upserts the Subject rows if they do not exist yet.
 * Top-level topics are curriculum units; children are skills inside a unit.
 *
 * Safety: DRY-RUN by default, pass --apply to write. Idempotent by
 * (subject, parent, name) natural key.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-topics-math-g12.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-topics-math-g12.ts --apply  # write
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');

type TopicSeed = {
  name: string; // English canonical
  nameKh: string;
  children?: TopicSeed[];
};

// ==========================================
// 1. SCIENCE TRACK (Advanced / ថ្នាក់វិទ្យាសាស្ត្រ)
// ==========================================
const SCIENCE_UNITS: TopicSeed[] = [
  { name: 'លីមីតនៃអនុគមន៍', nameKh: 'លីមីតនៃអនុគមន៍' }, // Unit 1: Limits of Functions
  { name: 'ដេរីវេនៃអនុគមន៍', nameKh: 'ដេរីវេនៃអនុគមន៍' }, // Unit 2: Derivatives of Functions
  { name: 'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត', nameKh: 'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត' }, // Unit 3: Exponential and Logarithmic Functions
  { name: 'អាំងតេក្រាល', nameKh: 'អាំងតេក្រាល' }, // Unit 4: Integrals
  { name: 'សមីការឌីផេរ៉ង់ស្យែល', nameKh: 'សមីការឌីផេរ៉ង់ស្យែល' }, // Unit 5: Differential Equations
  { name: 'ចំនួនកុំផ្លិច', nameKh: 'ចំនួនកុំផ្លិច' }, // Unit 6: Complex Numbers
  { name: 'ធរណីមាត្រក្នុងលំហ', nameKh: 'ធរណីមាត្រក្នុងលំហ' }, // Unit 7: Geometry in Space (Vectors)
  { name: 'សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់ និងប្លង់ក្នុងលំហ', nameKh: 'សមីការប៉ារ៉ាម៉ែត្រនៃបន្ទាត់ និងប្លង់ក្នុងលំហ' }, // Unit 8: Lines and Planes in Space
  { name: 'ប្រូបាប', nameKh: 'ប្រូបាប' }, // Unit 9: Probability
  { name: 'ស្ថិតិ និងបំណែងចែកប្រូបាប', nameKh: 'ស្ថិតិ និងបំណែងចែកប្រូបាប' }, // Unit 10: Probability Distributions & Statistics
];

// ==========================================
// 2. SOCIAL SCIENCE TRACK (Basic / ថ្នាក់វិទ្យាសាស្ត្រសង្គម)
// ==========================================
const SOCIAL_UNITS: TopicSeed[] = [
  { name: 'លីមីត និងដេរីវេនៃអនុគមន៍', nameKh: 'លីមីត និងដេរីវេនៃអនុគមន៍' }, // Unit 1: Limits and Derivatives
  { name: 'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត', nameKh: 'អនុគមន៍អ៊ិចស្ប៉ូណង់ស្យែល និងឡូការីត' }, // Unit 2: Exponential and Logarithmic Functions
  { name: 'អាំងតេក្រាល និងអនុវត្តន៍', nameKh: 'អាំងតេក្រាល និងអនុវត្តន៍' }, // Unit 3: Integrals and Applications
  { name: 'ស្ថិតិមានពីរអញ្ញាត', nameKh: 'ស្ថិតិមានពីរអញ្ញាត' }, // Unit 4: Bivariate Statistics (Regression)
  { name: 'ប្រូបាប', nameKh: 'ប្រូបាប' }, // Unit 5: Probability
  { name: 'គណិតវិទ្យាហិរញ្ញវត្ថុ', nameKh: 'គណិតវិទ្យាហិរញ្ញវត្ថុ' }, // Unit 6: Financial Mathematics
];

let created = 0;
let updated = 0;
let unchanged = 0;

async function upsertSubject(
  code: string,
  name: string,
  nameKh: string,
  track: 'SCIENCE' | 'SOCIAL',
  coefficient: number,
  weeklyHours: number,
  annualHours: number,
): Promise<{ id: string; name: string }> {
  let subject = await prisma.subject.findUnique({
    where: { code },
    select: { id: true, name: true },
  });

  if (!subject) {
    console.log(`  ➕ create subject ${code} (${nameKh})`);
    if (APPLY) {
      subject = await prisma.subject.create({
        data: {
          code,
          name,
          nameKh,
          nameEn: name,
          grade: '12',
          track,
          category: 'Core',
          coefficient,
          weeklyHours,
          annualHours,
        },
        select: { id: true, name: true },
      });
    } else {
      // In dry-run mode, return a dummy ID so topic seeding can simulate
      return { id: `dummy-id-${code}`, name };
    }
  } else {
    console.log(`  ✔️  subject exists: ${code} (${subject.name})`);
  }

  return subject;
}

async function upsertTopic(
  subjectId: string,
  parentId: string | null,
  seed: TopicSeed,
  order: number,
): Promise<string | null> {
  if (subjectId.startsWith('dummy-id-')) {
    console.log(`  ➕ [DRY RUN] create ${parentId ? '  └ ' : ''}${seed.name} (${seed.nameKh})`);
    created += 1;
    return null;
  }

  const existing = await prisma.topic.findFirst({
    where: { subjectId, parentId, name: seed.name },
    select: { id: true, nameKh: true, order: true, name: true },
  });

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

async function seedTrack(
  code: string,
  name: string,
  nameKh: string,
  track: 'SCIENCE' | 'SOCIAL',
  coefficient: number,
  weeklyHours: number,
  annualHours: number,
  units: TopicSeed[],
) {
  console.log(`\n==========================================`);
  console.log(`📚 Seeding Track: ${code} (${nameKh})`);
  console.log(`==========================================`);

  const subject = await upsertSubject(code, name, nameKh, track, coefficient, weeklyHours, annualHours);

  for (let u = 0; u < units.length; u++) {
    const unit = units[u];
    const unitId = await upsertTopic(subject.id, null, unit, u);
    if (!unit.children) continue;
    for (let c = 0; c < unit.children.length; c++) {
      if (unitId) {
        await upsertTopic(subject.id, unitId, unit.children[c], c);
      } else {
        console.log(`  ➕ [DRY RUN] create   └ ${unit.children[c].name} (${unit.children[c].nameKh})`);
        created += 1;
      }
    }
  }
}

async function seed() {
  console.log(`🌱 Grade-12 Math topic seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`);

  // 1. Science Track (Advanced)
  await seedTrack(
    'MATH-G12-SCIENCE',
    'Mathematics (Science Track)',
    'គណិតវិទ្យា (ថ្នាក់វិទ្យាសាស្ត្រ)',
    'SCIENCE',
    4.0,
    8,
    288,
    SCIENCE_UNITS,
  );

  // 2. Social Science Track (Basic)
  await seedTrack(
    'MATH-G12-SOCIAL',
    'Mathematics (Social Science Track)',
    'គណិតវិទ្យា (ថ្នាក់វិទ្យាសាស្ត្រសង្គម)',
    'SOCIAL',
    2.0,
    4,
    144,
    SOCIAL_UNITS,
  );

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
