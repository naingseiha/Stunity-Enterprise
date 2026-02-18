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

const router = Router();

// ========================================
// Quiz Endpoints
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

    console.log('✅ [QUIZ SUBMIT] Quiz found:', { id: quiz.id, postId: quiz.postId });

    // Parse questions from JSON
    const questions = quiz.questions as any[];

    // Calculate score
    let pointsEarned = 0;
    const answerResults = answers.map((userAnswer: any) => {
      const question = questions.find((q: any) => q.id === userAnswer.questionId);
      if (!question) {
        return { questionId: userAnswer.questionId, correct: false, pointsEarned: 0 };
      }

      let isCorrect = false;

      // Check answer based on question type
      if (question.type === 'MULTIPLE_CHOICE') {
        // Handle both string and number formats
        const userAnswerStr = String(userAnswer.answer);
        const correctAnswerStr = String(question.correctAnswer);
        isCorrect = userAnswerStr === correctAnswerStr;

        console.log('🔍 [QUIZ] MC Question:', {
          questionId: question.id,
          userAnswer: userAnswer.answer,
          userAnswerStr,
          correctAnswer: question.correctAnswer,
          correctAnswerStr,
          isCorrect
        });
      } else if (question.type === 'TRUE_FALSE') {
        // Handle both string and boolean formats
        const userAnswerStr = String(userAnswer.answer).toLowerCase();
        const correctAnswerStr = String(question.correctAnswer).toLowerCase();
        isCorrect = userAnswerStr === correctAnswerStr;
      } else if (question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK') {
        // Case-insensitive comparison, trimmed
        const userAns = String(userAnswer.answer || '').toLowerCase().trim();
        const correctAns = String(question.correctAnswer || '').toLowerCase().trim();
        isCorrect = userAns === correctAns;
      } else if (question.type === 'ORDERING') {
        try {
          // Parse user answer if string provided
          const userOrder = typeof userAnswer.answer === 'string' ? JSON.parse(userAnswer.answer) : userAnswer.answer;
          const correctOrder = question.options;

          if (Array.isArray(userOrder) && Array.isArray(correctOrder)) {
            isCorrect = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
          } else {
            isCorrect = false;
          }
        } catch (e) {
          isCorrect = false;
        }
      } else if (question.type === 'MATCHING') {
        try {
          const userMatches = typeof userAnswer.answer === 'string' ? JSON.parse(userAnswer.answer) : userAnswer.answer;
          const correctMatches: Record<string, string> = {};
          if (Array.isArray(question.options)) {
            question.options.forEach((opt: string) => {
              const parts = opt.split(':::');
              if (parts.length === 2) {
                correctMatches[parts[0]] = parts[1];
              }
            });
          }

          if (userMatches && typeof userMatches === 'object') {
            const userKeys = Object.keys(userMatches);
            const correctKeys = Object.keys(correctMatches);

            if (userKeys.length !== correctKeys.length) {
              isCorrect = false;
            } else {
              isCorrect = userKeys.every(key => userMatches[key] === correctMatches[key]);
            }
          } else {
            isCorrect = false;
          }
        } catch (e) {
          isCorrect = false;
        }
      }

      const points = isCorrect ? (question.points || 10) : 0;
      pointsEarned += points;

      return {
        questionId: userAnswer.questionId,
        correct: isCorrect,
        pointsEarned: points,
        userAnswer: userAnswer.answer,
        correctAnswer: question.correctAnswer,
      };
    });

    // Calculate percentage score
    const score = quiz.totalPoints > 0 ? Math.round((pointsEarned / quiz.totalPoints) * 100) : 0;
    const passed = score >= quiz.passingScore;

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

    // Return results based on visibility settings
    let resultsData: any = {
      attemptId: attempt.id,
      score,
      passed,
      pointsEarned,
      totalPoints: quiz.totalPoints,
      submittedAt: attempt.submittedAt,
    };

    // Include detailed results if visibility allows
    if (quiz.resultsVisibility === 'IMMEDIATE' || quiz.resultsVisibility === 'AFTER_SUBMISSION') {
      resultsData.results = answerResults;
      resultsData.questions = questions;
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
