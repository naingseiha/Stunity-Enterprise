import { Prisma, PrismaClient } from '@prisma/client';
import { resolveFeedVisibilityWhere } from './visibilityScope';

export type JoinedQuizStatus = 'all' | 'passed' | 'failed';

type LatestAttemptRow = {
  quizId: string;
  id: string;
  score: number;
  passed: boolean;
  pointsEarned: number;
  submittedAt: Date;
};

export async function getUserJoinedQuizzesPage(
  prisma: PrismaClient,
  prismaRead: PrismaClient,
  userId: string,
  schoolId: string | undefined,
  options: {
    page: number;
    limit: number;
    search?: string;
    status?: JoinedQuizStatus;
  },
) {
  const take = Math.min(Math.max(options.limit, 1), 50);
  const page = Math.max(options.page, 1);

  const statusFilter =
    options.status === 'passed'
      ? Prisma.sql`AND qa."passed" = true`
      : options.status === 'failed'
        ? Prisma.sql`AND qa."passed" = false`
        : Prisma.empty;

  const latestAttempts = await prisma.$queryRaw<LatestAttemptRow[]>(Prisma.sql`
    SELECT * FROM (
      SELECT DISTINCT ON (qa."quizId")
        qa."quizId",
        qa."id",
        qa."score",
        qa."passed",
        qa."pointsEarned",
        qa."submittedAt"
      FROM quiz_attempts qa
      WHERE qa."userId" = ${userId}
      ${statusFilter}
      ORDER BY qa."quizId", qa."submittedAt" DESC
    ) latest
    ORDER BY latest."submittedAt" DESC
  `);

  if (latestAttempts.length === 0) {
    return {
      data: [],
      pagination: { page, limit: take, total: 0, pages: 0 },
    };
  }

  const visibilityWhere = await resolveFeedVisibilityWhere(prismaRead, {
    userId,
    schoolId,
  });

  const postAnd: Prisma.PostWhereInput[] = [visibilityWhere, { postType: 'QUIZ' }];
  if (options.search?.trim()) {
    const term = options.search.trim();
    postAnd.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  const quizIds = latestAttempts.map((row) => row.quizId);
  const quizzes = await prisma.quiz.findMany({
    where: {
      id: { in: quizIds },
      post: { AND: postAnd },
    },
    include: {
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          topicTags: true,
          authorId: true,
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
            },
          },
          createdAt: true,
        },
      },
    },
  });

  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const attemptByQuizId = new Map(latestAttempts.map((row) => [row.quizId, row]));

  const merged = latestAttempts
    .map((attempt) => {
      const quiz = quizById.get(attempt.quizId);
      if (!quiz) return null;
      return { quiz, attempt };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const total = merged.length;
  const skip = (page - 1) * take;
  const pageRows = merged.slice(skip, skip + take);

  const data = pageRows.map(({ quiz, attempt }) => {
    const questionsRaw = quiz.questions as unknown;
    const questionCount = Array.isArray(questionsRaw) ? questionsRaw.length : 0;

    return {
      id: quiz.id,
      postId: quiz.post.id,
      title: quiz.post.title || 'Untitled Quiz',
      description: quiz.post.content,
      topicTags: quiz.post.topicTags,
      author: quiz.post.author,
      questionCount,
      questions: [],
      timeLimit: quiz.timeLimit,
      passingScore: quiz.passingScore,
      totalPoints: quiz.totalPoints,
      userAttempt: {
        id: attempt.id,
        score: attempt.score,
        passed: attempt.passed,
        pointsEarned: attempt.pointsEarned,
        submittedAt: attempt.submittedAt.toISOString(),
      },
      lastAttemptAt: attempt.submittedAt.toISOString(),
      createdAt: quiz.post.createdAt,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit: take,
      total,
      pages: Math.ceil(total / take),
    },
  };
}
