/**
 * Zod validators for FocusReel authoring — mirrors the pattern in
 * recall.validator.ts (application-level validation, not Prisma-enforced).
 *
 * pausePoints are stored as Json and consumed directly by the mobile player,
 * so they're validated deeply here (notably: correctAnswer must index into
 * options) — a malformed pause-point would otherwise crash the reel card.
 */

import { z } from 'zod';

const pausePointSchema = z
  .object({
    // Seconds into the video at which to pause and ask.
    time: z.number().min(0).max(86_400),
    question: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    correctAnswer: z.number().int().min(0),
    xp: z.number().int().min(0).max(100).optional().default(15),
  })
  .refine((p) => p.correctAnswer < p.options.length, {
    message: 'correctAnswer must be a valid index into options',
    path: ['correctAnswer'],
  });

const httpUrl = z
  .string()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), { message: 'must be an http(s) URL' });

export const createFocusReelSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  subject: z.string().trim().min(1).max(40),
  videoUrl: httpUrl,
  thumbnailUrl: httpUrl.optional(),
  // Duration in seconds; required by the model and used for the progress bar.
  duration: z.number().int().min(1).max(36_000),
  // Optional — a reel can ship with zero pause-points (pure watch), but when
  // present each is fully validated. Defaults to [] so the Json column is never
  // null/undefined.
  pausePoints: z.array(pausePointSchema).max(20).optional().default([]),
});

export type CreateFocusReelBody = z.infer<typeof createFocusReelSchema>;

/**
 * Lightweight "knowledge card" — a single quiz question with no video. This is
 * the high-supply primitive: fast to author, surfaces as a QUIZ_QUESTION reel,
 * and (via the reel-answer loop + seeding) feeds spaced repetition + mastery.
 */
export const createQuestionCardSchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    // For a True/False card the client may omit options (the route forces the
    // ['TRUE','FALSE'] sentinel); for an MCQ they're required (2–4 choices).
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(4).optional(),
    correctAnswer: z.number().int().min(0),
    explanation: z.string().trim().max(1000).optional(),
    subject: z.string().trim().min(1).max(40),
    points: z.number().int().min(1).max(100).optional().default(10),
    // 'TF' = one-tap True/False; 'CLOZE' = fill-in-the-blank (question must
    // contain a blank — a run of ≥3 underscores); 'MCQ' (default) = multiple choice.
    format: z.enum(['MCQ', 'TF', 'CLOZE']).optional().default('MCQ'),
  })
  .refine((c) => c.format === 'TF' || (!!c.options && c.options.length >= 2), {
    message: 'options are required for a multiple-choice or cloze card',
    path: ['options'],
  })
  .refine((c) => c.format !== 'CLOZE' || /_{3,}/.test(c.question), {
    message: 'a cloze card’s question must contain a blank (e.g. ___)',
    path: ['question'],
  })
  .refine(
    (c) => (c.format === 'TF' ? c.correctAnswer <= 1 : c.correctAnswer < (c.options?.length ?? 0)),
    { message: 'correctAnswer must be a valid index into options', path: ['correctAnswer'] },
  );

export type CreateQuestionCardBody = z.infer<typeof createQuestionCardSchema>;
