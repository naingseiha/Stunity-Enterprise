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
