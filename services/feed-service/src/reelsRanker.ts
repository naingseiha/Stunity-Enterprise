/**
 * EduReels Ranker — vertical-scroll "Reels" feed for Stunity.
 *
 * Unlike a passive video feed, this engine weaves 4 content pools into a
 * single mixed-media stream. Mobile renders different card UIs by branching
 * on `ReelDto.type`. Per-type rich state stays on the typed models; this
 * file is the only place that knows how to merge them.
 *
 *   Pool            Source                          Purpose
 *   ───────────     ─────────────────────────       ──────────────────────
 *   DISCOVERY       FocusReel (newest, by subject)  New interactive videos
 *   REINFORCEMENT   RecallCard (nextReviewAt due)   Spaced repetition (SM-2)
 *   CHALLENGES      Bounty (ACTIVE, not expired)    Peer Q&A with XP stakes
 *   SOCIAL          FocusReel by schoolmates        Classmate-generated
 *
 * Mixing strategy: weighted slot pattern (not random shuffle). Recall and
 * Quiz items are guaranteed every Nth slot so reinforcement always lands.
 */

import { PrismaClient } from '@prisma/client';
import { fetchReactionCounts } from './utils/reactionCounts';

export type ReelType = 'FOCUS_REEL' | 'RECALL_CARD' | 'QUIZ_QUESTION' | 'TF_CARD' | 'CLOZE_CARD' | 'BOUNTY' | 'POST';

/**
 * A cloze (fill-in-the-blank) card is a QuizQuestion whose `question` contains a
 * blank — a run of ≥3 underscores — with the answer choices in `options`. The
 * underscores read naturally everywhere (feed, post body), so there's no schema
 * change and no ugly sentinel token. Mobile renders the sentence with the blank
 * filled on answer. Detection is a substring match (kept in sync with the DB
 * `contains` filter in fetchCloze/fetchQuizzes).
 */
export const CLOZE_BLANK = '___';
function isCloze(question: unknown): boolean {
  return typeof question === 'string' && question.includes(CLOZE_BLANK);
}

/**
 * Canonical sentinel options that mark a QuizQuestion as a True/False card.
 * A TF card is just a QuizQuestion whose `options` are exactly these tokens
 * (correctAnswer 0 = True, 1 = False) — no schema change, so the SM-2 recall
 * loop + mastery aggregation work on it unchanged. Mobile renders localized
 * "True"/"False" labels; the DB stays language-neutral.
 */
export const TF_OPTIONS = ['TRUE', 'FALSE'] as const;

/** True when a QuizQuestion's options match the TF sentinel. */
function isTrueFalse(options: unknown): boolean {
  return (
    Array.isArray(options) &&
    options.length === 2 &&
    options[0] === TF_OPTIONS[0] &&
    options[1] === TF_OPTIONS[1]
  );
}

// Env kill-switch (feed-service has no flag registry — mirrors REELS_RECALL_SEED).
// When off, the TF_CARD slot degrades to the next learning type (a quiz).
const TF_CARDS_ENABLED = process.env.REELS_TF_CARDS !== 'false';
// When off, the CLOZE_CARD slot degrades to the next learning type.
const CLOZE_CARDS_ENABLED = process.env.REELS_CLOZE_CARDS !== 'false';

// Personalize the quiz/TF/video pools toward the learner's weakest subjects
// (lowest avg recallStrength across their RecallCards). When off — or for a new
// learner with no cards — the pools fall back to "newest" (the prior behavior).
const PERSONALIZE_ENABLED = process.env.REELS_PERSONALIZE !== 'false';
// How many of the learner's weakest subjects to bias toward.
const WEAK_SUBJECT_COUNT = 3;
// Only subjects whose avg recallStrength is *below* this count as "weak" — a
// subject the learner has essentially mastered shouldn't be boosted. Matches
// the "learned" strength a freshly-correct card is seeded at (sm2/recall utils).
const WEAK_STRENGTH_THRESHOLD = 0.6;

// How many recently-served item ids the cursor remembers to suppress repeats
// across pages. ~9 pages at the default limit of 10 — long enough that a card
// never repeats within a session, short enough to keep the cursor compact.
const SEEN_WINDOW = 90;

/**
 * Post types that auto-promote into the Reels feed. Any new short-form,
 * visually-engaging PostType added later just needs to be appended here —
 * the post will appear in both the normal feed and Reels automatically.
 */
export const REEL_ELIGIBLE_POST_TYPES = [
  'QUIZ',
  'QUESTION',
  'TUTORIAL',
  'POLL',
  'REFLECTION',
  'RESOURCE',
  'PROJECT',
] as const;

export interface ReelEngagement {
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  /** The viewer's reaction type (LIKE/INSIGHTFUL/CELEBRATE/SMART_TAKE) or null. */
  myReaction: string | null;
  /** Per-type reaction counts for the social-proof summary, e.g. { INSIGHTFUL: 3 }. */
  reactionCounts: Record<string, number>;
}

export interface ReelDto<TPayload = unknown> {
  id: string;
  type: ReelType;
  subject: string;
  createdAt: string; // ISO
  /** When set, the reel is backed by a Post and supports /posts/:id/like + comments. */
  postId?: string;
  engagement?: ReelEngagement;
  payload: TPayload;
}

export interface ReelsFeedResponse {
  items: ReelDto[];
  nextCursor: string | null;
  hasMore: boolean;
  /**
   * Per-stage timings in ms. Set on cache misses (when generateFeed actually
   * ran), undefined on hits. Stripped before caching so it never persists.
   */
  _timings?: Record<string, number>;
}

export interface GenerateOptions {
  cursor?: string | null;
  limit?: number;
  subject?: string;
}

// ── Slot weights (10 slots = one "block"). Easy to tune. ─────────────
// PHILOSOPHY: this is a *learning* feed, not a video feed. The atomic unit is
// one rep of useful knowledge, so the mix leads with ACTIVE-RETRIEVAL cards
// (recall + quiz + challenge) where the learner has to *do* something to earn
// the reward. Video (FOCUS_REEL) is one small accent, not the headline — other
// apps own video; our edge is that every swipe teaches/tests.
//
// 6/10 slots are active retrieval (recall ×3, quiz ×1, true/false ×1, cloze ×1),
// 1 challenge (bounty), 1 video, 2 posts (knowledge-dense posts as connective
// tissue). TF_CARD and CLOZE_CARD are the fast, game-feel reps that vary the
// rhythm — TF is recognition, cloze adds the generation effect. Empty pools fall
// back to the next LEARNING type first (see fallbackOrder), so a thin pool
// degrades to another learning card before a passive post.
const SLOT_PATTERN: ReelType[] = [
  'RECALL_CARD',
  'QUIZ_QUESTION',
  'POST',
  'RECALL_CARD',
  'TF_CARD',
  'FOCUS_REEL',
  'RECALL_CARD',
  'BOUNTY',
  'CLOZE_CARD',
  'POST',
];

export class ReelsRanker {
  /**
   * `prisma` is the primary (read+write) client — only used when a query
   * *must* see its own writes, which the ranker never needs.
   * `prismaRead` is the Supabase read replica when DATABASE_READ_URL is set,
   * otherwise falls back to `prisma`. All 6 pool queries below are read-only
   * and routed through prismaRead so primary pool slots stay free for
   * write traffic (likes, interactions, gamification updates).
   */
  constructor(
    private prisma: PrismaClient,
    private prismaRead: PrismaClient = prisma,
  ) {}

  async generateFeed(userId: string, opts: GenerateOptions = {}): Promise<ReelsFeedResponse> {
    const limit = Math.min(Math.max(opts.limit ?? 10, 1), 30);
    const subject = opts.subject?.trim() || undefined;

    // Cursor encodes the absolute slot index (so the slot pattern stays stable
    // across pagination) plus a sliding window of recently-served ids (so the
    // same card doesn't reappear every few swipes).
    const { offset: slotOffset, seen } = parseCursor(opts.cursor);

    const t0 = Date.now();
    const timings: Record<string, number> = {};
    const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      try { return await fn(); } finally { timings[label] = Date.now() - start; }
    };

    // `user` (schoolId for the social pool) and `weakSubjects` (personalization
    // signal) are both prerequisites for the pool fetches, so resolve them up
    // front in parallel.
    const [user, weakSubjects] = await Promise.all([
      time('user', () => this.prismaRead.user.findUnique({
        where: { id: userId },
        select: { schoolId: true },
      })),
      time('weak', () => this.fetchWeakSubjects(userId)),
    ]);

    // Compute how many of each type we need from the slot pattern window.
    const counts = countSlotsInWindow(slotOffset, limit);

    const [discovery, recall, quizzes, trueFalse, cloze, bounties, social, posts] = await Promise.all([
      time('discovery', () => this.fetchDiscovery(subject, counts.FOCUS_REEL, userId, weakSubjects, seen)),
      time('recall', () => this.fetchReinforcement(userId, subject, counts.RECALL_CARD, seen)),
      time('quizzes', () => this.fetchQuizzes(subject, counts.QUIZ_QUESTION, weakSubjects, seen)),
      time('truefalse', () => this.fetchTrueFalse(subject, counts.TF_CARD, weakSubjects, seen)),
      time('cloze', () => this.fetchCloze(subject, counts.CLOZE_CARD, weakSubjects, seen)),
      time('challenges', () => this.fetchChallenges(subject, counts.BOUNTY, seen)),
      time('social', () => this.fetchSocial(user?.schoolId ?? null, subject, counts.FOCUS_REEL, seen)),
      time('posts', () => this.fetchPostReels(userId, subject, counts.POST, seen)),
    ]);

    // Interleave Discovery + Social into the FOCUS_REEL pool (~70/30)
    // so the feed feels personal without being insular.
    const focusReelPool = mergeAlternating(discovery, social, 0.3);

    const pools: Record<ReelType, ReelDto[]> = {
      FOCUS_REEL: focusReelPool.map(toFocusReelDto),
      RECALL_CARD: recall.map(toRecallDto),
      QUIZ_QUESTION: quizzes.map((q) => toQuizDto(q, userId)),
      TF_CARD: trueFalse.map(toTfDto),
      CLOZE_CARD: cloze.map(toClozeDto),
      BOUNTY: bounties.map(toBountyDto),
      POST: posts.map(toPostDto),
    };

    const items = weaveByPattern(pools, slotOffset, limit);
    const nextOffset = slotOffset + items.length;
    const nextSeen = [...seen, ...items.map((i) => i.id)];
    timings.total = Date.now() - t0;

    return {
      items,
      nextCursor: items.length === limit ? encodeCursor(nextOffset, nextSeen) : null,
      hasMore: items.length === limit,
      _timings: timings,
    };
  }

  // ── Personalization signal ─────────────────────────────────────────

  /**
   * The learner's weakest subjects, lowest avg recallStrength first. Reads the
   * same RecallCards the mastery tree aggregates (subject derived from the
   * backing post's first topicTag, which reels authoring sets == courseCode, so
   * it lines up with the quiz/TF/video pools). Returns a lowercased set capped
   * at WEAK_SUBJECT_COUNT. Empty when personalization is off, the learner has no
   * cards, or every subject is equally fresh — the pools then fall back to
   * "newest" (the prior behavior).
   */
  private async fetchWeakSubjects(userId: string): Promise<Set<string>> {
    if (!PERSONALIZE_ENABLED) return new Set();
    const grouped = await this.prismaRead.recallCard.groupBy({
      by: ['subject'],
      where: { userId },
      _avg: { recallStrength: true },
      _count: { _all: true },
    });
    const ranked = grouped
      .filter((g) => g._count._all > 0 && (g._avg.recallStrength ?? 1) < WEAK_STRENGTH_THRESHOLD)
      .sort((a, b) => (a._avg.recallStrength ?? 1) - (b._avg.recallStrength ?? 1))
      .slice(0, WEAK_SUBJECT_COUNT)
      .map((g) => g.subject.toLowerCase());
    return new Set(ranked);
  }

  // ── Pools ──────────────────────────────────────────────────────────

  /** Discovery: newest FocusReels, optionally subject-filtered, excluding what the user already attempted. */
  private async fetchDiscovery(
    subject: string | undefined,
    take: number,
    userId: string,
    weakSubjects: Set<string> = new Set(),
    seen: string[] = [],
  ) {
    if (take <= 0) return [];
    const reels = await this.prismaRead.focusReel.findMany({
      where: {
        ...(subject ? { subject } : {}),
        attempts: { none: { userId } },
        ...notSeen(seen),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(take * 4, 12), // overfetch; bias + merge step trims
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, isVerified: true },
        },
      },
    });
    // Float weak-subject reels to the front before the merge/trim downstream.
    return biasBySubjects(reels, weakSubjects, (r) => r.subject);
  }

  /** Reinforcement: SM-2 due cards. Order by overdueness. */
  private async fetchReinforcement(userId: string, subject: string | undefined, take: number, seen: string[] = []) {
    if (take <= 0) return [];
    return this.prismaRead.recallCard.findMany({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        ...(subject ? { subject } : {}),
        ...notSeen(seen),
      },
      orderBy: { nextReviewAt: 'asc' },
      take,
      include: { question: true },
    });
  }

  /** Challenges: active bounties. */
  private async fetchChallenges(subject: string | undefined, take: number, seen: string[] = []) {
    if (take <= 0) return [];
    return this.prismaRead.bounty.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        ...(subject ? { subject } : {}),
        ...notSeen(seen),
      },
      orderBy: [{ bountyXp: 'desc' }, { createdAt: 'desc' }],
      take,
      include: {
        asker: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true },
        },
        _count: { select: { replies: true } },
      },
    });
  }

  /**
   * Micro-assessments: standalone quiz questions.
   * Subject filter is best-effort — Post has no tags column today, so when
   * `subject` is set we just skip this pool rather than over-fetch.
   */
  private async fetchQuizzes(subject: string | undefined, take: number, weakSubjects: Set<string> = new Set(), seen: string[] = []) {
    if (take <= 0 || subject) return [];
    // Plain MCQ only — exclude True/False (sentinel options) and cloze (blank in
    // the question); each surfaces as its own card type.
    const rows = await this.prismaRead.quizQuestion.findMany({
      where: {
        AND: [
          { NOT: { options: { equals: [...TF_OPTIONS] } } },
          { NOT: { question: { contains: CLOZE_BLANK } } },
        ],
        ...notSeen(seen),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(take * 8, 24), // overfetch so a weak-subject card buried past the newest few still surfaces
      include: {
        post: { select: { id: true, authorId: true, courseCode: true, topicTags: true } },
      },
    });
    return biasBySubjects(rows, weakSubjects, subjectOfQuiz, take);
  }

  /**
   * Cloze (fill-in-the-blank) cards: QuizQuestions whose question contains the
   * blank marker, with the answer choices in options. Adds the generation
   * effect to the active-retrieval mix. Env-gated (REELS_CLOZE_CARDS).
   */
  private async fetchCloze(subject: string | undefined, take: number, weakSubjects: Set<string> = new Set(), seen: string[] = []) {
    if (take <= 0 || subject || !CLOZE_CARDS_ENABLED) return [];
    const rows = await this.prismaRead.quizQuestion.findMany({
      where: {
        question: { contains: CLOZE_BLANK },
        NOT: { options: { equals: [...TF_OPTIONS] } },
        ...notSeen(seen),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(take * 8, 24),
      include: {
        post: { select: { id: true, authorId: true, courseCode: true, topicTags: true } },
      },
    });
    return biasBySubjects(rows, weakSubjects, subjectOfQuiz, take);
  }

  /**
   * True/False cards: QuizQuestions whose options are the TF sentinel. One-tap,
   * instant-feedback game-feel reps. Env-gated (REELS_TF_CARDS) — when off the
   * pool is empty so the TF_CARD slot degrades to the next learning type.
   */
  private async fetchTrueFalse(subject: string | undefined, take: number, weakSubjects: Set<string> = new Set(), seen: string[] = []) {
    if (take <= 0 || subject || !TF_CARDS_ENABLED) return [];
    const rows = await this.prismaRead.quizQuestion.findMany({
      where: { options: { equals: [...TF_OPTIONS] }, ...notSeen(seen) },
      orderBy: { createdAt: 'desc' },
      take: Math.max(take * 8, 24),
      include: {
        post: { select: { id: true, authorId: true, courseCode: true, topicTags: true } },
      },
    });
    return biasBySubjects(rows, weakSubjects, subjectOfQuiz, take);
  }

  /**
   * Post-backed reels: auto-promote Posts of reel-friendly types into the
   * feed. Same Post still shows in the normal feed too — this is a
   * surfacing layer, no data duplication. Enriches with the viewer's
   * isLikedByMe flag using a single batched Like lookup.
   */
  private async fetchPostReels(userId: string, subject: string | undefined, take: number, seen: string[] = []) {
    if (take <= 0) return [];

    // Overfetch — we draw POSTs both for native POST slots and as the
    // first fallback when FocusReel/Recall/Quiz/Bounty pools come up empty.
    const overfetch = Math.max(take * 3, 12);
    const posts = await this.prismaRead.post.findMany({
      where: {
        postType: { in: REEL_ELIGIBLE_POST_TYPES as unknown as any[] },
        ...(subject ? { courseCode: subject } : {}),
        ...notSeen(seen),
      },
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
      take: overfetch,
      select: {
        id: true,
        content: true,
        mediaUrls: true,
        postType: true,
        courseCode: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, isVerified: true },
        },
      },
    });

    if (posts.length === 0) return [];

    const postIdList = posts.map((p) => p.id);
    const [liked, reactionCountsMap] = await Promise.all([
      this.prismaRead.like.findMany({
        where: { userId, postId: { in: postIdList } },
        select: { postId: true, reactionType: true },
      }),
      fetchReactionCounts(this.prismaRead, postIdList),
    ]);
    const reactionMap = new Map(liked.map((l) => [l.postId, l.reactionType ?? 'LIKE']));

    return posts.map((p) => ({
      ...p,
      isLikedByMe: reactionMap.has(p.id),
      myReaction: reactionMap.get(p.id) ?? null,
      reactionCounts: reactionCountsMap.get(p.id) ?? {},
    }));
  }

  /** Social: schoolmates' FocusReels. */
  private async fetchSocial(
    schoolId: string | null,
    subject: string | undefined,
    take: number,
    seen: string[] = [],
  ) {
    if (take <= 0 || !schoolId) return [];
    return this.prismaRead.focusReel.findMany({
      where: {
        ...(subject ? { subject } : {}),
        creator: { schoolId },
        ...notSeen(seen),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, isVerified: true },
        },
      },
    });
  }
}

// ── Option shuffling ─────────────────────────────────────────────────
// Authored/seeded questions often store the correct answer at a fixed index
// (the seed pool is all correctAnswer=0), which makes a multiple-choice card
// gameable — "always tap A". Shuffle the options *deterministically* per
// question id so the order is stable across pagination and cache regenerations
// (a learner never sees the same card reorder), while the correct answer no
// longer sits in a predictable slot. True/False is never shuffled.
const SHUFFLE_OPTIONS_ENABLED = process.env.REELS_SHUFFLE_OPTIONS !== 'false';

/** FNV-1a string hash → 32-bit seed. */
function hashToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically shuffle `options`, remapping `correctAnswer` to the new
 * index of the originally-correct option. Stable per `seed` (the question id).
 * No-op for <2 options, an out-of-range correctAnswer, or when disabled.
 */
function shuffleOptions(
  options: unknown,
  correctAnswer: number,
  seed: string,
): { options: any; correctAnswer: number } {
  if (!SHUFFLE_OPTIONS_ENABLED || !Array.isArray(options) || options.length < 2) {
    return { options, correctAnswer };
  }
  if (correctAnswer < 0 || correctAnswer >= options.length) {
    return { options, correctAnswer };
  }
  const rand = mulberry32(hashToSeed(seed));
  const order = options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    options: order.map((i) => options[i]),
    correctAnswer: order.indexOf(correctAnswer),
  };
}

// ── DTO mappers ──────────────────────────────────────────────────────

function toFocusReelDto(r: any): ReelDto {
  return {
    id: r.id,
    type: 'FOCUS_REEL',
    subject: r.subject,
    createdAt: r.createdAt.toISOString(),
    payload: {
      title: r.title,
      description: r.description,
      videoUrl: r.videoUrl,
      thumbnailUrl: r.thumbnailUrl,
      duration: r.duration,
      pausePoints: r.pausePoints,
      creator: r.creator,
    },
  };
}

function toRecallDto(c: any): ReelDto {
  return {
    id: c.id,
    type: 'RECALL_CARD',
    subject: c.subject,
    createdAt: c.createdAt.toISOString(),
    payload: {
      subjectLabel: c.subjectLabel,
      courseTitle: c.courseTitle,
      recallStrength: c.recallStrength,
      xpReward: c.xpReward,
      protectsStreak: c.protectsStreak,
      lastReviewedAt: c.lastReviewedAt,
      question: c.question
        ? {
            id: c.question.id,
            question: c.question.question,
            // Shuffle by the question id so the order matches the same question
            // wherever it appears (quiz or recall) and is stable across pages.
            ...shuffleOptions(c.question.options, c.question.correctAnswer, c.question.id),
            explanation: c.question.explanation,
          }
        : null,
    },
  };
}

function toQuizDto(q: any, _userId: string): ReelDto {
  return {
    id: q.id,
    type: 'QUIZ_QUESTION',
    subject: q.post?.courseCode ?? 'general',
    createdAt: q.createdAt.toISOString(),
    postId: q.postId,
    payload: {
      question: q.question,
      ...shuffleOptions(q.options, q.correctAnswer, q.id),
      explanation: q.explanation,
      points: q.points,
    },
  };
}

function toTfDto(q: any): ReelDto {
  return {
    id: q.id,
    type: 'TF_CARD',
    subject: q.post?.courseCode ?? 'general',
    createdAt: q.createdAt.toISOString(),
    postId: q.postId,
    payload: {
      // The statement the learner judges true or false (stored in `question`).
      claim: q.question,
      // 0 = True, 1 = False (index into the TF_OPTIONS sentinel).
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      points: q.points,
    },
  };
}

function toClozeDto(q: any): ReelDto {
  return {
    id: q.id,
    type: 'CLOZE_CARD',
    subject: q.post?.courseCode ?? 'general',
    createdAt: q.createdAt.toISOString(),
    postId: q.postId,
    payload: {
      // The sentence with the blank marker (a run of underscores); mobile splits
      // on it to render the gap, then fills it with the chosen word on answer.
      sentence: q.question,
      ...shuffleOptions(q.options, q.correctAnswer, q.id),
      explanation: q.explanation,
      points: q.points,
    },
  };
}

function toPostDto(p: any): ReelDto {
  const firstMedia: string | undefined = p.mediaUrls?.[0];
  const isVideo = firstMedia ? /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(firstMedia) : false;
  return {
    id: p.id,
    type: 'POST',
    subject: p.courseCode ?? p.postType?.toLowerCase() ?? 'general',
    createdAt: p.createdAt.toISOString(),
    postId: p.id,
    engagement: {
      likesCount: p.likesCount ?? 0,
      commentsCount: p.commentsCount ?? 0,
      isLikedByMe: !!p.isLikedByMe,
      myReaction: p.myReaction ?? null,
      reactionCounts: p.reactionCounts ?? {},
    },
    payload: {
      postType: p.postType,
      content: p.content,
      mediaUrls: p.mediaUrls ?? [],
      coverUrl: firstMedia,
      isVideo,
      author: p.author,
    },
  };
}

function toBountyDto(b: any): ReelDto {
  return {
    id: b.id,
    type: 'BOUNTY',
    subject: b.subject,
    createdAt: b.createdAt.toISOString(),
    payload: {
      questionText: b.questionText,
      attachmentName: b.attachmentName,
      bountyXp: b.bountyXp,
      expiresAt: b.expiresAt,
      subjectColor: b.subjectColor,
      asker: b.asker,
      replyCount: b._count?.replies ?? 0,
    },
  };
}

// ── Personalization helpers ──────────────────────────────────────────

/** A quiz/TF row's subject: the post's courseCode, falling back to its first topicTag. */
function subjectOfQuiz(q: any): string | undefined {
  return q.post?.courseCode ?? q.post?.topicTags?.[0];
}

/**
 * Stable-partition `items` so those in a weak subject come first (preserving
 * the original — newest-first — order within each group), then optionally trim
 * to `take`. A no-op when `weak` is empty, so a new learner keeps the prior
 * newest-first ordering. Matching is case-insensitive.
 */
function biasBySubjects<T>(
  items: T[],
  weak: Set<string>,
  subjectOf: (t: T) => string | undefined,
  take?: number,
): T[] {
  if (weak.size === 0) return take === undefined ? items : items.slice(0, take);
  const isWeak = (t: T) => {
    const s = subjectOf(t)?.toLowerCase();
    return !!s && weak.has(s);
  };
  const ordered = [...items.filter(isWeak), ...items.filter((t) => !isWeak(t))];
  return take === undefined ? ordered : ordered.slice(0, take);
}

// ── Slot weaving ─────────────────────────────────────────────────────

function countSlotsInWindow(offset: number, limit: number): Record<ReelType, number> {
  const counts: Record<ReelType, number> = {
    FOCUS_REEL: 0,
    RECALL_CARD: 0,
    QUIZ_QUESTION: 0,
    TF_CARD: 0,
    CLOZE_CARD: 0,
    BOUNTY: 0,
    POST: 0,
  };
  for (let i = 0; i < limit; i++) {
    const slotType = SLOT_PATTERN[(offset + i) % SLOT_PATTERN.length];
    counts[slotType]++;
  }
  return counts;
}

/**
 * Walk the slot pattern, pulling from the matching pool. If a pool is empty
 * (e.g. user has zero due RecallCards), the slot falls back to the next
 * non-empty pool in priority order so the feed never short-returns.
 */
function weaveByPattern(
  pools: Record<ReelType, ReelDto[]>,
  offset: number,
  limit: number,
): ReelDto[] {
  // Learning-first fallback: when a slot's pool is empty, fill it with the next
  // ACTIVE-RETRIEVAL type before falling back to a passive post, so a thin pool
  // degrades to "still a learning rep" rather than "another post to scroll past".
  const fallbackOrder: ReelType[] = ['QUIZ_QUESTION', 'TF_CARD', 'CLOZE_CARD', 'RECALL_CARD', 'BOUNTY', 'POST', 'FOCUS_REEL'];
  const out: ReelDto[] = [];

  for (let i = 0; i < limit; i++) {
    const preferred = SLOT_PATTERN[(offset + i) % SLOT_PATTERN.length];
    const order = [preferred, ...fallbackOrder.filter((t) => t !== preferred)];
    let picked: ReelDto | undefined;
    for (const type of order) {
      if (pools[type].length > 0) {
        picked = pools[type].shift()!;
        break;
      }
    }
    if (!picked) break; // every pool empty — short return
    out.push(picked);
  }
  return out;
}

function mergeAlternating<T>(primary: T[], secondary: T[], secondaryRatio: number): T[] {
  const out: T[] = [];
  let pi = 0;
  let si = 0;
  let pulled = 0;
  while (pi < primary.length || si < secondary.length) {
    const shouldPullSecondary =
      si < secondary.length &&
      (pi >= primary.length || (pulled > 0 && si / pulled < secondaryRatio));
    if (shouldPullSecondary) out.push(secondary[si++]);
    else if (pi < primary.length) out.push(primary[pi++]);
    pulled++;
  }
  return out;
}

// ── Cursor (opaque base64-encoded {offset, seen}) ─────────────────────
//
// Carries the absolute slot index (so the slot pattern stays stable across
// pagination) AND a bounded sliding window of recently-served item ids, so the
// pools can exclude what the learner just saw and the same card doesn't repeat
// every few swipes. The window is capped (SEEN_WINDOW) to keep the cursor
// small; once an id falls out of the window it may recur — which is fine (and
// desirable for spaced repetition given a finite content pool).

interface ParsedCursor {
  offset: number;
  seen: string[];
}

function parseCursor(cursor: string | null | undefined): ParsedCursor {
  const empty: ParsedCursor = { offset: 0, seen: [] };
  if (!cursor) return empty;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    // New format: JSON {o, s}. Legacy format: a bare slot-offset number.
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw) as { o?: unknown; s?: unknown };
      const offset = typeof parsed.o === 'number' && parsed.o >= 0 ? parsed.o : 0;
      const seen = Array.isArray(parsed.s) ? parsed.s.filter((x): x is string => typeof x === 'string') : [];
      return { offset, seen };
    }
    const n = parseInt(raw, 10);
    return { offset: Number.isFinite(n) && n >= 0 ? n : 0, seen: [] };
  } catch {
    return empty;
  }
}

function encodeCursor(offset: number, seen: string[]): string {
  const trimmed = seen.length > SEEN_WINDOW ? seen.slice(seen.length - SEEN_WINDOW) : seen;
  return Buffer.from(JSON.stringify({ o: offset, s: trimmed }), 'utf8').toString('base64url');
}

/** Prisma where-fragment excluding already-served ids (no-op when none). */
function notSeen(seen: string[]): { id?: { notIn: string[] } } {
  return seen.length ? { id: { notIn: seen } } : {};
}
