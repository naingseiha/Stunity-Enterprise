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
