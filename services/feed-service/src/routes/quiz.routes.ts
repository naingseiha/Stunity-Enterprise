/**
 * Quiz Routes
 * 
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead, feedRanker, upload } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from '../utils/r2';
import { feedCache, EventPublisher } from '../redis';
import { buildPostAccessWhere, resolveFeedVisibilityWhere } from '../utils/visibilityScope';
import { getLatestQuizAttemptForUser } from '../utils/quizAttempts';
import { getUserJoinedQuizzesPage } from '../utils/joinedQuizzes';
import { gradeQuizSubmission } from '../utils/quizGrading';
import { buildQuizHistoryAggregates } from '../utils/quizHistory';
import { normalizeQuizQuestionsForGrading } from '../utils/quizQuestions';
import { createRecallCardsForFailedAnswers } from '../utils/recallCardsFromQuiz';

const router = Router();

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const normalizeAnswerText = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const stripChoicePrefix = (value: string): string =>
  value.replace(/^[a-f]\s*[:.)-]\s*/i, '').trim();

const getChoiceIndex = (answer: unknown, options: unknown): number | null => {
  if (!Array.isArray(options)) return null;

  if (typeof answer === 'number' && Number.isInteger(answer) && options[answer] !== undefined) {
    return answer;
  }

  const raw = String(answer ?? '').trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const index = Number(raw);
    return options[index] !== undefined ? index : null;
  }

  const letterMatch = raw.match(/^([a-f])(?:\s*[:.)-]\s*(.*))?$/i);
  if (letterMatch) {
    const index = OPTION_LETTERS.indexOf(letterMatch[1].toUpperCase());
    if (options[index] !== undefined) return index;
  }

  const normalizedRaw = normalizeAnswerText(raw);
  const normalizedWithoutPrefix = normalizeAnswerText(stripChoicePrefix(raw));

  const optionIndex = options.findIndex((option) => {
    const normalizedOption = normalizeAnswerText(option);
    return normalizedOption === normalizedRaw || normalizedOption === normalizedWithoutPrefix;
  });

  return optionIndex >= 0 ? optionIndex : null;
};

const isMultipleChoiceCorrect = (userAnswer: unknown, correctAnswer: unknown, options: unknown): boolean => {
  const userChoiceIndex = getChoiceIndex(userAnswer, options);
  const correctChoiceIndex = getChoiceIndex(correctAnswer, options);

  if (userChoiceIndex !== null && correctChoiceIndex !== null) {
    return userChoiceIndex === correctChoiceIndex;
  }

  return normalizeAnswerText(userAnswer) === normalizeAnswerText(correctAnswer);
};

// ========================================
// Quiz Discovery Endpoints (new)
// ========================================

// GET /quizzes — Browse all published quizzes (paginated, category, search)
router.get('/quizzes', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { category, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const take = Math.min(parseInt(limit) || 20, 50);
    const skip = (parseInt(page) - 1) * take;

    const postWhere: any = {
      AND: [
        await resolveFeedVisibilityWhere(prismaRead, {
          userId,
          schoolId: req.user!.schoolId,
        }),
        { postType: 'QUIZ' },
      ],
    };
    if (category && category !== 'ALL') {
      postWhere.AND.push({ topicTags: { has: category } });
    }
    if (search) {
      postWhere.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where: { post: postWhere },
        include: {
          post: { select: { id: true, title: true, content: true, topicTags: true, authorId: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } }, createdAt: true } },
          attempts: { where: { userId }, select: { id: true, score: true, passed: true, pointsEarned: true, submittedAt: true }, take: 1, orderBy: { submittedAt: 'desc' } },
        },
        orderBy: { post: { createdAt: 'desc' } },
        skip,
        take,
      }),
      prisma.quiz.count({ where: { post: postWhere } }),
    ]);

    const data = quizzes.map(q => ({
      id: q.id,
      postId: q.post.id,
      title: q.post.title || 'Untitled Quiz',
      description: q.post.content,
      topicTags: q.post.topicTags,
      author: q.post.author,
      questions: q.questions as any[],
      timeLimit: q.timeLimit,
      passingScore: q.passingScore,
      totalPoints: q.totalPoints,
      userAttempt: (q.attempts as any[])[0] || null,
      createdAt: q.post.createdAt,
    }));

    res.json({ success: true, data, pagination: { page: parseInt(page), limit: take, total, pages: Math.ceil(total / take) } });
  } catch (error: any) {
    console.error('Browse quizzes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
  }
});

// GET /quizzes/recommended — Recommended quizzes for current user
router.get('/quizzes/recommended', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string || '10'), 20);

    const attempted = await prisma.quizAttempt.findMany({
      where: { userId },
      select: { quizId: true },
    });
    const attemptedIds = attempted.map(a => a.quizId);

    const quizzes = await prisma.quiz.findMany({
      where: {
        ...(attemptedIds.length > 0 ? { id: { notIn: attemptedIds } } : {}),
        post: {
          AND: [
            await resolveFeedVisibilityWhere(prismaRead, {
              userId,
              schoolId: req.user!.schoolId,
            }),
            { postType: 'QUIZ' },
          ],
        },
      },
      include: {
        post: { select: { id: true, title: true, content: true, topicTags: true, likesCount: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } }, createdAt: true } },
        _count: { select: { attempts: true } },
      },
      orderBy: [{ post: { likesCount: 'desc' } }, { post: { createdAt: 'desc' } }],
      take: limit,
    });

    const data = quizzes.map(q => ({
      id: q.id,
      postId: q.post.id,
      title: q.post.title || 'Untitled Quiz',
      description: q.post.content,
      topicTags: q.post.topicTags,
      author: q.post.author,
      questions: q.questions as any[],
      timeLimit: q.timeLimit,
      passingScore: q.passingScore,
      totalPoints: q.totalPoints,
      attemptCount: q._count.attempts,
      userAttempt: null,
      createdAt: q.post.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Recommended quizzes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recommendations' });
  }
});

// GET /quizzes/daily — Today's featured daily quiz
router.get('/quizzes/daily', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const passed = await prisma.quizAttempt.findMany({
      where: { userId, passed: true },
      select: { quizId: true },
    });
    const passedIds = passed.map(a => a.quizId);

    const quiz = await prisma.quiz.findFirst({
      where: {
        post: {
          AND: [
            await resolveFeedVisibilityWhere(prismaRead, {
              userId,
              schoolId: req.user!.schoolId,
            }),
            { postType: 'QUIZ' },
            { createdAt: { gte: sevenDaysAgo } },
          ],
        },
        ...(passedIds.length > 0 ? { id: { notIn: passedIds } } : {}),
      },
      include: {
        post: { select: { id: true, title: true, content: true, topicTags: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } }, createdAt: true } },
        attempts: { where: { userId }, select: { id: true, score: true, passed: true, pointsEarned: true }, take: 1, orderBy: { submittedAt: 'desc' } },
      },
      orderBy: { post: { likesCount: 'desc' } },
    });

    if (!quiz) return res.json({ success: true, data: null });

    res.json({
      success: true,
      data: {
        id: quiz.id,
        postId: quiz.post.id,
        title: quiz.post.title || 'Daily Quiz',
        description: quiz.post.content,
        topicTags: quiz.post.topicTags,
        author: quiz.post.author,
        questions: quiz.questions as any[],
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        totalPoints: quiz.totalPoints,
        userAttempt: (quiz.attempts as any[])[0] || null,
        createdAt: quiz.post.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Daily quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch daily quiz' });
  }
});

// GET /quizzes/my-joined — Quizzes the user has attempted (latest attempt per quiz)
router.get('/quizzes/my-joined', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { search, page = '1', limit = '20', status = 'all' } = req.query as Record<string, string>;
    const statusFilter =
      status === 'passed' || status === 'failed' ? status : 'all';

    const result = await getUserJoinedQuizzesPage(prisma, prismaRead, userId, req.user!.schoolId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      status: statusFilter,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Get my joined quizzes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch joined quizzes' });
  }
});

// GET /quizzes/teacher/analytics — Dashboard rollup for quizzes authored by current user
router.get('/quizzes/teacher/analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const periodRaw = String(req.query.period || '30d');
    const period =
      periodRaw === '7d' || periodRaw === '30d' || periodRaw === '90d' || periodRaw === 'all'
        ? periodRaw
        : '30d';
    const classId = typeof req.query.classId === 'string' && req.query.classId.trim()
      ? req.query.classId.trim()
      : null;

    const { buildTeacherQuizAnalytics } = await import('../utils/teacherQuizAnalytics');
    const data = await buildTeacherQuizAnalytics(prisma, userId, period, classId);

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Teacher quiz analytics error:', error);
    const status = error?.statusCode === 403 ? 403 : 500;
    res.status(status).json({
      success: false,
      error: error?.message || 'Failed to load teacher quiz analytics',
    });
  }
});

// GET /quizzes/my-created — Get current user's authored quizzes (Quiz Studio)
router.get('/quizzes/my-created', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Find all quizzes attached to posts authored by the user
    const quizzes = await prisma.quiz.findMany({
      where: {
        post: {
          authorId: userId,
          postType: 'QUIZ'
        }
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            content: true,
            topicTags: true,
            createdAt: true,
          }
        },
        _count: {
          select: { attempts: true }
        }
      },
      orderBy: { post: { createdAt: 'desc' } }
    });

    const data = quizzes.map(q => ({
      id: q.id,
      postId: q.post.id,
      title: q.post.title || 'Untitled Quiz',
      description: q.post.content,
      topicTags: q.post.topicTags,
      questions: q.questions as any[],
      timeLimit: q.timeLimit,
      passingScore: q.passingScore,
      totalPoints: q.totalPoints,
      attemptCount: q._count.attempts,
      createdAt: q.post.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('My created quizzes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your created quizzes' });
  }
});

// GET /quizzes/:id — Single quiz detail with user attempt status
router.get('/quizzes/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        post: { select: { id: true, title: true, content: true, topicTags: true, author: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } }, createdAt: true } },
        attempts: { where: { userId }, select: { id: true, score: true, passed: true, pointsEarned: true, answers: true, submittedAt: true }, take: 1, orderBy: { submittedAt: 'desc' } },
        _count: { select: { attempts: true } },
      },
    });

    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });
    const visibleQuizPost = await prisma.post.findFirst({
      where: buildPostAccessWhere(quiz.postId, {
        userId,
        schoolId: req.user!.schoolId,
      }),
      select: { id: true },
    });

    if (!visibleQuizPost) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    res.json({
      success: true,
      data: {
        id: quiz.id,
        postId: quiz.post.id,
        title: quiz.post.title || 'Quiz',
        description: quiz.post.content,
        topicTags: quiz.post.topicTags,
        author: quiz.post.author,
        questions: quiz.questions as any[],
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        totalPoints: quiz.totalPoints,
        userAttempt: (quiz.attempts as any[])[0] || null,
        attemptCount: quiz._count.attempts,
        createdAt: quiz.post.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Get quiz error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quiz' });
  }
});

// ========================================
// Quiz Submission Endpoints
// ========================================



// POST /quizzes/:id/submit - Submit quiz answers
router.post('/quizzes/:id/submit', authenticateToken, async (req: AuthRequest, res: Response) => {
  console.log('🎯 [QUIZ SUBMIT] Endpoint hit!', {
    quizId: req.params.id,
    userId: req.user?.id,
    answersCount: req.body.answers?.length,
  });

  try {
    const quizId = req.params.id;
    const userId = req.user!.id;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      console.log('❌ [QUIZ SUBMIT] No answers provided');
      return res.status(400).json({ success: false, error: 'Answers array is required' });
    }

    console.log('🔍 [QUIZ SUBMIT] Looking up quiz:', quizId);

    // Fetch quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { post: true },
    });

    if (!quiz) {
      console.log('❌ [QUIZ SUBMIT] Quiz not found:', quizId);
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }
    const visibleQuizPost = await prisma.post.findFirst({
      where: buildPostAccessWhere(quiz.postId, {
        userId,
        schoolId: req.user!.schoolId,
      }),
      select: { id: true },
    });

    if (!visibleQuizPost) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    console.log('✅ [QUIZ SUBMIT] Quiz found:', { id: quiz.id, postId: quiz.postId });

    const graded = gradeQuizSubmission(
      quiz.questions,
      quizId,
      answers,
      quiz.passingScore,
    );
    const { score, passed, pointsEarned, totalPoints, results: answerResults } = graded;

    // Save quiz attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        answers: answers,
        score,
        pointsEarned,
        passed,
      },
    });

    // Bust personalized feed cache so quiz cards show this attempt immediately.
    await feedCache.invalidateUser(userId);

    // Spaced-repetition: every wrong answer becomes (or resets) a RecallCard
    // so it surfaces in the user's feed for review. Non-fatal — logged on
    // failure but doesn't block the response.
    try {
      await createRecallCardsForFailedAnswers(
        prisma,
        userId,
        { id: quiz.post.id, title: quiz.post.title, topicTags: quiz.post.topicTags },
        answerResults,
      );
    } catch (recallErr) {
      console.error('[quiz.submit] recall-card auto-create failed', recallErr);
    }

    // Return results based on visibility settings
    let resultsData: any = {
      attemptId: attempt.id,
      score,
      passed,
      pointsEarned,
      totalPoints,
      submittedAt: attempt.submittedAt,
    };

    // Include detailed results if visibility allows
    if (quiz.resultsVisibility === 'IMMEDIATE' || quiz.resultsVisibility === 'AFTER_SUBMISSION') {
      resultsData.results = answerResults;
      resultsData.questions = normalizeQuizQuestionsForGrading(quiz.questions, quizId);
    }

    res.json({
      success: true,
      data: resultsData,
    });
  } catch (error: any) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit quiz', details: error.message });
  }
});

// GET /quizzes/:id/attempts - Get all attempts for a quiz (instructor only)
router.get('/quizzes/:id/attempts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;

    // Get quiz and check if user is the author
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { post: true },
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    if (quiz.post.authorId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Only quiz author can view all attempts' });
    }

    // Fetch all attempts with user info
    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            studentId: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Calculate statistics
    const totalAttempts = attempts.length;
    const passedAttempts = attempts.filter(a => a.passed).length;
    const avgScore = totalAttempts > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts
      : 0;

    res.json({
      success: true,
      data: {
        attempts,
        statistics: {
          totalAttempts,
          passedAttempts,
          failedAttempts: totalAttempts - passedAttempts,
          passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
          averageScore: Math.round(avgScore),
        },
      },
    });
  } catch (error: any) {
    console.error('Get attempts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get attempts' });
  }
});

// GET /quizzes/:id/attempts/latest - Current user's most recent attempt (for feed "View results")
router.get('/quizzes/:id/attempts/latest', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const userId = req.user!.id;

    const attempt = await getLatestQuizAttemptForUser(prisma, quizId, userId);
    if (!attempt) {
      return res.status(404).json({ success: false, error: 'No attempts yet' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { questions: true, passingScore: true },
    });

    const storedAnswers = Array.isArray(attempt.answers)
      ? (attempt.answers as Array<{ questionId: string; answer: unknown }>)
      : [];

    const graded = quiz
      ? gradeQuizSubmission(quiz.questions, quizId, storedAnswers, quiz.passingScore)
      : null;

    res.json({
      success: true,
      data: {
        ...attempt,
        results: graded?.results ?? [],
      },
    });
  } catch (error: any) {
    console.error('Get latest quiz attempt error:', error);
    res.status(500).json({ success: false, error: 'Failed to get latest attempt' });
  }
});

// GET /quizzes/:id/attempts/my - Get current user's attempts for a quiz
router.get('/quizzes/:id/attempts/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const userId = req.user!.id;

    const attempts = await prisma.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      success: true,
      data: attempts,
    });
  } catch (error: any) {
    console.error('Get my attempts error:', error);
    res.status(500).json({ success: false, error: 'Failed to get attempts' });
  }
});

// GET /quizzes/:id/history - WI5: paginated attempt timeline + progress aggregates
// for the current user (per-quiz history surface). Aggregates cover ALL attempts;
// the `timeline` page is sliced for display.
router.get('/quizzes/:id/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const quizId = req.params.id;
    const userId = req.user!.id;
    const page = Math.max(parseInt((req.query.page as string) || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10) || 20, 1), 50);

    const quiz = await prismaRead.quiz.findUnique({
      where: { id: quizId },
      select: { questions: true, passingScore: true, totalPoints: true, post: { select: { id: true, title: true } } },
    });
    if (!quiz) return res.status(404).json({ success: false, error: 'Quiz not found' });

    // All of the user's attempts (read replica) — newest first for the timeline.
    const attempts = await prismaRead.quizAttempt.findMany({
      where: { quizId, userId },
      orderBy: { submittedAt: 'desc' },
      select: { id: true, score: true, passed: true, pointsEarned: true, submittedAt: true, answers: true },
    });

    // Grade each stored attempt to recover per-question correctness for the
    // accuracy rollup. gradeQuizSubmission is pure + cheap for a single user's
    // attempts on one quiz.
    const summaries = attempts.map((a) => {
      const storedAnswers = Array.isArray(a.answers)
        ? (a.answers as Array<{ questionId: string; answer: unknown }>)
        : [];
      const graded = gradeQuizSubmission(quiz.questions, quizId, storedAnswers, quiz.passingScore);
      return {
        id: a.id,
        score: a.score,
        passed: a.passed,
        pointsEarned: a.pointsEarned,
        submittedAt: a.submittedAt,
        perQuestion: graded.results.map((r) => ({ questionId: r.questionId, correct: r.correct })),
      };
    });

    const aggregates = buildQuizHistoryAggregates(summaries);

    const start = (page - 1) * limit;
    const timeline = attempts.slice(start, start + limit).map((a) => ({
      id: a.id,
      score: a.score,
      passed: a.passed,
      pointsEarned: a.pointsEarned,
      submittedAt: a.submittedAt,
    }));

    res.json({
      success: true,
      data: {
        quiz: { id: quiz.post.id, quizId, title: quiz.post.title || 'Quiz', passingScore: quiz.passingScore, totalPoints: quiz.totalPoints },
        aggregates,
        timeline,
        pagination: { page, limit, total: attempts.length, pages: Math.ceil(attempts.length / limit) },
      },
    });
  } catch (error: any) {
    console.error('Get quiz history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get quiz history' });
  }
});

// GET /quizzes/:id/attempts/:attemptId - Get specific attempt details
router.get('/quizzes/:id/attempts/:attemptId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id: quizId, attemptId } = req.params;
    const userId = req.user!.id;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: { post: true },
        },
      },
    });

    if (!attempt || attempt.quizId !== quizId) {
      return res.status(404).json({ success: false, error: 'Attempt not found' });
    }

    // Only allow user to see their own attempt, or quiz author to see any attempt
    if (attempt.userId !== userId && attempt.quiz.post.authorId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this attempt' });
    }

    // Include questions for detailed review
    const questions = attempt.quiz.questions as any[];
    const answers = attempt.answers as any[];

    res.json({
      success: true,
      data: {
        ...attempt,
        questions,
        detailedAnswers: answers.map((userAnswer: any) => {
          const question = questions.find((q: any) => q.id === userAnswer.questionId);
          return {
            questionId: userAnswer.questionId,
            question: question?.text,
            type: question?.type,
            options: question?.options,
            userAnswer: userAnswer.answer,
            correctAnswer: question?.correctAnswer,
            points: question?.points,
          };
        }),
      },
    });
  } catch (error: any) {
    console.error('Get attempt details error:', error);
    res.status(500).json({ success: false, error: 'Failed to get attempt details' });
  }
});

export default router;
