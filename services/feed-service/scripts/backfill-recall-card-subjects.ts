/**
 * Backfill recall-card subjects.
 *
 * Historical RecallCards created before the deriveSubjectFromPost fix took the
 * literal "#quiz" tag as their subject, so ~2/3 of all cards ended up with
 * subject="quiz" (real subject buried in subjectLabel). That collapsed unrelated
 * subjects into one bucket in GET /recall/mastery and made the skill-gap nudge
 * read "you haven't reviewed quiz".
 *
 * This re-derives { subject, subjectLabel } for affected cards FROM THE SOURCE
 * POST (questionId → QuizQuestion → post) using the exact same helper new cards
 * use, so backfilled rows are identical to freshly-created ones.
 *
 * Safety:
 *   - DRY-RUN by default. Pass --apply to write.
 *   - Only touches cards whose subject is a generic token (quiz/general/review);
 *     real-subject cards are left alone.
 *   - Idempotent: re-running re-derives to the same value.
 *   - Per-row best-effort; a card whose question/post is gone is skipped.
 *
 * Usage (from services/feed-service):
 *   node ../../node_modules/.bin/tsx scripts/backfill-recall-card-subjects.ts          # dry run
 *   node ../../node_modules/.bin/tsx scripts/backfill-recall-card-subjects.ts --apply  # write
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { deriveSubjectFromPost } from '../src/utils/recallCardsFromQuiz';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// Mirror of GENERIC_SUBJECT_TOKENS in recallCardsFromQuiz.ts — the subjects we
// consider "broken" and want to re-derive. (Kept local so the script targets
// only these rows; the derive helper itself is imported for parity.)
const GENERIC_SUBJECTS = new Set(['quiz', 'general', 'quiz review', 'review']);

const APPLY = process.argv.includes('--apply');

async function backfill() {
  console.log(`🔁 Recall-card subject backfill — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const cards = await prisma.recallCard.findMany({
    select: { id: true, subject: true, subjectLabel: true, questionId: true },
  });
  const targets = cards.filter((c) => GENERIC_SUBJECTS.has((c.subject || '').toLowerCase()));

  console.log(`📊 ${cards.length} cards total · ${targets.length} with a generic subject\n`);
  if (targets.length === 0) {
    console.log('✅ Nothing to backfill.');
    return;
  }

  // Resolve the source post (title + topicTags) for each target question.
  const questionIds = Array.from(new Set(targets.map((c) => c.questionId)));
  const questions = await prisma.quizQuestion.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, post: { select: { id: true, title: true, topicTags: true } } },
  });
  const postByQuestion = new Map(questions.map((q) => [q.id, q.post]));

  let planned = 0;
  let skipped = 0;
  let unchanged = 0;
  const updates: { id: string; subject: string; subjectLabel: string }[] = [];

  for (const card of targets) {
    const post = postByQuestion.get(card.questionId);
    if (!post) {
      skipped += 1;
      console.log(`  ⏭️  ${card.id} — no source question/post, skipping`);
      continue;
    }
    const next = deriveSubjectFromPost(post);
    if (next.subject === card.subject && next.subjectLabel === card.subjectLabel) {
      unchanged += 1;
      continue;
    }
    updates.push({ id: card.id, ...next });
    planned += 1;
    console.log(
      `  • ${card.id}\n      from: [${card.subject}] ${JSON.stringify(card.subjectLabel)}\n      to:   [${next.subject}] ${JSON.stringify(next.subjectLabel)}`,
    );
  }

  console.log(
    `\n📋 ${planned} to update · ${unchanged} already-correct · ${skipped} skipped (no source post)`,
  );

  if (!APPLY) {
    console.log('\n🟡 DRY RUN — re-run with --apply to write these changes.');
    return;
  }

  let written = 0;
  for (const u of updates) {
    try {
      await prisma.recallCard.update({
        where: { id: u.id },
        data: { subject: u.subject, subjectLabel: u.subjectLabel },
      });
      written += 1;
    } catch (err) {
      console.error(`  ❌ failed to update ${u.id}:`, err);
    }
  }
  console.log(`\n✅ Updated ${written}/${updates.length} cards.`);
}

backfill()
  .then(() => console.log('\n✅ Done.'))
  .catch((err) => {
    console.error('\n❌ Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
