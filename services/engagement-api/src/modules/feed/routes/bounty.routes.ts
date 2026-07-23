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
  toggleAha,
  awardBountyAtomic,
  BountyNotAwardableError,
  computeMasterExplainerTiersBatch,
  cancelBountyWithRefund,
} from '../utils/bountyEscrow';
import { feedCache } from '../redis';
import {
  activeBountiesQuerySchema,
  createBountyBodySchema,
  createReplyBodySchema,
  awardBountyBodySchema,
  repliesQuerySchema,
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

      // Batch tier lookup for all top tutors — one grouped query
      // instead of N round-trips.
      const tutorSubjectPairs = bounties
        .map((b) => {
          const tutorId = b.replies[0]?.tutor.id;
          if (!tutorId) return null;
          return { tutorId, subject: b.subject };
        })
        .filter((pair): pair is { tutorId: string; subject: string } => !!pair);

      const tierByTutor = await computeMasterExplainerTiersBatch(
        prisma,
        tutorSubjectPairs,
      );

      const shaped = bounties.map((b) => {
        const tutorsWorking = new Set(b.replies.map((r) => r.tutorId)).size;
        const answersCount = b.replies.length;
        const top = b.replies[0]; // highest ahaCount; undefined if none

        const askerName =
          `${b.asker.lastName ?? ''} ${b.asker.firstName ?? ''}`.trim() ||
          'Unknown';

        const lookupKey = top ? `${top.tutor.id}:${b.subject}` : '';

        return {
          id: b.id,
          asker: {
            id: b.asker.id,
            name: askerName,
            avatarUrl: b.asker.profilePictureUrl ?? undefined,
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
                tier: tierByTutor.get(lookupKey) ?? 'bronze',
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
// GET /bounties/:bountyId — single bounty by ID
// Used by BountyDetailScreen to avoid fetching all active bounties.
// ─────────────────────────────────────────────────────────
router.get(
  '/bounties/:bountyId',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const bountyId = req.params.bountyId;

      const b = await prisma.bounty.findUnique({
        where: { id: bountyId },
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

      if (!b) {
        return res
          .status(404)
          .json({ success: false, error: 'Bounty not found' });
      }

      const now = new Date();
      const topTutorId = b.replies[0]?.tutor.id;
      const tierByTutor = topTutorId
        ? await computeMasterExplainerTiersBatch(prisma, [{ tutorId: topTutorId, subject: b.subject }])
        : new Map();

      const tutorsWorking = new Set(b.replies.map((r) => r.tutorId)).size;
      const answersCount = b.replies.length;
      const top = b.replies[0];

      const askerName =
        `${b.asker.lastName ?? ''} ${b.asker.firstName ?? ''}`.trim() ||
        'Unknown';

      const lookupKey = top ? `${top.tutor.id}:${b.subject}` : '';

      const shaped = {
        id: b.id,
        asker: {
          id: b.asker.id,
          name: askerName,
          avatarUrl: b.asker.profilePictureUrl ?? undefined,
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
              tier: tierByTutor.get(lookupKey) ?? 'bronze',
            }
          : undefined,
        createdAt: b.createdAt.toISOString(),
      };

      res.json({ success: true, data: shaped });
    } catch (error: any) {
      console.error('[GET /bounties/:bountyId]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bounty',
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

// ─────────────────────────────────────────────────────────
// GET /bounties/:bountyId/replies — list replies, ordered by Aha! desc
// ─────────────────────────────────────────────────────────
router.get(
  '/bounties/:bountyId/replies',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const bountyId = req.params.bountyId;
      const userId = req.user!.id;

      const parsed = repliesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query',
          details: parsed.error.flatten(),
        });
      }

      const replies = await prisma.bountyReply.findMany({
        where: { bountyId },
        orderBy: [
          { isWinner: 'desc' },
          { ahaCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: parsed.data.limit ?? 30,
        include: {
          tutor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            },
          },
          bounty: {
            select: {
              subject: true,
            },
          },
          // hasAha for the current viewer — single query via filtered count
          _count: {
            select: {
              ahas: {
                where: { userId },
              },
            },
          },
        },
      });

      const tutorSubjectPairs = replies.map((r) => ({
        tutorId: r.tutor.id,
        subject: r.bounty.subject,
      }));

      const tierByTutor = await computeMasterExplainerTiersBatch(
        prisma,
        tutorSubjectPairs,
      );

      const shaped = replies.map((r) => {
        const lookupKey = `${r.tutor.id}:${r.bounty.subject}`;
        return {
          id: r.id,
          tutor: {
            id: r.tutor.id,
            name:
              `${r.tutor.lastName ?? ''} ${r.tutor.firstName ?? ''}`.trim() ||
              'Tutor',
            avatarUrl: r.tutor.profilePictureUrl ?? undefined,
            tier: tierByTutor.get(lookupKey) ?? null,
          },
          format: r.format,
          content: r.content,
          mediaUrl: r.mediaUrl ?? undefined,
          ahaCount: r.ahaCount,
          hasAha: (r._count as any).ahas > 0,
          isWinner: r.isWinner,
          createdAt: r.createdAt.toISOString(),
        };
      });

      res.json({ success: true, data: shaped });
    } catch (error: any) {
      console.error('[GET /bounties/:bountyId/replies]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch replies',
        details: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /bounties/:bountyId/replies — submit a reply
// ─────────────────────────────────────────────────────────
router.post(
  '/bounties/:bountyId/replies',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const tutorId = req.user!.id;
      const bountyId = req.params.bountyId;

      const parsed = createReplyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }

      const bounty = await prisma.bounty.findUnique({
        where: { id: bountyId },
        select: {
          id: true,
          askerId: true,
          status: true,
          expiresAt: true,
        },
      });
      if (!bounty) {
        return res
          .status(404)
          .json({ success: false, error: 'Bounty not found' });
      }
      if (bounty.askerId === tutorId) {
        return res.status(403).json({
          success: false,
          error: 'Cannot reply to your own bounty',
        });
      }
      if (bounty.status !== 'ACTIVE' || bounty.expiresAt <= new Date()) {
        return res.status(409).json({
          success: false,
          error: 'Bounty is no longer accepting replies',
        });
      }

      const reply = await prisma.bountyReply.create({
        data: {
          bountyId,
          tutorId,
          format: parsed.data.format ?? 'TEXT',
          content: parsed.data.content,
          mediaUrl: parsed.data.mediaUrl ?? null,
        },
        select: {
          id: true,
          format: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: reply.id,
          format: reply.format,
          createdAt: reply.createdAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[POST /bounties/:bountyId/replies]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit reply',
        details: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /bounties/:bountyId/replies/:replyId/aha — toggle Aha! reaction
// ─────────────────────────────────────────────────────────
router.post(
  '/bounties/:bountyId/replies/:replyId/aha',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { bountyId, replyId } = req.params;

      // Cheap sanity check the reply belongs to the bounty (the toggleAha
      // helper doesn't care, but the URL contract should match data).
      const reply = await prisma.bountyReply.findUnique({
        where: { id: replyId },
        select: { id: true, bountyId: true },
      });
      if (!reply || reply.bountyId !== bountyId) {
        return res
          .status(404)
          .json({ success: false, error: 'Reply not found on this bounty' });
      }

      const result = await toggleAha(prisma, { replyId, userId });
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('[POST /bounties/:bountyId/replies/:replyId/aha]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle Aha',
        details: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /bounties/:bountyId/award — asker picks winning reply
// ─────────────────────────────────────────────────────────
router.post(
  '/bounties/:bountyId/award',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const askerId = req.user!.id;
      const bountyId = req.params.bountyId;

      const parsed = awardBountyBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }

      const result = await awardBountyAtomic(prisma, {
        bountyId,
        askerId,
        replyId: parsed.data.replyId,
      });

      res.json({
        success: true,
        data: {
          bountyId: result.bountyId,
          winnerReplyId: result.winnerReplyId,
          winnerTutorId: result.winnerTutorId,
          xpAwarded: result.xpAwarded,
          awardedAt: result.awardedAt.toISOString(),
        },
      });
    } catch (error: any) {
      if (error instanceof BountyNotAwardableError) {
        return res
          .status(409)
          .json({ success: false, error: error.message });
      }
      console.error('[POST /bounties/:bountyId/award]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to award bounty',
        details: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /bounties/:bountyId/cancel — asker cancels bounty and gets a refund
// ─────────────────────────────────────────────────────────
router.post(
  '/bounties/:bountyId/cancel',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const askerId = req.user!.id;
      const bountyId = req.params.bountyId;

      const result = await cancelBountyWithRefund(prisma, {
        bountyId,
        askerId,
      });

      // Bust feed cache for the asker
      await feedCache.invalidateUser(askerId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[POST /bounties/:bountyId/cancel]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel bounty',
        details: error.message,
      });
    }
  },
);

export default router;

