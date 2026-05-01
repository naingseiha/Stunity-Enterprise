/**
 * Feed Ranker — Server-side personalized feed scoring engine
 * 
 * 6-factor scoring model (v2 — Facebook/TikTok/YouTube inspired):
 *   1. Engagement (variable) — popularity signals (likes, comments, shares, views) + velocity
 *   2. Relevance (variable)  — match between user interests, enrolled courses, and post topics
 *   3. Quality (variable)    — content quality signals (type, media, author credibility)
 *   4. Recency (variable)    — time decay (tuned per post type)
 *   5. Social Proof (variable) — interactions from followed users + author affinity
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
import { buildFeedVisibilityWhere, resolveFeedVisibilityWhere } from './utils/visibilityScope';
import { buildFeedCursorWhere, decodeFeedCursor, encodeFeedCursor } from './utils/feedCursor';

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

const USER_SIGNALS_CACHE_TTL_SECONDS = 60;
const SUGGESTED_CAROUSEL_CACHE_TTL_SECONDS = 300;
const CANDIDATE_POOL_CACHE_TTL_SECONDS = 45;
const TRENDING_POOL_CACHE_TTL_SECONDS = 45;
const EXPLORE_POOL_CACHE_TTL_SECONDS = 45;
const FEED_SESSION_CACHE_TTL_SECONDS = 300;
const FEED_SESSION_PAGE_MULTIPLIER = 6;
const FEED_SESSION_MIN_ITEMS = 80;
const FEED_SESSION_MAX_ITEMS = 120;

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
    _count: {
        likes: number;
        comments: number;
        views: number;
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
    topicDwellTime: Record<string, number>; // topicId → avg view duration (seconds)
    followingIds: string[];
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

function buildQuizPostWhere(userId: string, schoolId: string | null | undefined): Prisma.PostWhereInput {
    return {
        AND: [
            buildFeedVisibilityWhere({ userId, schoolId }),
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

    /**
     * Generate a personalized feed for a user.
     * FOR_YOU mode uses content-mixing: relevance (60%) + trending (25%) + explore (15%)
     */
    async generateFeed(
        userId: string,
        options?: {
            mode?: 'FOR_YOU' | 'FOLLOWING' | 'RECENT';
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

        const feedSessionKey = `feedranker:session:${userId}:${mode}:${subject || 'ALL'}:limit:${limit}:exclude:${excludeKey}`;

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
                    return this.getRecentFeed(userId, 1, limit, subject, cursor);
                }
                const nextCursor = this.getNextCursorFromFeedItems(paged);
                return {
                    items: paged,
                    total: cachedSequence.length,
                    hasMore: Boolean(nextCursor),
                    ...(nextCursor ? { nextCursor } : {}),
                };
            }
            if (process.env.NODE_ENV !== 'production') {
                console.log(`⚠️ [FeedRanker] Cache MISS for session ${feedSessionKey}, page ${page}. Regenerating.`);
            }
        }

        if (mode === 'FOLLOWING') {
            const userSignals = await this.getUserSignals(userId);
            const candidates = await this.getCandidates(userId, userSignals, 'FOLLOWING', normalizedExcludeIds, subject);
            const scored = candidates.map(post => this.scorePost(post, userSignals));
            const diversified = this.applyDiversity(scored);

            const items: FeedItem[] = diversified.map(p => ({ type: 'POST', data: p }));
            const start = (page - 1) * limit;
            const paged = items.slice(start, start + limit);
            if (paged.length === 0) {
                return this.getRecentFeed(userId, 1, limit, subject, cursor);
            }
            const nextCursor = this.getNextCursorFromFeedItems(paged);

            // Cache the generated sequence for page > 1
            if (page === 1) {
                feedCache.set(feedSessionKey, items, FEED_SESSION_CACHE_TTL_SECONDS).catch(() => { });
            }

            return {
                items: paged,
                total: items.length,
                hasMore: Boolean(nextCursor),
                ...(nextCursor ? { nextCursor } : {}),
            };
        }

        // FOR_YOU: Content-mixing strategy (Facebook/TikTok-style)
        const userSignals = await this.getUserSignals(userId);

        // Run all 3 pools in parallel for speed — use allSettled so failures don't block
        const [relevanceResult, trendingResult, exploreResult] = await Promise.allSettled([
            this.getCandidates(userId, userSignals, 'FOR_YOU', normalizedExcludeIds, subject),
            this.getTrendingContent(userId, userSignals.schoolId, normalizedExcludeIds, subject),
            this.getExploreContent(userId, userSignals, normalizedExcludeIds, subject),
        ]);

        // Pool 1: Relevance-ranked candidates (60% of feed) — required
        const relevanceCandidates = relevanceResult.status === 'fulfilled' ? relevanceResult.value : [];
        const relevanceScored = relevanceCandidates.map(post => this.scorePost(post, userSignals));
        relevanceScored.sort((a, b) => b.score - a.score);

        // Pool 2: Trending (25% of feed) — optional, graceful fallback
        const trendingPosts = trendingResult.status === 'fulfilled' ? trendingResult.value : [];
        if (trendingResult.status === 'rejected') {
            console.warn('⚠️ [FeedRanker] Trending pool failed, skipping:', trendingResult.reason?.message);
        }
        const trendingScored = trendingPosts.map(post => this.scorePost(post, userSignals));

        // Pool 3: Explore (15% of feed) — optional, graceful fallback
        const explorePosts = exploreResult.status === 'fulfilled' ? exploreResult.value : [];
        if (exploreResult.status === 'rejected') {
            console.warn('⚠️ [FeedRanker] Explore pool failed, skipping:', exploreResult.reason?.message);
        }
        const exploreScored = explorePosts.map(post => this.scorePost(post, userSignals));

        console.log(`🧠 [FeedRanker] Pools: relevance=${relevanceScored.length} trending=${trendingScored.length} explore=${exploreScored.length}`);

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
                this.getSuggestedUsers(userId, userSignals),
                this.getSuggestedCourses(userId, userSignals),
                this.getSuggestedQuizzes(userId, userSignals),
            ]);

            let injectionIndex = 6;

            // Inject Users
            if (suggestedUsers.length > 0 && rawFeedItems.length >= injectionIndex) {
                rawFeedItems.splice(injectionIndex, 0, { type: 'SUGGESTED_USERS', data: suggestedUsers });
                injectionIndex += 8; // Next injection 8 items later
            }

            // Inject Courses
            if (suggestedCourses.length > 0 && rawFeedItems.length >= injectionIndex) {
                rawFeedItems.splice(injectionIndex, 0, { type: 'SUGGESTED_COURSES', data: suggestedCourses });
                injectionIndex += 10;
            }

            // Inject Quizzes
            if (suggestedQuizzes.length > 0 && rawFeedItems.length >= injectionIndex) {
                rawFeedItems.splice(injectionIndex, 0, { type: 'SUGGESTED_QUIZZES', data: suggestedQuizzes });
            }
        }

        // Paginate
        const start = (page - 1) * limit;
        const paged = rawFeedItems.slice(start, start + limit);
        if (paged.length === 0) {
            return this.getRecentFeed(userId, 1, limit, subject, cursor);
        }
        const nextCursor = this.getNextCursorFromFeedItems(paged);

        // Cache the generated sequence for page > 1
        if (page === 1) {
            feedCache.set(feedSessionKey, rawFeedItems, FEED_SESSION_CACHE_TTL_SECONDS).catch(() => { });
        }

        return {
            items: paged,
            total: rawFeedItems.length,
            hasMore: Boolean(nextCursor),
            ...(nextCursor ? { nextCursor } : {}),
        };
    }

    // ─── Suggested Content Injectors ──────────────────────────────────────
    private async getSuggestedUsers(userId: string, signals: UserSignals): Promise<Partial<User>[]> {
        const cacheKey = `feedranker:suggested-users:${userId}:v1`;
        return this.getOrLoadCached(cacheKey, SUGGESTED_CAROUSEL_CACHE_TTL_SECONDS, async () => {
            const db = this.readPrisma;
            // Suggest users who share interests, teachers, or anyone active the user isn't already following.
            // Intentionally permissive — we only exclude the current user and already-followed users.
            const userTopics = Object.keys(signals.topics).slice(0, 5);
            const excludeIds = [userId, ...signals.followingIds];

            const baseWhere: any = {
                id: { notIn: excludeIds },
            };

            const primaryWhere: any = {
                ...baseWhere,
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
                instructorId: { not: userId },
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
                        instructorId: { not: userId },
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
                        instructorId: { not: userId },
                        isPublished: true,
                    },
                    include: includeFields,
                    orderBy,
                    take: 8,
                });
            }

            if (suggested.length < 2) {
                suggested = await db.course.findMany({
                    where: { instructorId: { not: userId } },
                    include: includeFields,
                    orderBy,
                    take: 8,
                });
            }

            return suggested.map(course => ({
                ...course,
                enrollmentCount: course.enrolledCount,
            }));
        });
    }

    private async getSuggestedQuizzes(userId: string, signals: UserSignals): Promise<any[]> {
        const cacheKey = `feedranker:suggested-quizzes:${userId}:v1`;
        return this.getOrLoadCached(cacheKey, SUGGESTED_CAROUSEL_CACHE_TTL_SECONDS, async () => {
            const db = this.readPrisma;
            const userTopics = Object.keys(signals.topics).slice(0, 5);
            const quizVisibilityWhere = buildQuizPostWhere(userId, signals.schoolId);

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

            let suggested = await db.quiz.findMany({
                where: {
                    ...(attemptedIds.length > 0 ? { id: { notIn: attemptedIds } } : {}),
                    post: {
                        AND: [
                            quizVisibilityWhere,
                        ],
                        ...(userTopics.length > 0 && { topicTags: { hasSome: userTopics } })
                    },
                },
                include: includeFields,
                orderBy,
                take: 8,
            });

            if (suggested.length < 2) {
                suggested = await db.quiz.findMany({
                    where: {
                        ...(attemptedIds.length > 0 ? { id: { notIn: attemptedIds } } : {}),
                        post: {
                            AND: [
                                quizVisibilityWhere,
                            ],
                        },
                    },
                    include: includeFields,
                    orderBy,
                    take: 8,
                });
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
        schoolId: string | null | undefined,
        excludeIds: string[],
        subject?: string
    ): Promise<PostWithRelations[]> {
        const load = async () => {
            const where: any = {
                AND: [
                    await resolveFeedVisibilityWhere(this.readPrisma, { userId, schoolId }),
                    { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                    { trendingScore: { gt: 0.1 } },
                ],
            };

            if (subject && subject !== 'ALL') {
                where.AND.push({ topicTags: { hasSome: [subject.toLowerCase()] } });
            }
            if (excludeIds.length > 0) {
                where.AND.push({ id: { notIn: excludeIds } });
            }

            return await this.readPrisma.post.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            profilePictureUrl: true, role: true, isVerified: true,
                        },
                    },
                    pollOptions: {
                        select: { id: true, text: true, position: true, votesCount: true, createdAt: true },
                    },
                    quiz: { select: { id: true, timeLimit: true, passingScore: true, totalPoints: true, resultsVisibility: true } },
                    postScore: true,
                    _count: { select: { likes: true, comments: true, views: true } },
                    repostOf: { select: { id: true, content: true, title: true, postType: true, mediaUrls: true, mediaMetadata: true, mediaAspectRatio: true, createdAt: true, likesCount: true, commentsCount: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } } } },
                },
                orderBy: { trendingScore: 'desc' },
                take: 36,
            }) as unknown as PostWithRelations[];
        };

        if (excludeIds.length > 0) {
            return load();
        }

        const cacheKey = `feedranker:trending:${userId}:${schoolId || 'ALL'}:${subject || 'ALL'}`;
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
            if (excludeIds.length > 0) {
                where.AND.push({ id: { notIn: excludeIds } });
            }

            return await this.readPrisma.post.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            profilePictureUrl: true, role: true, isVerified: true,
                        },
                    },
                    pollOptions: {
                        select: { id: true, text: true, position: true, votesCount: true, createdAt: true },
                    },
                    quiz: { select: { id: true, timeLimit: true, passingScore: true, totalPoints: true, resultsVisibility: true } },
                    postScore: true,
                    _count: { select: { likes: true, comments: true, views: true } },
                    repostOf: { select: { id: true, content: true, title: true, postType: true, mediaUrls: true, mediaMetadata: true, mediaAspectRatio: true, createdAt: true, likesCount: true, commentsCount: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } } } },
                },
                orderBy: [
                    { likesCount: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 24,
            }) as unknown as PostWithRelations[];
        };

        if (excludeIds.length > 0) {
            return load();
        }

        const cacheKey = `feedranker:explore:${userId}:${subject || 'ALL'}`;
        return this.getOrLoadCached(cacheKey, EXPLORE_POOL_CACHE_TTL_SECONDS, load);
    }

    // ─── Step 1: User Signals (Enhanced v2) ──────────────────────────
    private async getUserSignals(userId: string): Promise<UserSignals> {
        const cacheKey = `feedranker:signals:${userId}:v1`;
        return this.getOrLoadCached(cacheKey, USER_SIGNALS_CACHE_TTL_SECONDS, async () => {
            const db = this.readPrisma;
            const [feedSignals, follows, user, authorInteractions, enrollments, academicProfile, deadlinesData, classmatesData, groupData] = await Promise.all([
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
                db.like.groupBy({
                    by: ['postId'],
                    where: { userId },
                    _count: { postId: true },
                }).then(async (likes) => {
                    if (likes.length === 0) return new Map<string, number>();
                    const postIds = likes.map(l => l.postId);
                    const posts = await db.post.findMany({
                        where: { id: { in: postIds.slice(0, 200) } },
                        select: { id: true, authorId: true },
                    });
                    const authorCounts = new Map<string, number>();
                    for (const post of posts) {
                        authorCounts.set(post.authorId, (authorCounts.get(post.authorId) || 0) + 3);
                    }
                    return authorCounts;
                }).catch(() => new Map<string, number>()),
                db.enrollment.findMany({
                    where: { userId },
                    select: {
                        course: { select: { tags: true, category: true, instructorId: true } },
                    },
                    take: 20,
                }).catch(() => [] as any[]),
                db.userAcademicProfile.findUnique({
                    where: { userId },
                }).catch(() => null),
                db.userDeadline.findMany({
                    where: { userId, deadlineDate: { gte: new Date() } },
                }).catch(() => [] as any[]),
                db.enrollment.findMany({
                    where: { course: { enrollments: { some: { userId } } } },
                    select: { userId: true },
                    distinct: ['userId'],
                }).catch(() => [] as any[]),
                db.clubMember.findMany({
                    where: { club: { members: { some: { userId } } } },
                    select: { userId: true },
                    distinct: ['userId'],
                }).catch(() => [] as any[])
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
                topicDwellTime,
                followingIds: follows.map(f => f.followingId),
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

            if (mode === 'FOLLOWING') {
                baseAnd.push({ authorId: { in: signals.followingIds } });
            }

            const sharedInclude = {
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
                        timeLimit: true,
                        passingScore: true,
                        totalPoints: true,
                        resultsVisibility: true,
                    },
                },
                postScore: true,
                _count: {
                    select: { likes: true, comments: true, views: true },
                },
                repostOf: {
                    select: {
                        id: true, content: true, title: true, postType: true, mediaUrls: true, mediaMetadata: true, mediaAspectRatio: true,
                        createdAt: true, likesCount: true, commentsCount: true,
                        author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } },
                    },
                },
            };

            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
            const recentWhere = { AND: [...baseAnd, { createdAt: { gte: since } }] };

            const [established, fresh] = await Promise.all([
                this.readPrisma.post.findMany({
                    where: recentWhere,
                    include: sharedInclude,
                    orderBy: [
                        { isPinned: 'desc' },
                        { trendingScore: 'desc' },
                        { createdAt: 'desc' },
                    ],
                    take: 60,
                }),
                this.readPrisma.post.findMany({
                    where: { AND: [...baseAnd, { createdAt: { gte: sixHoursAgo } }] },
                    include: sharedInclude,
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                }),
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
                    include: sharedInclude,
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

        if (excludeIds.length > 0) {
            return load();
        }

        const cacheKey = `feedranker:candidates:${userId}:${mode}:${subject || 'ALL'}`;
        return this.getOrLoadCached(cacheKey, CANDIDATE_POOL_CACHE_TTL_SECONDS, load);
    }

    // ─── Step 3: Score a Post ─────────────────────────────────────────
    private scorePost(post: PostWithRelations, signals: UserSignals): ScoredPost {
        const engagement = this.calcEngagement(post);
        const relevance = this.calcRelevance(post, signals);
        const quality = this.calcQuality(post);
        const recency = this.calcRecency(post);
        const socialProof = this.calcSocialProof(post, signals);
        const learningContext = this.calcLearningContext(post, signals);

        // Gamification / Academic Context
        const academicRelevance = this.calcAcademicRelevance(post, signals);
        const teacherRelevance = this.calcTeacherRelevance(post, signals);
        const peerLearning = this.calcPeerLearning(post, signals);
        const difficultyMatch = this.calcDifficultyMatch(post, signals);

        // Get per-post-type weights (or fall back to base weights)
        const overrides = POST_TYPE_WEIGHTS[post.postType];
        const weights = overrides ? { ...BASE_WEIGHTS, ...overrides } : BASE_WEIGHTS;

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
            pinBoost;

        return {
            post,
            score,
            breakdown: { engagement, relevance, quality, recency, socialProof, learningContext, academicRelevance, teacherRelevance, peerLearning, difficultyMatch },
        };
    }

    // ─── Engagement Score (0-1) ────────────────────────────────────
    private calcEngagement(post: PostWithRelations): number {
        const likes = post._count?.likes || post.likesCount || 0;
        const comments = post._count?.comments || post.commentsCount || 0;
        const views = post._count?.views || 0;
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

    // ─── Quality Score (0-1) ───────────────────────────────────────
    private calcQuality(post: PostWithRelations): number {
        // Use precomputed if available
        if (post.postScore?.qualityScore) {
            return post.postScore.qualityScore;
        }

        let score = POST_TYPE_QUALITY[post.postType] || 0.40;

        // Media bonus
        if (post.mediaUrls && post.mediaUrls.length > 0) score += 0.10;

        // Content length bonus (meaningful content)
        if (post.content.length > 200) score += 0.05;
        if (post.content.length > 500) score += 0.05;

        // Verified author bonus
        if (post.author?.isVerified) score += 0.10;

        // Title presence (structured content)
        if (post.title) score += 0.05;

        // 💎 Q&A Bounty Boost (Max +0.3 for very high bounties)
        if (post.postType === 'QUESTION' && (post as any).questionBounty > 0) {
            const bounty = (post as any).questionBounty;
            // 10 diamonds = 0.05, 50 = 0.15, 100+ = 0.3
            const bountyBoost = Math.min(bounty / 300, 0.3);
            score += bountyBoost;
        }

        return Math.min(score, 1.0);
    }

    // ─── Recency Score (0-1) ───────────────────────────────────────
    private calcRecency(post: PostWithRelations): number {
        const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);

        // Exponential decay: λ tuned so ~50% at 24h, ~25% at 48h
        const lambda = 0.029; // ln(2)/24 ≈ 0.029
        return Math.exp(-lambda * ageHours);
    }

    // ─── Social Proof Score (0-1) ──────────────────────────────────
    private calcSocialProof(post: PostWithRelations, signals: UserSignals): number {
        // Check if any followed users liked or commented on this post
        const followedLikes = post.likes?.filter(
            l => signals.followingIds.includes(l.userId)
        ).length || 0;

        const followedComments = post.comments?.filter(
            c => signals.followingIds.includes(c.authorId)
        ).length || 0;

        if (followedLikes + followedComments === 0) return 0;

        // Normalize: cap at 5 social interactions
        return Math.min((followedLikes * 2 + followedComments * 3) / 15, 1.0);
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

        const likes = post._count?.likes || post.likesCount || 0;
        const comments = post._count?.comments || post.commentsCount || 0;
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
                _count: {
                    select: { likes: true, comments: true, views: true },
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

        const [posts, total] = await Promise.all([
            this.readPrisma.post.findMany({
                ...baseQuery,
                skip,
                take: limit,
            }) as unknown as PostWithRelations[],
            this.readPrisma.post.count({ where }),
        ]);

        const scored = posts.map(post => ({
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
            },
        }));

        const items: FeedItem[] = scored.map(s => ({ type: 'POST', data: s }));

        return {
            items,
            total,
            hasMore: skip + limit < total,
        };
    }

    // ─── Track User Action (Batched) ──────────────────────────────
    async trackAction(
        userId: string,
        postId: string,
        action: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE' | 'BOOKMARK',
        duration?: number,
        source?: string
    ): Promise<void> {
        try {
            const post = await this.prisma.post.findUnique({
                where: { id: postId },
                select: { topicTags: true },
            });

            if (!post) return;

            const topics = ((post as any).topicTags as string[]) || [];
            const weight = ACTION_WEIGHTS[action] || 1;
            const actionField = `${action.toLowerCase()}Count` as any;

            // Batch all signal upserts + optional postView into a single transaction
            const ops = topics.map(topic => {
                const key = topic.toLowerCase();
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
                        ...(action === 'VIEW' && duration ? {
                            avgViewDuration: { increment: duration * 0.1 },
                        } : {}),
                    },
                });
            });

            // Include postView create in the same transaction for VIEW
            if (action === 'VIEW') {
                ops.push(this.prisma.postView.create({
                    data: {
                        postId,
                        userId,
                        duration: duration ? Math.round(duration) : null,
                        source: source || 'feed',
                    },
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
                sharesCount: true,
                postType: true,
                createdAt: true,
                _count: { select: { likes: true, comments: true, views: true } },
            },
        });

        if (posts.length === 0) return 0;

        // Pre-compute all scores in memory (zero DB cost)
        const scored = posts.map(post => {
            const likes = post._count.likes;
            const comments = post._count.comments;
            const views = post._count.views;
            const shares = post.sharesCount;

            const engagementRaw = (likes * 3) + (comments * 5) + (shares * 7) + (views * 0.5);
            const engagementScore = engagementRaw / (engagementRaw + 50);
            const qualityScore = POST_TYPE_QUALITY[post.postType] || 0.40;
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
