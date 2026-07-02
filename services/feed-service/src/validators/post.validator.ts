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
import { normalizeQuestionType, resolveCorrectIndex } from '../utils/quizQuestionRows';

/**
 * One quiz question, in the shape clients actually author (QuizForm sends
 * `text` + string correctAnswer; legacy/AI payloads send `question` and/or a
 * numeric index; six question types exist). Validated server-side so a
 * malformed/over-cap quiz can't be created via any client, with type-aware
 * correctness checks in superRefine below.
 */
const quizQuestionSchema = z
  .object({
    id: z.string().max(100).optional(),
    question: z.string().max(QUIZ_QUESTION_MAX_LEN).trim().optional(),
    text: z.string().max(QUIZ_QUESTION_MAX_LEN).trim().optional(),
    type: z.string().max(32).optional(),
    options: z
      .array(z.string().max(QUIZ_OPTION_MAX_LEN))
      .max(QUIZ_MAX_OPTIONS, `At most ${QUIZ_MAX_OPTIONS} options`)
      .optional(),
    correctAnswer: z.union([z.number().int().min(0), z.string().max(QUIZ_OPTION_MAX_LEN)]),
    points: z.number().int().min(0).optional(),
    position: z.number().int().min(0).optional(),
    explanation: z.string().max(2000).optional().nullable(),
    topicId: z.string().max(64).optional().nullable(),
  })
  .passthrough() // tolerate extra authoring fields without dropping them
  .superRefine((q, ctx) => {
    const text = (q.text ?? q.question ?? '').trim();
    if (!text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['question'],
        message: 'Question is required',
      });
    }

    const type = normalizeQuestionType(q.type);
    if (type === 'MULTIPLE_CHOICE') {
      const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (options.length < QUIZ_MIN_OPTIONS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: `At least ${QUIZ_MIN_OPTIONS} options`,
        });
      } else if (resolveCorrectIndex(q.correctAnswer, options) === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctAnswer'],
          message: 'correctAnswer must index into options',
        });
      }
    } else if (type === 'TRUE_FALSE') {
      const answer = String(q.correctAnswer).trim().toLowerCase();
      if (answer !== 'true' && answer !== 'false' && answer !== '0' && answer !== '1') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctAnswer'],
          message: 'correctAnswer must be true or false',
        });
      }
    } else if (type === 'SHORT_ANSWER' || type === 'FILL_IN_BLANK') {
      if (!String(q.correctAnswer ?? '').trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correctAnswer'],
          message: 'An answer is required',
        });
      }
    } else if (type === 'ORDERING') {
      const options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (options.length < QUIZ_MIN_OPTIONS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: `At least ${QUIZ_MIN_OPTIONS} items to order`,
        });
      }
    } else if (type === 'MATCHING') {
      const pairs = (q.options ?? []).filter((o) => o.split(':::').filter((p) => p.trim()).length === 2);
      if (pairs.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: 'At least one left:::right pair',
        });
      }
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
