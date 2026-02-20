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

import { PrismaClient, Post, User, PostType } from '@prisma/client';

// ─── Scoring Weights (v2 — dynamic per post type) ──────────────────
interface ScoringWeights {
    ENGAGEMENT: number;
    RELEVANCE: number;
    QUALITY: number;
    RECENCY: number;
    SOCIAL_PROOF: number;
    LEARNING_CONTEXT: number;
}

const BASE_WEIGHTS: ScoringWeights = {
    ENGAGEMENT: 0.25,
    RELEVANCE: 0.25,
    QUALITY: 0.15,
    RECENCY: 0.15,
    SOCIAL_PROOF: 0.10,
    LEARNING_CONTEXT: 0.10,
};

// Per-post-type weight overrides (key insight: different content needs differ)
const POST_TYPE_WEIGHTS: Partial<Record<PostType, ScoringWeights>> = {
    // Courses are evergreen, highly intentional — relevance is king
    COURSE: { ENGAGEMENT: 0.15, RELEVANCE: 0.35, QUALITY: 0.20, RECENCY: 0.05, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.15 },
    // Questions need fast answers — recency matters most
    QUESTION: { ENGAGEMENT: 0.20, RELEVANCE: 0.20, QUALITY: 0.10, RECENCY: 0.30, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.10 },
    // Quizzes match curriculum — high relevance + learning context
    QUIZ: { ENGAGEMENT: 0.20, RELEVANCE: 0.30, QUALITY: 0.15, RECENCY: 0.10, SOCIAL_PROOF: 0.10, LEARNING_CONTEXT: 0.15 },
    // Exams are deadline-driven, must match student's courses
    EXAM: { ENGAGEMENT: 0.10, RELEVANCE: 0.35, QUALITY: 0.15, RECENCY: 0.15, SOCIAL_PROOF: 0.05, LEARNING_CONTEXT: 0.20 },
    // Assignments are curriculum-bound
    ASSIGNMENT: { ENGAGEMENT: 0.10, RELEVANCE: 0.35, QUALITY: 0.15, RECENCY: 0.15, SOCIAL_PROOF: 0.05, LEARNING_CONTEXT: 0.20 },
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
    topics: Record<string, number>;      // topicId → interest score
    topicDwellTime: Record<string, number>; // topicId → avg view duration (seconds)
    followingIds: string[];
    authorAffinity: Record<string, number>; // authorId → affinity score (0-100)
    enrolledCourseTopics: string[];         // topics from enrolled courses
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
    };
}

// ─── Feed Ranker ───────────────────────────────────────────────────
export class FeedRanker {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Generate a personalized feed for a user.
     * FOR_YOU mode uses content-mixing: relevance (60%) + trending (25%) + explore (15%)
     */
    async generateFeed(
        userId: string,
        options: {
            mode?: 'FOR_YOU' | 'FOLLOWING' | 'RECENT';
            page?: number;
            limit?: number;
            excludeIds?: string[];
            subject?: string;
        } = {}
    ): Promise<{ posts: ScoredPost[]; total: number; hasMore: boolean }> {
        const { mode = 'FOR_YOU', page = 1, limit = 20, excludeIds = [], subject } = options;

        // Short-circuit for simple modes
        if (mode === 'RECENT') {
            return this.getRecentFeed(userId, page, limit, subject);
        }

        if (mode === 'FOLLOWING') {
            const userSignals = await this.getUserSignals(userId);
            const candidates = await this.getCandidates(userId, userSignals, 'FOLLOWING', excludeIds, subject);
            const scored = candidates.map(post => this.scorePost(post, userSignals));
            const diversified = this.applyDiversity(scored);
            const start = (page - 1) * limit;
            const paged = diversified.slice(start, start + limit);
            return { posts: paged, total: diversified.length, hasMore: start + limit < diversified.length };
        }

        // FOR_YOU: Content-mixing strategy (Facebook/TikTok-style)
        const userSignals = await this.getUserSignals(userId);

        // Run all 3 pools in parallel for speed — use allSettled so failures don't block
        const [relevanceResult, trendingResult, exploreResult] = await Promise.allSettled([
            this.getCandidates(userId, userSignals, 'FOR_YOU', excludeIds, subject),
            this.getTrendingContent(excludeIds, subject),
            this.getExploreContent(userId, userSignals, excludeIds, subject),
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

        // Mix: interleave pools with target ratios
        const totalTarget = limit * 3; // Over-generate, then paginate
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

        // Paginate
        const start = (page - 1) * limit;
        const paged = diversified.slice(start, start + limit);

        return {
            posts: paged,
            total: diversified.length,
            hasMore: start + limit < diversified.length,
        };
    }

    // ─── Trending Content (high engagement velocity) ──────────────────
    private async getTrendingContent(
        excludeIds: string[],
        subject?: string
    ): Promise<PostWithRelations[]> {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours

        const where: any = {
            createdAt: { gte: since },
            visibility: { in: ['PUBLIC', 'SCHOOL'] },
            trendingScore: { gt: 0.1 }, // Only posts with some traction
            ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
        };

        if (subject && subject !== 'ALL') {
            where.topicTags = { hasSome: [subject.toLowerCase()] };
        }

        return await this.prisma.post.findMany({
            where,
            include: {
                author: {
                    select: {
                        id: true, firstName: true, lastName: true,
                        profilePictureUrl: true, role: true, isVerified: true,
                    },
                },
                pollOptions: { include: { _count: { select: { votes: true } } } },
                quiz: { select: { id: true, timeLimit: true, passingScore: true, totalPoints: true, resultsVisibility: true } },
                postScore: true,
                _count: { select: { likes: true, comments: true, views: true } },
                repostOf: { select: { id: true, content: true, title: true, postType: true, mediaUrls: true, createdAt: true, likesCount: true, commentsCount: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } } } },
            },
            orderBy: { trendingScore: 'desc' },
            take: 50,
        }) as unknown as PostWithRelations[];
    }

    // ─── Explore/Discovery (bubble-breaking content) ──────────────────
    private async getExploreContent(
        userId: string,
        signals: UserSignals,
        excludeIds: string[],
        subject?: string
    ): Promise<PostWithRelations[]> {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
        const userTopics = Object.keys(signals.topics);

        const where: any = {
            createdAt: { gte: since },
            visibility: { in: ['PUBLIC', 'SCHOOL'] },
            authorId: { notIn: [userId, ...signals.followingIds] }, // Not from followed users
            ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
        };

        // Exclude user's known topics to surface new content
        if (userTopics.length > 0) {
            where.NOT = { topicTags: { hasSome: userTopics.slice(0, 10) } };
        }

        if (subject && subject !== 'ALL') {
            where.topicTags = { hasSome: [subject.toLowerCase()] };
            delete where.NOT; // If filtering by subject, don't exclude topics
        }

        return await this.prisma.post.findMany({
            where,
            include: {
                author: {
                    select: {
                        id: true, firstName: true, lastName: true,
                        profilePictureUrl: true, role: true, isVerified: true,
                    },
                },
                pollOptions: { include: { _count: { select: { votes: true } } } },
                quiz: { select: { id: true, timeLimit: true, passingScore: true, totalPoints: true, resultsVisibility: true } },
                postScore: true,
                _count: { select: { likes: true, comments: true, views: true } },
                repostOf: { select: { id: true, content: true, title: true, postType: true, mediaUrls: true, createdAt: true, likesCount: true, commentsCount: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } } } },
            },
            orderBy: [
                { likesCount: 'desc' },
                { createdAt: 'desc' },
            ],
            take: 30,
        }) as unknown as PostWithRelations[];
    }

    // ─── Step 1: User Signals (Enhanced v2) ──────────────────────────
    private async getUserSignals(userId: string): Promise<UserSignals> {
        const [feedSignals, follows, user, authorInteractions, enrollments] = await Promise.all([
            this.prisma.userFeedSignal.findMany({
                where: { userId },
                orderBy: { score: 'desc' },
                take: 50, // top 50 topics
            }),
            this.prisma.follow.findMany({
                where: { followerId: userId },
                select: { followingId: true },
            }),
            this.prisma.user.findUnique({
                where: { id: userId },
                select: { interests: true, skills: true },
            }),
            // Author affinity: count interactions per author from likes and comments
            this.prisma.like.groupBy({
                by: ['postId'],
                where: { userId },
                _count: { postId: true },
            }).then(async (likes) => {
                // Get the author IDs for liked posts
                if (likes.length === 0) return new Map<string, number>();
                const postIds = likes.map(l => l.postId);
                const posts = await this.prisma.post.findMany({
                    where: { id: { in: postIds.slice(0, 200) } },
                    select: { id: true, authorId: true },
                });
                const authorCounts = new Map<string, number>();
                for (const post of posts) {
                    authorCounts.set(post.authorId, (authorCounts.get(post.authorId) || 0) + 3);
                }
                return authorCounts;
            }).catch(() => new Map<string, number>()),
            // Enrolled course topics
            this.prisma.enrollment.findMany({
                where: { userId },
                select: {
                    course: { select: { tags: true, category: true } },
                },
                take: 20,
            }).catch(() => [] as any[]),
        ]);

        // Merge DB signals with profile interests/skills  
        const topics: Record<string, number> = {};
        const topicDwellTime: Record<string, number> = {};
        feedSignals.forEach(s => {
            topics[s.topicId] = s.score;
            // Use avgViewDuration from the signal if available
            if ((s as any).avgViewDuration && (s as any).avgViewDuration > 0) {
                topicDwellTime[s.topicId] = (s as any).avgViewDuration;
            }
        });

        // Seed from profile interests (lower weight than learned signals)
        if (user?.interests) {
            user.interests.forEach(interest => {
                const key = interest.toLowerCase();
                if (!topics[key]) topics[key] = 20; // baseline interest
            });
        }
        if (user?.skills) {
            user.skills.forEach(skill => {
                const key = skill.toLowerCase();
                if (!topics[key]) topics[key] = 15;
            });
        }

        // Build author affinity map
        const authorAffinity: Record<string, number> = {};
        for (const [authorId, score] of authorInteractions) {
            authorAffinity[authorId] = Math.min(score, 100);
        }

        // Extract enrolled course topics
        const enrolledCourseTopics: string[] = [];
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
        }
        enrolledCourseTopics.push(...courseTopicSet);

        return {
            topics,
            topicDwellTime,
            followingIds: follows.map(f => f.followingId),
            authorAffinity,
            enrolledCourseTopics,
        };
    }

    // ─── Step 2: Candidate Generation ────────────────────────────────
    private async getCandidates(
        userId: string,
        signals: UserSignals,
        mode: 'FOR_YOU' | 'FOLLOWING',
        excludeIds: string[],
        subject?: string
    ): Promise<PostWithRelations[]> {
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days

        const baseWhere: any = {
            createdAt: { gte: since },
            visibility: { in: ['PUBLIC', 'SCHOOL'] },
            ...(excludeIds.length > 0 && { id: { notIn: excludeIds } }),
        };

        if (subject && subject !== 'ALL') {
            baseWhere.topicTags = { hasSome: [subject.toLowerCase()] };
        }

        if (mode === 'FOLLOWING') {
            baseWhere.authorId = { in: signals.followingIds };
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
                include: {
                    _count: { select: { votes: true } },
                },
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
                    id: true, content: true, title: true, postType: true, mediaUrls: true,
                    createdAt: true, likesCount: true, commentsCount: true,
                    author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } },
                },
            },
        };

        // Two-pool candidate fetch: 75 established (by trendingScore) + 25 fresh (last 6 hours)
        // This guarantees new posts always enter the feed even before they have engagement.
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

        const [established, fresh] = await Promise.all([
            this.prisma.post.findMany({
                where: baseWhere,
                include: sharedInclude,
                orderBy: [
                    { isPinned: 'desc' },
                    { trendingScore: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 75,
            }),
            // Fresh posts (< 6h) that might not have trendingScore yet
            this.prisma.post.findMany({
                where: { ...baseWhere, createdAt: { gte: sixHoursAgo } },
                include: sharedInclude,
                orderBy: { createdAt: 'desc' },
                take: 25,
            }),
        ]);

        // Merge and deduplicate (established posts take priority if in both)
        const seen = new Set<string>(established.map(p => p.id));
        const freshOnly = fresh.filter(p => !seen.has(p.id));
        const candidates = [...established, ...freshOnly] as unknown as PostWithRelations[];

        return candidates;
    }

    // ─── Step 3: Score a Post ─────────────────────────────────────────
    private scorePost(post: PostWithRelations, signals: UserSignals): ScoredPost {
        const engagement = this.calcEngagement(post);
        const relevance = this.calcRelevance(post, signals);
        const quality = this.calcQuality(post);
        const recency = this.calcRecency(post);
        const socialProof = this.calcSocialProof(post, signals);
        const learningContext = this.calcLearningContext(post, signals);

        // Get per-post-type weights (or fall back to base weights)
        const weights = POST_TYPE_WEIGHTS[post.postType] || BASE_WEIGHTS;

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
            (velocityBonus * 0.05) + // Small but impactful velocity boost
            pinBoost;

        return {
            post,
            score,
            breakdown: { engagement, relevance, quality, recency, socialProof, learningContext },
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
        subject?: string
    ): Promise<{ posts: ScoredPost[]; total: number; hasMore: boolean }> {
        const skip = (page - 1) * limit;

        const where: any = {
            visibility: { in: ['PUBLIC', 'SCHOOL'] },
        };
        if (subject && subject !== 'ALL') {
            where.topicTags = { hasSome: [subject.toLowerCase()] };
        }

        const [posts, total] = await Promise.all([
            this.prisma.post.findMany({
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
                        include: {
                            _count: { select: { votes: true } },
                        },
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
                            id: true, content: true, title: true, postType: true, mediaUrls: true,
                            createdAt: true, likesCount: true, commentsCount: true,
                            author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, role: true, isVerified: true } },
                        },
                    },
                },
                orderBy: [
                    { isPinned: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip,
                take: limit,
            }) as unknown as PostWithRelations[],
            this.prisma.post.count({ where }),
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
            },
        }));

        return {
            posts: scored,
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
                visibility: { in: ['PUBLIC', 'SCHOOL'] },
            },
            include: {
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
