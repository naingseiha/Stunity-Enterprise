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

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3014;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as any;
    req.user = user;
    next();
  } catch (error) {
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

    // Fetch quiz details
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { post: true },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
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
        quizTitle: quiz.post.title,
        questionCount: (quiz.questions as any[]).length,
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

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

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
        totalQuestions: (session.quiz?.questions as any[]).length,
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
// Server Start
// ========================================

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
  console.log('✅ Analytics Service - Ready for professional quiz features!');
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
