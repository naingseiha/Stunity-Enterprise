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

export type ReelType = 'FOCUS_REEL' | 'RECALL_CARD' | 'QUIZ_QUESTION' | 'BOUNTY' | 'POST';

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
// Production has many Posts (QUIZ/QUESTION/POLL/TUTORIAL/...) and few native
// reel rows (FocusReel/Bounty/RecallCard). Heavy POST weighting reflects that
// — empty native pools still fall back to POST via fallbackOrder.
const SLOT_PATTERN: ReelType[] = [
  'POST',
  'POST',
  'FOCUS_REEL',
  'POST',
  'QUIZ_QUESTION',
  'POST',
  'RECALL_CARD',
  'POST',
  'BOUNTY',
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

    // Cursor encodes the absolute slot index across calls, so the slot
    // pattern stays stable across pagination (no duplicate slot types
    // when the user keeps scrolling).
    const slotOffset = parseCursor(opts.cursor) ?? 0;

    const t0 = Date.now();
    const timings: Record<string, number> = {};
    const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      try { return await fn(); } finally { timings[label] = Date.now() - start; }
    };

    const user = await time('user', () => this.prismaRead.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    }));

    // Compute how many of each type we need from the slot pattern window.
    const counts = countSlotsInWindow(slotOffset, limit);

    const [discovery, recall, quizzes, bounties, social, posts] = await Promise.all([
      time('discovery', () => this.fetchDiscovery(subject, counts.FOCUS_REEL, userId)),
      time('recall', () => this.fetchReinforcement(userId, subject, counts.RECALL_CARD)),
      time('quizzes', () => this.fetchQuizzes(subject, counts.QUIZ_QUESTION)),
      time('challenges', () => this.fetchChallenges(subject, counts.BOUNTY)),
      time('social', () => this.fetchSocial(user?.schoolId ?? null, subject, counts.FOCUS_REEL)),
      time('posts', () => this.fetchPostReels(userId, subject, counts.POST)),
    ]);

    // Interleave Discovery + Social into the FOCUS_REEL pool (~70/30)
    // so the feed feels personal without being insular.
    const focusReelPool = mergeAlternating(discovery, social, 0.3);

    const pools: Record<ReelType, ReelDto[]> = {
      FOCUS_REEL: focusReelPool.map(toFocusReelDto),
      RECALL_CARD: recall.map(toRecallDto),
      QUIZ_QUESTION: quizzes.map((q) => toQuizDto(q, userId)),
      BOUNTY: bounties.map(toBountyDto),
      POST: posts.map(toPostDto),
    };

    const items = weaveByPattern(pools, slotOffset, limit);
    const nextOffset = slotOffset + items.length;
    timings.total = Date.now() - t0;

    return {
      items,
      nextCursor: items.length === limit ? encodeCursor(nextOffset) : null,
      hasMore: items.length === limit,
      _timings: timings,
    };
  }

  // ── Pools ──────────────────────────────────────────────────────────

  /** Discovery: newest FocusReels, optionally subject-filtered, excluding what the user already attempted. */
  private async fetchDiscovery(subject: string | undefined, take: number, userId: string) {
    if (take <= 0) return [];
    return this.prismaRead.focusReel.findMany({
      where: {
        ...(subject ? { subject } : {}),
        attempts: { none: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: take * 2, // overfetch; merge step trims
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, isVerified: true },
        },
      },
    });
  }

  /** Reinforcement: SM-2 due cards. Order by overdueness. */
  private async fetchReinforcement(userId: string, subject: string | undefined, take: number) {
    if (take <= 0) return [];
    return this.prismaRead.recallCard.findMany({
      where: {
        userId,
        nextReviewAt: { lte: new Date() },
        ...(subject ? { subject } : {}),
      },
      orderBy: { nextReviewAt: 'asc' },
      take,
      include: { question: true },
    });
  }

  /** Challenges: active bounties. */
  private async fetchChallenges(subject: string | undefined, take: number) {
    if (take <= 0) return [];
    return this.prismaRead.bounty.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        ...(subject ? { subject } : {}),
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
  private async fetchQuizzes(subject: string | undefined, take: number) {
    if (take <= 0 || subject) return [];
    return this.prismaRead.quizQuestion.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        post: { select: { id: true, authorId: true, courseCode: true } },
      },
    });
  }

  /**
   * Post-backed reels: auto-promote Posts of reel-friendly types into the
   * feed. Same Post still shows in the normal feed too — this is a
   * surfacing layer, no data duplication. Enriches with the viewer's
   * isLikedByMe flag using a single batched Like lookup.
   */
  private async fetchPostReels(userId: string, subject: string | undefined, take: number) {
    if (take <= 0) return [];

    // Overfetch — we draw POSTs both for native POST slots and as the
    // first fallback when FocusReel/Recall/Quiz/Bounty pools come up empty.
    const overfetch = Math.max(take * 3, 12);
    const posts = await this.prismaRead.post.findMany({
      where: {
        postType: { in: REEL_ELIGIBLE_POST_TYPES as unknown as any[] },
        ...(subject ? { courseCode: subject } : {}),
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

    const liked = await this.prismaRead.like.findMany({
      where: { userId, postId: { in: posts.map((p) => p.id) } },
      select: { postId: true, reactionType: true },
    });
    const reactionMap = new Map(liked.map((l) => [l.postId, l.reactionType ?? 'LIKE']));

    return posts.map((p) => ({
      ...p,
      isLikedByMe: reactionMap.has(p.id),
      myReaction: reactionMap.get(p.id) ?? null,
    }));
  }

  /** Social: schoolmates' FocusReels. */
  private async fetchSocial(
    schoolId: string | null,
    subject: string | undefined,
    take: number,
  ) {
    if (take <= 0 || !schoolId) return [];
    return this.prismaRead.focusReel.findMany({
      where: {
        ...(subject ? { subject } : {}),
        creator: { schoolId },
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
            options: c.question.options,
            correctAnswer: c.question.correctAnswer,
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
      options: q.options,
      correctAnswer: q.correctAnswer,
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

// ── Slot weaving ─────────────────────────────────────────────────────

function countSlotsInWindow(offset: number, limit: number): Record<ReelType, number> {
  const counts: Record<ReelType, number> = {
    FOCUS_REEL: 0,
    RECALL_CARD: 0,
    QUIZ_QUESTION: 0,
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
  const fallbackOrder: ReelType[] = ['POST', 'FOCUS_REEL', 'QUIZ_QUESTION', 'RECALL_CARD', 'BOUNTY'];
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

// ── Cursor (opaque base64-encoded slot offset) ───────────────────────

function parseCursor(cursor: string | null | undefined): number | null {
  if (!cursor) return null;
  try {
    const n = parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}
