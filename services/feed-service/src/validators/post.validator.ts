/**
 * Zod validation schemas for post and comment endpoints.
 */

import { z } from 'zod';

const VISIBILITY = ['PUBLIC', 'SCHOOL', 'PRIVATE'] as const;
const POST_TYPE = [
  'ARTICLE', 'QUESTION', 'ANNOUNCEMENT', 'POLL', 'ACHIEVEMENT', 'PROJECT',
  'COURSE', 'EVENT', 'QUIZ', 'EXAM', 'ASSIGNMENT', 'RESOURCE', 'TUTORIAL',
  'RESEARCH', 'CLUB_ANNOUNCEMENT', 'REFLECTION', 'COLLABORATION',
] as const;
const MEDIA_DISPLAY_MODE = ['AUTO', 'GRID', 'CAROUSEL', 'GALLERY'] as const;

export const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000, 'Content must be at most 50,000 characters').trim(),
  title: z.string().max(500).trim().optional(),
  postType: z.enum(POST_TYPE).default('ARTICLE'),
  visibility: z.enum(VISIBILITY).default('SCHOOL'),
  mediaUrls: z.array(z.string().max(2048)).max(20).default([]),
  mediaDisplayMode: z.enum(MEDIA_DISPLAY_MODE).default('AUTO'),
  topicTags: z.array(z.string().max(50)).max(20).optional(),
  deadline: z.string().optional(),
  pollOptions: z.array(z.string().min(1).max(200)).max(10).optional(),
  pollSettings: z.object({
    duration: z.number().min(1).max(720).optional(),
  }).optional(),
  quizData: z.object({
    questions: z.array(z.any()),
    timeLimit: z.number().min(0).optional(),
    passingScore: z.number().min(0).max(100).optional(),
    totalPoints: z.number().min(0).optional(),
    resultsVisibility: z.string().optional(),
    shuffleQuestions: z.boolean().optional(),
    shuffleAnswers: z.boolean().optional(),
    maxAttempts: z.number().nullable().optional(),
    showReview: z.boolean().optional(),
    showExplanations: z.boolean().optional(),
  }).optional(),
  questionBounty: z.number().int().min(0).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Comment must be at most 5,000 characters').trim(),
  parentId: z.string().optional().nullable(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
