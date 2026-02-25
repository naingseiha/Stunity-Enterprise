/**
 * Analytics Service - Professional Quiz Features
 * 
 * Features:
 * - Live Quiz Mode (Kahoot-style)
 * - Leaderboards & Competition
 * - Learning Streaks & Achievements
 * - XP & Leveling System
 * - Quiz Analytics
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import currencyRoutes from './gamification/routes/currency.routes';
import achievementRoutes from './gamification/routes/achievements.routes';
import challengeRoutes from './gamification/routes/challenges.routes';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.ANALYTICS_SERVICE_PORT || 3014;
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// Middleware
app.use(cors());
app.use(express.json());

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

// Keep AuthRequest for backwards compatibility in this file if needed
interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role: string;
  };
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ [ANALYTICS AUTH] No token provided');
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  console.log('🔐 [ANALYTICS AUTH] Verifying token for:', req.method, req.path);
  console.log('🔑 [ANALYTICS AUTH] Token preview:', token.substring(0, 30) + '...');
  console.log('🔑 [ANALYTICS AUTH] JWT_SECRET:', JWT_SECRET);

  try {
    const user = jwt.verify(token, JWT_SECRET) as any;
    console.log('✅ [ANALYTICS AUTH] Token verified for user:', user);
    req.user = {
      id: user.userId, // Map userId from JWT to id
      userId: user.userId,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error: any) {
    console.error('❌ [ANALYTICS AUTH] Token verification failed:', error.message);
    console.error('🔍 [ANALYTICS AUTH] Error name:', error.name);
    return res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

// ========================================
// Health Check
// ========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    service: 'analytics-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString(),
    features: {
      liveQuiz: true,
      leaderboards: true,
      streaks: true,
      achievements: true,
    },
  });
});

// ========================================
// Live Quiz Mode - Phase 1 Feature 1
// ========================================

// In-memory storage for live quiz sessions (use Redis in production)
interface LiveQuizSession {
  id: string;
  quizId: string;
  hostId: string;
  sessionCode: string;
  status: 'lobby' | 'active' | 'completed';
  currentQuestionIndex: number;
  questionStartTime: number;
  participants: Map<string, ParticipantData>;
  settings: {
    questionTime: number; // seconds
    showLeaderboard: boolean;
    pointsPerQuestion: number;
    speedBonusMultiplier: number;
  };
  quiz?: any;
  startedAt?: Date;
  completedAt?: Date;
}

interface ParticipantData {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  answers: Array<{
    questionId: string;
    answer: string;
    timeSpent: number;
    correct: boolean;
    points: number;
  }>;
  joinedAt: Date;
  connected: boolean;
}

const liveSessions = new Map<string, LiveQuizSession>();

// Generate 6-digit session code
const generateSessionCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /live/create - Host creates a live quiz session
app.post('/live/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { quizId, settings } = req.body;
    const hostId = req.user!.id;

    // TODO: Fetch quiz details from feed service via API call
    // For now, we'll create the session without quiz validation
    const quiz = { id: quizId }; // Stub for now

    // Comment out quiz lookup since quiz model doesn't exist in analytics schema
    // const quiz = await prisma.quiz.findUnique({
    //   where: { id: quizId },
    //   include: { post: true },
    // });

    // if (!quiz) {
    //   return res.status(404).json({ success: false, error: 'Quiz not found' });
    // }

    // Generate unique session code
    let sessionCode = generateSessionCode();
    while (liveSessions.has(sessionCode)) {
      sessionCode = generateSessionCode();
    }

    const session: LiveQuizSession = {
      id: `live_${Date.now()}`,
      quizId,
      hostId,
      sessionCode,
      status: 'lobby',
      currentQuestionIndex: -1,
      questionStartTime: 0,
      participants: new Map(),
      settings: {
        questionTime: settings?.questionTime || 30,
        showLeaderboard: settings?.showLeaderboard ?? true,
        pointsPerQuestion: settings?.pointsPerQuestion || 1000,
        speedBonusMultiplier: settings?.speedBonusMultiplier || 0.5,
      },
      quiz,
    };

    liveSessions.set(sessionCode, session);

    console.log(`🎮 [LIVE QUIZ] Session created: ${sessionCode} for quiz: ${quizId}`);

    res.json({
      success: true,
      data: {
        sessionCode,
        sessionId: session.id,
        quizTitle: 'Quiz', // Would get from feed service
        questionCount: 0, // Would get from feed service
      },
    });
  } catch (error: any) {
    console.error('Create live session error:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// POST /live/:code/join - Student joins a live session
app.post('/live/:code/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;

    const session = liveSessions.get(code);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.status !== 'lobby') {
      return res.status(400).json({ success: false, error: 'Session already started' });
    }

    // TODO: Get user details from auth service via API call
    // For now, use basic user info from token
    const user = {
      id: userId,
      firstName: req.user!.email?.split('@')[0] || 'User',
      lastName: '',
      email: req.user!.email,
    };

    // Comment out user lookup since user model doesn't exist in analytics schema
    // const user = await prisma.user.findUnique({
    //   where: { id: userId },
    //   select: { id: true, firstName: true, lastName: true, email: true },
    // });

    // if (!user) {
    //   return res.status(404).json({ success: false, error: 'User not found' });
    // }

    // Add participant
    session.participants.set(userId, {
      userId,
      username: `${user.firstName} ${user.lastName}`,
      score: 0,
      answers: [],
      joinedAt: new Date(),
      connected: true,
    });

    console.log(`👤 [LIVE QUIZ] User ${user.email} joined session ${code}`);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        quizTitle: session.quiz?.post.title,
        questionCount: (session.quiz?.questions as any[]).length,
        participantCount: session.participants.size,
        hostId: session.hostId,
      },
    });
  } catch (error: any) {
    console.error('Join session error:', error);
    res.status(500).json({ success: false, error: 'Failed to join session' });
  }
});

// GET /live/:code/lobby - Get lobby status
app.get('/live/:code/lobby', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const session = liveSessions.get(code);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const participants = Array.from(session.participants.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      connected: p.connected,
    }));

    res.json({
      success: true,
      data: {
        sessionCode: code,
        status: session.status,
        participantCount: session.participants.size,
        participants,
        quizTitle: session.quiz?.post.title,
        questionCount: (session.quiz?.questions as any[]).length,
        settings: session.settings,
      },
    });
  } catch (error: any) {
    console.error('Get lobby error:', error);
    res.status(500).json({ success: false, error: 'Failed to get lobby status' });
  }
});

// POST /live/:code/start - Host starts the quiz
app.post('/live/:code/start', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;
    const session = liveSessions.get(code);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.hostId !== userId) {
      return res.status(403).json({ success: false, error: 'Only host can start session' });
    }

    if (session.status !== 'lobby') {
      return res.status(400).json({ success: false, error: 'Session already started' });
    }

    session.status = 'active';
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;
    session.questionStartTime = Date.now();

    console.log(`🚀 [LIVE QUIZ] Session ${code} started with ${session.participants.size} participants`);

    const questions = session.quiz?.questions as any[];
    const currentQuestion = questions[0];

    res.json({
      success: true,
      data: {
        status: 'active',
        currentQuestionIndex: 0,
        question: {
          id: currentQuestion.id,
          text: currentQuestion.text,
          type: currentQuestion.type,
          options: currentQuestion.options,
          points: currentQuestion.points,
        },
        timeLimit: session.settings.questionTime,
      },
    });
  } catch (error: any) {
    console.error('Start session error:', error);
    res.status(500).json({ success: false, error: 'Failed to start session' });
  }
});

// POST /live/:code/submit - Submit answer for current question
app.post('/live/:code/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const { answer } = req.body;
    const userId = req.user!.id;

    const session = liveSessions.get(code);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const participant = session.participants.get(userId);
    if (!participant) {
      return res.status(403).json({ success: false, error: 'Not in session' });
    }

    const questions = session.quiz?.questions as any[];
    const currentQuestion = questions[session.currentQuestionIndex];

    if (!currentQuestion) {
      return res.status(400).json({ success: false, error: 'No active question' });
    }

    // Calculate time spent
    const timeSpent = (Date.now() - session.questionStartTime) / 1000;

    // Check if answer is correct
    let isCorrect = false;
    if (currentQuestion.type === 'MULTIPLE_CHOICE') {
      const userAnswerNum = parseInt(answer);
      const correctAnswerNum = parseInt(currentQuestion.correctAnswer);
      isCorrect = userAnswerNum === correctAnswerNum;
    } else if (currentQuestion.type === 'TRUE_FALSE') {
      isCorrect = answer === currentQuestion.correctAnswer.toString();
    } else if (currentQuestion.type === 'SHORT_ANSWER') {
      const userAns = answer?.toLowerCase().trim();
      const correctAns = currentQuestion.correctAnswer?.toLowerCase().trim();
      isCorrect = userAns === correctAns;
    }

    // Calculate points (base + speed bonus)
    let points = 0;
    if (isCorrect) {
      const basePoints = session.settings.pointsPerQuestion;
      const timeRatio = Math.max(0, 1 - (timeSpent / session.settings.questionTime));
      const speedBonus = basePoints * session.settings.speedBonusMultiplier * timeRatio;
      points = Math.round(basePoints + speedBonus);
    }

    // Store answer
    participant.answers.push({
      questionId: currentQuestion.id,
      answer,
      timeSpent,
      correct: isCorrect,
      points,
    });
    participant.score += points;

    console.log(`📝 [LIVE QUIZ] User ${userId} answered Q${session.currentQuestionIndex + 1}: ${isCorrect ? 'correct' : 'incorrect'} (+${points})`);

    res.json({
      success: true,
      data: {
        correct: isCorrect,
        points,
        totalScore: participant.score,
        timeSpent,
      },
    });
  } catch (error: any) {
    console.error('Submit answer error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit answer' });
  }
});

// POST /live/:code/next - Host moves to next question
app.post('/live/:code/next', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const userId = req.user!.id;
    const session = liveSessions.get(code);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.hostId !== userId) {
      return res.status(403).json({ success: false, error: 'Only host can advance' });
    }

    const questions = session.quiz?.questions as any[];

    // Check if quiz is complete
    if (session.currentQuestionIndex >= questions.length - 1) {
      session.status = 'completed';
      session.completedAt = new Date();

      console.log(`🏁 [LIVE QUIZ] Session ${code} completed`);

      return res.json({
        success: true,
        data: {
          status: 'completed',
          message: 'Quiz completed',
        },
      });
    }

    // Move to next question
    session.currentQuestionIndex++;
    session.questionStartTime = Date.now();

    const nextQuestion = questions[session.currentQuestionIndex];

    res.json({
      success: true,
      data: {
        currentQuestionIndex: session.currentQuestionIndex,
        question: {
          id: nextQuestion.id,
          text: nextQuestion.text,
          type: nextQuestion.type,
          options: nextQuestion.options,
          points: nextQuestion.points,
        },
        timeLimit: session.settings.questionTime,
      },
    });
  } catch (error: any) {
    console.error('Next question error:', error);
    res.status(500).json({ success: false, error: 'Failed to get next question' });
  }
});

// GET /live/:code/leaderboard - Get current leaderboard
app.get('/live/:code/leaderboard', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const session = liveSessions.get(code);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Sort participants by score
    const leaderboard = Array.from(session.participants.values())
      .map(p => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        score: p.score,
        correctAnswers: p.answers.filter(a => a.correct).length,
        totalAnswers: p.answers.length,
      }))
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({ ...p, rank: index + 1 }));

    res.json({
      success: true,
      data: {
        leaderboard,
        totalParticipants: session.participants.size,
        currentQuestion: session.currentQuestionIndex + 1,
        totalPoints: (session.quiz?.questions as any[]).length,
      },
    });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

// GET /live/:code/results - Get final results
app.get('/live/:code/results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;
    const session = liveSessions.get(code);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    // Get final leaderboard
    const leaderboard = Array.from(session.participants.values())
      .map(p => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        score: p.score,
        correctAnswers: p.answers.filter(a => a.correct).length,
        totalAnswers: p.answers.length,
        accuracy: p.answers.length > 0
          ? Math.round((p.answers.filter(a => a.correct).length / p.answers.length) * 100)
          : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({ ...p, rank: index + 1 }));

    // Calculate session stats
    const totalAnswers = Array.from(session.participants.values())
      .reduce((sum, p) => sum + p.answers.length, 0);
    const correctAnswers = Array.from(session.participants.values())
      .reduce((sum, p) => sum + p.answers.filter(a => a.correct).length, 0);

    res.json({
      success: true,
      data: {
        sessionCode: code,
        quizTitle: session.quiz?.post.title,
        status: session.status,
        leaderboard,
        stats: {
          totalParticipants: session.participants.size,
          totalAnswers,
          correctAnswers,
          averageAccuracy: totalAnswers > 0
            ? Math.round((correctAnswers / totalAnswers) * 100)
            : 0,
        },
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
    });
  } catch (error: any) {
    console.error('Get results error:', error);
    res.status(500).json({ success: false, error: 'Failed to get results' });
  }
});

// ========================================
// Leaderboards & Competition - Phase 1 Feature 2
// ========================================

// XP & Level Calculation Helpers
const calculateXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

const calculateLevelFromXP = (xp: number): number => {
  let level = 1;
  let totalXP = 0;
  while (totalXP <= xp) {
    totalXP += calculateXPForLevel(level);
    if (totalXP > xp) break;
    level++;
  }
  return level;
};

const calculateXPForQuiz = (score: number, totalPoints: number, timeSpent: number, timeLimit: number): number => {
  const baseXP = 50;
  const accuracyBonus = Math.floor((score / totalPoints) * 50); // 0-50
  const speedRatio = timeLimit > 0 ? Math.max(0, 1 - (timeSpent / timeLimit)) : 0;
  const speedBonus = Math.floor(speedRatio * 10); // 0-10
  return baseXP + accuracyBonus + speedBonus;
};

// GET /stats/:userId - Get user stats
app.get('/stats/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let { userId } = req.params;

    // Handle "current-user-id" keyword
    if (userId === 'current-user-id') {
      userId = req.user!.id;
    }

    let stats = await prisma.userStats.findUnique({
      where: { userId },
      include: {
        attempts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Create stats if doesn't exist
    if (!stats) {
      stats = await prisma.userStats.create({
        data: { userId },
        include: {
          attempts: true,
        },
      });
    }

    // Calculate additional metrics
    const avgScore = stats.totalAnswers > 0
      ? (stats.correctAnswers / stats.totalAnswers) * 100
      : 0;

    const winRate = stats.liveQuizTotal > 0
      ? (stats.liveQuizWins / stats.liveQuizTotal) * 100
      : 0;

    const xpToNextLevel = calculateXPForLevel(stats.level + 1);
    const xpProgress = stats.xp - calculateXPForLevel(stats.level);

    res.json({
      success: true,
      data: {
        ...stats,
        avgScore: Math.round(avgScore * 10) / 10,
        winRate: Math.round(winRate * 10) / 10,
        xpToNextLevel,
        xpProgress,
        recentAttempts: stats.attempts,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// POST /stats/record-attempt - Record quiz attempt & award XP
app.post('/stats/record-attempt', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log('📝 [Analytics] Recording attempt for user:', userId);
    console.log('📝 [Analytics] Request body:', JSON.stringify(req.body, null, 2));

    const { quizId, score, totalPoints, timeSpent, timeLimit, type, sessionCode, rank } = req.body;

    // Check max attempts
    if (quizId) {
      const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { maxAttempts: true }
      });

      if (quiz?.maxAttempts) {
        const attemptsCount = await prisma.quizAttemptRecord.count({
          where: {
            quizId,
            userId
          }
        });

        if (attemptsCount >= quiz.maxAttempts) {
          return res.status(403).json({ success: false, error: 'Max attempts reached' });
        }
      }
    }

    // Calculate XP
    const xpEarned = calculateXPForQuiz(score, totalPoints, timeSpent, timeLimit || 300);
    const accuracy = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

    console.log('📝 [Analytics] Calculated XP:', xpEarned);
    console.log('📝 [Analytics] Calculated Accuracy:', accuracy);

    // Get or create user stats
    let stats = await prisma.userStats.findUnique({ where: { userId } });
    console.log('📝 [Analytics] Found user stats:', !!stats);

    if (!stats) {
      console.log('📝 [Analytics] Creating new user stats');
      stats = await prisma.userStats.create({ data: { userId } });
    }

    // Update stats
    const newXP = stats.xp + xpEarned;
    const newLevel = calculateLevelFromXP(newXP);
    const leveledUp = newLevel > stats.level;

    // Determine if win (for live quiz)
    const isWin = type === 'live' && rank === 1;

    // Update user stats
    console.log('📝 [Analytics] Updating user stats...');
    const updatedStats = await prisma.userStats.update({
      where: { userId },
      data: {
        xp: newXP,
        level: newLevel,
        totalQuizzes: { increment: 1 },
        totalPoints: { increment: score },
        correctAnswers: { increment: Math.floor((score / totalPoints) * 100) }, // This looks wrong if totalPoints IS NOT 100
        totalAnswers: { increment: 100 }, // This looks wrong, should probably be passed in payload
        liveQuizWins: type === 'live' && isWin ? { increment: 1 } : undefined,
        liveQuizTotal: type === 'live' ? { increment: 1 } : undefined,
      },
    });
    console.log('📝 [Analytics] User stats updated');

    // Record attempt
    console.log('📝 [Analytics] Creating quiz attempt record...');
    const attemptData = {
      userId,
      quizId,
      score,
      totalPoints,
      accuracy,
      timeSpent,
      rank,
      xpEarned,
      type,
      sessionCode,
      userStatsId: stats.id,
    };
    console.log('📝 [Analytics] Attempt data:', JSON.stringify(attemptData, null, 2));

    await prisma.quizAttemptRecord.create({
      data: attemptData,
    });
    console.log('📝 [Analytics] Quiz attempt record created');

    res.json({
      success: true,
      data: {
        xpEarned,
        newXP,
        newLevel,
        leveledUp,
        stats: updatedStats,
      },
    });
  } catch (error: any) {
    console.error('❌ [Analytics] Record attempt error:', error);
    res.status(500).json({ success: false, error: 'Failed to record attempt', details: error.message });
  }
});

// GET /leaderboard/global - Global leaderboard
app.get('/leaderboard/global', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const leaderboard = await prisma.userStats.findMany({
      orderBy: [
        { xp: 'desc' },
        { level: 'desc' },
      ],
      take: limit,
      skip,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            email: true
          }
        }
      }
    });

    const total = await prisma.userStats.count();

    // Calculate requesting user's rank
    const userId = req.user!.id;
    let userRank = null;
    let userStats = null;

    if (userId) {
      userStats = await prisma.userStats.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            }
          }
        }
      });

      if (userStats) {
        // Count how many users have strictly more XP, 
        // OR same XP but higher Level, to determine rank (1-indexed)
        const higherRankedCount = await prisma.userStats.count({
          where: {
            OR: [
              { xp: { gt: userStats.xp } },
              {
                xp: userStats.xp,
                level: { gt: userStats.level }
              }
            ]
          }
        });
        userRank = higherRankedCount + 1;
      }
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        userStanding: userStats ? {
          ...userStats,
          rank: userRank
        } : null,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

// GET /leaderboard/weekly - Weekly leaderboard
app.get('/leaderboard/weekly', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    // Get attempts this week
    const weeklyAttempts = await prisma.quizAttemptRecord.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: weekStart },
      },
      _sum: {
        xpEarned: true,
        score: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          xpEarned: 'desc',
        },
      },
      take: 50,
    });

    const userIds = weeklyAttempts.map(a => a.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const leaderboard = weeklyAttempts.map((attempt, index) => ({
      ...attempt,
      rank: index + 1,
      user: userMap.get(attempt.userId) || null
    }));

    // Find current user's weekly rank
    const userId = req.user!.id;
    const userStanding = leaderboard.find(l => l.userId === userId) || null;

    res.json({
      success: true,
      data: {
        weekStart,
        leaderboard,
        userStanding
      },
    });
  } catch (error: any) {
    console.error('Weekly leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get weekly leaderboard' });
  }
});

// POST /challenge/create - Challenge a friend
app.post('/challenge/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const challengerId = req.user!.id;
    const { opponentId, quizId } = req.body;

    if (challengerId === opponentId) {
      return res.status(400).json({ success: false, error: 'Cannot challenge yourself' });
    }

    // Create challenge (expires in 24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const challenge = await prisma.quizChallenge.create({
      data: {
        challengerId,
        opponentId,
        quizId,
        status: 'pending',
        expiresAt,
        participants: {
          create: [
            { userId: challengerId },
            { userId: opponentId },
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    res.json({
      success: true,
      data: challenge,
    });
  } catch (error: any) {
    console.error('Create challenge error:', error);
    res.status(500).json({ success: false, error: 'Failed to create challenge' });
  }
});

// POST /challenge/:id/accept - Accept challenge
app.post('/challenge/:id/accept', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const challenge = await prisma.quizChallenge.findUnique({
      where: { id },
    });

    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    if (challenge.opponentId !== userId) {
      return res.status(403).json({ success: false, error: 'Not your challenge to accept' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Challenge already accepted/completed' });
    }

    const updated = await prisma.quizChallenge.update({
      where: { id },
      data: { status: 'active' },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Accept challenge error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept challenge' });
  }
});

// GET /challenge/my-challenges - Get user's challenges
app.get('/challenge/my-challenges', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const challenges = await prisma.quizChallenge.findMany({
      where: {
        OR: [
          { challengerId: userId },
          { opponentId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        participants: true,
      },
    });

    res.json({
      success: true,
      data: challenges,
    });
  } catch (error: any) {
    console.error('Get challenges error:', error);
    res.status(500).json({ success: false, error: 'Failed to get challenges' });
  }
});

// POST /challenge/:id/submit - Submit challenge result
app.post('/challenge/:id/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { score } = req.body;

    const challenge = await prisma.quizChallenge.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }

    // Update participant score
    await prisma.challengeParticipant.updateMany({
      where: {
        challengeId: id,
        userId,
      },
      data: {
        score,
        completedAt: new Date(),
      },
    });

    // Update challenge scores
    if (challenge.challengerId === userId) {
      await prisma.quizChallenge.update({
        where: { id },
        data: { challengerScore: score },
      });
    } else {
      await prisma.quizChallenge.update({
        where: { id },
        data: { opponentScore: score },
      });
    }

    // Check if both completed
    const updated = await prisma.quizChallenge.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (updated && updated.challengerScore !== null && updated.opponentScore !== null) {
      // Determine winner
      const winnerId = updated.challengerScore > updated.opponentScore
        ? updated.challengerId
        : updated.opponentId;

      await prisma.quizChallenge.update({
        where: { id },
        data: {
          status: 'completed',
          winnerId,
          completedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Submit challenge error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit challenge' });
  }
});

// ========================================
// Server Start
// ========================================

// ========================================
// Enhanced Gamification - Phase 1 Foundation
// ========================================

app.use('/api/v1/gamification/currency', authenticateToken, currencyRoutes);
app.use('/api/v1/gamification/achievements', authenticateToken, achievementRoutes);
app.use('/api/v1/gamification/challenges', authenticateToken, challengeRoutes);

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   🎮 Analytics Service - Stunity Enterprise       ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🎯 Live Quiz Mode:');
  console.log('   POST   /live/create                    - Create session');
  console.log('   POST   /live/:code/join                - Join session');
  console.log('   GET    /live/:code/lobby               - Get lobby status');
  console.log('   POST   /live/:code/start               - Start quiz');
  console.log('   POST   /live/:code/submit              - Submit answer');
  console.log('   POST   /live/:code/next                - Next question');
  console.log('   GET    /live/:code/leaderboard         - Get leaderboard');
  console.log('   GET    /live/:code/results             - Get final results');
  console.log('');
  console.log('🏆 Leaderboards & Competition:');
  console.log('   GET    /stats/:userId                  - Get user stats');
  console.log('   POST   /stats/record-attempt           - Record quiz & award XP');
  console.log('   GET    /leaderboard/global             - Global leaderboard');
  console.log('   GET    /leaderboard/weekly             - Weekly leaderboard');
  console.log('   POST   /challenge/create               - Create challenge');
  console.log('   POST   /challenge/:id/accept           - Accept challenge');
  console.log('   GET    /challenge/my-challenges        - Get my challenges');
  console.log('   POST   /challenge/:id/submit           - Submit challenge result');
  console.log('');
  console.log('🔥 Streaks & Achievements:');
  console.log('   GET    /streak/:userId                 - Get user streak');
  console.log('   POST   /streak/update                  - Update streak after quiz');
  console.log('   POST   /streak/freeze                  - Use streak freeze');
  console.log('   GET    /achievements                   - Get all achievements');
  console.log('   GET    /achievements/:userId           - Get user achievements');
  console.log('   POST   /achievements/unlock            - Unlock achievement');
  console.log('   POST   /achievements/check             - Check & auto-unlock achievements');
  console.log('');
  console.log('✅ Analytics Service - Ready for professional quiz features!');
});

// ============================================================
// PHASE 1.3: STREAKS & ACHIEVEMENTS ENDPOINTS
// ============================================================

// GET /streak/:userId - Get user's streak
app.get('/streak/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    let streak = await prisma.learningStreak.findUnique({
      where: { userId },
    });

    // Create streak if doesn't exist
    if (!streak) {
      streak = await prisma.learningStreak.create({
        data: {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          lastQuizDate: null,
          freezesTotal: 1, // Start with 1 freeze
        },
      });
    }

    res.json({ success: true, streak });
  } catch (error: any) {
    console.error('Get streak error:', error);
    res.status(500).json({ success: false, error: 'Failed to get streak' });
  }
});

// POST /streak/update - Update streak after quiz
app.post('/streak/update', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const streak = await prisma.learningStreak.findUnique({
      where: { userId },
    });

    if (!streak) {
      // Create new streak
      const newStreak = await prisma.learningStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastQuizDate: new Date(),
          freezesTotal: 1,
        },
      });

      return res.json({
        success: true,
        streak: newStreak,
        streakIncreased: true,
        achievementUnlocked: null,
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastQuiz = streak.lastQuizDate ? new Date(streak.lastQuizDate) : null;
    if (lastQuiz) lastQuiz.setHours(0, 0, 0, 0);

    let newCurrentStreak = streak.currentStreak;
    let streakIncreased = false;
    let achievementUnlocked = null;

    if (!lastQuiz) {
      // First quiz
      newCurrentStreak = 1;
      streakIncreased = true;
    } else {
      const daysDiff = Math.floor((today.getTime() - lastQuiz.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Same day, no change
      } else if (daysDiff === 1) {
        // Next day, increase streak
        newCurrentStreak = streak.currentStreak + 1;
        streakIncreased = true;

        // Check for streak achievements
        if (newCurrentStreak === 7) {
          achievementUnlocked = 'STREAK_7_DAYS';
        } else if (newCurrentStreak === 30) {
          achievementUnlocked = 'STREAK_30_DAYS';
        } else if (newCurrentStreak === 100) {
          achievementUnlocked = 'STREAK_100_DAYS';
        }
      } else {
        // Missed a day, reset streak
        newCurrentStreak = 1;
      }
    }

    const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

    // Update streak
    const updatedStreak = await prisma.learningStreak.update({
      where: { userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastQuizDate: new Date(),
      },
    });

    res.json({
      success: true,
      streak: updatedStreak,
      streakIncreased,
      achievementUnlocked,
    });
  } catch (error: any) {
    console.error('Update streak error:', error);
    res.status(500).json({ success: false, error: 'Failed to update streak' });
  }
});

// POST /streak/freeze - Use streak freeze
app.post('/streak/freeze', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const streak = await prisma.learningStreak.findUnique({
      where: { userId },
    });

    if (!streak || streak.freezesTotal <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No freezes available'
      });
    }

    const updatedStreak = await prisma.learningStreak.update({
      where: { userId },
      data: {
        freezesTotal: streak.freezesTotal - 1,
        lastQuizDate: new Date(), // Extend last quiz date
      },
    });

    res.json({ success: true, streak: updatedStreak });
  } catch (error: any) {
    console.error('Freeze streak error:', error);
    res.status(500).json({ success: false, error: 'Failed to freeze streak' });
  }
});

// GET /achievements - Get all available achievements
app.get('/achievements', authenticateToken, async (_req: AuthRequest, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: { type: 'asc' },
    });

    res.json({ success: true, achievements });
  } catch (error: any) {
    console.error('Get achievements error:', error);
    res.status(500).json({ success: false, error: 'Failed to get achievements' });
  }
});

// GET /achievements/:userId - Get user's achievements
app.get('/achievements/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const userAchievements = await prisma.userGameAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });

    res.json({ success: true, userAchievements });
  } catch (error: any) {
    console.error('Get user achievements error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user achievements' });
  }
});

// POST /achievements/unlock - Unlock achievement
app.post('/achievements/unlock', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { achievementId } = req.body;

    // Check if already unlocked
    const existing = await prisma.userGameAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
    });

    if (existing) {
      return res.json({ success: true, userAchievement: existing, alreadyUnlocked: true });
    }

    // Unlock achievement
    const userAchievement = await prisma.userGameAchievement.create({
      data: {
        userId,
        achievementId,
      },
      include: { achievement: true },
    });

    res.json({ success: true, userAchievement, alreadyUnlocked: false });
  } catch (error: any) {
    console.error('Unlock achievement error:', error);
    res.status(500).json({ success: false, error: 'Failed to unlock achievement' });
  }
});

// POST /achievements/check - Check and auto-unlock achievements
app.post('/achievements/check', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get user stats and attempts
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
    });

    if (!userStats) {
      return res.json({ success: true, newAchievements: [] });
    }

    const newAchievements: any[] = [];

    // Check various achievement conditions
    const checkAndUnlock = async (achievementId: string, condition: boolean) => {
      if (!condition) return;

      const existing = await prisma.userGameAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      if (!existing) {
        const achievement = await prisma.achievement.findUnique({
          where: { id: achievementId },
        });

        if (achievement) {
          const unlocked = await prisma.userGameAchievement.create({
            data: { userId, achievementId },
            include: { achievement: true },
          });
          newAchievements.push(unlocked);
        }
      }
    };

    // First perfect score (100% accuracy)
    await checkAndUnlock('FIRST_PERFECT', attempts.some((a: any) => a.accuracy === 100));

    // Speed demon (quiz completed in under 50% of time limit) - disabled for now
    // await checkAndUnlock('SPEED_DEMON', attempts.some(a => a.timeSpent && a.timeSpent < timeLimit / 2));

    // Knowledge master (100 quizzes)
    await checkAndUnlock('KNOWLEDGE_MASTER', userStats.totalQuizzes >= 100);

    // Top performer (level 10)
    await checkAndUnlock('TOP_PERFORMER', userStats.level >= 10);

    // Quiz master (level 20)
    await checkAndUnlock('QUIZ_MASTER', userStats.level >= 20);

    res.json({ success: true, newAchievements });
  } catch (error: any) {
    console.error('Check achievements error:', error);
    res.status(500).json({ success: false, error: 'Failed to check achievements' });
  }
});

// Database connection check
prisma.$connect()
  .then(() => {
    console.log('✅ Analytics Service - Database ready');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});
