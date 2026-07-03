/**
 * Seed: sample practice questions for the first grade-9 Math units, so the
 * Learn path has live content on dev/staging. One QUIZ post per unit
 * ("Practice: <unit>"), questions tagged with the unit's topicId and written
 * through prepareQuizQuestions — identical shape to a teacher-authored quiz,
 * so grading, reels, recall and Learn practice all just work.
 *
 * ⚠️ SAMPLE CONTENT for the pilot — replace/extend with curriculum-reviewed
 * questions before any production rollout.
 *
 * Safety: DRY-RUN by default (--apply to write). Idempotent: skips a unit
 * whose "Practice: <unit>" post already exists. Author: first ADMIN /
 * SUPER_ADMIN / TEACHER user found (override with --author <userId>).
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/seed-practice-math-g9.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/seed-practice-math-g9.ts --apply  # write
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { prepareQuizQuestions } from '../src/utils/quizQuestionRows';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const authorArg = process.argv.indexOf('--author');
const AUTHOR_OVERRIDE = authorArg >= 0 ? process.argv[authorArg + 1] : null;
const SUBJECT_CODE = 'MATH-G9';

type SeedQuestion = { text: string; options: string[]; correct: number; explanation?: string };

/** Unit name (must match seed-topics-math-g9.ts) → sample questions. */
const PRACTICE: Record<string, SeedQuestion[]> = {
  'Real Numbers': [
    { text: 'តើ √49 ស្មើប៉ុន្មាន?', options: ['5', '6', '7', '8'], correct: 2, explanation: '7 × 7 = 49 ដូច្នេះ √49 = 7' },
    { text: 'តើ ∛27 ស្មើប៉ុន្មាន?', options: ['3', '9', '27', '81'], correct: 0, explanation: '3 × 3 × 3 = 27' },
    { text: 'តើ 2⁵ ស្មើប៉ុន្មាន?', options: ['10', '16', '25', '32'], correct: 3, explanation: '2×2×2×2×2 = 32' },
    { text: 'តើ √(16 × 9) ស្មើប៉ុន្មាន?', options: ['12', '25', '144', '7'], correct: 0, explanation: '√16 × √9 = 4 × 3 = 12' },
    { text: 'ចំនួន 4500 សរសេរជាទម្រង់វិទ្យាសាស្ត្រ គឺ?', options: ['4.5 × 10²', '4.5 × 10³', '45 × 10³', '0.45 × 10⁴'], correct: 1, explanation: '4500 = 4.5 × 1000 = 4.5 × 10³' },
    { text: 'តើ (−2)³ ស្មើប៉ុន្មាន?', options: ['−8', '−6', '6', '8'], correct: 0, explanation: '(−2)×(−2)×(−2) = −8' },
  ],
  'Polynomials & Algebraic Expressions': [
    { text: 'ពន្លាត (x + 2)(x − 3)', options: ['x² − x − 6', 'x² + x − 6', 'x² − 5x − 6', 'x² − x + 6'], correct: 0, explanation: 'x² − 3x + 2x − 6 = x² − x − 6' },
    { text: 'បំបែកជាផលគុណកត្តា: x² − 9', options: ['(x − 3)(x − 3)', '(x + 3)(x − 3)', '(x + 9)(x − 1)', 'x(x − 9)'], correct: 1, explanation: 'ផលដកការេ: a² − b² = (a+b)(a−b)' },
    { text: 'បំបែកជាផលគុណកត្តា: x² + 5x + 6', options: ['(x + 1)(x + 6)', '(x + 2)(x + 3)', '(x − 2)(x − 3)', '(x + 5)(x + 1)'], correct: 1, explanation: '2 × 3 = 6 និង 2 + 3 = 5' },
    { text: 'សម្រួល (2x² + 3x) − (x² − x)', options: ['x² + 2x', 'x² + 4x', '3x² + 2x', 'x² − 4x'], correct: 1, explanation: '2x² − x² = x² និង 3x − (−x) = 4x' },
    { text: 'តើដឺក្រេនៃពហុធា 3x³ + x − 7 គឺប៉ុន្មាន?', options: ['1', '2', '3', '7'], correct: 2, explanation: 'ដឺក្រេ = និទស្សន្តធំបំផុតរបស់ x' },
    { text: 'កត្តារួមនៃ 6x² + 9x គឺ?', options: ['3x', '6x', 'x²', '9'], correct: 0, explanation: '6x² + 9x = 3x(2x + 3)' },
  ],
  'Linear Equations': [
    { text: 'ដោះស្រាយ: 2x + 3 = 11', options: ['x = 3', 'x = 4', 'x = 5', 'x = 7'], correct: 1, explanation: '2x = 8 ⇒ x = 4' },
    { text: 'ដោះស្រាយ: 5x − 7 = 3x + 5', options: ['x = 4', 'x = 5', 'x = 6', 'x = 12'], correct: 2, explanation: '2x = 12 ⇒ x = 6' },
    { text: 'ដោះស្រាយ: x/3 = 4', options: ['x = 7', 'x = 12', 'x = 4/3', 'x = 1'], correct: 1, explanation: 'x = 4 × 3 = 12' },
    { text: 'ដោះស្រាយ: 3(x − 2) = 9', options: ['x = 3', 'x = 5', 'x = 6', 'x = 11'], correct: 1, explanation: 'x − 2 = 3 ⇒ x = 5' },
    { text: 'ចំនួនមួយបូក 8 ស្មើ 15។ តើចំនួននោះគឺប៉ុន្មាន?', options: ['5', '6', '7', '23'], correct: 2, explanation: 'x + 8 = 15 ⇒ x = 7' },
    { text: 'ដោះស្រាយ: 7 = 2x − 1', options: ['x = 3', 'x = 4', 'x = 6', 'x = 8'], correct: 1, explanation: '2x = 8 ⇒ x = 4' },
  ],
  'Linear Inequalities': [
    { text: 'ដោះស្រាយ: 2x − 1 < 5', options: ['x < 2', 'x < 3', 'x > 3', 'x < 6'], correct: 1, explanation: '2x < 6 ⇒ x < 3' },
    { text: 'ដោះស្រាយ: −3x ≤ 9', options: ['x ≤ −3', 'x ≤ 3', 'x ≥ −3', 'x ≥ 3'], correct: 2, explanation: 'ចែកនឹង −3 → ត្រឡប់ទិស: x ≥ −3' },
    { text: 'ដោះស្រាយ: x + 4 > 7', options: ['x > 3', 'x > 11', 'x < 3', 'x > −3'], correct: 0, explanation: 'x > 7 − 4 = 3' },
    { text: 'ដោះស្រាយ: 5 − x ≥ 2', options: ['x ≥ 3', 'x ≤ 3', 'x ≥ −3', 'x ≤ 7'], correct: 1, explanation: '−x ≥ −3 ⇒ x ≤ 3 (ត្រឡប់ទិស)' },
    { text: 'តើតម្លៃណាផ្ទៀងផ្ទាត់ x > 2?', options: ['0', '1', '2', '5'], correct: 3, explanation: '5 > 2 ពិត; 2 មិនធំជាង 2 ទេ' },
    { text: 'ដោះស្រាយ: 2(x − 1) < 8', options: ['x < 3', 'x < 4', 'x < 5', 'x > 5'], correct: 2, explanation: 'x − 1 < 4 ⇒ x < 5' },
  ],
  'Systems of Linear Equations': [
    { text: 'ដោះស្រាយ: x + y = 5 និង x − y = 1', options: ['(3, 2)', '(2, 3)', '(4, 1)', '(1, 4)'], correct: 0, explanation: 'បូកសមីការ: 2x = 6 ⇒ x = 3, y = 2' },
    { text: 'ដោះស្រាយ: 2x + y = 7 និង y = x + 1', options: ['(1, 2)', '(2, 3)', '(3, 4)', '(2, 5)'], correct: 1, explanation: 'ជំនួស: 2x + x + 1 = 7 ⇒ x = 2, y = 3' },
    { text: 'បើ x + 2y = 8 ហើយ x = 2 តើ y ស្មើប៉ុន្មាន?', options: ['2', '3', '4', '6'], correct: 1, explanation: '2 + 2y = 8 ⇒ 2y = 6 ⇒ y = 3' },
    { text: 'ដោះស្រាយ: 3x + y = 9 និង x + y = 5', options: ['(2, 3)', '(3, 2)', '(1, 4)', '(4, 1)'], correct: 0, explanation: 'ដក: 2x = 4 ⇒ x = 2, y = 3' },
    { text: 'ចំនួនពីរបូកគ្នាស្មើ 12 ដកគ្នាស្មើ 4។ ចំនួនធំគឺ?', options: ['6', '7', '8', '10'], correct: 2, explanation: '2x = 16 ⇒ x = 8 (និង 4)' },
    { text: 'តើគូ (x, y) ណាផ្ទៀងផ្ទាត់ x + y = 6 និង x − y = 2?', options: ['(4, 2)', '(2, 4)', '(5, 1)', '(3, 3)'], correct: 0, explanation: '4 + 2 = 6 ✓ និង 4 − 2 = 2 ✓' },
  ],
  'Functions & Graphs': [
    { text: 'មេគុណប្រាប់ទិសនៃ y = 3x − 2 គឺ?', options: ['−2', '2', '3', 'x'], correct: 2, explanation: 'ក្នុង y = ax + b មេគុណប្រាប់ទិសគឺ a = 3' },
    { text: 'បន្ទាត់ y = 2x + 5 កាត់អ័ក្ស y ត្រង់?', options: ['2', '5', '−5', '0'], correct: 1, explanation: 'b = 5 ជាចំណុចកាត់អ័ក្ស y' },
    { text: 'បើ f(x) = 2x + 1 តើ f(3) ស្មើប៉ុន្មាន?', options: ['5', '6', '7', '9'], correct: 2, explanation: 'f(3) = 2(3) + 1 = 7' },
    { text: 'តើចំណុច (1, 4) ស្ថិតលើបន្ទាត់ y = 3x + 1 ដែរឬទេ?', options: ['ស្ថិតលើ', 'មិនស្ថិតលើ', 'មិនអាចដឹង', 'ស្ថិតលើអ័ក្ស x'], correct: 0, explanation: '3(1) + 1 = 4 ✓' },
    { text: 'មេគុណប្រាប់ទិសនៃបន្ទាត់ឆ្លងកាត់ (0,0) និង (2,6) គឺ?', options: ['2', '3', '4', '6'], correct: 1, explanation: 'a = (6−0)/(2−0) = 3' },
    { text: 'បន្ទាត់ y = −x + 2 មានមេគុណប្រាប់ទិស?', options: ['1', '2', '−1', '−2'], correct: 2, explanation: 'a = −1 (បន្ទាត់ចុះ)' },
  ],
  Statistics: [
    { text: 'មធ្យមភាគនៃ 4, 6, 8 គឺ?', options: ['5', '6', '7', '18'], correct: 1, explanation: '(4+6+8)/3 = 18/3 = 6' },
    { text: 'មេដ្យាននៃ 3, 5, 7, 9, 11 គឺ?', options: ['5', '6', '7', '9'], correct: 2, explanation: 'តម្លៃកណ្តាល (ទី៣) គឺ 7' },
    { text: 'ម៉ូដនៃ 2, 3, 3, 5, 7 គឺ?', options: ['2', '3', '5', '7'], correct: 1, explanation: '3 កើតឡើង ២ ដង ច្រើនជាងគេ' },
    { text: 'វិសាលភាពនៃ 2, 5, 8, 10 គឺ?', options: ['6', '8', '10', '12'], correct: 1, explanation: '10 − 2 = 8' },
    { text: 'មធ្យមភាគនៃ 5, 5, 5, 5 គឺ?', options: ['0', '4', '5', '20'], correct: 2, explanation: 'ទិន្នន័យដូចគ្នាទាំងអស់ → មធ្យម = 5' },
    { text: 'មេដ្យាននៃ 2, 4, 6, 8 គឺ?', options: ['4', '5', '6', '7'], correct: 1, explanation: 'ចំនួនគូ → (4+6)/2 = 5' },
  ],
  'Similar Triangles': [
    { text: 'ត្រីកោណដូចគ្នា k = 2។ បើ AB = 4 តើ A′B′ ស្មើ?', options: ['2', '4', '6', '8'], correct: 3, explanation: 'A′B′ = k × AB = 2 × 4 = 8' },
    { text: 'បើមេគុណសមាមាត្រ k = 3 ផលធៀបក្រឡាផ្ទៃស្មើ?', options: ['3', '6', '9', '27'], correct: 2, explanation: 'S/S′ = k² = 9' },
    { text: 'ជ្រុង 6 ធៀបនឹង 9។ តើ k ស្មើប៉ុន្មាន?', options: ['1.5', '2', '3', '0.5'], correct: 0, explanation: 'k = 9/6 = 1.5' },
    { text: 'លក្ខខណ្ឌណាបញ្ជាក់ត្រីកោណដូចគ្នា?', options: ['មុំពីរស្មើគ្នារៀងគ្នា (AA)', 'ជ្រុងមួយស្មើគ្នា', 'បរិមាត្រស្មើគ្នា', 'ក្រឡាផ្ទៃស្មើគ្នា'], correct: 0, explanation: 'មុំ-មុំ (AA) គ្រប់គ្រាន់សម្រាប់ភាពដូចគ្នា' },
    { text: 'ត្រីកោណ 3, 4, 5 ដូចនឹងត្រីកោណ 6, 8, ?', options: ['9', '10', '12', '15'], correct: 1, explanation: 'k = 2 ⇒ 5 × 2 = 10' },
    { text: 'ជ្រុង 5 ក្លាយជា 15។ តើ k ស្មើ?', options: ['2', '3', '5', '10'], correct: 1, explanation: 'k = 15/5 = 3' },
  ],
  'Pythagorean Theorem': [
    { text: 'ជ្រុងកែង 3 និង 4។ អ៊ីប៉ូតេនុសស្មើ?', options: ['5', '6', '7', '12'], correct: 0, explanation: '√(9+16) = √25 = 5' },
    { text: 'អ៊ីប៉ូតេនុស 13 ជ្រុងកែងមួយ 5។ ជ្រុងទៀតស្មើ?', options: ['8', '10', '12', '18'], correct: 2, explanation: '√(169−25) = √144 = 12' },
    { text: 'ជ្រុងកែង 6 និង 8។ អ៊ីប៉ូតេនុសស្មើ?', options: ['9', '10', '12', '14'], correct: 1, explanation: '√(36+64) = √100 = 10' },
    { text: 'តើ 5, 12, 13 ជាត្រីកោណកែងដែរឬទេ?', options: ['ជា', 'មិនជា', 'មិនអាចដឹង', 'ជាត្រីកោណសម័ង្ស'], correct: 0, explanation: '25 + 144 = 169 = 13² ✓' },
    { text: 'អ៊ីប៉ូតេនុស 10 ជ្រុងកែងមួយ 6។ ជ្រុងទៀតស្មើ?', options: ['4', '6', '8', '16'], correct: 2, explanation: '√(100−36) = √64 = 8' },
    { text: 'ជ្រុងកែង 9 និង 12។ អ៊ីប៉ូតេនុសស្មើ?', options: ['13', '15', '18', '21'], correct: 1, explanation: '√(81+144) = √225 = 15' },
  ],
  Circles: [
    { text: 'រង្វង់កាំ r = 7។ បរិមាត្រស្មើ?', options: ['7π', '14π', '49π', '21π'], correct: 1, explanation: 'C = 2πr = 14π' },
    { text: 'ថាសកាំ r = 3។ ក្រឡាផ្ទៃស្មើ?', options: ['3π', '6π', '9π', '12π'], correct: 2, explanation: 'A = πr² = 9π' },
    { text: 'អង្កត់ផ្ចិត d = 10។ កាំស្មើ?', options: ['5', '10', '20', '25'], correct: 0, explanation: 'r = d/2 = 5' },
    { text: 'បើ C = 6π តើកាំស្មើ?', options: ['2', '3', '6', '12'], correct: 1, explanation: '2πr = 6π ⇒ r = 3' },
    { text: 'បើ A = 25π តើកាំស្មើ?', options: ['5', '12.5', '25', '625'], correct: 0, explanation: 'r² = 25 ⇒ r = 5' },
    { text: 'កន្លះថាសកាំ r = 2 មានក្រឡាផ្ទៃ?', options: ['π', '2π', '4π', '8π'], correct: 1, explanation: 'πr²/2 = 4π/2 = 2π' },
  ],
  'Solid Geometry & Volume': [
    { text: 'គូបជ្រុង a = 3។ មាឌស្មើ?', options: ['9', '18', '27', '81'], correct: 2, explanation: 'V = a³ = 27' },
    { text: 'ប្រអប់ 2 × 3 × 4។ មាឌស្មើ?', options: ['9', '20', '24', '30'], correct: 2, explanation: 'V = lwh = 24' },
    { text: 'ស៊ីឡាំង r = 2, h = 5។ មាឌស្មើ?', options: ['10π', '20π', '25π', '40π'], correct: 1, explanation: 'V = πr²h = 20π' },
    { text: 'កោណ r = 3, h = 4។ មាឌស្មើ?', options: ['12π', '36π', '9π', '18π'], correct: 0, explanation: 'V = (1/3)πr²h = 12π' },
    { text: 'ស្វ៊ែរកាំ r = 3។ មាឌស្មើ?', options: ['12π', '27π', '36π', '108π'], correct: 2, explanation: 'V = (4/3)π(27) = 36π' },
    { text: 'គូបមានមាឌ 64។ ជ្រុងស្មើ?', options: ['4', '8', '16', '32'], correct: 0, explanation: 'a = ∛64 = 4' },
  ],
  'Trigonometry Basics': [
    { text: 'sin 30° ស្មើ?', options: ['1/2', '√2/2', '√3/2', '1'], correct: 0, explanation: 'sin 30° = 1/2' },
    { text: 'cos 60° ស្មើ?', options: ['√3/2', '1/2', '√2/2', '0'], correct: 1, explanation: 'cos 60° = 1/2' },
    { text: 'tan 45° ស្មើ?', options: ['0', '1/2', '1', '√3'], correct: 2, explanation: 'tan 45° = 1' },
    { text: 'ជ្រុងទល់មុខ 3 អ៊ីប៉ូតេនុស 5។ sin θ ស្មើ?', options: ['3/5', '4/5', '5/3', '3/4'], correct: 0, explanation: 'sin = ទល់មុខ/អ៊ីប៉ូតេនុស = 3/5' },
    { text: 'ជ្រុងជាប់ 4 អ៊ីប៉ូតេនុស 5។ cos θ ស្មើ?', options: ['3/5', '5/4', '4/5', '4/3'], correct: 2, explanation: 'cos = ជាប់/អ៊ីប៉ូតេនុស = 4/5' },
    { text: 'ជ្រុងទល់មុខ 3 ជ្រុងជាប់ 4។ tan θ ស្មើ?', options: ['4/3', '3/4', '3/5', '4/5'], correct: 1, explanation: 'tan = ទល់មុខ/ជាប់ = 3/4' },
  ],
};

async function seed() {
  console.log(`🌱 Grade-9 Math practice seed — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const subject = await prisma.subject.findUnique({
    where: { code: SUBJECT_CODE },
    select: { id: true },
  });
  if (!subject) throw new Error(`Subject ${SUBJECT_CODE} not found`);

  const author = AUTHOR_OVERRIDE
    ? await prisma.user.findUnique({ where: { id: AUTHOR_OVERRIDE }, select: { id: true, role: true } })
    : await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'TEACHER'] } },
        select: { id: true, role: true },
        orderBy: { createdAt: 'asc' },
      });
  if (!author) throw new Error('No author user found — pass --author <userId>');
  console.log(`✍️  Author: ${author.id} (${author.role})\n`);

  let createdPosts = 0;
  let skipped = 0;

  for (const [unitName, seedQuestions] of Object.entries(PRACTICE)) {
    const topic = await prisma.topic.findFirst({
      where: { subjectId: subject.id, parentId: null, name: unitName },
      select: { id: true, nameKh: true },
    });
    if (!topic) {
      console.log(`  ⏭️  unit "${unitName}" not found in taxonomy — run seed-topics-math-g9 first`);
      skipped += 1;
      continue;
    }

    const title = `Practice: ${unitName}`;
    const existing = await prisma.post.findFirst({
      where: { authorId: author.id, postType: 'QUIZ', title },
      select: { id: true },
    });
    if (existing) {
      console.log(`  ⏭️  "${title}" already exists (${existing.id})`);
      skipped += 1;
      continue;
    }

    const prepared = prepareQuizQuestions(
      seedQuestions.map((q) => ({
        text: q.text,
        type: 'MULTIPLE_CHOICE',
        options: q.options,
        correctAnswer: q.correct,
        points: 1,
        explanation: q.explanation,
        topicId: topic.id,
      })),
      { validTopicIds: new Set([topic.id]) },
    );

    console.log(`  ➕ "${title}" — ${prepared.rows.length} questions → topic ${topic.id}`);
    createdPosts += 1;
    if (!APPLY) continue;

    await prisma.post.create({
      data: {
        authorId: author.id,
        content: `លំហាត់អនុវត្តន៍ ${topic.nameKh ?? unitName} (គណិតវិទ្យា ថ្នាក់ទី៩)`,
        title,
        postType: 'QUIZ',
        visibility: 'PUBLIC',
        topicTags: ['mathematics', 'grade9'],
        quiz: {
          create: {
            questions: prepared.questionsJson,
            timeLimit: 0,
            passingScore: 70,
            totalPoints: prepared.questionsJson.reduce((sum, q) => sum + q.points, 0),
            resultsVisibility: 'AFTER_SUBMISSION',
            shuffleQuestions: false,
            shuffleAnswers: false,
            showReview: true,
            showExplanations: true,
          },
        },
        quizQuestions: {
          create: prepared.rows.map((row) => ({
            id: row.id,
            question: row.question,
            options: row.options,
            correctAnswer: row.correctAnswer,
            points: row.points,
            position: row.position,
            explanation: row.explanation,
            topicId: row.topicId,
          })),
        },
      },
      select: { id: true },
    });
  }

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${createdPosts} practice posts, ${skipped} skipped.`,
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
