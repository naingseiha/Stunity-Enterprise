/**
 * Bounty Routes — REST surface for Feynman Bounties.
 *
 *   GET  /bounties/active     list of active bounties for feed injection
 *   POST /bounties            create a bounty (with atomic XP stake)
 *
 * Deferred (next session): POST /bounties/:id/replies (submit answer),
 * POST /bounties/:id/replies/:rid/aha (Aha! reaction), POST
 * /bounties/:id/award (asker picks winner — atomic XP transfer to tutor),
 * background job for expiration + refund.
 */

import { Router, Response } from 'express';
import { prisma } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  createBountyWithEscrow,
  hoursLeftUntil,
  InsufficientXpError,
} from '../utils/bountyEscrow';
import {
  activeBountiesQuerySchema,
  createBountyBodySchema,
} from '../validators/bounty.validator';

const router = Router();

const DEFAULT_ACTIVE_LIMIT = 10;

// ─────────────────────────────────────────────────────────
// GET /bounties/active
// Returns active bounties shaped to match the mobile FeynmanBounty type
// (apps/mobile/src/types/index.ts:FeynmanBounty).
// ─────────────────────────────────────────────────────────
router.get(
  '/bounties/active',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const parsed = activeBountiesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query',
          details: parsed.error.flatten(),
        });
      }
      const { limit, subject } = parsed.data;
      const now = new Date();

      const bounties = await prisma.bounty.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
          ...(subject ? { subject } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit ?? DEFAULT_ACTIVE_LIMIT,
        include: {
          asker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            },
          },
          replies: {
            select: {
              tutorId: true,
              ahaCount: true,
              tutor: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
            orderBy: { ahaCount: 'desc' },
          },
        },
      });

      const shaped = bounties.map((b) => {
        const tutorsWorking = new Set(b.replies.map((r) => r.tutorId)).size;
        const answersCount = b.replies.length;
        const top = b.replies[0]; // highest ahaCount; undefined if none

        const askerName =
          `${b.asker.lastName ?? ''} ${b.asker.firstName ?? ''}`.trim() ||
          'Unknown';

        return {
          id: b.id,
          asker: {
            id: b.asker.id,
            name: askerName,
            avatarUrl: b.asker.profilePictureUrl ?? undefined,
            // gradeLabel: derived from academic profile later — undefined
            // for now is fine; mobile renders without it gracefully.
          },
          subject: b.subject,
          subjectColor: b.subjectColor ?? undefined,
          questionText: b.questionText,
          attachmentName: b.attachmentName ?? undefined,
          bountyXp: b.bountyXp,
          hoursLeft: hoursLeftUntil(b.expiresAt, now),
          tutorsWorking,
          answersCount,
          topTutor: top
            ? {
                id: top.tutor.id,
                name:
                  `${top.tutor.lastName ?? ''} ${top.tutor.firstName ?? ''}`.trim() ||
                  'Tutor',
                // Tier: TBD. Compute from win count once that's tracked.
                // Mobile MasterExplainerBadge accepts undefined gracefully
                // (component just renders without the badge in that case).
                tier: 'bronze' as const,
              }
            : undefined,
          createdAt: b.createdAt.toISOString(),
        };
      });

      res.json({ success: true, data: shaped });
    } catch (error: any) {
      console.error('[GET /bounties/active]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bounties',
        details: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /bounties — create a bounty with atomic XP stake
// ─────────────────────────────────────────────────────────
router.post(
  '/bounties',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const parsed = createBountyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }

      // Normalize subjectColor: store with leading '#' if present
      const subjectColor = parsed.data.subjectColor
        ? parsed.data.subjectColor.startsWith('#')
          ? parsed.data.subjectColor
          : `#${parsed.data.subjectColor}`
        : null;

      const created = await createBountyWithEscrow(prisma, {
        askerId: userId,
        subject: parsed.data.subject,
        subjectColor,
        questionText: parsed.data.questionText,
        attachmentName: parsed.data.attachmentName ?? null,
        bountyXp: parsed.data.bountyXp,
        durationHours: parsed.data.durationHours,
      });

      res.status(201).json({
        success: true,
        data: {
          id: created.id,
          status: created.status,
          bountyXp: created.bountyXp,
          expiresAt: created.expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      if (error instanceof InsufficientXpError) {
        return res.status(409).json({
          success: false,
          error: 'Insufficient XP',
          details: { have: error.have, need: error.need },
        });
      }
      console.error('[POST /bounties]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create bounty',
        details: error.message,
      });
    }
  },
);

export default router;
