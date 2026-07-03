/**
 * Seed: mini-lessons + formula sheets for the grade-9 Math units.
 *
 * Fills Topic.miniLessonKh / Topic.formulaSheet for every unit seeded by
 * seed-topics-math-g9.ts (matched by unit name under MATH-G9). Shown by the
 * mobile UnitLessonScreen before practice.
 *
 * ⚠️ DRAFT content following the MoEYS grade-9 syllabus shape — have an
 * educator review before production. Formulas use plain unicode math
 * (no LaTeX pipeline yet).
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: rewrites only
 * when content differs; never touches rows whose unit name doesn't match.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-lessons-math-g9.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-lessons-math-g9.ts --apply  # write
 */

import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const SUBJECT_CODE = 'MATH-G9';

type Formula = { expr: string; noteKh?: string };
type LessonSeed = { lessonKh: string; formulas: Formula[] };

const LESSONS: Record<string, LessonSeed> = {
  'Real Numbers': {
    lessonKh:
      'ចំនួនពិត រួមមានចំនួនសនិទាន (អាចសរសេរជាប្រភាគ) និងចំនួនអសនិទាន (ដូចជា √2, π)។\n\nឫសការេ √a គឺជាចំនួនវិជ្ជមានដែលពេលគុណនឹងខ្លួនឯងស្មើ a។ ឫសគូប ∛a គឺជាចំនួនដែល ជាបីដងគុណខ្លួនឯងស្មើ a។\n\nនិទស្សន្ត aⁿ មានន័យថា គុណ a ចំនួន n ដង។ កំណត់សម្គាល់វិទ្យាសាស្ត្រ សរសេរចំនួនធំ/តូចជា a × 10ⁿ ដែល 1 ≤ a < 10។',
    formulas: [
      { expr: '√(a·b) = √a · √b', noteKh: 'ឫសការេនៃផលគុណ' },
      { expr: 'aᵐ · aⁿ = aᵐ⁺ⁿ', noteKh: 'គុណនិទស្សន្តគោលដូចគ្នា' },
      { expr: '(aᵐ)ⁿ = aᵐˣⁿ', noteKh: 'និទស្សន្តនៃនិទស្សន្ត' },
      { expr: 'a⁻ⁿ = 1/aⁿ', noteKh: 'និទស្សន្តអវិជ្ជមាន' },
      { expr: 'N = a × 10ⁿ (1 ≤ a < 10)', noteKh: 'កំណត់សម្គាល់វិទ្យាសាស្ត្រ' },
    ],
  },
  'Polynomials & Algebraic Expressions': {
    lessonKh:
      'ពហុធា គឺជាកន្សោមដែលផ្សំពីអថេរ និងចំនួន ភ្ជាប់ដោយប្រមាណវិធីបូក ដក គុណ (ឧ. 3x² + 2x − 5)។ ដឺក្រេនៃពហុធា គឺនិទស្សន្តធំបំផុតរបស់អថេរ។\n\nការបំបែកជាផលគុណកត្តា គឺជាការសរសេរពហុធាជាផលគុណនៃកន្សោមសាមញ្ញៗ។ ចាប់ផ្តើមដោយរកកត្តារួមជាមុនសិន បន្ទាប់មកប្រើអត្តសញ្ញាណសំខាន់ៗ។',
    formulas: [
      { expr: '(a + b)² = a² + 2ab + b²', noteKh: 'ការេនៃផលបូក' },
      { expr: '(a − b)² = a² − 2ab + b²', noteKh: 'ការេនៃផលដក' },
      { expr: 'a² − b² = (a + b)(a − b)', noteKh: 'ផលដកការេ' },
      { expr: 'x² + (p+q)x + pq = (x + p)(x + q)', noteKh: 'បំបែកត្រីធាដឺក្រេ ២' },
    ],
  },
  'Linear Equations': {
    lessonKh:
      'សមីការដឺក្រេទី១ មានរាង ax + b = 0 (a ≠ 0)។ ការដោះស្រាយ គឺរកតម្លៃ x ដែលធ្វើឲ្យសមីការពិត។\n\nវិធីដោះស្រាយ៖ (1) បំបាត់វង់ក្រចក (2) ប្តូរតួមានអថេរទៅខាងឆ្វេង តួចំនួនទៅខាងស្តាំ ដោយប្តូរសញ្ញា (3) ចែកនឹងមេគុណរបស់ x។\n\nសម្រាប់ចំណោទជាអក្សរ៖ តាងចំនួនមិនស្គាល់ជា x រួចបកប្រែឃ្លាជាសមីការ។',
    formulas: [
      { expr: 'ax + b = 0  ⇒  x = −b/a', noteKh: 'រូបមន្តទូទៅ' },
      { expr: 'a + x = b  ⇒  x = b − a', noteKh: 'ប្តូរតួ ប្តូរសញ្ញា' },
      { expr: 'ax = b  ⇒  x = b/a', noteKh: 'ចែកនឹងមេគុណ' },
    ],
  },
  'Linear Inequalities': {
    lessonKh:
      'វិសមីការដឺក្រេទី១ ដោះស្រាយដូចសមីការដែរ ប៉ុន្តែចម្លើយជាចន្លោះតម្លៃ មិនមែនតម្លៃតែមួយទេ។\n\n⚠️ ចំណុចសំខាន់បំផុត៖ ពេលគុណ ឬចែកអង្គទាំងពីរនឹងចំនួនអវិជ្ជមាន ត្រូវត្រឡប់ទិសសញ្ញាវិសមភាព (< ក្លាយជា > និងផ្ទុយមកវិញ)។',
    formulas: [
      { expr: 'x + a < b  ⇒  x < b − a', noteKh: 'បូក/ដក មិនប្តូរទិស' },
      { expr: 'ax < b (a > 0)  ⇒  x < b/a', noteKh: 'ចែកនឹងចំនួនវិជ្ជមាន' },
      { expr: '−ax < b (a > 0)  ⇒  x > −b/a', noteKh: 'ចែកនឹងចំនួនអវិជ្ជមាន → ត្រឡប់ទិស' },
    ],
  },
  'Systems of Linear Equations': {
    lessonKh:
      'ប្រព័ន្ធសមីការដឺក្រេទី១ ពីរអញ្ញាត គឺសមីការពីរដែលមានអថេរ x និង y រួមគ្នា។ ចម្លើយគឺគូ (x, y) ដែលផ្ទៀងផ្ទាត់សមីការទាំងពីរ។\n\nវិធីជំនួស៖ ដោះស្រាយអថេរមួយពីសមីការមួយ រួចជំនួសចូលសមីការមួយទៀត។\n\nវិធីលុប៖ គុណសមីការឲ្យមេគុណអថេរមួយស្មើគ្នា រួចបូក/ដកសមីការដើម្បីលុបអថេរនោះ។',
    formulas: [
      { expr: 'ax + by = c ; a′x + b′y = c′', noteKh: 'រាងទូទៅ' },
      { expr: 'y = (c − ax)/b', noteKh: 'ដោះស្រាយ y សម្រាប់វិធីជំនួស' },
    ],
  },
  'Functions & Graphs': {
    lessonKh:
      'អនុគមន៍លីនេអ៊ែរ មានរាង y = ax + b។ ក្រាហ្វរបស់វាជាបន្ទាត់ត្រង់។\n\nមេគុណប្រាប់ទិស a ហៅថា មេគុណប្រាប់ទិស (slope)៖ បើ a > 0 បន្ទាត់ឡើង បើ a < 0 បន្ទាត់ចុះ។ ចំណុច b គឺជាកន្លែងដែលបន្ទាត់កាត់អ័ក្ស y។\n\nដើម្បីគណនាតម្លៃអនុគមន៍ f(x) ត្រង់ x = k គ្រាន់តែជំនួស x ដោយ k។',
    formulas: [
      { expr: 'y = ax + b', noteKh: 'អនុគមន៍លីនេអ៊ែរ' },
      { expr: 'a = (y₂ − y₁)/(x₂ − x₁)', noteKh: 'មេគុណប្រាប់ទិសឆ្លងចំណុចពីរ' },
      { expr: 'f(k) = a·k + b', noteKh: 'តម្លៃអនុគមន៍ត្រង់ x = k' },
    ],
  },
  Statistics: {
    lessonKh:
      'ស្ថិតិមូលដ្ឋាន សិក្សាពីរបៀបសង្ខេបទិន្នន័យ។\n\nមធ្យមភាគ (mean) = ផលបូកទិន្នន័យទាំងអស់ ÷ ចំនួនទិន្នន័យ។\n\nមេដ្យាន (median) = តម្លៃកណ្តាល ពេលរៀបទិន្នន័យតាមលំដាប់ (បើចំនួនគូ យកមធ្យមនៃពីរតម្លៃកណ្តាល)។\n\nម៉ូដ (mode) = តម្លៃដែលកើតឡើងញឹកញាប់បំផុត។ វិសាលភាព (range) = តម្លៃធំបំផុត − តម្លៃតូចបំផុត។',
    formulas: [
      { expr: 'x̄ = (x₁ + x₂ + … + xₙ) / n', noteKh: 'មធ្យមភាគ' },
      { expr: 'Range = max − min', noteKh: 'វិសាលភាព' },
    ],
  },
  'Similar Triangles': {
    lessonKh:
      'ត្រីកោណពីរដូចគ្នា (similar) ពេលមុំរៀងគ្នាស្មើគ្នា ហើយជ្រុងរៀងគ្នាសមាមាត្រគ្នា។\n\nផលធៀបជ្រុងរៀងគ្នាហៅថា មេគុណសមាមាត្រ k។ បើជ្រុងធៀបជា k នោះផលធៀបក្រឡាផ្ទៃស្មើ k²។\n\nលក្ខខណ្ឌដូចគ្នា៖ មុំ-មុំ (AA), ជ្រុង-មុំ-ជ្រុង (SAS), ជ្រុង-ជ្រុង-ជ្រុង (SSS)។',
    formulas: [
      { expr: 'AB/A′B′ = BC/B′C′ = CA/C′A′ = k', noteKh: 'ជ្រុងរៀងគ្នាសមាមាត្រ' },
      { expr: 'S/S′ = k²', noteKh: 'ផលធៀបក្រឡាផ្ទៃ' },
    ],
  },
  'Pythagorean Theorem': {
    lessonKh:
      'ក្នុងត្រីកោណកែង ការេអ៊ីប៉ូតេនុស (ជ្រុងទល់មុខមុំកែង) ស្មើនឹងផលបូកការេជ្រុងកែងទាំងពីរ។\n\nទ្រឹស្តីបទច្រាស៖ បើ a² + b² = c² នោះត្រីកោណនោះជាត្រីកោណកែង។\n\nត្រីកោណកែងល្បីៗ៖ (3, 4, 5), (6, 8, 10), (5, 12, 13)។',
    formulas: [
      { expr: 'a² + b² = c²', noteKh: 'c ជាអ៊ីប៉ូតេនុស' },
      { expr: 'c = √(a² + b²)', noteKh: 'រកអ៊ីប៉ូតេនុស' },
      { expr: 'a = √(c² − b²)', noteKh: 'រកជ្រុងកែង' },
    ],
  },
  Circles: {
    lessonKh:
      'រង្វង់ គឺជាសំណុំចំណុចដែលមានចម្ងាយស្មើគ្នា (កាំ r) ពីផ្ចិត។\n\nអង្កត់ផ្ចិត d = 2r។ បរិមាត្ររង្វង់ (រង្វង់ជុំវិញ) C = 2πr។ ក្រឡាផ្ទៃថាស A = πr²។\n\nπ ≈ 3.14159 គឺជាផលធៀបរវាងបរិមាត្រ និងអង្កត់ផ្ចិតនៃរង្វង់គ្រប់ទំហំ។',
    formulas: [
      { expr: 'C = 2πr = πd', noteKh: 'បរិមាត្ររង្វង់' },
      { expr: 'A = πr²', noteKh: 'ក្រឡាផ្ទៃថាស' },
      { expr: 'd = 2r', noteKh: 'អង្កត់ផ្ចិត' },
    ],
  },
  'Solid Geometry & Volume': {
    lessonKh:
      'មាឌ គឺជារង្វាស់ទំហំផ្ទុករបស់សូលីត។\n\nគូប ជ្រុង a មានមាឌ a³។ បរិមាត្រកែង (ប្រអប់) មានមាឌ = បណ្តោយ × ទទឹង × កម្ពស់។\n\nស៊ីឡាំង = ក្រឡាផ្ទៃបាត × កម្ពស់។ កោណ = ⅓ នៃស៊ីឡាំងដែលមានបាត និងកម្ពស់ដូចគ្នា។ ស្វ៊ែរកាំ r មានមាឌ (4/3)πr³។',
    formulas: [
      { expr: 'V(គូប) = a³', noteKh: 'គូបជ្រុង a' },
      { expr: 'V(ប្រអប់) = l × w × h', noteKh: 'បរិមាត្រកែង' },
      { expr: 'V(ស៊ីឡាំង) = πr²h', noteKh: 'ស៊ីឡាំង' },
      { expr: 'V(កោណ) = (1/3)πr²h', noteKh: 'កោណ' },
      { expr: 'V(ស្វ៊ែរ) = (4/3)πr³', noteKh: 'ស្វ៊ែរ' },
    ],
  },
  'Trigonometry Basics': {
    lessonKh:
      'ត្រីកោណមាត្រ សិក្សាទំនាក់ទំនងរវាងមុំ និងជ្រុងក្នុងត្រីកោណកែង។\n\nសម្រាប់មុំស្រួច θ៖ ស៊ីនុស = ជ្រុងទល់មុខ ÷ អ៊ីប៉ូតេនុស, កូស៊ីនុស = ជ្រុងជាប់ ÷ អ៊ីប៉ូតេនុស, តង់សង់ = ជ្រុងទល់មុខ ÷ ជ្រុងជាប់។\n\nតម្លៃពិសេស៖ sin 30° = 1/2, cos 60° = 1/2, tan 45° = 1។',
    formulas: [
      { expr: 'sin θ = ទល់មុខ / អ៊ីប៉ូតេនុស', noteKh: 'ស៊ីនុស' },
      { expr: 'cos θ = ជាប់ / អ៊ីប៉ូតេនុស', noteKh: 'កូស៊ីនុស' },
      { expr: 'tan θ = ទល់មុខ / ជាប់', noteKh: 'តង់សង់' },
      { expr: 'sin 30° = 1/2 ; cos 60° = 1/2 ; tan 45° = 1', noteKh: 'តម្លៃពិសេស' },
    ],
  },
};

async function seed() {
  console.log(`🌱 Grade-9 Math lesson seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const subject = await prisma.subject.findUnique({
    where: { code: SUBJECT_CODE },
    select: { id: true },
  });
  if (!subject) throw new Error(`Subject ${SUBJECT_CODE} not found`);

  let updated = 0;
  let unchanged = 0;
  let missing = 0;

  for (const [unitName, lesson] of Object.entries(LESSONS)) {
    const topic = await prisma.topic.findFirst({
      where: { subjectId: subject.id, parentId: null, name: unitName },
      select: { id: true, miniLessonKh: true, formulaSheet: true },
    });
    if (!topic) {
      console.log(`  ⏭️  unit "${unitName}" not found — run seed-topics-math-g9 first`);
      missing += 1;
      continue;
    }

    const sameLesson = topic.miniLessonKh === lesson.lessonKh;
    const sameFormulas = JSON.stringify(topic.formulaSheet) === JSON.stringify(lesson.formulas);
    if (sameLesson && sameFormulas) {
      unchanged += 1;
      continue;
    }

    console.log(`  ✏️  ${unitName} — lesson ${lesson.lessonKh.length} chars, ${lesson.formulas.length} formulas`);
    updated += 1;
    if (!APPLY) continue;

    await prisma.topic.update({
      where: { id: topic.id },
      data: {
        miniLessonKh: lesson.lessonKh,
        formulaSheet: lesson.formulas as unknown as Prisma.InputJsonValue,
      },
    });
  }

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${updated} updated, ${unchanged} unchanged, ${missing} missing.`,
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
