/**
 * Zod validators for Quiz War endpoints.
 */

import { z } from 'zod';

export const joinQuizWarBodySchema = z.object({
  team: z.enum(['A', 'B']),
});
export type JoinQuizWarBody = z.infer<typeof joinQuizWarBodySchema>;
