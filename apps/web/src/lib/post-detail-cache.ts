/**
 * Instant post-detail paint: seed from feed cards, revalidate in background.
 */

import { buildRouteDataCacheKey, readRouteDataCache, writeRouteDataCache } from '@/lib/route-data-cache';

const POST_DETAIL_TTL_MS = 5 * 60 * 1000;

export function postDetailCacheKey(postId: string) {
  return buildRouteDataCacheKey('feed', 'post-detail', postId);
}

export function readPostDetailCache<T>(postId: string): T | null {
  return readRouteDataCache<T>(postDetailCacheKey(postId), POST_DETAIL_TTL_MS) ?? null;
}

export function writePostDetailCache<T>(postId: string, data: T) {
  writeRouteDataCache(postDetailCacheKey(postId), data);
}

/** Normalize a feed PostCard / FeedPost shape into a detail-page Post seed. */
export function seedPostDetailFromFeedCard(post: {
  id: string;
  title?: string;
  content: string;
  postType: string;
  visibility: string;
  createdAt: string;
  likesCount: number;
  valuesCount?: number;
  commentsCount: number;
  sharesCount?: number;
  viewsCount?: number;
  isLiked?: boolean;
  myReaction?: string | null;
  reactionCounts?: Record<string, number>;
  isValued?: boolean;
  isBookmarked?: boolean;
  mediaUrls?: string[];
  mediaDisplayMode?: string;
  resourceUrl?: string;
  studyClubId?: string;
  questionBounty?: number;
  topicTags?: string[];
  assignmentDueDate?: string;
  assignmentPoints?: number;
  courseCode?: string;
  courseLevel?: string;
  examDate?: string;
  examDuration?: number;
  examTotalPoints?: number;
  examPassingScore?: number;
  announcementUrgency?: string;
  tutorialDifficulty?: string;
  projectStatus?: string;
  projectDeadline?: string;
  researchField?: string;
  pollOptions?: Array<{ id: string; text: string; votes?: number }>;
  userVotedOptionId?: string;
  quizData?: { questions?: unknown[]; timeLimit?: number; passingScore?: number };
  quiz?: { id: string };
  userAttempt?: { score: number; passed: boolean } | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage?: string | null;
    profilePictureUrl?: string | null;
    role?: string;
  };
}) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    postType: post.postType || 'ARTICLE',
    visibility: post.visibility || 'PUBLIC',
    mediaUrls: post.mediaUrls || [],
    mediaDisplayMode: post.mediaDisplayMode || 'AUTO',
    createdAt: post.createdAt,
    updatedAt: post.createdAt,
    likesCount: post.likesCount ?? 0,
    valuesCount: post.valuesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    sharesCount: post.sharesCount ?? 0,
    viewsCount: post.viewsCount ?? 0,
    isLikedByMe: Boolean(post.isLiked || post.myReaction),
    myReaction: post.myReaction ?? (post.isLiked ? 'LIKE' : null),
    reactionCounts: post.reactionCounts ?? {},
    isValuedByMe: Boolean(post.isValued),
    isBookmarkedByMe: Boolean(post.isBookmarked),
    studyClubId: post.studyClubId ?? null,
    resourceUrl: post.resourceUrl ?? null,
    questionBounty: post.questionBounty,
    topicTags: post.topicTags,
    assignmentDueDate: post.assignmentDueDate ?? null,
    assignmentPoints: post.assignmentPoints ?? null,
    courseCode: post.courseCode ?? null,
    courseLevel: post.courseLevel ?? null,
    examDate: post.examDate ?? null,
    examDuration: post.examDuration ?? null,
    examTotalPoints: post.examTotalPoints ?? null,
    examPassingScore: post.examPassingScore ?? null,
    announcementUrgency: post.announcementUrgency ?? null,
    tutorialDifficulty: post.tutorialDifficulty ?? null,
    projectStatus: post.projectStatus ?? null,
    projectDeadline: post.projectDeadline ?? null,
    researchField: post.researchField ?? null,
    pollOptions: post.pollOptions?.map((o) => ({
      id: o.id,
      text: o.text,
      _count: { votes: o.votes ?? 0 },
    })),
    userVotedOptionId: post.userVotedOptionId,
    quiz: post.quiz?.id
      ? {
          id: post.quiz.id,
          questions: post.quizData?.questions,
          timeLimit: post.quizData?.timeLimit,
          passingScore: post.quizData?.passingScore,
          userAttempt: post.userAttempt ?? null,
        }
      : post.quizData
        ? {
            id: post.id,
            questions: post.quizData.questions,
            timeLimit: post.quizData.timeLimit,
            passingScore: post.quizData.passingScore,
            userAttempt: post.userAttempt ?? null,
          }
        : undefined,
    author: {
      id: post.author.id,
      firstName: post.author.firstName,
      lastName: post.author.lastName,
      profilePictureUrl: post.author.profilePictureUrl ?? post.author.profileImage ?? null,
      role: post.author.role || 'STUDENT',
    },
  };
}
