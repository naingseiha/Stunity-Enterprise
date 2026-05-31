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

// ─────────────────────────────────────────────────────────
// Aha! reaction toggle — keeps BountyReply.ahaCount in sync with the
// BountyAha rows in the same transaction so the denormalized count
// never drifts. Toggle semantics: existing Aha → remove + decrement;
// no Aha → insert + increment.
// ─────────────────────────────────────────────────────────

export interface ToggleAhaResult {
  added: boolean;        // true = inserted, false = removed
  ahaCount: number;      // new denormalized count
}

export async function toggleAha(
  prisma: PrismaClient,
  args: { replyId: string; userId: string },
): Promise<ToggleAhaResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.bountyAha.findUnique({
      where: { replyId_userId: { replyId: args.replyId, userId: args.userId } },
      select: { id: true },
    });

    if (existing) {
      await tx.bountyAha.delete({ where: { id: existing.id } });
      const reply = await tx.bountyReply.update({
        where: { id: args.replyId },
        data: { ahaCount: { decrement: 1 } },
        select: { ahaCount: true },
      });
      return { added: false, ahaCount: reply.ahaCount };
    }

    await tx.bountyAha.create({
      data: { replyId: args.replyId, userId: args.userId },
    });
    const reply = await tx.bountyReply.update({
      where: { id: args.replyId },
      data: { ahaCount: { increment: 1 } },
      select: { ahaCount: true },
    });
    return { added: true, ahaCount: reply.ahaCount };
  });
}

// ─────────────────────────────────────────────────────────
// Award flow — atomic XP credit to winning tutor + state transition.
// Only callable by the asker. Idempotent at the bounty level (re-
// awarding throws BountyNotAwardableError because status != ACTIVE).
// ─────────────────────────────────────────────────────────

export class BountyNotAwardableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BountyNotAwardableError';
  }
}

export interface AwardResult {
  bountyId: string;
  winnerReplyId: string;
  winnerTutorId: string;
  xpAwarded: number;
  awardedAt: Date;
}

export async function awardBountyAtomic(
  prisma: PrismaClient,
  args: { bountyId: string; askerId: string; replyId: string },
): Promise<AwardResult> {
  return prisma.$transaction(async (tx) => {
    const bounty = await tx.bounty.findUnique({
      where: { id: args.bountyId },
      select: {
        id: true,
        askerId: true,
        bountyXp: true,
        status: true,
      },
    });
    if (!bounty) {
      throw new BountyNotAwardableError('Bounty not found');
    }
    if (bounty.askerId !== args.askerId) {
      throw new BountyNotAwardableError(
        'Only the asker can award this bounty',
      );
    }
    if (bounty.status !== 'ACTIVE') {
      throw new BountyNotAwardableError(
        `Bounty is ${bounty.status}, cannot award`,
      );
    }

    const reply = await tx.bountyReply.findUnique({
      where: { id: args.replyId },
      select: { id: true, bountyId: true, tutorId: true },
    });
    if (!reply || reply.bountyId !== args.bountyId) {
      throw new BountyNotAwardableError(
        'Reply does not belong to this bounty',
      );
    }
    if (reply.tutorId === args.askerId) {
      throw new BountyNotAwardableError(
        "Asker cannot award their own reply",
      );
    }

    const awardedAt = new Date();

    // 1) Mark reply as winner
    await tx.bountyReply.update({
      where: { id: reply.id },
      data: { isWinner: true },
    });

    // 2) Transition bounty
    await tx.bounty.update({
      where: { id: bounty.id },
      data: {
        status: 'AWARDED',
        winnerReplyId: reply.id,
        awardedAt,
      },
    });

    // 3) Credit XP to winning tutor (upsert handles brand-new tutors)
    await tx.userStats.upsert({
      where: { userId: reply.tutorId },
      create: { userId: reply.tutorId, xp: bounty.bountyXp },
      update: { xp: { increment: bounty.bountyXp } },
    });

    return {
      bountyId: bounty.id,
      winnerReplyId: reply.id,
      winnerTutorId: reply.tutorId,
      xpAwarded: bounty.bountyXp,
      awardedAt,
    };
  });
}

// ─────────────────────────────────────────────────────────
// Master Explainer tier — derived from total winning replies. Real
// product would compute per-subject; prototype computes globally so
// a single SQL count suffices.
// ─────────────────────────────────────────────────────────

export type MasterExplainerTier = 'bronze' | 'silver' | 'gold';

export const TIER_THRESHOLDS = {
  bronze: 10,
  silver: 50,
  gold: 200,
} as const;

export async function computeMasterExplainerTier(
  prisma: PrismaClient,
  tutorId: string,
  subject?: string,
): Promise<MasterExplainerTier | null> {
  const wins = await prisma.bountyReply.count({
    where: {
      tutorId,
      isWinner: true,
      ...(subject ? { bounty: { subject } } : {}),
    },
  });
  if (wins >= TIER_THRESHOLDS.gold) return 'gold';
  if (wins >= TIER_THRESHOLDS.silver) return 'silver';
  if (wins >= TIER_THRESHOLDS.bronze) return 'bronze';
  return null;
}

export interface TutorSubjectPair {
  tutorId: string;
  subject: string;
}

/**
 * Batch tier lookup — returns Map<"tutorId:subject", tier | null> for use in
 * list endpoints to compute subject-specific tiers without N+1 queries.
 */
export async function computeMasterExplainerTiersBatch(
  prisma: PrismaClient,
  pairs: TutorSubjectPair[],
): Promise<Map<string, MasterExplainerTier | null>> {
  const result = new Map<string, MasterExplainerTier | null>();
  if (pairs.length === 0) return result;

  for (const p of pairs) {
    result.set(`${p.tutorId}:${p.subject}`, null);
  }

  const tutorIds = Array.from(new Set(pairs.map((p) => p.tutorId)));
  const subjects = Array.from(new Set(pairs.map((p) => p.subject)));

  const wins = await prisma.bountyReply.findMany({
    where: {
      tutorId: { in: tutorIds },
      isWinner: true,
      bounty: {
        subject: { in: subjects },
      },
    },
    select: {
      tutorId: true,
      bounty: {
        select: { subject: true },
      },
    },
  });

  const counts = new Map<string, number>();
  for (const w of wins) {
    if (!w.bounty) continue;
    const key = `${w.tutorId}:${w.bounty.subject}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  for (const p of pairs) {
    const key = `${p.tutorId}:${p.subject}`;
    const winsCount = counts.get(key) || 0;
    if (winsCount >= TIER_THRESHOLDS.gold) result.set(key, 'gold');
    else if (winsCount >= TIER_THRESHOLDS.silver) result.set(key, 'silver');
    else if (winsCount >= TIER_THRESHOLDS.bronze) result.set(key, 'bronze');
  }

  return result;
}


export async function sweepExpiredBounties(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const expiredBounties = await prisma.bounty.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      askerId: true,
      bountyXp: true,
    },
  });

  if (expiredBounties.length === 0) return 0;

  let sweptCount = 0;
  for (const bounty of expiredBounties) {
    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.bounty.findUnique({
          where: { id: bounty.id },
          select: { status: true },
        });

        if (!fresh || fresh.status !== 'ACTIVE') return;

        await tx.bounty.update({
          where: { id: bounty.id },
          data: { status: 'EXPIRED' },
        });

        await tx.userStats.upsert({
          where: { userId: bounty.askerId },
          create: { userId: bounty.askerId, xp: bounty.bountyXp },
          update: { xp: { increment: bounty.bountyXp } },
        });
      });

      const { feedCache } = await import('../redis');
      await feedCache.invalidateUser(bounty.askerId);

      sweptCount++;
    } catch (err) {
      console.error(`❌ [sweepExpiredBounties] Failed to sweep bounty ${bounty.id}:`, err);
    }
  }

  return sweptCount;
}

export async function cancelBountyWithRefund(
  prisma: PrismaClient,
  args: { bountyId: string; askerId: string },
): Promise<{ id: string; status: string; refundedXp: number }> {
  return prisma.$transaction(async (tx) => {
    const bounty = await tx.bounty.findUnique({
      where: { id: args.bountyId },
      select: {
        id: true,
        askerId: true,
        bountyXp: true,
        status: true,
      },
    });

    if (!bounty) {
      throw new Error('Bounty not found');
    }
    if (bounty.askerId !== args.askerId) {
      throw new Error('Only the asker can cancel this bounty');
    }
    if (bounty.status !== 'ACTIVE') {
      throw new Error(`Bounty is ${bounty.status}, cannot cancel`);
    }

    await tx.bounty.update({
      where: { id: bounty.id },
      data: { status: 'CANCELLED' },
    });

    await tx.userStats.upsert({
      where: { userId: bounty.askerId },
      create: { userId: bounty.askerId, xp: bounty.bountyXp },
      update: { xp: { increment: bounty.bountyXp } },
    });

    return {
      id: bounty.id,
      status: 'CANCELLED',
      refundedXp: bounty.bountyXp,
    };
  });
}

