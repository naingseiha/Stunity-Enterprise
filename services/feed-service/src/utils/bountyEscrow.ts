/**
 * Bounty XP escrow — atomic stake / award / refund.
 *
 * The Bounty.bountyXp column is the source of truth for how much XP is
 * locked. The asker's UserStats.xp is debited at creation and credited
 * back on cancel / expire. On award, the credit goes to the winning
 * tutor instead.
 *
 * Race-safety: Prisma's conditional `update.where` (extended-where on a
 * non-unique field) lets us debit XP only when the user actually has
 * enough, in a single SQL UPDATE. Concurrent attempts that would
 * underflow throw P2025 ("record not found") — cleaner than a stale
 * read + race window.
 */

import type { PrismaClient, Prisma } from '@prisma/client';

export const MIN_BOUNTY_XP = 5;
export const MAX_BOUNTY_XP = 1000;
export const DEFAULT_BOUNTY_DURATION_HOURS = 24;
export const MAX_BOUNTY_DURATION_HOURS = 168; // 1 week

export class InsufficientXpError extends Error {
  constructor(public have: number, public need: number) {
    super(`Insufficient XP: have ${have}, need ${need}`);
    this.name = 'InsufficientXpError';
  }
}

export interface CreateBountyArgs {
  askerId: string;
  subject: string;
  subjectColor?: string | null;
  questionText: string;
  attachmentName?: string | null;
  bountyXp: number;
  durationHours?: number;
}

export interface CreatedBounty {
  id: string;
  status: string;
  expiresAt: Date;
  bountyXp: number;
}

/**
 * Atomically: validate XP, debit the asker, create the bounty.
 * Throws InsufficientXpError if the asker can't afford the stake.
 * Throws Error if bountyXp or durationHours are out of bounds.
 */
export async function createBountyWithEscrow(
  prisma: PrismaClient,
  args: CreateBountyArgs,
): Promise<CreatedBounty> {
  if (args.bountyXp < MIN_BOUNTY_XP || args.bountyXp > MAX_BOUNTY_XP) {
    throw new Error(
      `bountyXp must be between ${MIN_BOUNTY_XP} and ${MAX_BOUNTY_XP}`,
    );
  }
  const duration = args.durationHours ?? DEFAULT_BOUNTY_DURATION_HOURS;
  if (duration < 1 || duration > MAX_BOUNTY_DURATION_HOURS) {
    throw new Error(
      `durationHours must be between 1 and ${MAX_BOUNTY_DURATION_HOURS}`,
    );
  }

  const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    // Race-safe debit: only succeeds if xp >= bountyXp. Otherwise the
    // record-not-found error is mapped to InsufficientXpError below.
    try {
      await tx.userStats.update({
        where: {
          userId: args.askerId,
          xp: { gte: args.bountyXp },
        } as Prisma.UserStatsWhereUniqueInput,
        data: { xp: { decrement: args.bountyXp } },
      });
    } catch (err: any) {
      // P2025 = "Record to update not found" — either user has no stats
      // row yet, or xp < bountyXp. Read to disambiguate the error.
      const stats = await tx.userStats.findUnique({
        where: { userId: args.askerId },
        select: { xp: true },
      });
      throw new InsufficientXpError(stats?.xp ?? 0, args.bountyXp);
    }

    const bounty = await tx.bounty.create({
      data: {
        askerId: args.askerId,
        subject: args.subject,
        subjectColor: args.subjectColor ?? null,
        questionText: args.questionText,
        attachmentName: args.attachmentName ?? null,
        bountyXp: args.bountyXp,
        expiresAt,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        bountyXp: true,
      },
    });

    return bounty as CreatedBounty;
  });
}

/**
 * Hours-remaining helper for the API response — matches the mobile
 * FeynmanBounty.hoursLeft semantics (ceil, floor 0).
 */
export function hoursLeftUntil(expiresAt: Date, now: Date = new Date()): number {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60));
}
