/**
 * AI backfill: classify existing quiz_questions rows into a 1-5 difficulty
 * band, so the Learn-tab practice ladder (Basic/Medium/Advanced/Exam-Prep/
 * Final-Challenge stages) can serve genuinely different questions per stage
 * instead of the same undifferentiated pool every time.
 *
 * Uses Claude (via @anthropic-ai/sdk directly, same pattern as
 * classify-question-topics.ts calling Gemini directly) — not Gemini, which
 * is still billing-suspended for this project.
 *
 * Safety:
 *   - DRY-RUN by default. Pass --apply to write.
 *   - Idempotent: only difficulty IS NULL rows are ever selected.
 *   - Per-batch best-effort: a failed batch is logged and skipped, never
 *     retried into a loop.
 *   - Out-of-range/unparseable model output is discarded, not clamped.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/classify-question-difficulty.ts               # dry run, 100 questions
 *   node ../../node_modules/.bin/tsx scripts/classify-question-difficulty.ts --limit 500
 *   node ../../node_modules/.bin/tsx scripts/classify-question-difficulty.ts --apply
 */

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';

// Root .env has DATABASE_URL; ANTHROPIC_API_KEY currently only lives in
// ai-service's own .env (not yet promoted to a shared secret) — load both,
// root first so DATABASE_URL etc. keep their normal source of truth.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../ai-service/.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Math.max(1, parseInt(process.argv[limitArg + 1], 10) || 100) : 100;
const BATCH_SIZE = 15;
const MODEL = 'claude-sonnet-5';

const SYSTEM_PROMPT = `You are a difficulty classifier for a Cambodian school quiz bank (Khmer MoEYS curriculum, grades 7-12).
For EACH question, assign a difficulty from 1 (easiest) to 5 (hardest) on an ABSOLUTE scale spanning the WHOLE curriculum
(grade 7 basics through grade 12 Bac II exam-prep) — do not judge each batch relative to only the other questions in it,
since one batch might contain only grade-9 review or only grade-12 calculus.

Anchor examples (use these to calibrate, do not just copy their difficulty for similar-looking questions):
- 1: pure recall/definition, single-step arithmetic (e.g. "what is 20% of 500?", "what does DNA stand for?").
- 2: direct one-formula plug-in with no setup required (e.g. "compute the area of a circle with r=3").
- 3: requires an extra setup/interpretation step before applying a formula, or combines two simple facts
  (e.g. a related-rates word problem, solving a 2-variable linear system, a single substitution integral).
- 4: multi-step reasoning combining several concepts, or grade-11/12 content requiring a non-obvious technique
  (e.g. L'Hopital-style limits, integration by parts, a differential equation requiring a specific method,
  a geometry proof chaining multiple theorems).
- 5: exam-level synthesis — multiple techniques chained together, edge cases, or the kind of question that would
  appear as the final/hardest item on a real Bac II exam paper.
IMPORTANT: a question being short or multiple-choice does NOT make it easy — grade-12 calculus/complex-number
content should usually land at 3-5 even when phrased as a single "compute X" line, because the underlying
technique (not the sentence length) is what's hard. Use the full 1-5 range across a real batch; do not cluster
everything at 1-2 just because each individual step looks small.

RULES:
- Output ONLY a JSON array, no markdown fences, no extra text.
- One entry per question: {"questionId": "<id>", "difficulty": <1-5 integer>}
- Judge difficulty by the reasoning required for THIS grade/subject context, not question length or language (Khmer/English/mixed).
- Always return an integer 1-5 for every question — never null, never omit a question.`;

type Row = {
  id: string;
  question: string;
  options: string[];
  explanation: string | null;
  points: number;
  topic: { name: string; subject: { grade: string; nameEn: string | null; name: string } } | null;
};

const parseJsonArray = (raw: string): Array<{ questionId: string; difficulty: number }> => {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('model did not return an array');
  return parsed;
};

const isValidDifficulty = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;

async function classify() {
  console.log(`🤖 Difficulty classification — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'} · limit ${LIMIT}\n`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey });

  const questions: Row[] = await prisma.quizQuestion.findMany({
    where: { difficulty: null },
    select: {
      id: true,
      question: true,
      options: true,
      explanation: true,
      points: true,
      topic: { select: { name: true, subject: { select: { grade: true, nameEn: true, name: true } } } },
    },
    orderBy: { createdAt: 'asc' },
    take: LIMIT,
  });
  console.log(`❓ ${questions.length} untagged (difficulty IS NULL) questions to classify\n`);
  if (questions.length === 0) return;

  let tagged = 0;
  let invalid = 0;
  let failedBatches = 0;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const batchLabel = `batch ${i / BATCH_SIZE + 1}/${Math.ceil(questions.length / BATCH_SIZE)}`;

    const userPrompt = JSON.stringify({
      questions: batch.map((q) => ({
        questionId: q.id,
        text: q.question,
        options: q.options,
        explanation: q.explanation,
        context: q.topic
          ? `${q.topic.subject.nameEn ?? q.topic.subject.name} (grade ${q.topic.subject.grade}): ${q.topic.name}`
          : undefined,
      })),
    });

    try {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new Error('no text content in response');
      const assignments = parseJsonArray(textBlock.text);
      const byQuestion = new Map(assignments.map((a) => [a.questionId, a.difficulty]));

      for (const q of batch) {
        const difficulty = byQuestion.get(q.id);
        if (!isValidDifficulty(difficulty)) {
          invalid += 1;
          continue;
        }
        console.log(`  🎚️  [${difficulty}] ${q.question.slice(0, 70)}…`);
        tagged += 1;
        if (APPLY) {
          await prisma.quizQuestion.update({ where: { id: q.id }, data: { difficulty } });
        }
      }
    } catch (err) {
      failedBatches += 1;
      console.error(`  ❌ ${batchLabel} failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${tagged} tagged, ${invalid} invalid/missing discarded, ${failedBatches} failed batches.`,
  );
}

classify()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
