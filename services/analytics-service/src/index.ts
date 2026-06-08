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
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import currencyRoutes from './gamification/routes/currency.routes';
import achievementRoutes from './gamification/routes/achievements.routes';
import challengeRoutes from './gamification/routes/challenges.routes';
import leaderboardRoutes from './gamification/routes/leaderboards.routes';
import teamChallengeRoutes from './gamification/routes/team-challenges.routes';
import shopRoutes from './gamification/routes/shop.routes';
import {
  buildWeekActivityFromDates,
  computeStreakStatus,
  computeStreakTransition,
  getWeekStartMonday,
  loadWeekActivityForUser,
} from './utils/streakCalendar';
import { prisma } from './lib/prisma';
import { shouldRunDbStartupWarmup } from '../../lib/prisma-pool-url';
import { resolveFlagsForUser } from './featureFlags';

// Load environment variables from root .env
dotenv.config({ path: '../../.env' });
dotenv.config(); // fallback: also check service-local .env

const app = express();
app.set('trust proxy', 1); // ✅ Required for Cloud Run/Vercel (X-Forwarded-For)
const PORT = process.env.PORT || process.env.ANALYTICS_SERVICE_PORT || 3014;
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in production. Refusing to start.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'stunity-enterprise-secret-2026';

// Auth middleware (Express.Request.user is augmented in src/types/express.d.ts)
const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token required' });
    return;
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email?: string;
      role: string;
      schoolId?: string;
      teacherId?: string;
      parentId?: string;
    };
    req.user = user;
    next();
  } catch {
    res.status(403).json({ success: false, error: 'Invalid token' });
    return;
  }
};

// Use Request in route handlers; after authenticateToken, req.user is set (see src/types/express.d.ts).

// Middleware
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins in production if CORS_ORIGIN is set to *
    if (process.env.CORS_ORIGIN === '*') return callback(null, true);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
}));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'analytics-service',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get(['/ready', '/health/ready'], async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'analytics-service',
      error: error.message || 'Database health check failed',
      timestamp: new Date().toISOString(),
    });
  }
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

const FEED_SERVICE_URL = process.env.FEED_SERVICE_URL || 'http://localhost:3010';

// POST /live/create - Host creates a live quiz session
app.post('/live/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { quizId, settings } = req.body;
    const hostId = req.user!.id;

    // Fetch quiz details from feed service
    let quiz: any = { id: quizId };
    const authHeader = req.headers.authorization;
    try {
      const feedRes = await fetch(`${FEED_SERVICE_URL}/quizzes/${quizId}`, {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      if (feedRes.ok) {
        const feedData = await feedRes.json() as any;
        if (feedData.success && feedData.data) {
          const d = feedData.data;
          quiz = {
            id: d.id,
            post: { title: d.title },
            questions: (d.questions || []).map((q: any, i: number) => ({
              id: q.id || `q_${i}`,
              text: q.text,
              type: q.type || 'MULTIPLE_CHOICE',
              options: q.options || [],
              correctAnswer: q.correctAnswer ?? q.correctAnswerIndex ?? 0,
              points: q.points ?? 100,
            })),
          };
        }
      }
    } catch (err: any) {
      console.warn('[LIVE QUIZ] Could not fetch quiz from feed-service:', err.message);
    }

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
        quizTitle: quiz.post?.title || 'Quiz',
        questionCount: (quiz.questions as any[])?.length ?? 0,
      },
    });
  } catch (error: any) {
    console.error('Create live session error:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// POST /live/:code/join - Student joins a live session
app.post('/live/:code/join', authenticateToken, async (req: Request, res: Response) => {
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
app.get('/live/:code/lobby', authenticateToken, async (req: Request, res: Response) => {
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
        hostId: session.hostId,
        participantCount: session.participants.size,
        participants,
        quizTitle: session.quiz?.post?.title,
        questionCount: (session.quiz?.questions as any[])?.length ?? 0,
        settings: session.settings,
      },
    });
  } catch (error: any) {
    console.error('Get lobby error:', error);
    res.status(500).json({ success: false, error: 'Failed to get lobby status' });
  }
});

// GET /live/:code/current - Get current question (for host & participants to poll)
app.get('/live/:code/current', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const session = liveSessions.get(code);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const questions = session.quiz?.questions as any[];
    const questionCount = questions?.length ?? 0;

    if (session.status === 'lobby') {
      return res.json({
        success: true,
        data: {
          status: 'lobby',
          currentQuestionIndex: -1,
          questionCount,
        },
      });
    }

    if (session.status === 'completed') {
      return res.json({
        success: true,
        data: {
          status: 'completed',
          currentQuestionIndex: questionCount - 1,
          questionCount,
        },
      });
    }

    const currentQuestion = questions?.[session.currentQuestionIndex];
    if (!currentQuestion) {
      return res.json({
        success: true,
        data: {
          status: session.status,
          currentQuestionIndex: session.currentQuestionIndex,
          questionCount,
        },
      });
    }

    res.json({
      success: true,
      data: {
        status: 'active',
        hostId: session.hostId,
        currentQuestionIndex: session.currentQuestionIndex,
        question: {
          id: currentQuestion.id,
          text: currentQuestion.text,
          type: currentQuestion.type,
          options: currentQuestion.options,
          points: currentQuestion.points,
        },
        timeLimit: session.settings.questionTime,
        questionCount,
      },
    });
  } catch (error: any) {
    console.error('Get current question error:', error);
    res.status(500).json({ success: false, error: 'Failed to get current question' });
  }
});

// POST /live/:code/start - Host starts the quiz
app.post('/live/:code/start', authenticateToken, async (req: Request, res: Response) => {
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

    const questions = (session.quiz?.questions as any[]) ?? [];
    const currentQuestion = questions[0];
    if (!currentQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Quiz has no questions. Create a session with a valid quiz that has questions (fetch quiz from feed-service).',
      });
    }

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
app.post('/live/:code/submit', authenticateToken, async (req: Request, res: Response) => {
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
app.post('/live/:code/next', authenticateToken, async (req: Request, res: Response) => {
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
app.get('/live/:code/leaderboard', authenticateToken, async (req: Request, res: Response) => {
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
app.get('/live/:code/results', authenticateToken, async (req: Request, res: Response) => {
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
  // Smooth progression: Base 100 XP, increases by 50 per level.
  return 100 + (level - 1) * 50;
};

const calculateCumulativeXPForLevel = (level: number): number => {
  let totalXP = 0;
  for (let currentLevel = 1; currentLevel < level; currentLevel++) {
    totalXP += calculateXPForLevel(currentLevel);
  }
  return totalXP;
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

type FeedQuizAttempt = {
  id: string;
  quizId: string;
  userId: string;
  score: number;
  pointsEarned: number;
  passed: boolean;
  submittedAt: Date;
  answers: unknown;
};

const computeQuizPracticeFromFeedAttempts = (attempts: FeedQuizAttempt[]) => {
  if (attempts.length === 0) return null;

  const sorted = [...attempts].sort(
    (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
  );

  const passedCount = attempts.filter((a) => a.passed).length;
  const passRate = (passedCount / attempts.length) * 100;

  let winStreak = 0;
  for (const attempt of sorted) {
    if (attempt.passed) winStreak += 1;
    else break;
  }

  let correctAnswers = 0;
  let totalAnswers = 0;
  for (const attempt of attempts) {
    const answerArr = Array.isArray(attempt.answers) ? attempt.answers : [];
    const questionCount = answerArr.length;
    totalAnswers += questionCount;
    correctAnswers += Math.round((attempt.score / 100) * questionCount);
  }

  const avgScore =
    attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length;

  const estimatedXp = attempts.reduce((sum, attempt) => {
    const answerArr = Array.isArray(attempt.answers) ? attempt.answers : [];
    const maxPoints =
      attempt.score > 0
        ? Math.round(attempt.pointsEarned / (attempt.score / 100))
        : Math.max(answerArr.length * 10, 10);
    return sum + calculateXPForQuiz(attempt.pointsEarned, maxPoints, 0, 300);
  }, 0);

  const recentAttempts = sorted.slice(0, 10).map((attempt) => {
    const answerArr = Array.isArray(attempt.answers) ? attempt.answers : [];
    const questionCount = answerArr.length;
    const maxPoints =
      attempt.score > 0
        ? Math.round(attempt.pointsEarned / (attempt.score / 100))
        : questionCount * 10;

    return {
      id: attempt.id,
      userId: attempt.userId,
      quizId: attempt.quizId,
      score: attempt.score,
      totalPoints: maxPoints,
      accuracy: attempt.score,
      timeSpent: 0,
      xpEarned: 0,
      type: 'solo',
      createdAt: attempt.submittedAt.toISOString(),
    };
  });

  return {
    passRate: Math.round(passRate * 10) / 10,
    winStreak,
    correctAnswers,
    totalAnswers,
    avgScore: Math.round(avgScore * 10) / 10,
    totalQuizzes: attempts.length,
    totalPoints: attempts.reduce((sum, attempt) => sum + attempt.pointsEarned, 0),
    estimatedXp,
    recentAttempts,
  };
};

const resolveRecordAttemptScores = (body: {
  score?: number;
  totalPoints?: number;
  scorePercent?: number;
  pointsEarned?: number;
  questionCount?: number;
}) => {
  const totalPoints = Math.max(1, Number(body.totalPoints) || 1);
  const questionCount = Math.max(
    1,
    Number(body.questionCount) ||
      (totalPoints >= 10 ? Math.round(totalPoints / 10) : 1),
  );

  let scorePercent = Number(body.scorePercent);
  if (!Number.isFinite(scorePercent)) {
    const rawScore = Number(body.score) || 0;
    const pointsEarned = Number(body.pointsEarned);
    if (Number.isFinite(pointsEarned) && pointsEarned <= totalPoints) {
      scorePercent = totalPoints > 0 ? (pointsEarned / totalPoints) * 100 : 0;
    } else if (rawScore >= 0 && rawScore <= 100) {
      scorePercent = rawScore;
    } else {
      scorePercent = totalPoints > 0 ? (rawScore / totalPoints) * 100 : 0;
    }
  }

  const pointsEarned = Number.isFinite(Number(body.pointsEarned))
    ? Number(body.pointsEarned)
    : Math.round((scorePercent / 100) * totalPoints);

  const correctCount = Math.round((scorePercent / 100) * questionCount);

  return {
    totalPoints,
    questionCount,
    scorePercent: Math.max(0, Math.min(100, scorePercent)),
    pointsEarned,
    correctCount,
  };
};

// GET /stats/:userId/summary - Lightweight stats for feed/profile cards (single round-trip)
app.get('/stats/:userId/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    let { userId } = req.params;
    if (userId === 'current-user-id') {
      userId = req.user!.id;
    }

    const [stats, feedAttempts, streak] = await Promise.all([
      prisma.userStats.findUnique({ where: { userId } }),
      prisma.quizAttempt.findMany({
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          quizId: true,
          userId: true,
          score: true,
          pointsEarned: true,
          passed: true,
          submittedAt: true,
          answers: true,
        },
      }),
      prisma.learningStreak.findUnique({ where: { userId } }),
    ]);

    const practice = computeQuizPracticeFromFeedAttempts(feedAttempts as FeedQuizAttempt[]);

    let xp = stats?.xp ?? 0;
    let level = stats?.level ?? 1;
    let totalQuizzes = stats?.totalQuizzes ?? 0;
    let avgScore = stats && stats.totalAnswers > 0
      ? (stats.correctAnswers / stats.totalAnswers) * 100
      : 0;

    if (practice) {
      avgScore = practice.avgScore;
      totalQuizzes = Math.max(totalQuizzes, practice.totalQuizzes);
      if ((stats?.xp ?? 0) === 0 && practice.estimatedXp > 0) {
        xp = practice.estimatedXp;
        level = calculateLevelFromXP(xp);
      }
    }

    const xpToNextLevel = calculateXPForLevel(level);
    const currentLevelXP = calculateCumulativeXPForLevel(level);
    const xpProgress = Math.max(0, Math.min(xp - currentLevelXP, xpToNextLevel));

    const recentScores = practice
      ? practice.recentAttempts.map((attempt) => attempt.score).slice(0, 7)
      : [];

    const weekStart = getWeekStartMonday();
    const weekActivity = buildWeekActivityFromDates(
      feedAttempts
        .filter((attempt) => new Date(attempt.submittedAt) >= weekStart)
        .map((attempt) => new Date(attempt.submittedAt)),
    );
    const streakStatus = computeStreakStatus({
      currentStreak: streak?.currentStreak ?? 0,
      lastQuizDate: streak?.lastQuizDate ?? null,
    });

    res.json({
      success: true,
      data: {
        xp,
        level,
        xpProgress,
        xpToNextLevel,
        totalQuizzes,
        totalPoints: practice?.totalPoints ?? stats?.totalPoints ?? 0,
        avgScore: Math.round(avgScore * 10) / 10,
        winRate: practice ? practice.passRate : 0,
        winStreak: Math.max(stats?.winStreak ?? 0, practice?.winStreak ?? 0),
        correctAnswers: practice?.correctAnswers ?? stats?.correctAnswers ?? 0,
        totalAnswers: practice?.totalAnswers ?? stats?.totalAnswers ?? 0,
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
        lastQuizDate: streak?.lastQuizDate ?? null,
        freezesAvailable: streak?.freezesTotal ?? 0,
        weekActivity,
        studiedToday: streakStatus.studiedToday,
        streakAtRisk: streakStatus.streakAtRisk,
        recentScores,
      },
    });
  } catch (error: any) {
    console.error('Get stats summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats summary' });
  }
});

// GET /stats/:userId - Get user stats
app.get('/stats/:userId', authenticateToken, async (req: Request, res: Response) => {
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

    // Aggregate solo quiz practice from feed attempts (source of truth for profile card)
    const feedAttempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });
    const practice = computeQuizPracticeFromFeedAttempts(feedAttempts);

    // Calculate additional metrics (fallback to analytics records)
    let avgScore = stats.totalAnswers > 0
      ? (stats.correctAnswers / stats.totalAnswers) * 100
      : 0;

    let winRate = stats.liveQuizTotal > 0
      ? (stats.liveQuizWins / stats.liveQuizTotal) * 100
      : 0;

    let winStreak = stats.winStreak;
    let correctAnswers = stats.correctAnswers;
    let totalAnswers = stats.totalAnswers;
    let totalQuizzes = stats.totalQuizzes;
    let totalPoints = stats.totalPoints;
    let recentAttempts: any[] = stats.attempts;

    if (practice) {
      avgScore = practice.avgScore;
      winRate = practice.passRate;
      winStreak = Math.max(winStreak, practice.winStreak);
      correctAnswers = practice.correctAnswers;
      totalAnswers = practice.totalAnswers;
      totalQuizzes = Math.max(totalQuizzes, practice.totalQuizzes);
      totalPoints = Math.max(totalPoints, practice.totalPoints);
      recentAttempts = practice.recentAttempts;
    }

    let xp = stats.xp;
    let level = stats.level;
    if (practice && stats.xp === 0 && practice.estimatedXp > 0) {
      xp = practice.estimatedXp;
      level = calculateLevelFromXP(xp);
    }

    const xpToNextLevel = calculateXPForLevel(level);
    const currentLevelXP = calculateCumulativeXPForLevel(level);
    const xpProgress = Math.max(0, Math.min(xp - currentLevelXP, xpToNextLevel));

    res.json({
      success: true,
      data: {
        ...stats,
        xp,
        level,
        totalQuizzes,
        totalPoints,
        correctAnswers,
        totalAnswers,
        winStreak,
        avgScore: Math.round(avgScore * 10) / 10,
        winRate: Math.round(winRate * 10) / 10,
        xpToNextLevel,
        xpProgress,
        recentAttempts,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// POST /stats/record-attempt - Record quiz attempt & award XP
app.post('/stats/record-attempt', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    console.log('📝 [Analytics] Recording attempt for user:', userId);
    console.log('📝 [Analytics] Request body:', JSON.stringify(req.body, null, 2));

    const {
      quizId,
      score,
      totalPoints,
      timeSpent,
      timeLimit,
      type,
      sessionCode,
      rank,
      scorePercent,
      pointsEarned,
      passed,
      questionCount,
    } = req.body;

    const resolved = resolveRecordAttemptScores({
      score,
      totalPoints,
      scorePercent,
      pointsEarned,
      questionCount,
    });

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

    // Calculate XP from points earned vs max points
    const xpEarned = calculateXPForQuiz(
      resolved.pointsEarned,
      resolved.totalPoints,
      timeSpent,
      timeLimit || 300,
    );
    const accuracy = resolved.scorePercent;

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

    // Determine if win (for live quiz) or pass (for solo)
    const isWin = type === 'live' && rank === 1;
    const didPass =
      typeof passed === 'boolean'
        ? passed
        : type !== 'live' && resolved.scorePercent >= 60;

    let nextWinStreak = stats.winStreak;
    let nextBestStreak = stats.bestStreak;
    if (type === 'live') {
      if (isWin) {
        nextWinStreak += 1;
        nextBestStreak = Math.max(nextBestStreak, nextWinStreak);
      } else {
        nextWinStreak = 0;
      }
    } else if (didPass) {
      nextWinStreak += 1;
      nextBestStreak = Math.max(nextBestStreak, nextWinStreak);
    } else {
      nextWinStreak = 0;
    }

    // Update user stats and sync User model via transaction
    console.log('📝 [Analytics] Updating user stats and syncing user...');
    const [updatedStats] = await prisma.$transaction([
      prisma.userStats.update({
        where: { userId },
        data: {
          xp: newXP,
          level: newLevel,
          totalQuizzes: { increment: 1 },
          totalPoints: { increment: resolved.pointsEarned },
          correctAnswers: { increment: resolved.correctCount },
          totalAnswers: { increment: resolved.questionCount },
          winStreak: nextWinStreak,
          bestStreak: nextBestStreak,
          liveQuizWins: type === 'live' && isWin ? { increment: 1 } : undefined,
          liveQuizTotal: type === 'live' ? { increment: 1 } : undefined,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          level: newLevel,
          totalPoints: { increment: resolved.pointsEarned }
        }
      })
    ]);
    console.log('📝 [Analytics] User stats and core User model updated');

    // Record attempt
    console.log('📝 [Analytics] Creating quiz attempt record...');
    const attemptData = {
      userId,
      quizId,
      score: resolved.pointsEarned,
      totalPoints: resolved.totalPoints,
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
app.get('/leaderboard/global', authenticateToken, async (req: Request, res: Response) => {
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
app.get('/leaderboard/weekly', authenticateToken, async (req: Request, res: Response) => {
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

// GET /leaderboard/learning-streak — Ranked by current learning streak days
app.get('/leaderboard/learning-streak', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100);
    const userId = req.user!.id;

    const streaks = await prisma.learningStreak.findMany({
      where: { currentStreak: { gt: 0 } },
      orderBy: [{ currentStreak: 'desc' }, { longestStreak: 'desc' }],
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            email: true,
          },
        },
      },
    });

    const leaderboard = streaks.map((row, index) => ({
      id: row.id,
      userId: row.userId,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      xp: row.currentStreak,
      level: row.currentStreak,
      totalQuizzes: 0,
      totalPoints: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      liveQuizWins: 0,
      liveQuizTotal: 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rank: index + 1,
      user: row.user,
    }));

    const myRow = await prisma.learningStreak.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            email: true,
          },
        },
      },
    });

    let userStanding = null;
    if (myRow) {
      const higherCount = await prisma.learningStreak.count({
        where: {
          OR: [
            { currentStreak: { gt: myRow.currentStreak } },
            {
              currentStreak: myRow.currentStreak,
              longestStreak: { gt: myRow.longestStreak },
            },
          ],
        },
      });
      userStanding = {
        ...myRow,
        xp: myRow.currentStreak,
        level: myRow.currentStreak,
        totalQuizzes: 0,
        totalPoints: 0,
        correctAnswers: 0,
        totalAnswers: 0,
        liveQuizWins: 0,
        liveQuizTotal: 0,
        rank: myRow.currentStreak > 0 ? higherCount + 1 : null,
        user: myRow.user,
      };
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        userStanding,
      },
    });
  } catch (error: any) {
    console.error('Learning streak leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get learning streak leaderboard' });
  }
});

// POST /challenge/create - Challenge a friend
app.post('/challenge/create', authenticateToken, async (req: Request, res: Response) => {
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
app.post('/challenge/:id/accept', authenticateToken, async (req: Request, res: Response) => {
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
app.get('/challenge/my-challenges', authenticateToken, async (req: Request, res: Response) => {
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
app.post('/challenge/:id/submit', authenticateToken, async (req: Request, res: Response) => {
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
app.use('/api/v1/gamification/leaderboards', authenticateToken, leaderboardRoutes);
app.use('/api/v1/gamification/team-challenges', authenticateToken, teamChallengeRoutes);
app.use('/api/v1/gamification/shop', authenticateToken, shopRoutes);

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

// GET /feature-flags - Resolved feature flags for the calling user (deterministic
// %-rollout). Mobile fetches this on launch to gate features. GrowthBook can later
// replace the resolver without changing this contract.
app.get('/feature-flags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    res.json({ success: true, flags: resolveFlagsForUser(userId) });
  } catch (error: any) {
    console.error('Feature flags error:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve feature flags' });
  }
});

// POST /events - Batched product-analytics ingestion. Writes raw events and
// upserts the caller's active-day rollup (powers WAD/MAU).
app.post('/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const schoolId = req.user!.schoolId || null;
    const events = Array.isArray(req.body?.events) ? req.body.events : null;
    if (!events || events.length === 0) {
      return res.status(400).json({ success: false, error: 'events array required' });
    }

    const now = new Date();
    const rows = events
      .slice(0, 100) // cap batch
      .filter((e: any) => e && typeof e.name === 'string')
      .map((e: any) => ({
        userId,
        schoolId,
        name: String(e.name).slice(0, 100),
        props: e.props && typeof e.props === 'object' ? e.props : undefined,
        sessionId: typeof e.sessionId === 'string' ? e.sessionId.slice(0, 100) : null,
        createdAt: e.ts ? new Date(e.ts) : now,
      }));

    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    await Promise.all([
      rows.length > 0 ? prisma.analyticsEvent.createMany({ data: rows }) : Promise.resolve(),
      prisma.userActiveDay.upsert({
        where: { userId_day: { userId, day } },
        create: { userId, day, schoolId },
        update: {},
      }),
    ]);

    res.json({ success: true, accepted: rows.length });
  } catch (error: any) {
    console.error('Event ingestion error:', error);
    res.status(500).json({ success: false, error: 'Failed to ingest events' });
  }
});

// GET /metrics/summary - North-star + guardrail metrics (admin only). Scoped to the
// admin's school; SUPER_ADMIN sees global. (growth-plan §7)
app.get('/metrics/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const role = req.user!.role;
    if (!['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN'].includes(role)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const isSuper = role === 'SUPER_ADMIN';
    const schoolScope = isSuper ? {} : { schoolId: req.user!.schoolId || '__none__' };

    const now = new Date();
    const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start7 = new Date(startToday); start7.setUTCDate(start7.getUTCDate() - 6);
    const start30 = new Date(startToday); start30.setUTCDate(start30.getUTCDate() - 29);

    const round = (n: number) => Math.round(n);
    const round2 = (n: number) => Math.round(n * 100) / 100;

    const [mauRows, weeklyActiveDays, dauRows, newUsers7d, profileComplete80] = await Promise.all([
      prisma.userActiveDay.findMany({
        where: { ...schoolScope, day: { gte: start30 } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.userActiveDay.count({ where: { ...schoolScope, day: { gte: start7 } } }),
      prisma.userActiveDay.findMany({
        where: { ...schoolScope, day: startToday },
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.user.count({ where: { ...(isSuper ? {} : schoolScope), createdAt: { gte: start7 } } }),
      prisma.user.count({
        where: { ...(isSuper ? {} : schoolScope), createdAt: { gte: start7 }, profileCompleteness: { gte: 80 } },
      }),
    ]);

    const mau = mauRows.length;
    const dau = dauRows.length;
    const dauUserIds = dauRows.map((r) => r.userId);

    // Engagement loop + anti-metric, scoped to today's active users.
    const [recallReviewers, notifCount] = await Promise.all([
      dauUserIds.length > 0
        ? prisma.recallReview.findMany({
            where: { userId: { in: dauUserIds }, reviewedAt: { gte: startToday } },
            select: { userId: true },
            distinct: ['userId'],
          })
        : Promise.resolve([] as { userId: string }[]),
      dauUserIds.length > 0
        ? prisma.notification.count({
            where: { recipientId: { in: dauUserIds }, type: 'SYSTEM', createdAt: { gte: startToday } },
          })
        : Promise.resolve(0),
    ]);

    const dauWithRecall = recallReviewers.length;

    // Skill-gap nudge experiment (flag: skill_gap_nudge) — shown→review
    // conversion over the trailing 7 days. Counts come from AnalyticsEvent
    // (client-emitted), scoped to the admin's school. This is the go/no-go
    // metric: invest in the full nudge engine only if conversionPct holds up
    // (and retention doesn't regress).
    const [nudgeShown, nudgeReviewed] = await Promise.all([
      prisma.analyticsEvent.count({
        where: { ...schoolScope, name: 'skill_nudge_shown', createdAt: { gte: start7 } },
      }),
      prisma.analyticsEvent.count({
        where: { ...schoolScope, name: 'skill_nudge_review', createdAt: { gte: start7 } },
      }),
    ]);

    res.json({
      success: true,
      scope: isSuper ? 'global' : 'school',
      generatedAt: now.toISOString(),
      northStar: {
        wadPerMau: mau > 0 ? round2(weeklyActiveDays / mau) : 0, // avg weekly active days per MAU
        dau,
        mau,
        weeklyActiveDays,
      },
      topOfFunnel: {
        newUsers7d,
        profileComplete80,
        pct: newUsers7d > 0 ? round((profileComplete80 / newUsers7d) * 100) : 0,
      },
      engagementLoop: {
        dau,
        dauWithRecall,
        pctDauRecall: dau > 0 ? round((dauWithRecall / dau) * 100) : 0,
      },
      skillNudge: {
        windowDays: 7,
        shown: nudgeShown,
        reviewed: nudgeReviewed,
        conversionPct: nudgeShown > 0 ? round((nudgeReviewed / nudgeShown) * 100) : 0,
      },
      antiMetric: {
        nonUrgentNotifsPerDauToday: dau > 0 ? round2(notifCount / dau) : 0,
        cap: 3,
      },
    });
  } catch (error: any) {
    console.error('Metrics summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to compute metrics' });
  }
});

// GET /streak/leaderboard?scope=school|class|club - Streak ranking within a scope
// (growth-plan §3.2). Registered BEFORE /streak/:userId so it isn't captured by it.
app.get('/streak/leaderboard', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const scope = String(req.query.scope || 'school');
    const LIMIT = 50;

    const empty = (extra: object = {}) =>
      res.json({ success: true, scope, entries: [], myRank: null, myStreak: 0, ...extra });

    // Build the streak filter for the requested scope.
    let whereStreak: any;

    if (scope === 'school') {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { schoolId: true } });
      if (!me?.schoolId) return empty();
      whereStreak = { currentStreak: { gt: 0 }, user: { schoolId: me.schoolId } };
    } else if (scope === 'class') {
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { studentId: true } });
      if (!me?.studentId) return empty();
      const myClasses = await prisma.studentClass.findMany({
        where: { studentId: me.studentId, status: 'ACTIVE' },
        select: { classId: true },
      });
      const classIds = myClasses.map((c) => c.classId);
      if (classIds.length === 0) return empty();
      const classmates = await prisma.studentClass.findMany({
        where: { classId: { in: classIds }, status: 'ACTIVE' },
        select: { studentId: true },
      });
      const studentIds = [...new Set(classmates.map((c) => c.studentId))];
      const users = await prisma.user.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      });
      whereStreak = { currentStreak: { gt: 0 }, userId: { in: users.map((u) => u.id) } };
    } else if (scope === 'club') {
      const myClubs = await prisma.clubMember.findMany({
        where: { userId, isActive: true },
        select: { clubId: true },
      });
      const clubIds = myClubs.map((c) => c.clubId);
      if (clubIds.length === 0) return empty();
      const members = await prisma.clubMember.findMany({
        where: { clubId: { in: clubIds }, isActive: true },
        select: { userId: true },
      });
      whereStreak = { currentStreak: { gt: 0 }, userId: { in: [...new Set(members.map((m) => m.userId))] } };
    } else {
      return res.status(400).json({ success: false, error: 'Invalid scope' });
    }

    const rows = await prisma.learningStreak.findMany({
      where: whereStreak,
      orderBy: [{ currentStreak: 'desc' }, { longestStreak: 'desc' }],
      take: LIMIT,
      select: {
        userId: true,
        currentStreak: true,
        longestStreak: true,
        user: { select: { firstName: true, lastName: true, profilePictureUrl: true } },
      },
    });

    const entries = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: `${r.user?.firstName ?? ''} ${r.user?.lastName ?? ''}`.trim() || 'Learner',
      avatar: r.user?.profilePictureUrl ?? null,
      currentStreak: r.currentStreak,
      longestStreak: r.longestStreak,
      isMe: r.userId === userId,
    }));

    // The caller's own standing (even if outside the top N).
    const myStreakRec = await prisma.learningStreak.findUnique({
      where: { userId },
      select: { currentStreak: true },
    });
    const myStreak = myStreakRec?.currentStreak ?? 0;
    let myRank: number | null = null;
    if (myStreak > 0) {
      const higher = await prisma.learningStreak.count({
        where: { ...whereStreak, currentStreak: { gt: myStreak } },
      });
      myRank = higher + 1;
    }

    res.json({ success: true, scope, entries, myRank, myStreak });
  } catch (error: any) {
    console.error('Streak leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get streak leaderboard' });
  }
});

// GET /streak/:userId - Get user's streak
app.get('/streak/:userId', authenticateToken, async (req: Request, res: Response) => {
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
          freezesTotal: 0, // earned per 7-day milestone, not granted up front
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
app.post('/streak/update', authenticateToken, async (req: Request, res: Response) => {
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
          freezesTotal: 0, // earned per 7-day milestone, not granted up front
        },
      });

      const weekActivity = await loadWeekActivityForUser(prisma, userId);
      const streakStatus = computeStreakStatus(newStreak);

      return res.json({
        success: true,
        streak: newStreak,
        streakIncreased: true,
        achievementUnlocked: null,
        weekActivity,
        studiedToday: streakStatus.studiedToday,
        streakAtRisk: streakStatus.streakAtRisk,
      });
    }

    const transition = computeStreakTransition(streak);
    const { streakIncreased, achievementUnlocked, freezeEarned, freezeSpent } = transition;

    // Update streak
    const updatedStreak = await prisma.learningStreak.update({
      where: { userId },
      data: {
        currentStreak: transition.currentStreak,
        longestStreak: transition.longestStreak,
        lastQuizDate: new Date(),
        freezesTotal: transition.freezesTotal,
        freezesUsed: transition.freezesUsed,
      },
    });

    const weekActivity = await loadWeekActivityForUser(prisma, userId);
    const streakStatus = computeStreakStatus(updatedStreak);

    res.json({
      success: true,
      streak: updatedStreak,
      streakIncreased,
      achievementUnlocked,
      freezeEarned,
      freezeSpent,
      freezesAvailable: updatedStreak.freezesTotal,
      weekActivity,
      studiedToday: streakStatus.studiedToday,
      streakAtRisk: streakStatus.streakAtRisk,
    });
  } catch (error: any) {
    console.error('Update streak error:', error);
    res.status(500).json({ success: false, error: 'Failed to update streak' });
  }
});

// POST /streak/freeze - Use streak freeze
app.post('/streak/freeze', authenticateToken, async (req: Request, res: Response) => {
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
        freezesUsed: streak.freezesUsed + 1,
        lastQuizDate: new Date(),
      },
    });

    const weekActivity = await loadWeekActivityForUser(prisma, userId);
    const streakStatus = computeStreakStatus(updatedStreak);

    res.json({
      success: true,
      streak: updatedStreak,
      freezesAvailable: updatedStreak.freezesTotal,
      weekActivity,
      studiedToday: streakStatus.studiedToday,
      streakAtRisk: streakStatus.streakAtRisk,
    });
  } catch (error: any) {
    console.error('Freeze streak error:', error);
    res.status(500).json({ success: false, error: 'Failed to freeze streak' });
  }
});

// GET /achievements - Get all available achievements
app.get('/achievements', authenticateToken, async (_req: Request, res: Response) => {
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
app.get('/achievements/:userId', authenticateToken, async (req: Request, res: Response) => {
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
app.post('/achievements/unlock', authenticateToken, async (req: Request, res: Response) => {
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
app.post('/achievements/check', authenticateToken, async (req: Request, res: Response) => {
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

// Database connection check — do NOT exit on failure; Supabase's connection
// pooler occasionally trips the circuit-breaker during a cold start. The
// service should stay up and individual requests will fail gracefully.
if (shouldRunDbStartupWarmup()) {
  prisma.$connect()
    .then(() => {
      console.log('✅ Analytics Service - Database ready');
    })
    .catch((error) => {
      console.error('⚠️  Analytics Service - DB connect warning (service will continue):', error.message);
    });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await prisma.$disconnect();
  process.exit(0);
});
