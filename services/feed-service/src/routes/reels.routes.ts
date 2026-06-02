/**
 * EduReels routes — unified mixed-media feed + per-type interaction telemetry.
 *
 * Endpoints:
 *   GET  /reels/feed                Fetch a page of mixed ReelDtos (cursor-paged)
 *   POST /reels/interactions        Log a user interaction; updates combo + XP
 *
 * The interaction body is discriminated by `itemType`:
 *   FOCUS_REEL    pause-point answered → FocusReelAttempt upsert, combo±
 *   QUIZ_QUESTION standalone quiz answered → combo±, XP
 *   RECALL_CARD   SM-2 grade ('again'|'good'|'easy') → applyReview + RecallReview row
 *   BOUNTY        view/tap-through signal (no combo, just telemetry)
 *
 * Combo rules: +1 per correct, reset on wrong, +50 XP loot every 5 streak.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead } from '../context';
import { ReelsRanker } from '../reelsRanker';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { applyReview, RecallGrade } from '../utils/sm2';
import { upsertRecallCardFromReelAnswer, seedRecallCardsFromQuizPool } from '../utils/recallCardsFromQuiz';
import { feedCache } from '../redis';

// Ranker uses the read replica for all 6 pool queries; writes (interactions,
// combo, SM-2 reviews) stay on the primary via `prisma` below.
const reelsRanker = new ReelsRanker(prisma, prismaRead);
const router = Router();

const COMBO_FILL_EVERY = 5;
const COMBO_FILL_BONUS = 50;
const BASE_XP_CORRECT = 5;
const REELS_FEED_TTL = 60; // seconds — short enough that fresh posts surface within a minute
const REELS_STATE_TTL = 15; // HUD warmup — combo updates frequently, so keep TTL tight

// Flag-gated (default ON; set REELS_RECALL_SEED=false to disable). When the
// learner's due-recall pool is thin, lazily seed cards from real quiz content
// so recall reels have something to show from day one.
const RECALL_SEED_ENABLED = process.env.REELS_RECALL_SEED !== 'false';

// ── Lightweight in-process metrics ──────────────────────────────────
// Counts cache hits/misses for /feed and /state. Logged once per minute
// and reset, so we get a rolling sample without growing memory.
const metrics = {
  feed: { hit: 0, miss: 0 },
  state: { hit: 0, miss: 0 },
};
setInterval(() => {
  const f = metrics.feed;
  const s = metrics.state;
  if (f.hit + f.miss + s.hit + s.miss === 0) return;
  const fRatio = f.hit + f.miss > 0 ? (f.hit / (f.hit + f.miss)).toFixed(2) : 'n/a';
  const sRatio = s.hit + s.miss > 0 ? (s.hit / (s.hit + s.miss)).toFixed(2) : 'n/a';
  console.log(
    `[Reels metrics] feed: hit=${f.hit} miss=${f.miss} ratio=${fRatio} | state: hit=${s.hit} miss=${s.miss} ratio=${sRatio}`,
  );
  metrics.feed = { hit: 0, miss: 0 };
  metrics.state = { hit: 0, miss: 0 };
}, 60_000).unref();

const buildServerTiming = (parts: Record<string, number>): string =>
  Object.entries(parts)
    .map(([k, v]) => `${k};dur=${v}`)
    .join(', ');

/**
 * Lightweight HUD warmup — mobile fetches this on screen mount so the combo
 * meter, due-recall count and personal-best show real values immediately
 * (instead of starting at 0 until the first interaction).
 */
router.get('/state', authenticateToken, async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  const timings: Record<string, number> = {};
  try {
    const userId = req.user!.id;
    const cacheKey = `reels:state:${userId}`;
    const tCache = Date.now();
    const cached = await feedCache.get(cacheKey);
    timings.cache = Date.now() - tCache;
    if (cached) {
      metrics.state.hit++;
      timings.total = Date.now() - t0;
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Server-Timing', buildServerTiming(timings));
      return res.json(cached);
    }
    metrics.state.miss++;

    // HUD warmup is read-only — route via replica.
    const tUser = Date.now();
    const userPromise = prismaRead.user.findUnique({
      where: { id: userId },
      select: { reelCombo: true, highestReelCombo: true, totalPoints: true },
    });
    const tDue = Date.now();
    const nowDate = new Date();
    const in24h = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
    const duePromise = prismaRead.recallCard.count({
      where: { userId, nextReviewAt: { lte: nowDate } },
    });
    // Cards becoming due within the next 24h — powers the "N coming up
    // tomorrow" tomorrow-pull in the end-of-session celebration.
    const upcomingPromise = prismaRead.recallCard.count({
      where: { userId, nextReviewAt: { gt: nowDate, lte: in24h } },
    });
    const [user, dueRecallCount, upcomingRecallCount] = await Promise.all([
      userPromise,
      duePromise,
      upcomingPromise,
    ]);
    timings.user = Date.now() - tUser;
    timings.due = Date.now() - tDue;

    const payload = {
      combo: user?.reelCombo ?? 0,
      highestCombo: user?.highestReelCombo ?? 0,
      totalPoints: user?.totalPoints ?? 0,
      dueRecallCount,
      upcomingRecallCount,
    };
    await feedCache.set(cacheKey, payload, REELS_STATE_TTL);
    timings.total = Date.now() - t0;
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Server-Timing', buildServerTiming(timings));
    res.json(payload);
  } catch (error) {
    console.error('[Reels] State error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Re-resolve `isLikedByMe` for every post-backed item right before responding.
 * The feed list itself is cacheable (item shape + likesCount don't change
 * within the TTL), but per-viewer `isLikedByMe` must always be fresh —
 * otherwise a user's like is "forgotten" until the cache TTL expires.
 *
 * Single indexed Like.findMany — cheap regardless of cache hit/miss.
 */
async function hydrateLikedState(items: any[], userId: string): Promise<any[]> {
  const postIds = items
    .map((it) => it.postId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (postIds.length === 0) return items;

  // Read-only; route via replica so per-request hydration doesn't tax
  // the primary's pool slots while writes are happening.
  const liked = await prismaRead.like.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  const likedSet = new Set(liked.map((l) => l.postId));

  return items.map((it) =>
    it.postId
      ? {
          ...it,
          engagement: {
            ...(it.engagement ?? { likesCount: 0, commentsCount: 0 }),
            isLikedByMe: likedSet.has(it.postId),
          },
        }
      : it,
  );
}

router.get('/feed', authenticateToken, async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  const timings: Record<string, number> = {};
  try {
    const userId = req.user!.id;
    const cursor = (req.query.cursor as string) || null;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const subject = (req.query.subject as string) || undefined;

    // Cache key is per-user-per-cursor — first page is hot, deep pages are cold.
    // (We still scope by userId because the spaced-repetition pool is per-user.)
    const cacheKey = `reels:feed:${userId}:${cursor ?? 'first'}:${limit}:${subject ?? 'all'}`;

    const tCache = Date.now();
    let result = await feedCache.get(cacheKey);
    timings.cache = Date.now() - tCache;
    let cacheHit = false;
    let poolTimings: Record<string, number> | undefined;
    if (result) {
      cacheHit = true;
      metrics.feed.hit++;
    } else {
      metrics.feed.miss++;
      // Top up the recall pool from real quiz content before ranking, but only
      // on the first page (deep pages keep the slot pattern stable). Best-effort
      // and self-quiescing — a no-op once the user has enough due cards.
      if (RECALL_SEED_ENABLED && !cursor) {
        const seeded = await seedRecallCardsFromQuizPool(prisma, userId);
        if (seeded > 0) console.log(`[Reels] seeded ${seeded} recall card(s) for user=${userId}`);
      }
      const tRank = Date.now();
      result = await reelsRanker.generateFeed(userId, { cursor, limit, subject });
      timings.rank = Date.now() - tRank;
      poolTimings = result._timings;
      // Strip transient timings before caching so they don't persist across requests.
      const { _timings, ...cacheable } = result;
      await feedCache.set(cacheKey, cacheable, REELS_FEED_TTL);
      result = cacheable as typeof result;
    }

    // Always hydrate fresh isLikedByMe — never cache the viewer's per-post like state.
    const tHydrate = Date.now();
    const hydratedItems = await hydrateLikedState(result.items ?? [], userId);
    timings.hydrate = Date.now() - tHydrate;
    timings.total = Date.now() - t0;

    if (!cacheHit && poolTimings) {
      // Flatten pool timings into Server-Timing under a `pool-*` prefix so the
      // client can read them via res.headers.get('Server-Timing').
      for (const [k, v] of Object.entries(poolTimings)) {
        if (k === 'total') continue; // already exposed as `rank`
        timings[`pool-${k}`] = v;
      }
      console.log(
        `[Reels MISS] user=${userId} cursor=${cursor ?? 'first'} total=${timings.total}ms rank=${timings.rank}ms hydrate=${timings.hydrate}ms pools=${JSON.stringify(poolTimings)}`,
      );
    }

    res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS');
    res.setHeader('Server-Timing', buildServerTiming(timings));
    res.json({ ...result, items: hydratedItems });
  } catch (error) {
    console.error('[Reels] Feed error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/interactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { itemId, itemType } = req.body ?? {};

  if (!itemId || !itemType) {
    return res.status(400).json({ error: 'Missing itemId or itemType' });
  }

  try {
    switch (itemType as string) {
      case 'FOCUS_REEL':
        return res.json(await handleFocusReel(userId, itemId, req.body));
      case 'QUIZ_QUESTION':
        return res.json(await handleQuizQuestion(userId, req.body));
      case 'RECALL_CARD':
        return res.json(await handleRecallCard(userId, itemId, req.body));
      case 'BOUNTY':
        return res.json(await handleBountyView(userId, itemId));
      default:
        return res.status(400).json({ error: `Unknown itemType: ${itemType}` });
    }
  } catch (error: any) {
    console.error('[Reels] Interaction error:', error);
    res.status(500).json({ error: error?.message ?? 'Internal Server Error' });
  }
});

// ── Handlers ──────────────────────────────────────────────────────────

async function handleFocusReel(userId: string, reelId: string, body: any) {
  const correct = !!body.correct;
  const baseXp = clampInt(body.xpEarned, 0, 100) || (correct ? BASE_XP_CORRECT : 0);

  const combo = await applyCombo(userId, correct ? 'correct' : 'wrong', baseXp);

  await prisma.focusReelAttempt.upsert({
    where: { reelId_userId: { reelId, userId } },
    update: { xpEarned: { increment: baseXp + combo.comboBonus }, completedAt: new Date() },
    create: { reelId, userId, xpEarned: baseXp + combo.comboBonus },
  });

  await invalidateUserState(userId);
  return { success: true, ...combo };
}

async function handleQuizQuestion(userId: string, body: any) {
  const correct = !!body.correct;
  const baseXp = clampInt(body.xpEarned, 0, 100) || (correct ? BASE_XP_CORRECT : 0);
  const combo = await applyCombo(userId, correct ? 'correct' : 'wrong', baseXp);

  // Close the learning loop: a quiz-reel answer enters spaced repetition so it
  // feeds SM-2 scheduling + the subject-mastery tree, not just the combo HUD.
  // Best-effort — never blocks the interaction response.
  let recallCarded = false;
  if (typeof body.itemId === 'string') {
    recallCarded = await upsertRecallCardFromReelAnswer(prisma, userId, body.itemId, correct);
  }

  await invalidateUserState(userId);
  return { success: true, recallCarded, ...combo };
}

async function handleRecallCard(userId: string, cardId: string, body: any) {
  const grade = body.grade as RecallGrade | undefined;
  if (!grade || !['again', 'good', 'easy'].includes(grade)) {
    throw new Error('RECALL_CARD interaction requires grade: again|good|easy');
  }

  const card = await prisma.recallCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new Error('RecallCard not found');

  const outcome = applyReview(
    {
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
      recallStrength: card.recallStrength,
    },
    grade,
    card.xpReward,
  );

  // Combo forgiveness: 'again' is honest forgetting (neutral, keeps the
  // streak); 'good'/'easy' advance it.
  const comboOutcome = grade === 'again' ? 'neutral' : 'correct';
  const combo = await applyCombo(userId, comboOutcome, outcome.xpEarned);

  await prisma.$transaction([
    prisma.recallCard.update({
      where: { id: cardId },
      data: {
        easeFactor: outcome.easeFactor,
        interval: outcome.interval,
        repetitions: outcome.repetitions,
        recallStrength: outcome.recallStrength,
        nextReviewAt: outcome.nextReviewAt,
        lastReviewedAt: new Date(),
        reviewCount: { increment: 1 },
        incorrectCount: grade === 'again' ? { increment: 1 } : undefined,
      },
    }),
    prisma.recallReview.create({
      data: {
        recallCardId: cardId,
        userId,
        grade,
        xpEarned: outcome.xpEarned,
        easeBefore: card.easeFactor,
        intervalBefore: card.interval,
        recallStrengthBefore: card.recallStrength,
      },
    }),
  ]);

  await invalidateUserState(userId);
  return {
    success: true,
    nextReviewAt: outcome.nextReviewAt,
    recallStrength: outcome.recallStrength,
    ...combo,
  };
}

async function handleBountyView(_userId: string, bountyId: string) {
  // Bounty taps don't affect combo. Reserved for future signal logging.
  await prisma.bounty.findUnique({ where: { id: bountyId }, select: { id: true } });
  return { success: true };
}

// ── Combo meter ───────────────────────────────────────────────────────

interface ComboResult {
  combo: number;
  highestCombo: number;
  totalPoints: number;
  xpEarned: number;
  comboBonus: number;
  isComboFill: boolean;
}

async function invalidateUserState(userId: string): Promise<void> {
  // Best-effort — non-fatal if redis is down.
  try { await feedCache.set(`reels:state:${userId}`, null, 1); } catch { /* noop */ }
}

/**
 * Combo outcome:
 *   'correct' → +1 to the streak (loot every Nth).
 *   'wrong'   → reset the streak to 0.
 *   'neutral' → leave the streak untouched but still award baseXp. Used for a
 *               recall "again" grade: honestly forgetting a card is a normal
 *               part of spaced repetition, not a failure, so it shouldn't nuke
 *               a hard-won combo (combo forgiveness).
 */
type ComboOutcome = 'correct' | 'wrong' | 'neutral';

async function applyCombo(userId: string, result: ComboOutcome, baseXp: number): Promise<ComboResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { reelCombo: true, highestReelCombo: true, totalPoints: true },
    });
    if (!user) throw new Error('User not found');

    let combo = user.reelCombo;
    let highest = user.highestReelCombo;
    let comboBonus = 0;
    let isComboFill = false;

    if (result === 'correct') {
      combo += 1;
      if (combo > highest) highest = combo;
      if (combo > 0 && combo % COMBO_FILL_EVERY === 0) {
        comboBonus = COMBO_FILL_BONUS;
        isComboFill = true;
      }
    } else if (result === 'wrong') {
      combo = 0;
    }
    // 'neutral' leaves combo as-is.

    const xpEarned = result === 'wrong' ? 0 : baseXp + comboBonus;
    const totalPoints = user.totalPoints + xpEarned;

    const updated = await tx.user.update({
      where: { id: userId },
      data: { reelCombo: combo, highestReelCombo: highest, totalPoints },
      select: { reelCombo: true, highestReelCombo: true, totalPoints: true },
    });

    return {
      combo: updated.reelCombo,
      highestCombo: updated.highestReelCombo,
      totalPoints: updated.totalPoints,
      xpEarned,
      comboBonus,
      isComboFill,
    };
  });
}

function clampInt(v: any, min: number, max: number): number {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

export default router;
