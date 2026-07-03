/**
 * AI backfill: classify untagged quiz questions into curriculum Topics.
 *
 * Feeds Gemini the active Topic catalog (subject + unit > skill paths) and
 * batches of untagged quiz_questions rows; the model returns a topicId per
 * question or null when nothing fits (questions outside seeded subjects
 * simply stay untagged). Applied tags also propagate to that question's
 * existing RecallCards (only where their topicId is still null).
 *
 * Safety:
 *   - DRY-RUN by default. Pass --apply to write.
 *   - Returned topic ids are validated against the catalog; anything else
 *     is discarded.
 *   - Low temperature, per-batch best-effort: a failed batch is logged and
 *     skipped, never retried into a loop.
 *   - Idempotent in effect: only topicId IS NULL rows are ever selected.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/classify-question-topics.ts               # dry run, 100 questions
 *   node ../../node_modules/.bin/tsx scripts/classify-question-topics.ts --limit 500
 *   node ../../node_modules/.bin/tsx scripts/classify-question-topics.ts --apply
 */

import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Math.max(1, parseInt(process.argv[limitArg + 1], 10) || 100) : 100;
const BATCH_SIZE = 15;

const SYSTEM_PROMPT = `You are a curriculum classifier for a Cambodian school platform.
You receive a catalog of curriculum topics and a list of quiz questions.
For EACH question, pick the single best-fitting topic id from the catalog, or null if no topic fits confidently.

RULES:
- Output ONLY a JSON array, no markdown fences, no extra text.
- One entry per question: {"questionId": "<id>", "topicId": "<catalog id or null>"}
- Prefer the most specific topic (a skill over its unit) when clearly applicable.
- Questions may be in Khmer, English, or mixed — classify by mathematical/scientific content, not language.
- When in doubt, return null. A wrong tag is worse than no tag.`;

type CatalogEntry = { id: string; label: string };

const parseJsonArray = (raw: string): Array<{ questionId: string; topicId: string | null }> => {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('model did not return an array');
  return parsed;
};

async function classify() {
  console.log(`🤖 Topic classification — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'} · limit ${LIMIT}\n`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
  });

  // Catalog: "Subject (grade N): Unit" and "Subject (grade N): Unit > Skill".
  const topics = await prisma.topic.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      parent: { select: { name: true } },
      subject: { select: { name: true, nameEn: true, grade: true } },
    },
  });
  if (topics.length === 0) {
    console.log('No active topics — seed a taxonomy first.');
    return;
  }
  const catalog: CatalogEntry[] = topics.map((t) => ({
    id: t.id,
    label: `${t.subject.nameEn ?? t.subject.name} (grade ${t.subject.grade}): ${
      t.parent ? `${t.parent.name} > ${t.name}` : t.name
    }`,
  }));
  const validIds = new Set(catalog.map((c) => c.id));
  console.log(`📚 Catalog: ${catalog.length} topics\n`);

  const questions = await prisma.quizQuestion.findMany({
    where: { topicId: null },
    select: {
      id: true,
      question: true,
      options: true,
      post: { select: { title: true, topicTags: true, courseCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: LIMIT,
  });
  console.log(`❓ ${questions.length} untagged questions to classify\n`);
  if (questions.length === 0) return;

  let tagged = 0;
  let skippedNull = 0;
  let invalid = 0;
  let failedBatches = 0;

  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const batchLabel = `batch ${i / BATCH_SIZE + 1}/${Math.ceil(questions.length / BATCH_SIZE)}`;

    const userPrompt = JSON.stringify({
      catalog,
      questions: batch.map((q) => ({
        questionId: q.id,
        text: q.question,
        options: q.options,
        context: [q.post?.title, q.post?.courseCode, ...(q.post?.topicTags ?? [])]
          .filter(Boolean)
          .join(' | '),
      })),
    });

    try {
      const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${userPrompt}`);
      const assignments = parseJsonArray(result.response.text());
      const byQuestion = new Map(assignments.map((a) => [a.questionId, a.topicId]));

      for (const q of batch) {
        const topicId = byQuestion.get(q.id);
        if (!topicId) {
          skippedNull += 1;
          continue;
        }
        if (!validIds.has(topicId)) {
          invalid += 1;
          continue;
        }
        const label = catalog.find((c) => c.id === topicId)?.label;
        console.log(`  🏷️  ${q.question.slice(0, 60)}… → ${label}`);
        tagged += 1;
        if (APPLY) {
          await prisma.$transaction([
            prisma.quizQuestion.update({ where: { id: q.id }, data: { topicId } }),
            prisma.recallCard.updateMany({
              where: { questionId: q.id, topicId: null },
              data: { topicId },
            }),
          ]);
        }
      }
    } catch (err) {
      failedBatches += 1;
      console.error(`  ❌ ${batchLabel} failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${tagged} tagged, ${skippedNull} no-fit, ` +
      `${invalid} invalid ids discarded, ${failedBatches} failed batches.`,
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
