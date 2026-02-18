/**
 * Shared Post Transformer
 * 
 * Single source of truth for converting backend post responses
 * into the mobile app's Post type. Eliminates duplicated 
 * transformation logic across feedStore, FeedScreen polling,
 * and realtime handlers.
 */

import { Post } from '@/types';

/**
 * Transform a raw backend post object into the mobile app Post type.
 * Returns null if transformation fails (caller should filter nulls).
 */
export function transformPost(post: any): Post | null {
    try {
        return {
            id: post.id,
            author: {
                id: post.author?.id,
                firstName: post.author?.firstName,
                lastName: post.author?.lastName,
                name: `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim(),
                profilePictureUrl: post.author?.profilePictureUrl,
                role: post.author?.role,
                isVerified: post.author?.isVerified,
            },
            content: post.content,
            title: post.title,
            postType: post.postType || 'ARTICLE',
            visibility: post.visibility || 'PUBLIC',
            mediaUrls: post.mediaUrls || [],
            mediaDisplayMode: post.mediaDisplayMode || 'AUTO',
            likes: post.likesCount || post._count?.likes || 0,
            comments: post.commentsCount || post._count?.comments || 0,
            shares: post.sharesCount || 0,
            isLiked: post.isLikedByMe || post.isLiked || false,
            isBookmarked: post.isBookmarked || false,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            // E-Learning metadata
            topicTags: post.topicTags || post.tags || [],
            tags: post.tags || post.topicTags || [],
            // Poll fields
            pollOptions: post.pollOptions?.map((opt: any) => ({
                id: opt.id,
                text: opt.text,
                votes: opt.votes || opt._count?.votes || 0,
            })),
            userVotedOptionId: post.userVotedOptionId,
            // Quiz fields
            quizData: post.postType === 'QUIZ' && post.quiz ? {
                id: post.quiz.id,
                questions: post.quiz.questions || [],
                timeLimit: post.quiz.timeLimit,
                passingScore: post.quiz.passingScore,
                totalPoints: post.quiz.totalPoints || post.quiz.questions?.reduce((sum: number, q: any) => sum + (q.points || 0), 0) || 0,
                resultsVisibility: post.quiz.resultsVisibility,
                userAttempt: post.quiz.userAttempt ? {
                    id: post.quiz.userAttempt.id,
                    score: post.quiz.userAttempt.score,
                    passed: post.quiz.userAttempt.passed,
                    pointsEarned: post.quiz.userAttempt.pointsEarned,
                    submittedAt: post.quiz.userAttempt.submittedAt,
                } : undefined,
            } : undefined,
            learningMeta: post.learningMeta || {
                progress: post.progress,
                totalSteps: post.totalSteps,
                completedSteps: post.completedSteps,
                difficulty: post.difficulty,
                isLive: post.isLive,
                liveViewers: post.liveViewers,
                deadline: post.deadline,
                isUrgent: post.isUrgent,
                answerCount: post.answerCount,
                isAnswered: post.isAnswered,
                studyGroupId: post.studyGroupId,
                studyGroupName: post.studyGroupName,
                xpReward: post.xpReward,
                estimatedMinutes: post.estimatedMinutes,
                participantCount: post.participantCount,
                hasCode: post.hasCode,
                hasPdf: post.hasPdf,
                hasFormula: post.hasFormula,
            },
        } as Post;
    } catch (error: any) {
        console.error('❌ [transformPost] Error transforming post:', post?.id, error);
        return null;
    }
}

/**
 * Transform an array of backend posts, filtering out any that fail transformation.
 */
export function transformPosts(posts: any[]): Post[] {
    return posts.map(transformPost).filter(Boolean) as Post[];
}
