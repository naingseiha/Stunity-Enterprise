/**
 * Zod validation schemas for post and comment endpoints.
 */

import { z } from 'zod';
import {
  POLL_MIN_OPTIONS,
  POLL_MAX_OPTIONS,
  POLL_OPTION_MAX_LEN,
  QUIZ_MIN_OPTIONS,
  QUIZ_MAX_OPTIONS,
  QUIZ_OPTION_MAX_LEN,
  QUIZ_QUESTION_MAX_LEN,
} from '../constants/limits';

/**
 * One quiz question. Validated server-side so a malformed/over-cap quiz can't be
 * created via any client. `correctAnswer` is a 0-based index into `options` and
 * is range-checked against the option count via superRefine below.
 */
const quizQuestionSchema = z
  .object({
    question: z.string().min(1, 'Question is required').max(QUIZ_QUESTION_MAX_LEN).trim(),
    options: z
      .array(z.string().min(1, 'Option cannot be empty').max(QUIZ_OPTION_MAX_LEN))
      .min(QUIZ_MIN_OPTIONS, `At least ${QUIZ_MIN_OPTIONS} options`)
      .max(QUIZ_MAX_OPTIONS, `At most ${QUIZ_MAX_OPTIONS} options`),
    correctAnswer: z.number().int().min(0),
    points: z.number().int().min(0).optional(),
    position: z.number().int().min(0).optional(),
    explanation: z.string().max(2000).optional().nullable(),
  })
  .passthrough() // tolerate extra authoring fields (id, etc.) without dropping them
  .superRefine((q, ctx) => {
    if (q.correctAnswer >= q.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctAnswer'],
        message: 'correctAnswer must index into options',
      });
    }
  });

const VISIBILITY = ['PUBLIC', 'SCHOOL', 'CLASS', 'PRIVATE'] as const;
const POST_TYPE = [
  'ARTICLE', 'QUESTION', 'ANNOUNCEMENT', 'POLL', 'ACHIEVEMENT', 'PROJECT',
  'COURSE', 'EVENT_CREATED', 'QUIZ', 'EXAM', 'ASSIGNMENT', 'RESOURCE', 'TUTORIAL',
  'RESEARCH', 'CLUB_CREATED', 'REFLECTION', 'COLLABORATION',
] as const;
const MEDIA_DISPLAY_MODE = ['AUTO', 'GRID', 'CAROUSEL', 'GALLERY', 'LANDSCAPE', 'PORTRAIT', 'SQUARE'] as const;

export const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000, 'Content must be at most 50,000 characters').trim(),
  title: z.string().max(500).trim().optional(),
  postType: z.enum(POST_TYPE).default('ARTICLE'),
  visibility: z.enum(VISIBILITY).default('SCHOOL'),
  mediaUrls: z.array(z.string().max(2048)).max(20).default([]),
  mediaDisplayMode: z.enum(MEDIA_DISPLAY_MODE).default('AUTO'),
  mediaMetadata: z.array(z.object({
    uri: z.string().max(2048).optional(),
    thumbnailUrl: z.string().max(2048).optional(),
    posterUrl: z.string().max(2048).optional(),
    hlsUrl: z.string().max(2048).optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    aspectRatio: z.number().positive().optional(),
    type: z.string().max(32).optional(),
    mimeType: z.string().max(128).optional(),
    duration: z.number().positive().optional(),
    blurhash: z.string().max(256).optional(),
  })).max(20).default([]),
  mediaAspectRatio: z.number().positive().optional(),
  topicTags: z.array(z.string().max(50)).max(20).optional(),
  deadline: z.string().optional(),
  pollOptions: z
    .array(z.string().min(1, 'Option cannot be empty').max(POLL_OPTION_MAX_LEN))
    .min(POLL_MIN_OPTIONS, `A poll needs at least ${POLL_MIN_OPTIONS} options`)
    .max(POLL_MAX_OPTIONS, `A poll can have at most ${POLL_MAX_OPTIONS} options`)
    .optional(),
  pollSettings: z.object({
    duration: z.number().min(1).max(720).optional(),
  }).optional(),
  quizData: z.object({
    questions: z.array(quizQuestionSchema).min(1, 'A quiz needs at least one question'),
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
