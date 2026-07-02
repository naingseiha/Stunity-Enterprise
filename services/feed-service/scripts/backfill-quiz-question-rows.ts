/**
 * Backfill: unify Quiz.questions Json with quiz_questions rows.
 *
 * Quizzes created through the normal create-post flow historically wrote ONLY
 * the Json store, so their questions have no quiz_questions rows — which means
 * no RecallCards (FK), no reels surfacing, no mastery aggregation, and no
 * anchor for topic tagging. Seed-script quizzes have BOTH stores but with
 * mismatched ids (rows got cuids, Json kept its own ids), which breaks the
 * same FK chain more quietly.
 *
 * For every quiz this script:
 *   1. Adopts existing rows where possible — by Json id, then by normalized
 *      question text, then by position — so already-carded rows keep their id
 *      (and their RecallCards).
 *   2. Runs the same prepareQuizQuestions used by the live create/edit paths,
 *      preserving safe Json ids so stored QuizAttempt.answers keep matching.
 *   3. Creates missing rows / syncs adopted rows, rewrites the Json to the
 *      canonical shape, recomputes totalPoints, and — only when an id could
 *      not be preserved — remaps that id inside stored attempt answers.
 *
 * Safety:
 *   - DRY-RUN by default. Pass --apply to write.
 *   - Idempotent: a second run reports every quiz as unchanged.
 *   - Per-quiz transaction, best-effort: one broken quiz doesn't stop the run.
 *   - Never deletes rows.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/backfill-quiz-question-rows.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/backfill-quiz-question-rows.ts --apply  # write
 */

import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { prepareQuizQuestions, questionTextOf } from '../src/utils/quizQuestionRows';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const APPLY = process.argv.includes('--apply');

const normText = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Key-order-insensitive compare — Postgres jsonb normalizes key order. */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
};

type RawQuestion = Record<string, unknown>;

async function backfill() {
  console.log(`🔁 Quiz question-row backfill — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const [quizzes, allRows, allTopics] = await Promise.all([
    prisma.quiz.findMany({
      select: { id: true, postId: true, questions: true, totalPoints: true },
    }),
    prisma.quizQuestion.findMany({
      select: {
        id: true,
        postId: true,
        question: true,
        options: true,
        correctAnswer: true,
        points: true,
        position: true,
        explanation: true,
        topicId: true,
      },
    }),
    prisma.topic.findMany({ select: { id: true } }),
  ]);

  const rowsByPost = new Map<string, typeof allRows>();
  const allRowIds = new Set<string>();
  for (const row of allRows) {
    allRowIds.add(row.id);
    const list = rowsByPost.get(row.postId) ?? [];
    list.push(row);
    rowsByPost.set(row.postId, list);
  }
  const validTopicIds = new Set(allTopics.map((t) => t.id));

  console.log(`📊 ${quizzes.length} quizzes · ${allRows.length} existing question rows\n`);

  let unchanged = 0;
  let updatedQuizzes = 0;
  let createdRows = 0;
  let syncedRows = 0;
  let remappedAttempts = 0;
  let failed = 0;

  for (const quiz of quizzes) {
    try {
      const raw: RawQuestion[] = Array.isArray(quiz.questions)
        ? (quiz.questions as unknown[]).filter(
            (q): q is RawQuestion => !!q && typeof q === 'object',
          )
        : [];
      if (raw.length === 0) {
        unchanged += 1;
        continue;
      }

      const rowsOnPost = rowsByPost.get(quiz.postId) ?? [];
      const existingRowIds = new Set(rowsOnPost.map((r) => r.id));

      // 1. Adopt existing rows: by id, then text, then position — so a row
      //    that already has RecallCards pointing at it keeps its id.
      const claimed = new Set<string>();
      const adjusted = raw.map((q, index) => {
        const incomingId = typeof q.id === 'string' ? q.id : '';
        if (incomingId && existingRowIds.has(incomingId) && !claimed.has(incomingId)) {
          claimed.add(incomingId);
          return q;
        }
        const text = normText(questionTextOf(q));
        const byText = text
          ? rowsOnPost.find((r) => !claimed.has(r.id) && normText(r.question) === text)
          : undefined;
        const match = byText ?? rowsOnPost.find((r) => !claimed.has(r.id) && r.position === index);
        if (match) {
          claimed.add(match.id);
          return { ...q, id: match.id };
        }
        return q;
      });

      // 2. Same planner the live write paths use. takenRowIds guards adopting
      //    a Json id that some OTHER post's row already owns.
      const prepared = prepareQuizQuestions(adjusted, {
        validTopicIds,
        existingRowIds,
        takenRowIds: allRowIds,
        preserveIncomingIds: true,
      });

      // 3. Which original ids changed? Those need remapping in stored answers.
      const idRemap = new Map<string, string>();
      raw.forEach((q, index) => {
        const before = typeof q.id === 'string' && q.id ? q.id : null;
        const after = prepared.questionsJson[index]?.id;
        if (before && after && before !== after) idRemap.set(before, after);
      });

      const rowById = new Map(rowsOnPost.map((r) => [r.id, r]));
      const rowsToCreate = prepared.rows.filter((r) => r.action === 'create');
      // Only sync rows whose content actually drifted from the Json — keeps
      // a second run a true no-op.
      const rowsToSync = prepared.rows.filter((r) => {
        if (r.action !== 'update') return false;
        const cur = rowById.get(r.id);
        if (!cur) return true;
        return (
          cur.question !== r.question ||
          JSON.stringify(cur.options) !== JSON.stringify(r.options) ||
          cur.correctAnswer !== r.correctAnswer ||
          cur.points !== r.points ||
          cur.position !== r.position ||
          (cur.explanation ?? null) !== r.explanation ||
          (r.topicId ? cur.topicId !== r.topicId : false)
        );
      });
      const nextTotalPoints = prepared.questionsJson.reduce((sum, q) => sum + q.points, 0);
      const jsonChanged =
        stableStringify(prepared.questionsJson) !== stableStringify(quiz.questions) ||
        nextTotalPoints !== quiz.totalPoints;

      if (!jsonChanged && rowsToCreate.length === 0 && rowsToSync.length === 0) {
        unchanged += 1;
        continue;
      }

      console.log(
        `  📝 quiz ${quiz.id} — +${rowsToCreate.length} rows, sync ${rowsToSync.length}, ` +
          `${idRemap.size} id remap(s)${jsonChanged ? ', json rewrite' : ''}`,
      );

      if (!APPLY) {
        updatedQuizzes += 1;
        createdRows += rowsToCreate.length;
        syncedRows += rowsToSync.length;
        continue;
      }

      // Batch-array transaction (one pipelined round trip) — an interactive
      // tx times out at 5s, which a per-row await loop blows through against
      // a remote pooler.
      const ops: Prisma.PrismaPromise<unknown>[] = [];

      if (rowsToCreate.length > 0) {
        ops.push(
          prisma.quizQuestion.createMany({
            data: rowsToCreate.map((row) => ({
              id: row.id,
              postId: quiz.postId,
              question: row.question,
              options: row.options,
              correctAnswer: row.correctAnswer,
              points: row.points,
              position: row.position,
              explanation: row.explanation,
              topicId: row.topicId,
            })),
            skipDuplicates: true,
          }),
        );
      }
      for (const row of rowsToSync) {
        ops.push(
          prisma.quizQuestion.update({
            where: { id: row.id },
            data: {
              question: row.question,
              options: row.options,
              correctAnswer: row.correctAnswer,
              points: row.points,
              position: row.position,
              explanation: row.explanation,
              // Don't null out a topic a human may have tagged directly on the
              // row — only propagate a topicId the Json actually carries.
              ...(row.topicId ? { topicId: row.topicId } : {}),
            },
          }),
        );
      }

      ops.push(
        prisma.quiz.update({
          where: { id: quiz.id },
          data: {
            questions: prepared.questionsJson as unknown as Prisma.InputJsonValue,
            totalPoints: nextTotalPoints,
          },
        }),
      );

      if (idRemap.size > 0) {
        // Read outside the tx — nothing else writes attempts mid-backfill.
        const attempts = await prisma.quizAttempt.findMany({
          where: { quizId: quiz.id },
          select: { id: true, answers: true },
        });
        for (const attempt of attempts) {
          if (!Array.isArray(attempt.answers)) continue;
          let touched = false;
          const nextAnswers = (attempt.answers as unknown[]).map((a) => {
            if (!a || typeof a !== 'object') return a;
            const ans = a as Record<string, unknown>;
            const mapped = typeof ans.questionId === 'string' ? idRemap.get(ans.questionId) : undefined;
            if (!mapped) return a;
            touched = true;
            return { ...ans, questionId: mapped };
          });
          if (touched) {
            ops.push(
              prisma.quizAttempt.update({
                where: { id: attempt.id },
                data: { answers: nextAnswers as Prisma.InputJsonValue },
              }),
            );
            remappedAttempts += 1;
          }
        }
      }

      await prisma.$transaction(ops);

      // New rows are global now — later quizzes must not adopt their ids.
      for (const row of rowsToCreate) allRowIds.add(row.id);

      updatedQuizzes += 1;
      createdRows += rowsToCreate.length;
      syncedRows += rowsToSync.length;
    } catch (err) {
      failed += 1;
      console.error(`  ❌ quiz ${quiz.id} failed:`, err);
    }
  }

  console.log(
    `\n✅ Done (${APPLY ? 'applied' : 'dry run'}): ${updatedQuizzes} quizzes updated, ` +
      `${createdRows} rows created, ${syncedRows} rows synced, ` +
      `${remappedAttempts} attempts remapped, ${unchanged} unchanged, ${failed} failed.`,
  );
}

backfill()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
