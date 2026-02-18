/**
 * Feed Ranker — Server-side personalized feed scoring engine
 * 
 * 5-factor scoring model:
 *   1. Engagement (30%) — popularity signals (likes, comments, shares, views)
 *   2. Relevance (30%)  — match between user interests and post topics
 *   3. Quality (15%)    — content quality signals
 *   4. Recency (15%)    — time decay
 *   5. Social Proof (10%) — interactions from followed users
 * 
 * Inspired by Facebook EdgeRank + TikTok's interest-graph approach,
 * tailored for educational / learning content.
 */

import { PrismaClient, Post, User, PostType } from '@prisma/client';

// ─── Scoring Weights ───────────────────────────────────────────────
const WEIGHTS = {
    ENGAGEMENT: 0.30,
    RELEVANCE: 0.30,
    QUALITY: 0.15,
    RECENCY: 0.15,
    SOCIAL_PROOF: 0.10,
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
    topics: Record<string, number>;  // topicId → interest score
    followingIds: string[];
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
            },
            orderBy: [
                { likesCount: 'desc' },
                { createdAt: 'desc' },
            ],
            take: 30,
        }) as unknown as PostWithRelations[];
    }

    // ─── Step 1: User Signals ─────────────────────────────────────────
    private async getUserSignals(userId: string): Promise<UserSignals> {
        const [feedSignals, follows, user] = await Promise.all([
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
        ]);

        // Merge DB signals with profile interests/skills  
        const topics: Record<string, number> = {};
        feedSignals.forEach(s => { topics[s.topicId] = s.score; });

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

        return {
            topics,
            followingIds: follows.map(f => f.followingId),
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

        const candidates = await this.prisma.post.findMany({
            where: baseWhere,
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
                        // questions omitted — load on detail
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
            },
            orderBy: [
                { isPinned: 'desc' },
                { trendingScore: 'desc' },
                { createdAt: 'desc' },
            ],
            take: 100, // candidate pool size (reduced from 200 for speed)
        }) as unknown as PostWithRelations[];

        return candidates;
    }

    // ─── Step 3: Score a Post ─────────────────────────────────────────
    private scorePost(post: PostWithRelations, signals: UserSignals): ScoredPost {
        const engagement = this.calcEngagement(post);
        const relevance = this.calcRelevance(post, signals);
        const quality = this.calcQuality(post);
        const recency = this.calcRecency(post);
        const socialProof = this.calcSocialProof(post, signals);

        // Pinned posts always come first
        const pinBoost = post.isPinned ? 1000 : 0;

        const score =
            (engagement * WEIGHTS.ENGAGEMENT) +
            (relevance * WEIGHTS.RELEVANCE) +
            (quality * WEIGHTS.QUALITY) +
            (recency * WEIGHTS.RECENCY) +
            (socialProof * WEIGHTS.SOCIAL_PROOF) +
            pinBoost;

        return {
            post,
            score,
            breakdown: { engagement, relevance, quality, recency, socialProof },
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
                    score += signals.topics[key];
                    matchCount++;
                }
            }
        }

        // Normalize topic score (max user signal score is 100)
        const topicScore = matchCount > 0 ? Math.min(score / (matchCount * 100), 1.0) : 0;

        // Author affinity: boost if author is followed
        const followBoost = signals.followingIds.includes(post.authorId) ? 0.3 : 0;

        return Math.min(topicScore + followBoost, 1.0);
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
            },
        }));

        return {
            posts: scored,
            total,
            hasMore: skip + limit < total,
        };
    }

    // ─── Track User Action ────────────────────────────────────────
    async trackAction(
        userId: string,
        postId: string,
        action: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE' | 'BOOKMARK',
        duration?: number,
        source?: string
    ): Promise<void> {
        try {
            // Get post topics
            const post = await this.prisma.post.findUnique({
                where: { id: postId },
            });

            if (!post) return;

            const topics = ((post as any).topicTags as string[]) || [];
            const weight = ACTION_WEIGHTS[action] || 1;

            // Update signal for each topic
            for (const topic of topics) {
                const key = topic.toLowerCase();
                const actionField = `${action.toLowerCase()}Count` as any;

                await this.prisma.userFeedSignal.upsert({
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
                            // Running average for view duration
                            avgViewDuration: { increment: duration * 0.1 }, // weighted running avg
                        } : {}),
                    },
                });
            }

            // Track post view in PostView table for VIEW action
            if (action === 'VIEW') {
                await this.prisma.postView.create({
                    data: {
                        postId,
                        userId,
                        duration: duration ? Math.round(duration) : null,
                        source: source || 'feed',
                    },
                });
            }
        } catch (error) {
            console.error('❌ [FeedRanker] trackAction error:', error);
            // Non-critical — don't crash the request
        }
    }

    // ─── Refresh Post Scores (background job) ──────────────────────
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

        let updated = 0;

        for (const post of posts) {
            const likes = post._count.likes;
            const comments = post._count.comments;
            const views = post._count.views;
            const shares = post.sharesCount;

            const engagementRaw = (likes * 3) + (comments * 5) + (shares * 7) + (views * 0.5);
            const engagementScore = engagementRaw / (engagementRaw + 50);

            const qualityScore = POST_TYPE_QUALITY[post.postType] || 0.40;

            const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
            const decayFactor = Math.exp(-0.029 * ageHours);

            // Trending: engagement velocity (recent vs older)
            const trendingScore = engagementScore * decayFactor;

            await this.prisma.postScore.upsert({
                where: { postId: post.id },
                create: {
                    postId: post.id,
                    engagementScore,
                    qualityScore,
                    trendingScore,
                    decayFactor,
                },
                update: {
                    engagementScore,
                    qualityScore,
                    trendingScore,
                    decayFactor,
                    computedAt: new Date(),
                },
            });

            // Also update the denormalized trendingScore on the post
            await this.prisma.post.update({
                where: { id: post.id },
                data: { trendingScore },
            });

            updated++;
        }

        return updated;
    }
}
