/**
 * Zod validators for Feynman Bounty endpoints.
 */

import { z } from 'zod';
import {
  MIN_BOUNTY_XP,
  MAX_BOUNTY_XP,
  MAX_BOUNTY_DURATION_HOURS,
} from '../utils/bountyEscrow';

export const createBountyBodySchema = z.object({
  subject: z.string().min(1).max(100),
  subjectColor: z
    .string()
    .regex(/^#?[0-9a-fA-F]{6}$/, 'subjectColor must be a hex color')
    .optional()
    .nullable(),
  questionText: z.string().min(10).max(2000),
  attachmentName: z.string().max(200).optional().nullable(),
  bountyXp: z.number().int().min(MIN_BOUNTY_XP).max(MAX_BOUNTY_XP),
  durationHours: z
    .number()
    .int()
    .min(1)
    .max(MAX_BOUNTY_DURATION_HOURS)
    .optional(),
});
export type CreateBountyBody = z.infer<typeof createBountyBodySchema>;

export const activeBountiesQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = typeof v === 'number' ? v : parseInt(v, 10);
      return Number.isFinite(n) ? n : undefined;
    })
    .pipe(z.number().int().min(1).max(50).optional()),
  subject: z.string().min(1).max(100).optional(),
});
export type ActiveBountiesQuery = z.infer<typeof activeBountiesQuerySchema>;
