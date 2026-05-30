/**
 * Quiz War Routes — REST surface for the live inter-class battle banner.
 *
 *   GET  /quiz-wars/active        active war for the user's school (or null)
 *   POST /quiz-wars/:id/join      idempotent join (creates QuizWarParticipant)
 *
 * Deferred (next session):
 *   POST /quiz-wars/:id/answer    submit a round answer (advances score)
 *   POST /quiz-wars/:id/start     transition PRE_MATCH → LIVE (admin/cron)
 *   POST /quiz-wars/:id/end       transition LIVE → POST_MATCH + award XP
 *   WebSocket /quiz-wars/:id/ws   real-time score deltas + round transitions
 */

import { Router, Response } from 'express';
import { prisma } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { joinQuizWarBodySchema } from '../validators/quizWar.validator';

const router = Router();

/**
 * Time remaining helper — matches the mobile QuizWar.timeRemainingSec
 * semantics (floor, never negative).
 */
function secondsLeftUntil(endsAt: Date, now: Date = new Date()): number {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / 1000);
}

// ─────────────────────────────────────────────────────────
// GET /quiz-wars/active — the user's school's active war (or null)
//
// Shape matches mobile QuizWar type (apps/mobile/src/types/index.ts).
// One war per school at a time by design — uses (schoolId, status,
// endsAt) index for the lookup.
// ─────────────────────────────────────────────────────────
router.get(
  '/quiz-wars/active',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.json({ success: true, data: null });
      }

      const now = new Date();
      const war = await prisma.quizWar.findFirst({
        where: {
          schoolId,
          status: { in: ['PRE_MATCH', 'LIVE'] },
          endsAt: { gt: now },
        },
        orderBy: { startsAt: 'asc' },
        include: {
          // Total participant count → classmatesFighting on mobile.
          _count: { select: { participants: true } },
          // Find the viewer's own participant row (if any) to derive
          // isUserParticipating + userTeamId.
          participants: {
            where: { userId },
            select: { team: true },
            take: 1,
          },
        },
      });

      if (!war) {
        return res.json({ success: true, data: null });
      }

      const myParticipation = war.participants[0];

      const data = {
        id: war.id,
        status: war.status,
        subject: war.subject,
        round: war.round,
        totalRounds: war.totalRounds,
        timeRemainingSec: secondsLeftUntil(war.endsAt, now),
        teamA: {
          // Mobile uses teamA.id to compare against userTeamId for the
          // "Your team" indicator. Use the team name as the id since
          // it's the natural identifier in this denormalized model.
          id: war.teamAName,
          name: war.teamAName,
          color: war.teamAColor,
          score: war.teamAScore,
        },
        teamB: {
          id: war.teamBName,
          name: war.teamBName,
          color: war.teamBColor,
          score: war.teamBScore,
        },
        classmatesFighting: war._count.participants,
        isUserParticipating: !!myParticipation,
        userTeamId: myParticipation
          ? myParticipation.team === 'A'
            ? war.teamAName
            : war.teamBName
          : undefined,
        rewardXp: war.rewardXp,
        createdAt: war.createdAt.toISOString(),
      };

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('[GET /quiz-wars/active]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch active quiz war',
        details: error.message,
      });
    }
  },
);

// ─────────────────────────────────────────────────────────
// POST /quiz-wars/:warId/join — idempotent join
//
// Body: { team: 'A' | 'B' }. If the user already joined this war, we
// return the existing participation (idempotent) — letting them switch
// sides is a separate decision. For now: first join wins.
// ─────────────────────────────────────────────────────────
router.post(
  '/quiz-wars/:warId/join',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const warId = req.params.warId;

      const parsed = joinQuizWarBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }

      const war = await prisma.quizWar.findUnique({
        where: { id: warId },
        select: { id: true, status: true, endsAt: true, schoolId: true },
      });
      if (!war) {
        return res
          .status(404)
          .json({ success: false, error: 'Quiz war not found' });
      }
      if (war.status === 'POST_MATCH' || war.endsAt <= new Date()) {
        return res.status(409).json({
          success: false,
          error: 'Quiz war is no longer accepting participants',
        });
      }

      // Idempotent: if already joined, return existing without changing
      // team (no team-switching mid-war for prototype).
      const participant = await prisma.quizWarParticipant.upsert({
        where: { warId_userId: { warId, userId } },
        create: {
          warId,
          userId,
          team: parsed.data.team,
        },
        update: {}, // no-op if exists
        select: {
          id: true,
          team: true,
          joinedAt: true,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          warId,
          team: participant.team,
          joinedAt: participant.joinedAt.toISOString(),
          isAlreadyJoined: participant.team !== parsed.data.team,
        },
      });
    } catch (error: any) {
      console.error('[POST /quiz-wars/:warId/join]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join quiz war',
        details: error.message,
      });
    }
  },
);

export default router;
