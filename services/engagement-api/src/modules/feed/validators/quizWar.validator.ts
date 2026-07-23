import { z } from 'zod';

export const joinQuizWarBodySchema = z.object({
  team: z.enum(['A', 'B']),
});
export type JoinQuizWarBody = z.infer<typeof joinQuizWarBodySchema>;

export const createQuizWarBodySchema = z.object({
  subject: z.string().min(1),
  startsAt: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
  endsAt: z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), z.date()),
  teamAName: z.string().min(1),
  teamAColor: z.string().min(1),
  teamBName: z.string().min(1),
  teamBColor: z.string().min(1),
  rewardXp: z.number().int().positive().optional(),
  totalRounds: z.number().int().positive().optional(),
});
export type CreateQuizWarBody = z.infer<typeof createQuizWarBodySchema>;

export const submitAnswerBodySchema = z.object({
  isCorrect: z.boolean(),
});
export type SubmitAnswerBody = z.infer<typeof submitAnswerBodySchema>;

