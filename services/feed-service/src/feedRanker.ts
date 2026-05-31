/**
 * Feed Ranker — Server-side personalized feed scoring engine
 * 
 * 6-factor scoring model (v2 — Facebook/TikTok/YouTube inspired):
 *   1. Engagement (variable) — popularity signals (likes, comments, shares, views) + velocity
 *   2. Relevance (variable)  — match between user interests, enrolled courses, and post topics
 *   3. Quality (variable)    — content quality signals (type, media, author credibility)
 *   4. Recency (variable)    — time decay (tuned per post type)
 *   5. Social Proof (variable) — batched counts of likes/comments from the viewer's
 *      circle (followers, classmates, study-group peers), not per-post relation hydration
 *   6. Learning Context (10%) — boost for posts matching enrolled courses
 * 
 * Weights are dynamic per post type:
 *   - COURSE/EXAM: high relevance (students searching for specific topics)
 *   - QUESTION: high recency (need quick answers)
 *   - QUIZ/ASSIGNMENT: high relevance (match curriculum)
 *   - ARTICLE/POLL: standard weights
 * 
 * Inspired by Facebook EdgeRank + TikTok's interest-graph approach,
 * tailored for educational / learning content.
 */

import { PrismaClient, Post, User, PostType, Prisma } from '@prisma/client';
import { feedCache } from './redis';
import { resolveFeedVisibilityWhere } from './utils/visibilityScope';
import {
    buildFeedCursorWhere, decodeFeedCursor, encodeFeedCursor,
    decodeBrainModeCursor, encodeBrainModeCursor, buildBrainModeCursorWhere
} from './utils/feedCursor';

// ─── Scoring Weights (v2 — dynamic per post type) ──────────────────
interface ScoringWeights {
    ENGAGEMENT: number;
    RELEVANCE: number;
    QUALITY: number;
    RECENCY: number;
    SOCIAL_PROOF: number;
    LEARNING_CONTEXT: number;
    ACADEMIC_RELEVANCE: number;
    TEACHER_RELEVANCE: number;
    PEER_LEARNING: number;
    DIFFICULTY_MATCH: number;
}

const BASE_WEIGHTS: ScoringWeights = {
    ENGAGEMENT: 0.15,
    RELEVANCE: 0.20,
    QUALITY: 0.15,
    RECENCY: 0.10,
    SOCIAL_PROOF: 0.05,
    LEARNING_CONTEXT: 0.10,
    ACADEMIC_RELEVANCE: 0.15,
    TEACHER_RELEVANCE: 0.10,
    PEER_LEARNING: 0.05,
    DIFFICULTY_MATCH: 0.05,
};

// Per-post-type weight overrides (key insight: different content needs differ)
const POST_TYPE_WEIGHTS: Partial<Record<PostType, Partial<ScoringWeights>>> = {
    // Courses are evergreen, highly intentional — relevance is king
    COURSE: { ENGAGEMENT: 0.15, RELEVANCE: 0.35, QUALITY: 0.20, RECENCY: 0.05, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.15 },
    // Questions need fast answers — recency matters most
    QUESTION: { RECENCY: 0.25, PEER_LEARNING: 0.15, RELEVANCE: 0.20, ACADEMIC_RELEVANCE: 0.15, ENGAGEMENT: 0.15, TEACHER_RELEVANCE: 0.10, QUALITY: 0.00, SOCIAL_PROOF: 0.00, LEARNING_CONTEXT: 0.00, DIFFICULTY_MATCH: 0.00 },
    // Quizzes match curriculum — high relevance + learning context
    QUIZ: { ENGAGEMENT: 0.20, RELEVANCE: 0.30, QUALITY: 0.15, RECENCY: 0.10, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.15 },
    // Exams are deadline-driven, must match student's courses
    EXAM: { ACADEMIC_RELEVANCE: 0.30, TEACHER_RELEVANCE: 0.20, RELEVANCE: 0.20, LEARNING_CONTEXT: 0.15, QUALITY: 0.10, ENGAGEMENT: 0.05, RECENCY: 0.00, SOCIAL_PROOF: 0.00, PEER_LEARNING: 0.00, DIFFICULTY_MATCH: 0.00 },
    // Assignments are curriculum-bound
    ASSIGNMENT: { ACADEMIC_RELEVANCE: 0.30, TEACHER_RELEVANCE: 0.20, RELEVANCE: 0.20, LEARNING_CONTEXT: 0.15, QUALITY: 0.10, ENGAGEMENT: 0.05, RECENCY: 0.00, SOCIAL_PROOF: 0.00, PEER_LEARNING: 0.00, DIFFICULTY_MATCH: 0.00 },
    // Tutorials are evergreen educational content
    TUTORIAL: { ENGAGEMENT: 0.20, RELEVANCE: 0.30, QUALITY: 0.20, RECENCY: 0.05, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.15 },
    // Research papers — quality and relevance matter most  
    RESEARCH: { ENGAGEMENT: 0.15, RELEVANCE: 0.30, QUALITY: 0.25, RECENCY: 0.05, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.15 },
    // Resources — similar to tutorials
    RESOURCE: { ENGAGEMENT: 0.20, RELEVANCE: 0.30, QUALITY: 0.20, RECENCY: 0.05, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.15 },
    // Projects — engagement and quality showcase
    PROJECT: { ENGAGEMENT: 0.25, RELEVANCE: 0.25, QUALITY: 0.20, RECENCY: 0.10, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.10 },
};

// Action weights for signal tracking
const ACTION_WEIGHTS: Record<string, number> = {
    VIEW: 1,
    LIKE: 3,
    COMMENT: 5,
    SHARE: 7,
    BOOKMARK: 4,
};

// High-value educational post types get a quality baseline boost
const POST_TYPE_QUALITY: Partial<Record<PostType, number>> = {
    COURSE: 0.85,
    QUIZ: 0.80,
    TUTORIAL: 0.80,
    PROJECT: 0.75,
    RESEARCH: 0.75,
    RESOURCE: 0.70,
    EXAM: 0.70,
    ASSIGNMENT: 0.65,
    ARTICLE: 0.50,
    POLL: 0.40,
    QUESTION: 0.45,
};

const SCORING_WEIGHT_KEYS: (keyof ScoringWeights)[] = [
    'ENGAGEMENT',
    'RELEVANCE',
    'QUALITY',
    'RECENCY',
    'SOCIAL_PROOF',
    'LEARNING_CONTEXT',
    'ACADEMIC_RELEVANCE',
    'TEACHER_RELEVANCE',
    'PEER_LEARNING',
    'DIFFICULTY_MATCH',
];

function normalizeScoringWeights(weights: ScoringWeights): ScoringWeights {
    const total = SCORING_WEIGHT_KEYS.reduce((sum, key) => sum + Math.max(0, weights[key]), 0);
    if (total <= 0) return weights;

    return SCORING_WEIGHT_KEYS.reduce((normalized, key) => {
        normalized[key] = Math.max(0, weights[key]) / total;
        return normalized;
    }, {} as ScoringWeights);
}

function calculateEducationalQualityBoost(averageRating?: number | null, ratingCount?: number): number {
    if (!averageRating || averageRating <= 0 || !ratingCount || ratingCount <= 0) return 0;

    const confidence = 1 - Math.exp(-ratingCount / 5);
    const normalizedRating = Math.max(0, Math.min(averageRating / 5, 1));
    return normalizedRating * confidence * 0.18;
}

function getPostSignalTopics(post: {
    topicTags?: string[] | null;
    postType?: PostType | string | null;
}): string[] {
    const topics = [
        ...(post.topicTags || []),
        post.postType,
    ]
        .map((topic) => String(topic || '').trim().toLowerCase())
        .filter(Boolean);

    return [...new Set(topics)];
}

function calculatePostQualityScore(post: {
    postType: PostType;
    mediaUrls?: string[] | null;
    content?: string | null;
    title?: string | null;
    questionBounty?: number | null;
    author?: { isVerified?: boolean | null } | null;
}, educationalAverageRating?: number | null, educationalRatingCount?: number): number {
    let score = POST_TYPE_QUALITY[post.postType] || 0.40;

    if (post.mediaUrls && post.mediaUrls.length > 0) score += 0.10;

    const contentLength = post.content?.length || 0;
    if (contentLength > 200) score += 0.05;
    if (contentLength > 500) score += 0.05;

    if (post.author?.isVerified) score += 0.10;
    if (post.title) score += 0.05;

    if (post.postType === 'QUESTION' && (post.questionBounty || 0) > 0) {
        score += Math.min((post.questionBounty || 0) / 300, 0.3);
    }

    score += calculateEducationalQualityBoost(educationalAverageRating, educationalRatingCount);

    return Math.min(score, 1.0);
}

// User signals (interests, follows, blocks, recent affinity) change slowly —
// any single page view doesn't need real-time freshness. 10 min keeps the
// cache warm across a normal session and any quick re-open, eliminating the
// 6-subsystem fan-out that today makes page 1 cold take ~4s.
const USER_SIGNALS_CACHE_TTL_SECONDS = 600;
const SUGGESTED_CAROUSEL_CACHE_TTL_SECONDS = 300;

/** Horizontally scrollable quiz rail — fill with topic-matched first, then wider pool. */
const SUGGESTED_QUIZ_CAROUSEL_TARGET = 16;
// Candidate/trending/explore pools are post-list queries that change as new
// posts come in. 45s was tight and pushed every refresh into cache-miss; 3 min
// keeps them warm during a scroll session while still picking up new content
// often enough for an educational/social feed. Hot posts also get invalidated
// directly by post-create/edit hooks.
const CANDIDATE_POOL_CACHE_TTL_SECONDS = 180;
const TRENDING_POOL_CACHE_TTL_SECONDS = 180;
const EXPLORE_POOL_CACHE_TTL_SECONDS = 180;
const FEED_SESSION_CACHE_TTL_SECONDS = 300;
const FEED_SESSION_PAGE_MULTIPLIER = 6;
const FEED_SESSION_MIN_ITEMS = 80;
const FEED_SESSION_MAX_ITEMS = 120;
const OPTIONAL_FEED_POOL_TIMEOUT_MS = Number(process.env.FEED_OPTIONAL_POOL_TIMEOUT_MS || 1200);
const SOCIAL_PROOF_TIMEOUT_MS = Number(process.env.FEED_SOCIAL_PROOF_TIMEOUT_MS || 900);
const FEED_SUGGESTIONS_TIMEOUT_MS = Number(process.env.FEED_SUGGESTIONS_TIMEOUT_MS || 900);

// ─── Types ─────────────────────────────────────────────────────────
interface PostWithRelations extends Post {
    author: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        profilePictureUrl: string | null;
        role: string;
        isVerified: boolean;
    };
    _count?: {
        likes?: number;
        comments?: number;
        views?: number;
    };
    postScore?: {
        engagementScore: number;
        qualityScore: number;
        trendingScore: number;
        decayFactor: number;
    } | null;
    likes?: { userId: string }[];
    comments?: { authorId: string }[];
    views?: { userId: string | null; duration: number | null }[];
}

interface UserSignals {
    userId: string;
    schoolId?: string | null;
    topics: Record<string, number>;      // topicId → interest score
    negativeTopics: Record<string, number>; // topicId → explicit downranking score
    topicDwellTime: Record<string, number>; // topicId → avg view duration (seconds)
    followingIds: string[];
    blockedUserIds: string[];
    hiddenPostIds: string[];
    authorAffinity: Record<string, number>; // authorId → affinity score (0-100)
    enrolledCourseTopics: string[];         // topics from enrolled courses
    academicLevel: number;
    weakTopics: string[];
    strongTopics: string[];
    deadlines: { date: number; topics: string[] }[];
    classmates: string[];
    studyGroupMembers: string[];
    instructorIds: string[];
}

type UserPostFeedbackRow = {
    postId: string;
    feedbackType: string;
    topicTags: string[] | null;
    postType: PostType | string | null;
    createdAt: Date;
};

const FEED_AUTHOR_SELECT = {
    id: true,
    firstName: true,
    lastName: true,
    profilePictureUrl: true,
    role: true,
    isVerified: true,
} satisfies Prisma.UserSelect;

const FEED_CANDIDATE_POST_SELECT = {
    id: true,
    authorId: true,
    schoolId: true,
    content: true,
    title: true,
    postType: true,
    visibility: true,
    mediaUrls: true,
    mediaKeys: true,
    mediaDisplayMode: true,
    mediaMetadata: true,
    mediaAspectRatio: true,
    likesCount: true,
    commentsCount: true,
    sharesCount: true,
    viewsCount: true,
    isEdited: true,
    isPinned: true,
    createdAt: true,
    updatedAt: true,
    topicTags: true,
    trendingScore: true,
    difficultyLevel: true,
    questionBounty: true,
    repostOfId: true,
    repostComment: true,
    author: { select: FEED_AUTHOR_SELECT },
    postScore: {
        select: {
            engagementScore: true,
            qualityScore: true,
            trendingScore: true,
            decayFactor: true,
        },
    },
} satisfies Prisma.PostSelect;

const FEED_VISIBLE_RELATIONS_SELECT = {
    id: true,
    pollOptions: {
        select: { id: true, text: true, position: true, votesCount: true, createdAt: true },
        orderBy: { position: 'asc' as const },
    },
    quiz: {
        select: {
            id: true,
            questions: true,
            timeLimit: true,
            passingScore: true,
            totalPoints: true,
            resultsVisibility: true,
        },
    },
    repostOf: {
        select: {
            id: true,
            content: true,
            title: true,
            postType: true,
            mediaUrls: true,
            mediaMetadata: true,
            mediaAspectRatio: true,
            createdAt: true,
            likesCount: true,
            commentsCount: true,
            viewsCount: true,
            sharesCount: true,
            author: { select: FEED_AUTHOR_SELECT },
        },
    },
} satisfies Prisma.PostSelect;

async function buildQuizPostWhere(prisma: PrismaClient, userId: string, schoolId: string | null | undefined): Promise<Prisma.PostWhereInput> {
    return {
        AND: [
            await resolveFeedVisibilityWhere(prisma, { userId, schoolId }),
            { postType: 'QUIZ' },
        ],
    };
}

export interface ScoredPost {
    post: PostWithRelations;
    score: number;
    breakdown: {
        engagement: number;
        relevance: number;
        quality: number;
        recency: number;
        socialProof: number;
        learningContext: number;
        academicRelevance: number;
        teacherRelevance: number;
        peerLearning: number;
        difficultyMatch: number;
        negativeFeedback: number;
    };
}

export type FeedItem =
    | { type: 'POST'; data: ScoredPost }
    | { type: 'SUGGESTED_USERS'; data: Partial<User>[] }
    | { type: 'SUGGESTED_COURSES'; data: any[] }
    | { type: 'SUGGESTED_QUIZZES'; data: any[] };

// ─── Feed Ranker ───────────────────────────────────────────────────
export class FeedRanker {
    private prisma: PrismaClient;
    private readPrisma: PrismaClient;
    private inFlightLoads = new Map<string, Promise<unknown>>();

    constructor(prisma: PrismaClient, readPrisma?: PrismaClient) {
        this.prisma = prisma;
        this.readPrisma = readPrisma ?? prisma;
    }

    private normalizeExcludeIds(excludeIds: string[]): string[] {
        return [...new Set(excludeIds.filter(Boolean))].sort();
    }

    private hashKey(value: string): string {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
        }
        return Math.abs(hash).toString(36);
    }

    private buildExcludeKey(excludeIds: string[]): string {
        if (excludeIds.length === 0) return 'NONE';
        return this.hashKey(excludeIds.join(','));
    }

    private getNextCursorFromFeedItems(items: FeedItem[]): string | undefined {
        const lastPost = [...items]
            .reverse()
            .find((item): item is { type: 'POST'; data: ScoredPost } => item.type === 'POST' && Boolean(item.data?.post));

        if (!lastPost) return undefined;

        return encodeFeedCursor({
            id: lastPost.data.post.id,
            createdAt: lastPost.data.post.createdAt,
            isPinned: lastPost.data.post.isPinned,
        });
    }

    private async getOrLoadCached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
        const cached = await feedCache.get(key);
        if (cached !== null && cached !== undefined) {
            return cached as T;
        }

        const inFlight = this.inFlightLoads.get(key);
        if (inFlight) {
            return inFlight as Promise<T>;
        }

        const loadPromise = (async () => {
            const value = await loader();
            await feedCache.set(key, value, ttlSeconds);
            return value;
        })().finally(() => {
            this.inFlightLoads.delete(key);
        });

        this.inFlightLoads.set(key, loadPromise);
        return loadPromise;
    }

    private async withSoftTimeout<T>(
        label: string,
        promise: Promise<T>,
        timeoutMs: number,
        fallback: T,
    ): Promise<T> {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const guarded = promise.catch((error) => {
            if (process.env.NODE_ENV !== 'production') {
                console.warn(`⚠️ [FeedRanker] ${label} failed:`, error?.message || error);
            }
            return fallback;
        });

        const timeoutPromise = new Promise<T>((resolve) => {
            timeout = setTimeout(() => {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn(`⚠️ [FeedRanker] ${label} timed out after ${timeoutMs}ms; returning fallback`);
                }
                resolve(fallback);
            }, timeoutMs);
        });

        try {
            return await Promise.race([guarded, timeoutPromise]);
        } finally {
            if (timeout) clearTimeout(timeout);
        }
    }

    private async hydrateVisiblePostRelations(items: FeedItem[]): Promise<FeedItem[]> {
        const postItems = items.filter((item): item is { type: 'POST'; data: ScoredPost } => item.type === 'POST');
        const relationPostIds = postItems
            .filter((item) => item.data.post.postType === 'POLL' || item.data.post.postType === 'QUIZ' || Boolean(item.data.post.repostOfId))
            .map((item) => item.data.post.id);

        if (relationPostIds.length === 0) return items;

        const relationRows = await this.withSoftTimeout(
            'visible feed relation hydration',
            this.readPrisma.post.findMany({
                where: { id: { in: [...new Set(relationPostIds)] } },
                select: FEED_VISIBLE_RELATIONS_SELECT,
            }),
            1600,
            [] as any[],
        );
        if (relationRows.length === 0) return items;

        const relationsByPostId = new Map(relationRows.map((post: any) => [post.id, post]));
        return items.map((item) => {
            if (item.type !== 'POST') return item;

            const relations = relationsByPostId.get(item.data.post.id);
            if (!relations) return item;

            return {
                type: 'POST',
                data: {
                    ...item.data,
                    post: {
                        ...item.data.post,
                        pollOptions: relations.pollOptions,
                        quiz: relations.quiz,
                        repostOf: relations.repostOf,
                    },
                },
            };
        });
    }

    /**
     * Generate a personalized feed for a user.
     * FOR_YOU mode uses content-mixing: relevance (60%) + trending (25%) + explore (15%)
     */
    async generateFeed(
        userId: string,
        options?: {
            mode?: 'FOR_YOU' | 'FOLLOWING' | 'RECENT' | 'BRAIN_MODE';
            page?: number;
            limit?: number;
            excludeIds?: string[];
            subject?: string;
            cursor?: string;
        }
    ): Promise<{ items: FeedItem[]; total?: number; hasMore: boolean; nextCursor?: string }> {
        const { mode = 'FOR_YOU', page = 1, limit = 20, excludeIds = [], subject, cursor } = options || {};
        const normalizedExcludeIds = this.normalizeExcludeIds(excludeIds);
        const excludeKey = this.buildExcludeKey(normalizedExcludeIds);

        // Short-circuit for simple modes
        if (mode === 'RECENT') {
            return this.getRecentFeed(userId, page, limit, subject, cursor);
        }
        // BRAIN_MODE — pure quality sort: Post.edScore desc (NULLS LAST),
        // then createdAt desc. Powered by the posts_edScore_createdAt_idx
        // index added in migration 20260530065104.
        if (mode === 'BRAIN_MODE') {
            return this.getBrainModeFeed(userId, page, limit, subject, cursor);
        }

        const feedSessionKey = `feedranker:session:${userId}:v2:${mode}:${subject || 'ALL'}:limit:${limit}:exclude:${excludeKey}`;

        // Phase 1 Optimization: If page > 1, pull from the cached feed sequence session
        if (page > 1) {
            const cachedSequence = await feedCache.get(feedSessionKey) as FeedItem[] | null;
            if (cachedSequence && Array.isArray(cachedSequence)) {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`🧠 [FeedRanker] Cache HIT for session ${feedSessionKey}, page ${page}`);
                }
                const start = (page - 1) * limit;
                const paged = cachedSequence.slice(start, start + limit);
                if (paged.length === 0) {
                    if (cursor) {
                        return this.getRecentFeed(userId, 1, limit, subject, cursor);
                    }
                    return { items: [], total: cachedSequence.length, hasMore: false };
                }
                const nextCursor = this.getNextCursorFromFeedItems(paged);
                const hasMore = start + paged.length < cachedSequence.length || (mode === 'FOR_YOU' && Boolean(nextCursor));
                return {
                    items: await this.hydrateVisiblePostRelations(paged),
                    total: cachedSequence.length,
                    hasMore,
                    ...(hasMore && nextCursor ? { nextCursor } : {}),
                };
            }
            if (process.env.NODE_ENV !== 'production') {
                console.log(`⚠️ [FeedRanker] Cache MISS for session ${feedSessionKey}, page ${page}. Regenerating.`);
            }
        }

        if (mode === 'FOLLOWING') {
            const userSignals = await this.getUserSignals(userId);
            const candidates = await this.getCandidates(userId, userSignals, 'FOLLOWING', normalizedExcludeIds, subject);
            const circleIds = this.getSocialCircleActorIds(userSignals);
            const circleSocial =
                circleIds.length > 0 && candidates.length > 0
                    ? await this.withSoftTimeout(
                        'following social proof counts',
                        this.loadCircleSocialProofCounts(candidates.map((p) => p.id), circleIds),
                        SOCIAL_PROOF_TIMEOUT_MS,
                        new Map<string, { likes: number; comments: number }>(),
                    )
                    : new Map();
            const scored = candidates.map(post => this.scorePost(post, userSignals, circleSocial));
            const diversified = this.applyDiversity(scored);

            const items: FeedItem[] = diversified.map(p => ({ type: 'POST', data: p }));
            const start = (page - 1) * limit;
            const paged = items.slice(start, start + limit);
            if (paged.length === 0) {
                if (cursor) {
                    return this.getRecentFeed(userId, 1, limit, subject, cursor);
                }
                return { items: [], total: items.length, hasMore: false };
            }
            const nextCursor = this.getNextCursorFromFeedItems(paged);
            const hasMore = start + paged.length < items.length;

            // Cache the generated sequence for page > 1
            if (page === 1) {
                feedCache.set(feedSessionKey, items, FEED_SESSION_CACHE_TTL_SECONDS).catch(() => { });
            }

            return {
                items: await this.hydrateVisiblePostRelations(paged),
                total: items.length,
                hasMore,
                ...(hasMore && nextCursor ? { nextCursor } : {}),
            };
        }

        // FOR_YOU: Content-mixing strategy (Facebook/TikTok-style)
        const userSignals = await this.getUserSignals(userId);

        // Run all 3 pools in parallel for speed — use allSettled so failures don't block
        const [relevanceResult, trendingResult, exploreResult] = await Promise.allSettled([
            this.getCandidates(userId, userSignals, 'FOR_YOU', normalizedExcludeIds, subject),
            this.withSoftTimeout(
                'trending pool',
                this.getTrendingContent(userId, userSignals, normalizedExcludeIds, subject),
                OPTIONAL_FEED_POOL_TIMEOUT_MS,
                [] as PostWithRelations[],
            ),
            this.withSoftTimeout(
                'explore pool',
                this.getExploreContent(userId, userSignals, normalizedExcludeIds, subject),
                OPTIONAL_FEED_POOL_TIMEOUT_MS,
                [] as PostWithRelations[],
            ),
        ]);

        // Pool 1–3 raw rows — required before scoring so we batch social-proof queries once
        const relevanceCandidates = relevanceResult.status === 'fulfilled' ? relevanceResult.value : [];
        const trendingPosts = trendingResult.status === 'fulfilled' ? trendingResult.value : [];
        if (trendingResult.status === 'rejected') {
            console.warn('⚠️ [FeedRanker] Trending pool failed, skipping:', trendingResult.reason?.message);
        }
        const explorePosts = exploreResult.status === 'fulfilled' ? exploreResult.value : [];
        if (exploreResult.status === 'rejected') {
            console.warn('⚠️ [FeedRanker] Explore pool failed, skipping:', exploreResult.reason?.message);
        }

        const uniquePoolIds = [...new Set(
            [...relevanceCandidates, ...trendingPosts, ...explorePosts].map((p) => p.id)
        )];
        const circleIds = this.getSocialCircleActorIds(userSignals);
        const circleSocial =
            circleIds.length > 0 && uniquePoolIds.length > 0
                ? await this.withSoftTimeout(
                    'social proof counts',
                    this.loadCircleSocialProofCounts(uniquePoolIds, circleIds),
                    SOCIAL_PROOF_TIMEOUT_MS,
                    new Map<string, { likes: number; comments: number }>(),
                )
                : new Map();

        const relevanceScored = relevanceCandidates.map(post => this.scorePost(post, userSignals, circleSocial));
        relevanceScored.sort((a, b) => b.score - a.score);

        const trendingScored = trendingPosts.map(post => this.scorePost(post, userSignals, circleSocial));
        const exploreScored = explorePosts.map(post => this.scorePost(post, userSignals, circleSocial));

        if (process.env.NODE_ENV !== 'production') {
            console.log(`🧠 [FeedRanker] Pools: relevance=${relevanceScored.length} trending=${trendingScored.length} explore=${exploreScored.length}`);
        }

        // Mix: interleave pools with target ratios.
        // Cache enough items for several fast page fetches without over-generating work.
        const totalTarget = Math.min(
            Math.max(limit * FEED_SESSION_PAGE_MULTIPLIER, FEED_SESSION_MIN_ITEMS),
            FEED_SESSION_MAX_ITEMS
        );
        const relevanceCount = Math.ceil(totalTarget * 0.60);
        const trendingCount = Math.ceil(totalTarget * 0.25);
        const exploreCount = Math.ceil(totalTarget * 0.15);

        const mixed: ScoredPost[] = [];
        const seen = new Set<string>();

        // Helper to add unique posts
        const addUnique = (pool: ScoredPost[], count: number) => {
            let added = 0;
            for (const item of pool) {
                if (added >= count) break;
                if (!seen.has(item.post.id)) {
                    seen.add(item.post.id);
                    mixed.push(item);
                    added++;
                }
            }
        };

        addUnique(relevanceScored, relevanceCount);
        addUnique(trendingScored, trendingCount);
        addUnique(exploreScored, exploreCount);

        // Re-sort mixed feed by score, then apply diversity
        mixed.sort((a, b) => b.score - a.score);
        const diversified = this.applyDiversity(mixed);

        // Inject Mixed Media (Suggested Users & Courses) every ~7 items
        const rawFeedItems: FeedItem[] = diversified.map(p => ({ type: 'POST', data: p }));

        // Only fetch suggestions if we are generating page 1
        if (page === 1) {
            const [suggestedUsers, suggestedCourses, suggestedQuizzes] = await Promise.all([
                this.withSoftTimeout(
                    'suggested users',
                    this.getSuggestedUsers(userId, userSignals),
                    FEED_SUGGESTIONS_TIMEOUT_MS,
                    [] as Partial<User>[],
                ),
                this.withSoftTimeout(
                    'suggested courses',
                    this.getSuggestedCourses(userId, userSignals),
                    FEED_SUGGESTIONS_TIMEOUT_MS,
                    [] as any[],
                ),
                this.withSoftTimeout(
                    'suggested quizzes',
                    this.getSuggestedQuizzes(userId, userSignals),
                    FEED_SUGGESTIONS_TIMEOUT_MS,
                    [] as any[],
                ),
            ]);

            // Inject Users
            let injectionIndex = 6;
            if (suggestedUsers.length > 0 && rawFeedItems.length >= injectionIndex) {
                rawFeedItems.splice(injectionIndex, 0, { type: 'SUGGESTED_USERS', data: suggestedUsers });
            }

            // Quiz suggestions work best as an early quick challenge, far from course discovery.
            injectionIndex = 3;
            if (suggestedQuizzes.length > 0 && rawFeedItems.length >= injectionIndex) {
                rawFeedItems.splice(injectionIndex, 0, { type: 'SUGGESTED_QUIZZES', data: suggestedQuizzes });
            }

            // Course recommendations sit later so the two learning suggestion carousels do not stack.
            injectionIndex = 26;
            if (suggestedCourses.length > 0 && rawFeedItems.length >= injectionIndex) {
                rawFeedItems.splice(injectionIndex, 0, { type: 'SUGGESTED_COURSES', data: suggestedCourses });
            }
        }

        // Paginate
        const start = (page - 1) * limit;
        const paged = rawFeedItems.slice(start, start + limit);
        if (paged.length === 0) {
            if (cursor) {
                return this.getRecentFeed(userId, 1, limit, subject, cursor);
            }
            return { items: [], total: rawFeedItems.length, hasMore: false };
        }
        const nextCursor = this.getNextCursorFromFeedItems(paged);
        const hasMore = start + paged.length < rawFeedItems.length || Boolean(nextCursor);

        // Cache the generated sequence for page > 1
        if (page === 1) {
            feedCache.set(feedSessionKey, rawFeedItems, FEED_SESSION_CACHE_TTL_SECONDS).catch(() => { });
        }

        return {
            items: await this.hydrateVisiblePostRelations(paged),
            total: rawFeedItems.length,
            hasMore,
            ...(hasMore && nextCursor ? { nextCursor } : {}),
        };
    }

    private async getUserPostFeedback(userId: string): Promise<UserPostFeedbackRow[]> {
        const cacheKey = `feedranker:feedback:${userId}:v1`;
        return this.getOrLoadCached(cacheKey, USER_SIGNALS_CACHE_TTL_SECONDS, async () => {
            try {
                return await this.readPrisma.$queryRaw<UserPostFeedbackRow[]>`
                    SELECT
                        f."postId",
                        f."feedbackType",
                        p."topicTags",
                        p."postType",
                        f."createdAt"
                    FROM "user_post_feedback" f
                    INNER JOIN "posts" p ON p."id" = f."postId"
                    WHERE f."userId" = ${userId}
                      AND f."feedbackType" IN ('HIDE', 'NOT_INTERESTED', 'SHOW_LESS')
                      AND f."createdAt" >= NOW() - INTERVAL '180 days'
                    ORDER BY f."createdAt" DESC
                    LIMIT 500
                `;
            } catch (error: any) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('⚠️ [FeedRanker] Feedback table unavailable, skipping negative signals:', error?.message);
                }
                return [];
            }
        });
    }

    // ─── Suggested Content Injectors ──────────────────────────────────────
    private async getSuggestedUsers(userId: string, signals: UserSignals): Promise<Partial<User>[]> {
        const cacheKey = `feedranker:suggested-users:${userId}:v1`;
        return this.getOrLoadCached(cacheKey, SUGGESTED_CAROUSEL_CACHE_TTL_SECONDS, async () => {
            const db = this.readPrisma;
            // Suggest users who share interests, teachers, or anyone active the user isn't already following.
            // Intentionally permissive — we only exclude the current user and already-followed users.
            const userTopics = Object.keys(signals.topics).slice(0, 5);
            const excludeIds = [userId, ...signals.followingIds, ...signals.blockedUserIds];

            const baseWhere: any = {
                id: { notIn: excludeIds },
            };

            const primaryWhere: any = {
                ...baseWhere,
                ...(signals.schoolId ? { schoolId: signals.schoolId } : {}),
                OR: [
                    { role: { in: ['TEACHER', 'ADMIN', 'SUPER_ADMIN', 'STAFF'] } },
                    ...(userTopics.length > 0 ? [{ interests: { hasSome: userTopics } }] : []),
                ],
            };

            const selectFields = {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                role: true,
                headline: true,
                isEmailVerified: true,
            };

            let suggested = await db.user.findMany({
                where: primaryWhere,
                select: selectFields,
                orderBy: { createdAt: 'desc' },
                take: 10,
            });

            if (suggested.length < 3) {
                suggested = await db.user.findMany({
                    where: baseWhere,
                    select: selectFields,
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                });
            }

            return suggested;
        });
    }

    private async getSuggestedCourses(userId: string, signals: UserSignals): Promise<any[]> {
        const cacheKey = `feedranker:suggested-courses:${userId}:v1`;
        return this.getOrLoadCached(cacheKey, SUGGESTED_CAROUSEL_CACHE_TTL_SECONDS, async () => {
            const db = this.readPrisma;
            const userTopics = Object.keys(signals.topics).slice(0, 5);

            const includeFields = {
                instructor: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, isEmailVerified: true } },
            };
            const orderBy: any = [
                { rating: 'desc' },
                { enrolledCount: 'desc' },
                { createdAt: 'desc' },
            ];

            const primaryWhere: any = {
                instructorId: { notIn: [userId, ...signals.blockedUserIds] },
                isPublished: true,
                enrollments: { none: { userId } },
                ...(userTopics.length > 0 && { tags: { hasSome: userTopics } }),
            };

            let suggested = await db.course.findMany({
                where: primaryWhere,
                include: includeFields,
                orderBy,
                take: 8,
            });

            if (suggested.length < 2) {
                suggested = await db.course.findMany({
                    where: {
                        instructorId: { notIn: [userId, ...signals.blockedUserIds] },
                        isPublished: true,
                        enrollments: { none: { userId } },
                    },
                    include: includeFields,
                    orderBy,
                    take: 8,
                });
            }

            if (suggested.length < 2) {
                suggested = await db.course.findMany({
                    where: {
                        instructorId: { notIn: [userId, ...signals.blockedUserIds] },
                        isPublished: true,
                    },
                    include: includeFields,
                    orderBy,
                    take: 8,
                });
            }

            if (suggested.length < 2) {
                suggested = await db.course.findMany({
                    where: { instructorId: { notIn: [userId, ...signals.blockedUserIds] } },
                    include: includeFields,
                    orderBy,
                    take: 8,
                });
            }

            return suggested.map(course => ({
                ...course,
                thumbnailUrl: (course as any).thumbnailUrl || course.thumbnail,
                enrollmentCount: course.enrolledCount,
            }));
        });
    }

    private async getSuggestedQuizzes(userId: string, signals: UserSignals): Promise<any[]> {
        const cacheKey = `feedranker:suggested-quizzes:${userId}:v2`;
        return this.getOrLoadCached(cacheKey, SUGGESTED_CAROUSEL_CACHE_TTL_SECONDS, async () => {
            const db = this.readPrisma;
            const userTopics = Object.keys(signals.topics).slice(0, 5);
            const quizVisibilityWhere = await buildQuizPostWhere(this.readPrisma, userId, signals.schoolId);

            const attempted = await db.quizAttempt.findMany({
                where: { userId },
                select: { quizId: true },
            });
            const attemptedIds = attempted.map(a => a.quizId);

            const includeFields = {
                post: {
                    select: {
                        id: true,
                        title: true,
                        content: true,
                        topicTags: true,
                        likesCount: true,
                        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
                        createdAt: true
                    }
                },
                _count: { select: { attempts: true } },
            };

            const orderBy: any = [
                { post: { likesCount: 'desc' } },
                { post: { createdAt: 'desc' } },
            ];

            const target = SUGGESTED_QUIZ_CAROUSEL_TARGET;

            // 1) Prefer topic overlap when we have interest signals.
            let suggested = await db.quiz.findMany({
                where: {
                    ...(attemptedIds.length > 0 ? { id: { notIn: attemptedIds } } : {}),
                    post: {
                        AND: [quizVisibilityWhere],
                        ...(userTopics.length > 0 ? { topicTags: { hasSome: userTopics } } : {}),
                    },
                },
                include: includeFields,
                orderBy,
                take: target,
            });

            // 2) If topic filter (or sparse pool) yielded too few, backfill from all visible quizzes.
            // Previously we only widened when suggested.length < 2, so exactly 1–2 topic matches
            // never expanded to the full carousel.
            if (suggested.length < target) {
                const have = new Set(suggested.map(q => q.id));
                const excludeIds = [...new Set([...attemptedIds, ...have])];
                const remaining = await db.quiz.findMany({
                    where: {
                        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
                        post: {
                            AND: [quizVisibilityWhere],
                        },
                    },
                    include: includeFields,
                    orderBy,
                    take: target - suggested.length,
                });
                suggested = [...suggested, ...remaining];
            }

            return suggested.map(q => ({
                id: q.id,
                postId: q.post.id,
                title: q.post.title || 'Untitled Quiz',
                description: q.post.content,
                topicTags: q.post.topicTags,
                author: q.post.author,
                questions: q.questions,
                timeLimit: q.timeLimit,
                passingScore: q.passingScore,
                totalPoints: q.totalPoints,
                attemptCount: q._count.attempts,
                createdAt: q.post.createdAt,
            }));
        });
    }

    // ─── Trending Content (high engagement velocity) ──────────────────
    private async getTrendingContent(
        userId: string,
        signals: UserSignals,
        excludeIds: string[],
        subject?: string
    ): Promise<PostWithRelations[]> {
        const load = async () => {
            const suppressedIds = [...new Set([...excludeIds, ...signals.hiddenPostIds])];
            const where: any = {
                AND: [
                    await resolveFeedVisibilityWhere(this.readPrisma, { userId, schoolId: signals.schoolId }),
                    { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                    { trendingScore: { gt: 0.1 } },
                ],
            };

            if (subject && subject !== 'ALL') {
                where.AND.push({ topicTags: { hasSome: [subject.toLowerCase()] } });
            }
            if (suppressedIds.length > 0) {
                where.AND.push({ id: { notIn: suppressedIds } });
            }

            return await this.readPrisma.post.findMany({
                where,
                select: FEED_CANDIDATE_POST_SELECT,
                orderBy: { trendingScore: 'desc' },
                take: 36,
            }) as unknown as PostWithRelations[];
        };

        if (excludeIds.length > 0 || signals.hiddenPostIds.length > 0) {
            return load();
        }

        const cacheKey = `feedranker:trending:${userId}:v2:${signals.schoolId || 'ALL'}:${subject || 'ALL'}`;
        return this.getOrLoadCached(cacheKey, TRENDING_POOL_CACHE_TTL_SECONDS, load);
    }

    // ─── Explore/Discovery (bubble-breaking content) ──────────────────
    private async getExploreContent(
        userId: string,
        signals: UserSignals,
        excludeIds: string[],
        subject?: string
    ): Promise<PostWithRelations[]> {
        const load = async () => {
            const userTopics = Object.keys(signals.topics);
            const suppressedIds = [...new Set([...excludeIds, ...signals.hiddenPostIds])];
            const where: any = {
                AND: [
                    await resolveFeedVisibilityWhere(this.readPrisma, { userId, schoolId: signals.schoolId }),
                    { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                    { authorId: { notIn: [userId, ...signals.followingIds] } },
                ],
            };

            if (userTopics.length > 0 && (!subject || subject === 'ALL')) {
                where.AND.push({ NOT: { topicTags: { hasSome: userTopics.slice(0, 10) } } });
            }

            if (subject && subject !== 'ALL') {
                where.AND.push({ topicTags: { hasSome: [subject.toLowerCase()] } });
            }
            if (suppressedIds.length > 0) {
                where.AND.push({ id: { notIn: suppressedIds } });
            }

            return await this.readPrisma.post.findMany({
                where,
                select: FEED_CANDIDATE_POST_SELECT,
                orderBy: [
                    { likesCount: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 24,
            }) as unknown as PostWithRelations[];
        };

        if (excludeIds.length > 0 || signals.hiddenPostIds.length > 0) {
            return load();
        }

        const cacheKey = `feedranker:explore:${userId}:v2:${subject || 'ALL'}`;
        return this.getOrLoadCached(cacheKey, EXPLORE_POOL_CACHE_TTL_SECONDS, load);
    }

    // ─── Step 1: User Signals (Enhanced v2) ──────────────────────────
    private async getUserSignals(userId: string): Promise<UserSignals> {
        const cacheKey = `feedranker:signals:${userId}:v2`;
        return this.getOrLoadCached(cacheKey, USER_SIGNALS_CACHE_TTL_SECONDS, async () => {
            const db = this.readPrisma;
            const [feedSignals, follows, user, authorInteractions, blockedRelationships, postFeedback, enrollments, academicProfile, deadlinesData, classmatesData, groupData] = await Promise.all([
                db.userFeedSignal.findMany({
                    where: { userId },
                    orderBy: { score: 'desc' },
                    take: 50,
                }),
                db.follow.findMany({
                    where: { followerId: userId },
                    select: { followingId: true },
                }),
                db.user.findUnique({
                    where: { id: userId },
                    select: { schoolId: true, interests: true, skills: true, careerGoals: true },
                }),
                this.withSoftTimeout(
                    'author affinity signals',
                    (async () => {
                        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                        const [likes, comments, bookmarks, views] = await Promise.all([
                            db.like.findMany({
                                where: { userId, createdAt: { gte: since } },
                                select: { postId: true },
                                orderBy: { createdAt: 'desc' },
                                take: 150,
                            }),
                            db.comment.findMany({
                                where: { authorId: userId, createdAt: { gte: since } },
                                select: { postId: true },
                                orderBy: { createdAt: 'desc' },
                                take: 150,
                            }),
                            db.bookmark.findMany({
                                where: { userId, createdAt: { gte: since } },
                                select: { postId: true },
                                orderBy: { createdAt: 'desc' },
                                take: 150,
                            }),
                            db.postView.findMany({
                                where: { userId, viewedAt: { gte: since } },
                                select: { postId: true, duration: true },
                                orderBy: { viewedAt: 'desc' },
                                take: 240,
                            }),
                        ]);

                        const postWeights = new Map<string, number>();
                        const addPostWeight = (postId: string, weight: number) => {
                            postWeights.set(postId, (postWeights.get(postId) || 0) + weight);
                        };

                        likes.forEach(item => addPostWeight(item.postId, 3));
                        comments.forEach(item => addPostWeight(item.postId, 5));
                        bookmarks.forEach(item => addPostWeight(item.postId, 6));
                        views.forEach(item => addPostWeight(item.postId, (item.duration || 0) >= 15 ? 2 : 0.75));

                        const postIds = Array.from(postWeights.keys()).slice(0, 300);
                        if (postIds.length === 0) return new Map<string, number>();

                        const posts = await db.post.findMany({
                            where: { id: { in: postIds } },
                            select: { id: true, authorId: true },
                        });
                        const authorCounts = new Map<string, number>();
                        for (const post of posts) {
                            if (post.authorId === userId) continue;
                            authorCounts.set(post.authorId, (authorCounts.get(post.authorId) || 0) + (postWeights.get(post.id) || 0));
                        }
                        return authorCounts;
                    })(),
                    1200,
                    new Map<string, number>(),
                ),
                db.userBlock.findMany({
                    where: {
                        OR: [
                            { blockerId: userId },
                            { blockedId: userId },
                        ],
                    },
                    select: { blockerId: true, blockedId: true },
                }).catch(() => [] as any[]),
                this.getUserPostFeedback(userId).catch(() => []),
                this.withSoftTimeout(
                    'enrollment learning signals',
                    db.enrollment.findMany({
                        where: { userId },
                        select: {
                            course: { select: { tags: true, category: true, instructorId: true } },
                        },
                        take: 20,
                    }),
                    900,
                    [] as any[],
                ),
                this.withSoftTimeout(
                    'academic profile signals',
                    db.userAcademicProfile.findUnique({ where: { userId } }),
                    700,
                    null,
                ),
                this.withSoftTimeout(
                    'deadline signals',
                    db.userDeadline.findMany({
                        where: { userId, deadlineDate: { gte: new Date() } },
                        take: 50,
                    }),
                    700,
                    [] as any[],
                ),
                this.withSoftTimeout(
                    'classmate signals',
                    db.enrollment.findMany({
                        where: { course: { enrollments: { some: { userId } } } },
                        select: { userId: true },
                        distinct: ['userId'],
                        take: 200,
                    }),
                    900,
                    [] as any[],
                ),
                this.withSoftTimeout(
                    'study group signals',
                    db.clubMember.findMany({
                        where: { club: { members: { some: { userId } } } },
                        select: { userId: true },
                        distinct: ['userId'],
                        take: 200,
                    }),
                    900,
                    [] as any[],
                )
            ]);

            const topics: Record<string, number> = {};
            const topicDwellTime: Record<string, number> = {};
            feedSignals.forEach(s => {
                topics[s.topicId] = s.score;
                if ((s as any).avgViewDuration && (s as any).avgViewDuration > 0) {
                    topicDwellTime[s.topicId] = (s as any).avgViewDuration;
                }
            });

            if (user?.interests) {
                user.interests.forEach(interest => {
                    const key = interest.toLowerCase();
                    if (!topics[key]) topics[key] = 20;
                });
            }
            if (user?.skills) {
                user.skills.forEach(skill => {
                    const key = skill.toLowerCase();
                    if (!topics[key]) topics[key] = 15;
                });
            }

            if (user?.careerGoals) {
                const goals = user.careerGoals.split(',').map(g => g.trim());
                goals.forEach(goal => {
                    if (goal) {
                        const key = goal.toLowerCase();
                        if (!topics[key]) topics[key] = 30;
                        else topics[key] += 15;
                    }
                });
            }

            const authorAffinity: Record<string, number> = {};
            for (const [authorId, score] of authorInteractions) {
                authorAffinity[authorId] = Math.min(score, 100);
            }

            const blockedUserIds = Array.from(new Set(
                blockedRelationships
                    .map((block: any) => block.blockerId === userId ? block.blockedId : block.blockerId)
                    .filter((id: string | undefined): id is string => Boolean(id))
            ));
            const blockedSet = new Set(blockedUserIds);
            const followingIds = follows
                .map(f => f.followingId)
                .filter(id => !blockedSet.has(id));

            const hiddenPostIds: string[] = [];
            const negativeTopics: Record<string, number> = {};
            const feedbackWeights: Record<string, number> = {
                HIDE: 18,
                NOT_INTERESTED: 14,
                SHOW_LESS: 8,
            };
            for (const feedback of postFeedback) {
                if (feedback.feedbackType === 'HIDE' || feedback.feedbackType === 'NOT_INTERESTED' || feedback.feedbackType === 'SHOW_LESS') {
                    hiddenPostIds.push(feedback.postId);
                }

                const feedbackWeight = feedbackWeights[feedback.feedbackType] || 0;
                if (feedbackWeight <= 0) continue;

                for (const topic of getPostSignalTopics(feedback)) {
                    negativeTopics[topic] = Math.min((negativeTopics[topic] || 0) + feedbackWeight, 100);
                }
            }

            const enrolledCourseTopics: string[] = [];
            const instructorIds: string[] = [];
            const courseTopicSet = new Set<string>();
            for (const enrollment of enrollments) {
                const course = enrollment.course;
                if (course?.tags) {
                    for (const tag of course.tags) {
                        courseTopicSet.add(tag.toLowerCase());
                    }
                }
                if (course?.category) {
                    courseTopicSet.add(course.category.toLowerCase());
                }
                if (course?.instructorId) {
                    instructorIds.push(course.instructorId);
                }
            }
            enrolledCourseTopics.push(...courseTopicSet);

            const academicLevel = academicProfile?.currentLevel ? Number(academicProfile.currentLevel) : 2.5;
            const weakTopics = academicProfile?.weakTopics || [];
            const strongTopics = academicProfile?.strongTopics || [];

            const deadlines = deadlinesData.map((d: any) => ({
                date: d.deadlineDate.getTime(),
                topics: d.relatedTopics || [],
            }));

            const classmates = classmatesData.map((c: any) => c.userId);
            const studyGroupMembers = groupData.map((g: any) => g.userId);

            return {
                userId,
                schoolId: user?.schoolId ?? null,
                topics,
                negativeTopics,
                topicDwellTime,
                followingIds,
                blockedUserIds,
                hiddenPostIds: [...new Set(hiddenPostIds)],
                authorAffinity,
                enrolledCourseTopics,
                academicLevel,
                weakTopics,
                strongTopics,
                deadlines,
                classmates,
                studyGroupMembers,
                instructorIds,
            };
        });
    }

    // ─── Step 2: Candidate Generation ────────────────────────────────
    private async getCandidates(
        userId: string,
        signals: UserSignals,
        mode: 'FOR_YOU' | 'FOLLOWING',
        excludeIds: string[],
        subject?: string
    ): Promise<PostWithRelations[]> {
        if (mode === 'FOLLOWING' && signals.followingIds.length === 0) {
            return [];
        }

        const load = async () => {
            const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
            const minimumCandidatePool = 20;

            const baseAnd: any[] = [
                await resolveFeedVisibilityWhere(this.readPrisma, { userId, schoolId: signals.schoolId }),
            ];

            if (subject && subject !== 'ALL') {
                baseAnd.push({ topicTags: { hasSome: [subject.toLowerCase()] } });
            }

            if (excludeIds.length > 0) {
                baseAnd.push({ id: { notIn: excludeIds } });
            }

            if (signals.hiddenPostIds.length > 0) {
                baseAnd.push({ id: { notIn: signals.hiddenPostIds } });
            }

            if (mode === 'FOLLOWING') {
                baseAnd.push({ authorId: { in: signals.followingIds } });
            }

            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            const recentWhere = { AND: [...baseAnd, { createdAt: { gte: since } }] };

            const [established, fresh] = await Promise.all([
                this.readPrisma.post.findMany({
                    where: recentWhere,
                    select: FEED_CANDIDATE_POST_SELECT,
                    orderBy: [
                        { isPinned: 'desc' },
                        { trendingScore: 'desc' },
                        { createdAt: 'desc' },
                    ],
                    take: 60,
                }),
                this.withSoftTimeout(
                    'fresh candidate pool',
                    this.readPrisma.post.findMany({
                        where: { AND: [...baseAnd, { createdAt: { gte: sixHoursAgo } }] },
                        select: FEED_CANDIDATE_POST_SELECT,
                        orderBy: { createdAt: 'desc' },
                        take: 20,
                    }),
                    OPTIONAL_FEED_POOL_TIMEOUT_MS,
                    [] as any[],
                ),
            ]);

            const seen = new Set<string>(established.map(p => p.id));
            const freshOnly = fresh.filter(p => !seen.has(p.id));
            const candidates = [...established, ...freshOnly] as unknown as PostWithRelations[];

            if (candidates.length < minimumCandidatePool) {
                const existingIds = candidates.map(post => post.id);
                const backfillWhere: any = {
                    AND: [...baseAnd, { createdAt: { lt: since } }],
                };

                if (existingIds.length > 0) {
                    backfillWhere.AND.push({ id: { notIn: existingIds } });
                }

                const backfill = await this.readPrisma.post.findMany({
                    where: backfillWhere,
                    select: FEED_CANDIDATE_POST_SELECT,
                    orderBy: [
                        { isPinned: 'desc' },
                        { createdAt: 'desc' },
                    ],
                    take: Math.max(minimumCandidatePool - candidates.length, 20),
                }) as unknown as PostWithRelations[];

                if (backfill.length > 0) {
                    candidates.push(...backfill);
                }
            }

            return candidates;
        };

        if (excludeIds.length > 0 || signals.hiddenPostIds.length > 0) {
            return load();
        }

        const cacheKey = `feedranker:candidates:${userId}:v2:${mode}:${subject || 'ALL'}`;
        return this.getOrLoadCached(cacheKey, CANDIDATE_POOL_CACHE_TTL_SECONDS, load);
    }

    /**
     * Viewer's learning circle for social-proof: followers + classmates + study-group peers,
     * excluding blocked users (followingIds are already sanitized in getUserSignals).
     */
    private getSocialCircleActorIds(signals: UserSignals): string[] {
        const blocked = new Set(signals.blockedUserIds);
        const merged = [
            ...signals.followingIds,
            ...signals.classmates,
            ...signals.studyGroupMembers,
        ].filter((id): id is string => Boolean(id && !blocked.has(id)));
        return [...new Set(merged)];
    }

    /**
     * Count likes/comments per post from members of socialCircleActorIds via batched groupBy —
     * avoids hydrating likes[] / comments[] on every candidate row.
     *
     * Chunking strategy: minimize round-trips when post IDs are bounded (~≤120) but the
     * peer circle can be large — chunk actor IN lists only unless both dimensions exceed MAX_IN.
     */
    private async loadCircleSocialProofCounts(
        postIds: string[],
        socialCircleActorIds: string[],
    ): Promise<Map<string, { likes: number; comments: number }>> {
        const out = new Map<string, { likes: number; comments: number }>();
        if (postIds.length === 0 || socialCircleActorIds.length === 0) return out;

        const uniquePosts = [...new Set(postIds)];
        const uniqueActors = [...new Set(socialCircleActorIds)];
        /** Safe upper bound for Prisma/SQL IN-list size per column */
        const MAX_IN = 200;

        const accumulate = (
            rows: Array<{ postId: string; _count: { _all: number } }>,
            field: 'likes' | 'comments'
        ) => {
            for (const row of rows) {
                const cur = out.get(row.postId) || { likes: 0, comments: 0 };
                cur[field] += row._count._all;
                out.set(row.postId, cur);
            }
        };

        const queryPair = async (postChunk: string[], actorChunk: string[]) => {
            const [likeGroups, commentGroups] = await Promise.all([
                this.readPrisma.like.groupBy({
                    by: ['postId'],
                    where: { postId: { in: postChunk }, userId: { in: actorChunk } },
                    _count: { _all: true },
                }),
                this.readPrisma.comment.groupBy({
                    by: ['postId'],
                    where: { postId: { in: postChunk }, authorId: { in: actorChunk } },
                    _count: { _all: true },
                }),
            ]);
            accumulate(likeGroups, 'likes');
            accumulate(commentGroups, 'comments');
        };

        if (uniquePosts.length <= MAX_IN && uniqueActors.length <= MAX_IN) {
            await queryPair(uniquePosts, uniqueActors);
            return out;
        }

        if (uniquePosts.length <= MAX_IN) {
            for (let ai = 0; ai < uniqueActors.length; ai += MAX_IN) {
                await queryPair(uniquePosts, uniqueActors.slice(ai, ai + MAX_IN));
            }
            return out;
        }

        if (uniqueActors.length <= MAX_IN) {
            for (let pi = 0; pi < uniquePosts.length; pi += MAX_IN) {
                await queryPair(uniquePosts.slice(pi, pi + MAX_IN), uniqueActors);
            }
            return out;
        }

        for (let pi = 0; pi < uniquePosts.length; pi += MAX_IN) {
            const postChunk = uniquePosts.slice(pi, pi + MAX_IN);
            for (let ai = 0; ai < uniqueActors.length; ai += MAX_IN) {
                await queryPair(postChunk, uniqueActors.slice(ai, ai + MAX_IN));
            }
        }

        return out;
    }

    // ─── Step 3: Score a Post ─────────────────────────────────────────
    private scorePost(
        post: PostWithRelations,
        signals: UserSignals,
        circleSocialCounts?: Map<string, { likes: number; comments: number }>,
    ): ScoredPost {
        const engagement = this.calcEngagement(post);
        const relevance = this.calcRelevance(post, signals);
        const negativeFeedback = this.calcNegativeFeedback(post, signals);
        const quality = this.calcQuality(post);
        const recency = this.calcRecency(post);
        const socialProof = this.calcSocialProof(post, signals, circleSocialCounts);
        const learningContext = this.calcLearningContext(post, signals);

        // Gamification / Academic Context
        const academicRelevance = this.calcAcademicRelevance(post, signals);
        const teacherRelevance = this.calcTeacherRelevance(post, signals);
        const peerLearning = this.calcPeerLearning(post, signals);
        const difficultyMatch = this.calcDifficultyMatch(post, signals);

        // Get per-post-type weights (or fall back to base weights)
        const overrides = POST_TYPE_WEIGHTS[post.postType];
        const weights = normalizeScoringWeights(overrides ? { ...BASE_WEIGHTS, ...overrides } : BASE_WEIGHTS);

        // Pinned posts always come first
        const pinBoost = post.isPinned ? 1000 : 0;

        // Engagement velocity bonus: boost rapidly-rising posts
        const velocityBonus = this.calcEngagementVelocity(post);

        const score =
            (engagement * weights.ENGAGEMENT) +
            (relevance * weights.RELEVANCE) +
            (quality * weights.QUALITY) +
            (recency * weights.RECENCY) +
            (socialProof * weights.SOCIAL_PROOF) +
            (learningContext * weights.LEARNING_CONTEXT) +
            (academicRelevance * weights.ACADEMIC_RELEVANCE) +
            (teacherRelevance * weights.TEACHER_RELEVANCE) +
            (peerLearning * weights.PEER_LEARNING) +
            (difficultyMatch * weights.DIFFICULTY_MATCH) +
            (velocityBonus * 0.05) + // Small but impactful velocity boost
            -(negativeFeedback * 0.30) +
            pinBoost;

        return {
            post,
            score,
            breakdown: { engagement, relevance, quality, recency, socialProof, learningContext, academicRelevance, teacherRelevance, peerLearning, difficultyMatch, negativeFeedback },
        };
    }

    // ─── Engagement Score (0-1) ────────────────────────────────────
    private calcEngagement(post: PostWithRelations): number {
        const likes = post.likesCount || post._count?.likes || 0;
        const comments = post.commentsCount || post._count?.comments || 0;
        const views = post.viewsCount || post._count?.views || 0;
        const shares = post.sharesCount || 0;

        // Weighted sum
        const raw = (likes * 3) + (comments * 5) + (shares * 7) + (views * 0.5);

        // Use precomputed score if available
        if (post.postScore?.engagementScore) {
            return post.postScore.engagementScore;
        }

        // Normalize with soft cap (sigmoid-like) — max approaches 1.0
        return raw / (raw + 50); // half-max at 50 engagement units
    }

    // ─── Relevance Score (0-1) ─────────────────────────────────────
    private calcRelevance(post: PostWithRelations, signals: UserSignals): number {
        let score = 0;
        let matchCount = 0;

        // Topic matching via dot product
        const postTags = (post as any).topicTags as string[] | undefined;
        if (postTags && postTags.length > 0) {
            for (const tag of postTags) {
                const key = tag.toLowerCase();
                if (signals.topics[key]) {
                    let topicWeight = signals.topics[key];

                    // Dwell-time amplification: boost topics where user spends more time
                    // (TikTok-inspired — completion/dwell time is a strong interest signal)
                    const dwellTime = signals.topicDwellTime[key] || 0;
                    if (dwellTime > 10) {
                        topicWeight *= 1.0 + Math.min(dwellTime / 60, 0.5); // Up to 50% boost for 60s+ avg dwell
                    }

                    score += topicWeight;
                    matchCount++;
                }
            }
        }

        // Normalize topic score (max user signal score is 100)
        const topicScore = matchCount > 0 ? Math.min(score / (matchCount * 100), 1.0) : 0;

        // Author affinity: graduated score based on interaction history
        // (Facebook-inspired — affinity replaces binary follow check)
        const authorId = post.authorId;
        let authorScore = 0;
        if (signals.authorAffinity[authorId]) {
            authorScore = Math.min(signals.authorAffinity[authorId] / 100, 0.4); // Up to 0.4 boost
        } else if (signals.followingIds.includes(authorId)) {
            authorScore = 0.2; // Base follow boost if no interaction data
        }

        return Math.min(topicScore + authorScore, 1.0);
    }

    // ─── Negative Feedback Score (0-1) ─────────────────────────────
    // Learner-controlled signals such as "Not interested" should overpower
    // passive popularity while still allowing explicit searches/subjects.
    private calcNegativeFeedback(post: PostWithRelations, signals: UserSignals): number {
        if (Object.keys(signals.negativeTopics).length === 0) return 0;

        const topics = getPostSignalTopics(post);
        if (topics.length === 0) return 0;

        let penalty = 0;
        for (const topic of topics) {
            penalty += signals.negativeTopics[topic] || 0;
        }

        return Math.min(penalty / (topics.length * 100), 1.0);
    }

    // ─── Quality Score (0-1) ───────────────────────────────────────
    private calcQuality(post: PostWithRelations): number {
        // Use precomputed if available
        if (post.postScore?.qualityScore) {
            return post.postScore.qualityScore;
        }

        return calculatePostQualityScore(post);
    }

    // ─── Recency Score (0-1) ───────────────────────────────────────
    private calcRecency(post: PostWithRelations): number {
        const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);

        // Exponential decay: λ tuned so ~50% at 24h, ~25% at 48h
        const lambda = 0.029; // ln(2)/24 ≈ 0.029
        return Math.exp(-lambda * ageHours);
    }

    // ─── Social Proof Score (0-1) ──────────────────────────────────
    private calcSocialProof(
        post: PostWithRelations,
        signals: UserSignals,
        circleSocialCounts?: Map<string, { likes: number; comments: number }>,
    ): number {
        let circleLikes = 0;
        let circleComments = 0;

        const pre = circleSocialCounts?.get(post.id);
        if (pre) {
            circleLikes = pre.likes;
            circleComments = pre.comments;
        } else {
            const circle = new Set(this.getSocialCircleActorIds(signals));
            circleLikes = post.likes?.filter(l => circle.has(l.userId)).length || 0;
            circleComments = post.comments?.filter(c => circle.has(c.authorId)).length || 0;
        }

        if (circleLikes + circleComments === 0) return 0;

        // Normalize: weighted comments > likes; cap ~5 meaningful interactions
        return Math.min((circleLikes * 2 + circleComments * 3) / 15, 1.0);
    }

    // ─── Learning Context Score (0-1) — NEW ────────────────────────
    // Boosts posts that match the user's enrolled course topics
    // (YouTube-inspired — recommend content within the user's active learning path)
    private calcLearningContext(post: PostWithRelations, signals: UserSignals): number {
        if (signals.enrolledCourseTopics.length === 0) return 0;

        const postTags = (post as any).topicTags as string[] | undefined;
        if (!postTags || postTags.length === 0) return 0;

        // Count how many post tags overlap with enrolled course topics
        let matchCount = 0;
        for (const tag of postTags) {
            if (signals.enrolledCourseTopics.includes(tag.toLowerCase())) {
                matchCount++;
            }
        }

        if (matchCount === 0) return 0;

        // Partial match: 1 tag match = 0.5, 2+ tags = approaching 1.0
        const matchRatio = matchCount / postTags.length;

        // Post type bonus: educational post types matching courses get extra boost
        const isEduType = ['COURSE', 'QUIZ', 'EXAM', 'ASSIGNMENT', 'TUTORIAL', 'RESOURCE', 'RESEARCH'].includes(post.postType);
        const typeMultiplier = isEduType ? 1.3 : 1.0;

        return Math.min(matchRatio * typeMultiplier, 1.0);
    }

    // ─── Engagement Velocity (0-1) — NEW ───────────────────────────
    // Detects rapidly-rising content (engagement per hour in first 6 hours)
    // (TikTok-inspired — fast feedback loop for rising content)
    private calcEngagementVelocity(post: PostWithRelations): number {
        const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);

        // Only calculate velocity for posts < 24 hours old
        if (ageHours > 24) return 0;

        const likes = post.likesCount || post._count?.likes || 0;
        const comments = post.commentsCount || post._count?.comments || 0;
        const totalEngagement = likes + comments;

        if (totalEngagement === 0) return 0;

        // Engagement per hour, capped at first 6 hours for velocity signal
        const effectiveHours = Math.max(ageHours, 0.5); // Avoid division by near-zero
        const velocity = totalEngagement / effectiveHours;

        // Normalize: velocity of 10 engagement/hour is excellent
        return Math.min(velocity / 10, 1.0);
    }

    // ─── Academic Relevance Score (0-1) — NEW ──────────────────────
    private calcAcademicRelevance(post: PostWithRelations, signals: UserSignals): number {
        const postTags = (post as any).topicTags as string[] | undefined;
        if (!postTags || postTags.length === 0) return 0;

        let score = 0;

        // 1. Weak Topics Match (1.0 weight) - highly prioritize content that helps student improve
        const weakMatches = postTags.filter(t => signals.weakTopics.includes(t.toLowerCase())).length;
        if (weakMatches > 0) score += 1.0;

        // 2. Strong Topics Match (0.5 weight) - reinforce existing knowledge
        const strongMatches = postTags.filter(t => signals.strongTopics.includes(t.toLowerCase())).length;
        if (strongMatches > 0) score += 0.5;

        // 3. Deadline Proximity Match (1.5 weight) - highest priority for imminent deadlines
        let deadlineScore = 0;
        const now = Date.now();
        for (const deadline of signals.deadlines) {
            const daysUntil = (deadline.date - now) / (1000 * 60 * 60 * 24);
            if (daysUntil >= 0 && daysUntil <= 7) {
                // Check if post topics match deadline topics
                const matches = postTags.some(t => deadline.topics.includes(t.toLowerCase()));
                if (matches) {
                    // Closer deadline = higher score (1.5 for today, scaling down to 0 for >7 days)
                    const urgency = Math.max(0, 1.5 * (1 - daysUntil / 7));
                    deadlineScore = Math.max(deadlineScore, urgency);
                }
            }
        }
        score += deadlineScore;

        // Normalize
        return Math.min(score / 3.0, 1.0);
    }

    // ─── Teacher Relevance Score (0-1) — NEW ───────────────────────
    private calcTeacherRelevance(post: PostWithRelations, signals: UserSignals): number {
        // Direct Instructor Match (1.0 weight)
        if (signals.instructorIds.includes(post.authorId)) {
            return 1.0;
        }

        // Generic Teacher Boost (0.5 weight) - any teaching staff
        if (post.author?.role === 'TEACHER') {
            return 0.5;
        }

        return 0.0;
    }

    // ─── Peer Learning Score (0-1) — NEW ───────────────────────────
    private calcPeerLearning(post: PostWithRelations, signals: UserSignals): number {
        // Same Course Classmates (1.0 weight)
        if (signals.classmates.includes(post.authorId)) {
            return 1.0;
        }

        // Study Group/Club Match (0.8 weight)
        if (signals.studyGroupMembers.includes(post.authorId)) {
            return 0.8;
        }

        return 0.0;
    }

    // ─── Difficulty Match Score (0-1) — NEW ────────────────────────
    private calcDifficultyMatch(post: PostWithRelations, signals: UserSignals): number {
        const postDiff = (post as any).difficultyLevel;
        if (postDiff === undefined || postDiff === null) return 0.5; // Neutral score if no difficulty set

        const userDiff = signals.academicLevel; // expected 1.0 - 5.0
        const postDiffNum = Number(postDiff);

        // Calculate the absolute distance between user's level and post difficulty
        const distance = Math.abs(postDiffNum - userDiff);

        // Assume maximum meaningful distance is 4.0 (e.g. 5.0 vs 1.0)
        // Closer to 0 difference = score of 1.0. Distance >= 2.0 gets score 0
        const matchScore = Math.max(0, 1 - (distance / 2.0));

        return matchScore;
    }


    // ─── Diversity Enforcement ─────────────────────────────────────
    private applyDiversity(scored: ScoredPost[]): ScoredPost[] {
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Enforce: no 3+ consecutive posts from same author OR same post type
        const result: ScoredPost[] = [];
        const deferred: ScoredPost[] = [];

        for (const item of scored) {
            const lastTwo = result.slice(-2);

            // Check author diversity
            const sameAuthor = lastTwo.length === 2 && lastTwo.every(
                r => r.post.authorId === item.post.authorId
            );

            // Check post-type diversity (no 3 articles/polls/etc. in a row)
            const sameType = lastTwo.length === 2 && lastTwo.every(
                r => r.post.postType === item.post.postType
            );

            if (sameAuthor || sameType) {
                deferred.push(item);
            } else {
                result.push(item);
            }
        }

        // Append deferred posts at the end
        result.push(...deferred);

        return result;
    }

    // ─── Simple Recent Feed ────────────────────────────────────────
    private async getRecentFeed(
        userId: string,
        page: number,
        limit: number,
        subject?: string,
        cursor?: string
    ): Promise<{ items: FeedItem[]; total?: number; hasMore: boolean; nextCursor?: string }> {
        const skip = (page - 1) * limit;
        const currentUser = await this.readPrisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
        });
        const hiddenPostIds = (await this.getUserPostFeedback(userId))
            .filter((feedback) => ['HIDE', 'NOT_INTERESTED', 'SHOW_LESS'].includes(feedback.feedbackType))
            .map((feedback) => feedback.postId);

        const where: any = {
            AND: [
                await resolveFeedVisibilityWhere(this.readPrisma, {
                    userId,
                    schoolId: currentUser?.schoolId,
                }),
            ],
        };
        if (subject && subject !== 'ALL') {
            where.AND.push({ topicTags: { hasSome: [subject.toLowerCase()] } });
        }
        if (hiddenPostIds.length > 0) {
            where.AND.push({ id: { notIn: [...new Set(hiddenPostIds)] } });
        }

        let cursorWhere: any = null;
        if (cursor) {
            let cursorState = decodeFeedCursor(cursor);

            if (!cursorState) {
                const cursorPost = await this.readPrisma.post.findUnique({
                    where: { id: cursor },
                    select: { id: true, createdAt: true, isPinned: true },
                });

                if (cursorPost) {
                    cursorState = {
                        id: cursorPost.id,
                        createdAt: cursorPost.createdAt.toISOString(),
                        isPinned: cursorPost.isPinned,
                    };
                }
            }

            cursorWhere = cursorState ? buildFeedCursorWhere(cursorState) : null;
            if (cursorWhere) {
                where.AND.push(cursorWhere);
            }
        }

        const baseQuery = {
            where,
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePictureUrl: true,
                        role: true,
                        isVerified: true,
                    },
                },
                pollOptions: {
                    select: { id: true, text: true, position: true, votesCount: true, createdAt: true },
                },
                quiz: {
                    select: {
                        id: true,
                        questions: true,
                        timeLimit: true,
                        passingScore: true,
                        totalPoints: true,
                        resultsVisibility: true,
                    },
                },
                repostOf: {
                    select: {
                        id: true, content: true, title: true, postType: true, mediaUrls: true, mediaMetadata: true, mediaAspectRatio: true,
                        createdAt: true, likesCount: true, commentsCount: true,
                        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } },
                    },
                },
            },
            orderBy: [
                { isPinned: 'desc' as const },
                { createdAt: 'desc' as const },
                { id: 'desc' as const },
            ],
        };

        if (cursorWhere) {
            const posts = await this.readPrisma.post.findMany({
                ...baseQuery,
                take: limit + 1,
            }) as unknown as PostWithRelations[];

            const hasMore = posts.length > limit;
            const pagePosts = hasMore ? posts.slice(0, limit) : posts;
            const scored = pagePosts.map(post => ({
                post,
                score: 0,
                breakdown: {
                    engagement: 0,
                    relevance: 0,
                    quality: 0,
                    recency: 1,
                    socialProof: 0,
                    learningContext: 0,
                    academicRelevance: 0,
                    teacherRelevance: 0,
                    peerLearning: 0,
                    difficultyMatch: 0,
                    negativeFeedback: 0,
                },
            }));

            const items: FeedItem[] = scored.map(s => ({ type: 'POST', data: s }));
            const lastVisiblePost = pagePosts[pagePosts.length - 1];
            const nextCursor = hasMore && lastVisiblePost
                ? encodeFeedCursor({
                    id: lastVisiblePost.id,
                    createdAt: lastVisiblePost.createdAt,
                    isPinned: lastVisiblePost.isPinned,
                })
                : undefined;

            return {
                items,
                hasMore,
                ...(nextCursor ? { nextCursor } : {}),
            };
        }

        const posts = await this.readPrisma.post.findMany({
            ...baseQuery,
            skip,
            take: limit + 1,
        }) as unknown as PostWithRelations[];

        const hasMore = posts.length > limit;
        const pagePosts = hasMore ? posts.slice(0, limit) : posts;

        const scored = pagePosts.map(post => ({
            post,
            score: 0,
            breakdown: {
                engagement: 0,
                relevance: 0,
                quality: 0,
                recency: 1,
                socialProof: 0,
                learningContext: 0,
                academicRelevance: 0,
                teacherRelevance: 0,
                peerLearning: 0,
                difficultyMatch: 0,
                negativeFeedback: 0,
            },
        }));

        const items: FeedItem[] = scored.map(s => ({ type: 'POST', data: s }));
        const lastVisiblePost = pagePosts[pagePosts.length - 1];
        const nextCursor = hasMore && lastVisiblePost
            ? encodeFeedCursor({
                id: lastVisiblePost.id,
                createdAt: lastVisiblePost.createdAt,
                isPinned: lastVisiblePost.isPinned,
            })
            : undefined;

        return {
            items,
            hasMore,
            ...(nextCursor ? { nextCursor } : {}),
        };
    }

    /**
     * BRAIN_MODE feed: sort all visible posts by Post.edScore desc, then
     * createdAt desc. Unrated posts (edScore = null) fall to the end
     * naturally on Postgres DESC ordering. Powered by the
     * posts_edScore_createdAt_idx index (added in migration 20260530065104).
     *
     * Same visibility / hidden-post / subject-filter logic as getRecentFeed
     * — the only differences are: (a) orderBy, (b) no cursor support
     * (offset pagination is fine since Brain Mode sessions are short and
     * ranking is deterministic), (c) `score` is populated with edScore so
     * the mobile knows why this post surfaced.
     */
    private async getBrainModeFeed(
        userId: string,
        page: number,
        limit: number,
        subject?: string,
        cursor?: string
    ): Promise<{ items: FeedItem[]; total?: number; hasMore: boolean; nextCursor?: string }> {
        const cursorState = cursor ? decodeBrainModeCursor(cursor) : null;
        const useCursor = Boolean(cursorState);
        const skip = useCursor ? 0 : (page - 1) * limit;

        const currentUser = await this.readPrisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
        });
        const hiddenPostIds = (await this.getUserPostFeedback(userId))
            .filter((feedback) => ['HIDE', 'NOT_INTERESTED', 'SHOW_LESS'].includes(feedback.feedbackType))
            .map((feedback) => feedback.postId);

        const where: any = {
            AND: [
                await resolveFeedVisibilityWhere(this.readPrisma, {
                    userId,
                    schoolId: currentUser?.schoolId,
                }),
            ],
        };
        if (subject && subject !== 'ALL') {
            where.AND.push({ topicTags: { hasSome: [subject.toLowerCase()] } });
        }
        if (hiddenPostIds.length > 0) {
            where.AND.push({ id: { notIn: [...new Set(hiddenPostIds)] } });
        }

        if (cursorState) {
            const cursorWhere = buildBrainModeCursorWhere(cursorState);
            if (cursorWhere) {
                where.AND.push(cursorWhere);
            }
        }

        const posts = await this.readPrisma.post.findMany({
            where,
            include: {
                author: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePictureUrl: true,
                        role: true,
                        isVerified: true,
                    },
                },
                pollOptions: {
                    select: { id: true, text: true, position: true, votesCount: true, createdAt: true },
                },
                quiz: {
                    select: {
                        id: true,
                        questions: true,
                        timeLimit: true,
                        passingScore: true,
                        totalPoints: true,
                        resultsVisibility: true,
                    },
                },
                repostOf: {
                    select: {
                        id: true, content: true, title: true, postType: true, mediaUrls: true, mediaMetadata: true, mediaAspectRatio: true,
                        createdAt: true, likesCount: true, commentsCount: true,
                        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } },
                    },
                },
            },
            orderBy: [
                { isPinned: 'desc' as const },
                // Prisma 5.x: `{ sort, nulls }` for nullable fields.
                { edScore: { sort: 'desc' as const, nulls: 'last' as const } },
                { createdAt: 'desc' as const },
                { id: 'desc' as const },
            ],
            skip,
            take: limit + 1,
        }) as unknown as PostWithRelations[];

        const hasMore = posts.length > limit;
        const pagePosts = hasMore ? posts.slice(0, limit) : posts;

        // Populate `score` with edScore so the mobile knows the quality
        // signal; `breakdown.quality` mirrors it for the _scoreBreakdown
        // surface the client already understands.
        const scored = pagePosts.map(post => {
            const ed = (post as any).edScore ?? 0;
            const teacherVerified = (post as any).teacherVerified === true;
            return {
                post,
                score: ed,
                breakdown: {
                    engagement: 0,
                    relevance: 0,
                    quality: ed,
                    recency: 0,
                    socialProof: 0,
                    learningContext: 0,
                    academicRelevance: 0,
                    teacherRelevance: teacherVerified ? 1 : 0,
                    peerLearning: 0,
                    difficultyMatch: 0,
                    negativeFeedback: 0,
                },
            };
        });

        const items: FeedItem[] = scored.map(s => ({ type: 'POST', data: s }));
        const lastVisiblePost = pagePosts[pagePosts.length - 1];
        const nextCursor = hasMore && lastVisiblePost
            ? encodeBrainModeCursor({
                id: lastVisiblePost.id,
                createdAt: lastVisiblePost.createdAt,
                isPinned: lastVisiblePost.isPinned,
                edScore: lastVisiblePost.edScore ?? null,
            })
            : undefined;

        return { items, hasMore, nextCursor };
    }

    // ─── Track User Action (Batched) ──────────────────────────────
    async trackViewSignalsBatch(
        userId: string,
        views: { postId: string; duration?: number; source?: string; sampleRate?: number }[],
        preloadedPosts?: { id: string; topicTags: string[]; postType?: PostType | string | null }[]
    ): Promise<void> {
        try {
            if (views.length === 0) return;

            const postIds = [...new Set(views.map(view => view.postId).filter(Boolean))];
            if (postIds.length === 0) return;

            const posts = preloadedPosts ?? await this.prisma.post.findMany({
                where: { id: { in: postIds } },
                select: { id: true, topicTags: true, postType: true },
            });

            const topicsByPostId = new Map(posts.map(post => [post.id, getPostSignalTopics(post)]));
            const topicAgg = new Map<string, { count: number; score: number; duration: number }>();
            const weight = ACTION_WEIGHTS.VIEW || 1;

            for (const view of views) {
                const topics = topicsByPostId.get(view.postId) || [];
                const duration = view.duration || 3;
                const sampleRate = Number(view.sampleRate);
                const sampleMultiplier = Number.isFinite(sampleRate) && sampleRate > 0 && sampleRate < 1
                    ? Math.min(1 / sampleRate, 10)
                    : 1;

                for (const rawTopic of topics) {
                    const topicId = rawTopic.toLowerCase();
                    const current = topicAgg.get(topicId) || { count: 0, score: 0, duration: 0 };
                    current.count += 1;
                    current.score += weight * sampleMultiplier;
                    current.duration += duration;
                    topicAgg.set(topicId, current);
                }
            }

            if (topicAgg.size === 0) return;

            const topicIds = Array.from(topicAgg.keys());
            const existingSignals = await this.prisma.userFeedSignal.findMany({
                where: { userId, topicId: { in: topicIds } },
                select: { topicId: true, viewCount: true, avgViewDuration: true },
            });
            const existingByTopic = new Map(existingSignals.map(signal => [signal.topicId, signal]));

            const ops = Array.from(topicAgg.entries()).map(([topicId, agg]) => {
                const existing = existingByTopic.get(topicId);
                const existingViewCount = existing?.viewCount || 0;
                const nextViewCount = existingViewCount + agg.count;
                const previousDurationTotal = (existing?.avgViewDuration || 0) * existingViewCount;
                const avgViewDuration = nextViewCount > 0
                    ? (previousDurationTotal + agg.duration) / nextViewCount
                    : agg.duration / agg.count;

                return this.prisma.userFeedSignal.upsert({
                    where: {
                        userId_topicId: { userId, topicId },
                    },
                    create: {
                        userId,
                        topicId,
                        score: agg.score,
                        viewCount: agg.count,
                        avgViewDuration: agg.duration / agg.count,
                    },
                    update: {
                        score: { increment: agg.score },
                        viewCount: { increment: agg.count },
                        lastInteraction: new Date(),
                        avgViewDuration,
                    },
                });
            });

            await this.prisma.$transaction(ops);
            await feedCache.invalidateUser(userId);
        } catch (error) {
            console.error('❌ [FeedRanker] trackViewSignalsBatch error:', error);
        }
    }

    async trackAction(
        userId: string,
        postId: string,
        action: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE' | 'BOOKMARK',
        duration?: number,
        source?: string,
        recordView = true
    ): Promise<void> {
        try {
            const post = await this.prisma.post.findUnique({
                where: { id: postId },
                select: { topicTags: true, postType: true },
            });

            if (!post) return;

            const topics = getPostSignalTopics(post);
            const weight = ACTION_WEIGHTS[action] || 1;
            const actionField = `${action.toLowerCase()}Count` as any;
            const existingSignals = action === 'VIEW' && duration
                ? await this.prisma.userFeedSignal.findMany({
                    where: { userId, topicId: { in: topics } },
                    select: { topicId: true, viewCount: true, avgViewDuration: true },
                })
                : [];
            const existingByTopic = new Map(existingSignals.map(signal => [signal.topicId, signal]));

            // Batch all signal upserts + optional postView into a single transaction
            const ops = topics.map(topic => {
                const key = topic.toLowerCase();
                const existing = existingByTopic.get(key);
                const existingViewCount = existing?.viewCount || 0;
                const avgViewDuration = action === 'VIEW' && duration
                    ? (((existing?.avgViewDuration || 0) * existingViewCount) + duration) / (existingViewCount + 1)
                    : undefined;

                return this.prisma.userFeedSignal.upsert({
                    where: {
                        userId_topicId: { userId, topicId: key },
                    },
                    create: {
                        userId,
                        topicId: key,
                        score: weight,
                        [actionField]: 1,
                        avgViewDuration: action === 'VIEW' && duration ? duration : 0,
                    },
                    update: {
                        score: { increment: weight },
                        [actionField]: { increment: 1 },
                        lastInteraction: new Date(),
                        ...(avgViewDuration !== undefined ? { avgViewDuration } : {}),
                    },
                });
            });

            // Include postView create in the same transaction for single VIEW
            // calls. Bulk view tracking inserts views in one createMany call and
            // then reuses this method only for topic/user-signal updates.
            if (action === 'VIEW' && recordView) {
                ops.push(this.prisma.postView.create({
                    data: {
                        postId,
                        userId,
                        duration: duration ? Math.round(duration) : null,
                        source: source || 'feed',
                    },
                }) as any);
                ops.push(this.prisma.post.update({
                    where: { id: postId },
                    data: { viewsCount: { increment: 1 } },
                }) as any);
            }

            if (ops.length > 0) {
                await this.prisma.$transaction(ops);

                // Immediately invalidate feed cache so the next pull-to-refresh
                // uses the newly updated topic/interest weights.
                await feedCache.invalidateUser(userId);
            }
        } catch (error) {
            console.error('❌ [FeedRanker] trackAction error:', error);
            // Non-critical — don't crash the request
        }
    }
    // ─── Refresh Post Scores (background job — batched) ────────────
    async refreshPostScores(): Promise<number> {
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

        const posts = await this.prisma.post.findMany({
            where: {
                createdAt: { gte: since },
                visibility: { in: ['PUBLIC', 'SCHOOL', 'CLASS'] },
            },
            select: {
                id: true,
                likesCount: true,
                commentsCount: true,
                sharesCount: true,
                viewsCount: true,
                postType: true,
                mediaUrls: true,
                content: true,
                title: true,
                questionBounty: true,
                createdAt: true,
                author: {
                    select: { isVerified: true },
                },
            },
        });

        if (posts.length === 0) return 0;

        const postIds = posts.map(post => post.id);
        const educationalRatings = await this.prisma.educationalValueRating.groupBy({
            by: ['postId'],
            where: { postId: { in: postIds } },
            _avg: { averageRating: true },
            _count: { postId: true },
        });
        const educationalQualityByPostId = new Map(
            educationalRatings.map(rating => [
                rating.postId,
                {
                    averageRating: rating._avg.averageRating || 0,
                    count: rating._count.postId || 0,
                },
            ])
        );

        // Pre-compute all scores in memory after the aggregate quality read.
        const scored = posts.map(post => {
            const likes = post.likesCount;
            const comments = post.commentsCount;
            const views = post.viewsCount;
            const shares = post.sharesCount;
            const educationalQuality = educationalQualityByPostId.get(post.id);

            const engagementRaw = (likes * 3) + (comments * 5) + (shares * 7) + (views * 0.5);
            const engagementScore = engagementRaw / (engagementRaw + 50);
            const qualityScore = calculatePostQualityScore(
                post,
                educationalQuality?.averageRating,
                educationalQuality?.count
            );
            const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
            const decayFactor = Math.exp(-0.029 * ageHours);
            const trendingScore = engagementScore * decayFactor;

            return { id: post.id, engagementScore, qualityScore, trendingScore, decayFactor };
        });

        // Batch all DB writes into a single transaction (2N queries → 1 transaction)
        const BATCH_SIZE = 100;
        for (let i = 0; i < scored.length; i += BATCH_SIZE) {
            const batch = scored.slice(i, i + BATCH_SIZE);
            await this.prisma.$transaction(
                batch.flatMap(s => [
                    this.prisma.postScore.upsert({
                        where: { postId: s.id },
                        create: {
                            postId: s.id,
                            engagementScore: s.engagementScore,
                            qualityScore: s.qualityScore,
                            trendingScore: s.trendingScore,
                            decayFactor: s.decayFactor,
                        },
                        update: {
                            engagementScore: s.engagementScore,
                            qualityScore: s.qualityScore,
                            trendingScore: s.trendingScore,
                            decayFactor: s.decayFactor,
                            computedAt: new Date(),
                        },
                    }),
                    this.prisma.post.update({
                        where: { id: s.id },
                        data: { trendingScore: s.trendingScore },
                    }),
                ])
            );
        }

        return scored.length;
    }
}
