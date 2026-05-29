/**
 * Zod validators for Recall Cards endpoints — mirrors the pattern in
 * post.validator.ts (application-level validation, not Prisma-enforced).
 */

import { z } from 'zod';

export const reviewCardBodySchema = z.object({
  grade: z.enum(['again', 'good', 'easy']),
});
export type ReviewCardBody = z.infer<typeof reviewCardBodySchema>;

export const dueCardsQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = typeof v === 'number' ? v : parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    })
    .pipe(z.number().int().min(1).max(50).optional()),
  // Optional subject filter — matches RecallCard.subject denorm column.
  subject: z
    .string()
    .min(1)
    .max(40)
    .optional(),
});
export type DueCardsQuery = z.infer<typeof dueCardsQuerySchema>;
