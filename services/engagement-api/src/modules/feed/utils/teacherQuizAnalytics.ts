import { PrismaClient } from '@prisma/client';
import { gradeQuizSubmission } from './quizGrading';
import { resolveTeacherClassScope } from './teacherClassScope';

export type TeacherAnalyticsPeriod = '7d' | '30d' | '90d' | 'all';

function periodStart(period: TeacherAnalyticsPeriod): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function buildTeacherQuizAnalytics(
  prisma: PrismaClient,
  userId: string,
  period: TeacherAnalyticsPeriod = '30d',
  classId?: string | null,
) {
  const since = periodStart(period);
  const classScope = await resolveTeacherClassScope(prisma, userId, classId);

  const quizzes = await prisma.quiz.findMany({
    where: {
      post: {
        authorId: userId,
        postType: 'QUIZ',
      },
    },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
        },
      },
    },
    orderBy: { post: { createdAt: 'desc' } },
  });

  if (quizzes.length === 0) {
    return {
      period,
      overview: {
        totalQuizzes: 0,
        totalAttempts: 0,
        uniqueStudents: 0,
        passRate: 0,
        averageScore: 0,
      },
      attemptsOverTime: [],
      quizzes: [],
      questionInsights: [],
      recentAttempts: [],
      classes: classScope.classes,
      classId: classScope.activeClassId,
    };
  }

  const quizIds = quizzes.map((q) => q.id);
  const quizById = new Map(quizzes.map((q) => [q.id, q]));

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      quizId: { in: quizIds },
      ...(since ? { submittedAt: { gte: since } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
    take: 2000,
  });

  const scopedAttempts = classScope.studentUserIds
    ? attempts.filter((attempt) => classScope.studentUserIds!.has(attempt.userId))
    : attempts;

  const uniqueStudents = new Set(scopedAttempts.map((a) => a.userId)).size;
  const passedAttempts = scopedAttempts.filter((a) => a.passed).length;
  const totalAttempts = scopedAttempts.length;
  const averageScore =
    totalAttempts > 0
      ? Math.round(scopedAttempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts)
      : 0;
  const passRate =
    totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 1000) / 10 : 0;

  const dailyMap = new Map<string, { attempts: number; passed: number }>();
  for (const attempt of scopedAttempts) {
    const key = dayKey(attempt.submittedAt);
    const row = dailyMap.get(key) ?? { attempts: 0, passed: 0 };
    row.attempts += 1;
    if (attempt.passed) row.passed += 1;
    dailyMap.set(key, row);
  }

  const attemptsOverTime = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({
      date,
      attempts: row.attempts,
      passed: row.passed,
    }));

  const attemptsByQuiz = new Map<string, typeof scopedAttempts>();
  for (const attempt of scopedAttempts) {
    const list = attemptsByQuiz.get(attempt.quizId) ?? [];
    list.push(attempt);
    attemptsByQuiz.set(attempt.quizId, list);
  }

  const quizSummaries = quizzes.map((quiz) => {
    const quizAttempts = attemptsByQuiz.get(quiz.id) ?? [];
    const quizPassed = quizAttempts.filter((a) => a.passed).length;
    const quizAvg =
      quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length,
          )
        : 0;

    return {
      id: quiz.id,
      postId: quiz.post.id,
      title: quiz.post.title || 'Untitled Quiz',
      description: quiz.post.content,
      questionCount: Array.isArray(quiz.questions) ? (quiz.questions as unknown[]).length : 0,
      passingScore: quiz.passingScore,
      totalPoints: quiz.totalPoints,
      timeLimit: quiz.timeLimit,
      createdAt: quiz.post.createdAt,
      attemptCount: quizAttempts.length,
      uniqueStudents: new Set(quizAttempts.map((a) => a.userId)).size,
      passRate:
        quizAttempts.length > 0
          ? Math.round((quizPassed / quizAttempts.length) * 1000) / 10
          : 0,
      averageScore: quizAvg,
    };
  });

  const questionStats = new Map<
    string,
    {
      quizId: string;
      quizTitle: string;
      questionId: string;
      questionText: string;
      total: number;
      wrong: number;
    }
  >();

  for (const attempt of scopedAttempts.slice(0, 800)) {
    const quiz = quizById.get(attempt.quizId);
    if (!quiz) continue;

    const rawAnswers = Array.isArray(attempt.answers)
      ? (attempt.answers as Array<{ questionId: string; answer: unknown }>)
      : [];

    if (rawAnswers.length === 0) continue;

    const graded = gradeQuizSubmission(
      quiz.questions,
      quiz.id,
      rawAnswers,
      quiz.passingScore,
    );

    for (const result of graded.results) {
      const key = `${quiz.id}:${result.questionId}`;
      const existing = questionStats.get(key) ?? {
        quizId: quiz.id,
        quizTitle: quiz.post.title || 'Untitled Quiz',
        questionId: result.questionId,
        questionText: result.questionId,
        total: 0,
        wrong: 0,
      };

      const questions = Array.isArray(quiz.questions) ? (quiz.questions as any[]) : [];
      const questionMeta = questions.find(
        (q) => q?.id === result.questionId || q?.questionId === result.questionId,
      );
      if (questionMeta?.text) {
        existing.questionText = String(questionMeta.text).slice(0, 120);
      } else if (questionMeta?.question) {
        existing.questionText = String(questionMeta.question).slice(0, 120);
      }

      existing.total += 1;
      if (!result.correct) existing.wrong += 1;
      questionStats.set(key, existing);
    }
  }

  const questionInsights = Array.from(questionStats.values())
    .filter((row) => row.total >= 2)
    .map((row) => ({
      ...row,
      wrongRate: Math.round((row.wrong / row.total) * 1000) / 10,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 8);

  const recentAttempts = scopedAttempts.slice(0, 20).map((attempt) => {
    const quiz = quizById.get(attempt.quizId);
    return {
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: quiz?.post.title || 'Untitled Quiz',
      userId: attempt.userId,
      userName: `${attempt.user.firstName ?? ''} ${attempt.user.lastName ?? ''}`.trim(),
      profilePictureUrl: attempt.user.profilePictureUrl,
      score: attempt.score,
      passed: attempt.passed,
      pointsEarned: attempt.pointsEarned,
      submittedAt: attempt.submittedAt.toISOString(),
    };
  });

  return {
    period,
    overview: {
      totalQuizzes: quizzes.length,
      totalAttempts,
      uniqueStudents,
      passRate,
      averageScore,
    },
    attemptsOverTime,
    quizzes: quizSummaries,
    questionInsights,
    recentAttempts,
    classes: classScope.classes,
    classId: classScope.activeClassId,
  };
}
