import { Post, User } from '@/types';

// Weight configurations (from FEED_ALGORITHM.md)
const WEIGHTS = {
    ENGAGEMENT: 0.4,
    RELEVANCE: 0.3,
    QUALITY: 0.2,
    RECENCY: 0.1,
};

// Engagement actions weights
const ENGAGEMENT_SCORES = {
    VIEW: 1,
    LIKE: 2,
    COMMENT: 5,
    SHARE: 7,
    BOOKMARK: 4,
    CLICK: 3,
};

export interface UserInterestProfile {
    topics: Record<string, number>; // Topic -> Weight (0-100)
    following: string[];
    interactedPosts: string[];
}

// Mock User Profile for initial testing
export const INITIAL_USER_PROFILE: UserInterestProfile = {
    topics: {
        'Mathematics': 50,
        'Science': 50,
        'Technology': 50,
        'History': 30,
        'Art': 30,
    },
    following: [],
    interactedPosts: [],
};

class RecommendationEngine {
    private userProfile: UserInterestProfile;

    constructor(initialProfile: UserInterestProfile = INITIAL_USER_PROFILE) {
        this.userProfile = initialProfile;
    }

    // Update user profile based on actions
    trackAction(action: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE' | 'BOOKMARK', post: Post) {
        const weight = ENGAGEMENT_SCORES[action] || 1;

        // Boost topic weights
        if (post.topicTags) {
            post.topicTags.forEach(tag => {
                const currentWeight = this.userProfile.topics[tag] || 0;
                this.userProfile.topics[tag] = Math.min(currentWeight + weight, 100);
            });
        }

        // Track interaction
        if (!this.userProfile.interactedPosts.includes(post.id)) {
            this.userProfile.interactedPosts.push(post.id);
        }
    }

    // 1. Engagement Score (0-100)
    private calculateEngagementScore(post: Post): number {
        const score =
            (post.likes * ENGAGEMENT_SCORES.LIKE) +
            (post.comments * ENGAGEMENT_SCORES.COMMENT) +
            (post.shares * ENGAGEMENT_SCORES.SHARE) +
            // Mock views as related to likes for now
            (post.likes * 10 * ENGAGEMENT_SCORES.VIEW);

        // Normalize to 0-100 (assuming max reasonable score around 1000 for this scale)
        return Math.min(score / 10, 100);
    }

    // 2. Relevance Score (0-100)
    private calculateRelevanceScore(post: Post): number {
        let score = 0;

        // Topic Match
        if (post.topicTags) {
            const matches = post.topicTags.filter(tag => this.userProfile.topics[tag]);
            if (matches.length > 0) {
                const avgWeight = matches.reduce((sum, tag) => sum + this.userProfile.topics[tag], 0) / matches.length;
                score += avgWeight;
            }
        }

        // Author Affinity (simulated)
        if (this.userProfile.following.includes(post.author.id)) {
            score += 30; // Boost for followed authors
        }

        return Math.min(score, 100);
    }

    // 3. Quality Score (0-100)
    private calculateQualityScore(post: Post): number {
        let score = 50; // Base score

        // Multimedia bonus
        if (post.mediaUrls && post.mediaUrls.length > 0) score += 20;

        // Length bonus (simulated)
        if (post.content.length > 100) score += 10;

        // Verification bonus
        if (post.author.isVerified) score += 15;

        // Post Type base quality (Courses/Quizzes are high value)
        if (['COURSE', 'QUIZ', 'PROJECT'].includes(post.postType)) score += 15;

        return Math.min(score, 100);
    }

    // 4. Recency Score (0-100)
    private calculateRecencyScore(post: Post): number {
        const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);

        // Decay function: 100 at 0 hours, drops to ~50 at 24 hours
        if (ageInHours < 24) {
            return Math.max(0, 100 - (ageInHours * 2));
        } else {
            return Math.max(10, 50 - ((ageInHours - 24) / 4));
        }
    }

    // Main Scoring Function
    calculateScore(post: Post): {
        total: number;
        breakdown: { engagement: number; relevance: number; quality: number; recency: number }
    } {
        const engagement = this.calculateEngagementScore(post);
        const relevance = this.calculateRelevanceScore(post);
        const quality = this.calculateQualityScore(post);
        const recency = this.calculateRecencyScore(post);

        const total =
            (engagement * WEIGHTS.ENGAGEMENT) +
            (relevance * WEIGHTS.RELEVANCE) +
            (quality * WEIGHTS.QUALITY) +
            (recency * WEIGHTS.RECENCY);

        return {
            total,
            breakdown: { engagement, relevance, quality, recency }
        };
    }

    // Feed Generation
    generateFeed(posts: Post[]): Post[] {
        const scoredPosts = posts.map(post => {
            const scoreData = this.calculateScore(post);
            return { ...post, score: scoreData.total, scoreBreakdown: scoreData.breakdown };
        });

        return scoredPosts.sort((a: any, b: any) => b.score - a.score);
    }

    getUserProfile() {
        return this.userProfile;
    }
}

export const recommendationEngine = new RecommendationEngine();
