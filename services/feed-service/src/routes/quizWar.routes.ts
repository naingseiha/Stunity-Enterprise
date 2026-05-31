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
import {
  joinQuizWarBodySchema,
  createQuizWarBodySchema,
  submitAnswerBodySchema,
} from '../validators/quizWar.validator';
import { feedCache } from '../redis';
import { publishQuizWarUpdate } from '../websocket';


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

async function broadcastWarUpdate(warId: string) {
  try {
    const now = new Date();
    const war = await prisma.quizWar.findUnique({
      where: { id: warId },
      include: {
        _count: { select: { participants: true } },
      },
    });

    if (!war) return;

    const data = {
      id: war.id,
      status: war.status,
      subject: war.subject,
      round: war.round,
      totalRounds: war.totalRounds,
      timeRemainingSec: secondsLeftUntil(war.endsAt, now),
      teamA: {
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
      classmatesFighting: war._count?.participants ?? 0,
    };

    await publishQuizWarUpdate(warId, {
      type: 'QUIZ_WAR_UPDATED',
      data,
    });
  } catch (err) {
    console.error('Failed to broadcast quiz war update:', err);
  }
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

      // Broadcast update to sync presence count in real-time
      broadcastWarUpdate(warId);
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

// ─────────────────────────────────────────────────────────
// POST /quiz-wars — admin creation of a new quiz war
// ─────────────────────────────────────────────────────────
router.post(
  '/quiz-wars',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const role = req.user!.role;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only school admins can create quiz wars',
        });
      }

      const schoolId = req.user!.schoolId;
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          error: 'User has no school assignment',
        });
      }

      const parsed = createQuizWarBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }

      const {
        subject,
        startsAt,
        endsAt,
        teamAName,
        teamAColor,
        teamBName,
        teamBColor,
        rewardXp = 200,
        totalRounds = 6,
      } = parsed.data;

      if (startsAt >= endsAt) {
        return res.status(400).json({
          success: false,
          error: 'startsAt must be before endsAt',
        });
      }

      const quizWar = await prisma.quizWar.create({
        data: {
          schoolId,
          subject,
          startsAt,
          endsAt,
          teamAName,
          teamAColor,
          teamBName,
          teamBColor,
          rewardXp,
          totalRounds,
          status: 'PRE_MATCH',
        },
      });

      res.status(201).json({
        success: true,
        data: quizWar,
      });
    } catch (error: any) {
      console.error('[POST /quiz-wars]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create quiz war',
        details: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────
// POST /quiz-wars/:id/answer — submit a round answer (advances score)
// ─────────────────────────────────────────────────────────
router.post(
  '/quiz-wars/:id/answer',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const warId = req.params.id;

      const parsed = submitAnswerBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }

      const { isCorrect } = parsed.data;

      // Find participant first to verify join + get team
      const participant = await prisma.quizWarParticipant.findUnique({
        where: { warId_userId: { warId, userId } },
      });

      if (!participant) {
        return res.status(403).json({
          success: false,
          error: 'User has not joined this quiz war. Join first.',
        });
      }

      // Check if war exists and is LIVE
      const war = await prisma.quizWar.findUnique({
        where: { id: warId },
      });

      if (!war) {
        return res.status(404).json({
          success: false,
          error: 'Quiz war not found',
        });
      }

      if (war.status !== 'LIVE' || war.endsAt <= new Date()) {
        return res.status(409).json({
          success: false,
          error: 'Quiz war is not currently active/live',
        });
      }

      const isTeamA = participant.team === 'A';
      const xpToAward = isCorrect ? 10 : 0;

      // Update participant counts & XP and increment team score on QuizWar in a transaction
      const [updatedParticipant, updatedWar] = await prisma.$transaction([
        prisma.quizWarParticipant.update({
          where: { id: participant.id },
          data: {
            totalAnswers: { increment: 1 },
            correctAnswers: isCorrect ? { increment: 1 } : undefined,
            xpEarned: isCorrect ? { increment: xpToAward } : undefined,
          },
        }),
        prisma.quizWar.update({
          where: { id: warId },
          data: {
            teamAScore: (isCorrect && isTeamA) ? { increment: 1 } : undefined,
            teamBScore: (isCorrect && !isTeamA) ? { increment: 1 } : undefined,
          },
        }),
        ...(xpToAward > 0 ? [
          prisma.user.update({
            where: { id: userId },
            data: {
              totalPoints: { increment: xpToAward },
            },
          }),
        ] : []),
      ]);

      // Bust feed cache for the user
      await feedCache.invalidateUser(userId);

      res.json({
        success: true,
        data: {
          participant: {
            id: updatedParticipant.id,
            correctAnswers: updatedParticipant.correctAnswers,
            totalAnswers: updatedParticipant.totalAnswers,
            xpEarned: updatedParticipant.xpEarned,
          },
          war: {
            teamAScore: updatedWar.teamAScore,
            teamBScore: updatedWar.teamBScore,
          },
        },
      });

      // Broadcast update to sync scores in real-time
      broadcastWarUpdate(warId);
    } catch (error: any) {
      console.error('[POST /quiz-wars/:id/answer]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit answer',
        details: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────
// POST /quiz-wars/:id/start — transition PRE_MATCH → LIVE (admin/cron)
// ─────────────────────────────────────────────────────────
router.post(
  '/quiz-wars/:id/start',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const role = req.user!.role;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only school admins can start quiz wars',
        });
      }

      const warId = req.params.id;
      const war = await prisma.quizWar.findUnique({
        where: { id: warId },
      });

      if (!war) {
        return res.status(404).json({
          success: false,
          error: 'Quiz war not found',
        });
      }

      if (war.status !== 'PRE_MATCH') {
        return res.status(409).json({
          success: false,
          error: `Cannot start a war that is in status: ${war.status}`,
        });
      }

      const updatedWar = await prisma.quizWar.update({
        where: { id: warId },
        data: { status: 'LIVE' },
      });

      res.json({
        success: true,
        data: updatedWar,
      });

      // Broadcast state update to WebSocket clients
      broadcastWarUpdate(warId);
    } catch (error: any) {
      console.error('[POST /quiz-wars/:id/start]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start quiz war',
        details: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────
// POST /quiz-wars/:id/end — transition LIVE → POST_MATCH + award XP
// ─────────────────────────────────────────────────────────
router.post(
  '/quiz-wars/:id/end',
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const role = req.user!.role;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only school admins can end quiz wars',
        });
      }

      const warId = req.params.id;
      const war = await prisma.quizWar.findUnique({
        where: { id: warId },
        include: {
          participants: true,
        },
      });

      if (!war) {
        return res.status(404).json({
          success: false,
          error: 'Quiz war not found',
        });
      }

      if (war.status !== 'LIVE') {
        return res.status(409).json({
          success: false,
          error: `Cannot end a war that is in status: ${war.status}`,
        });
      }

      // Determine winning team(s)
      let winningTeam: string | null = null;
      if (war.teamAScore > war.teamBScore) {
        winningTeam = 'A';
      } else if (war.teamBScore > war.teamAScore) {
        winningTeam = 'B';
      } else {
        winningTeam = 'TIE';
      }

      const rewardXp = war.rewardXp;
      const participants = war.participants;

      // Find the winning participants
      const winningParticipants = participants.filter((p) => {
        if (winningTeam === 'TIE') return true;
        return p.team === winningTeam;
      });

      // Determine MVP(s) from winning participants: those with highest correctAnswers > 0
      let maxCorrectAnswers = 0;
      winningParticipants.forEach((p) => {
        if (p.correctAnswers > maxCorrectAnswers) {
          maxCorrectAnswers = p.correctAnswers;
        }
      });

      const mvpParticipantIds = new Set<string>();
      if (maxCorrectAnswers > 0) {
        winningParticipants.forEach((p) => {
          if (p.correctAnswers === maxCorrectAnswers) {
            mvpParticipantIds.add(p.id);
          }
        });
      }

      // We will perform updates in a transaction
      const userUpdates: any[] = [];
      const participantUpdates: any[] = [];

      for (const p of participants) {
        const isWinner = winningTeam === 'TIE' || p.team === winningTeam;
        const isMvp = mvpParticipantIds.has(p.id);
        const endXpEarned = isWinner ? (isMvp ? rewardXp * 2 : rewardXp) : 0;

        if (endXpEarned > 0 || isMvp) {
          participantUpdates.push(
            prisma.quizWarParticipant.update({
              where: { id: p.id },
              data: {
                xpEarned: { increment: endXpEarned },
                isMvp,
              },
            })
          );

          userUpdates.push(
            prisma.user.update({
              where: { id: p.userId },
              data: {
                totalPoints: { increment: endXpEarned },
              },
            })
          );
        }
      }

      const [updatedWar] = await prisma.$transaction([
        prisma.quizWar.update({
          where: { id: warId },
          data: {
            status: 'POST_MATCH',
            awardedAt: new Date(),
          },
        }),
        ...participantUpdates,
        ...userUpdates,
      ]);

      // Invalidate caches for all participating users so they get updated totalPoints in their feeds
      for (const p of participants) {
        await feedCache.invalidateUser(p.userId);
      }

      res.json({
        success: true,
        data: {
          war: updatedWar,
          winningTeam,
          rewardXp,
          totalParticipants: participants.length,
          winningParticipantsCount: winningParticipants.length,
          mvpCount: mvpParticipantIds.size,
        },
      });

      // Broadcast final match state to WebSocket clients
      broadcastWarUpdate(warId);
    } catch (error: any) {
      console.error('[POST /quiz-wars/:id/end]', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end quiz war',
        details: error.message,
      });
    }
  }
);

export default router;
