import { Prisma, PrismaClient } from '@prisma/client';
import { feedCache } from '../redis';

interface FeedVisibilityScopeOptions {
  userId: string;
  schoolId?: string | null;
}

function classVisibilityForUser(userId: string): Prisma.PostWhereInput {
  return {
    visibility: 'CLASS',
    OR: [
      {
        author: {
          teacher: {
            is: {
              teacherClasses: {
                some: {
                  class: {
                    OR: [
                      {
                        students: {
                          some: {
                            user: { is: { id: userId } },
                          },
                        },
                      },
                      {
                        studentClasses: {
                          some: {
                            student: {
                              is: {
                                user: { is: { id: userId } },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        author: {
          student: {
            is: {
              OR: [
                {
                  class: {
                    is: {
                      OR: [
                        {
                          teacherClasses: {
                            some: {
                              teacher: {
                                is: {
                                  user: { is: { id: userId } },
                                },
                              },
                            },
                          },
                        },
                        {
                          students: {
                            some: {
                              user: { is: { id: userId } },
                            },
                          },
                        },
                        {
                          studentClasses: {
                            some: {
                              student: {
                                is: {
                                  user: { is: { id: userId } },
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  studentClasses: {
                    some: {
                      class: {
                        OR: [
                          {
                            teacherClasses: {
                              some: {
                                teacher: {
                                  is: {
                                    user: { is: { id: userId } },
                                  },
                                },
                              },
                            },
                          },
                          {
                            students: {
                              some: {
                                user: { is: { id: userId } },
                              },
                            },
                          },
                          {
                            studentClasses: {
                              some: {
                                student: {
                                  is: {
                                    user: { is: { id: userId } },
                                  },
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  };
}

export function buildFeedVisibilityWhere(options: FeedVisibilityScopeOptions): Prisma.PostWhereInput {
  const { userId, schoolId } = options;

  const visibilityClauses: Prisma.PostWhereInput[] = [
    { authorId: userId },
    { visibility: 'PUBLIC' },
    classVisibilityForUser(userId),
  ];

  if (schoolId) {
    visibilityClauses.push({ visibility: 'SCHOOL', schoolId });
  }

  return {
    OR: visibilityClauses,
  };
}

async function resolveAccessibleClassAuthorIds(
  prisma: PrismaClient,
  userId: string
): Promise<string[]> {
  const [teacherProfile, studentProfile] = await Promise.all([
    prisma.teacher.findFirst({
      where: { user: { is: { id: userId } } },
      select: {
        homeroomClassId: true,
        teacherClasses: { select: { classId: true } },
      },
    }),
    prisma.student.findFirst({
      where: { user: { is: { id: userId } } },
      select: {
        classId: true,
        studentClasses: { select: { classId: true } },
      },
    }),
  ]);

  const classIds = Array.from(new Set([
    teacherProfile?.homeroomClassId,
    ...(teacherProfile?.teacherClasses.map((item) => item.classId) || []),
    studentProfile?.classId,
    ...(studentProfile?.studentClasses.map((item) => item.classId) || []),
  ].filter((value): value is string => Boolean(value))));

  if (classIds.length === 0) {
    return [];
  }

  const [teacherAuthors, studentAuthors] = await Promise.all([
    prisma.teacher.findMany({
      where: {
        OR: [
          { homeroomClassId: { in: classIds } },
          { teacherClasses: { some: { classId: { in: classIds } } } },
        ],
      },
      select: {
        user: { select: { id: true } },
      },
    }),
    prisma.student.findMany({
      where: {
        OR: [
          { classId: { in: classIds } },
          { studentClasses: { some: { classId: { in: classIds } } } },
        ],
      },
      select: {
        user: { select: { id: true } },
      },
    }),
  ]);

  return Array.from(new Set([
    ...teacherAuthors.map((item) => item.user?.id).filter((value): value is string => Boolean(value)),
    ...studentAuthors.map((item) => item.user?.id).filter((value): value is string => Boolean(value)),
  ]));
}

export async function resolveFeedVisibilityWhere(
  prisma: PrismaClient,
  options: FeedVisibilityScopeOptions
): Promise<Prisma.PostWhereInput> {
  const { userId, schoolId } = options;
  const cacheKey = `visibility-scope:${userId}:${schoolId || 'NONE'}`;
  const cached = await feedCache.get(cacheKey);

  if (cached?.where) {
    return cached.where;
  }

  const classAuthorIds = await resolveAccessibleClassAuthorIds(prisma, userId);

  const visibilityClauses: Prisma.PostWhereInput[] = [
    { authorId: userId },
    { visibility: 'PUBLIC' },
  ];

  if (schoolId) {
    visibilityClauses.push({ visibility: 'SCHOOL', schoolId });
  }

  if (classAuthorIds.length > 0) {
    visibilityClauses.push({
      visibility: 'CLASS',
      authorId: { in: classAuthorIds },
    });
  }

  const resolvedWhere = {
    OR: visibilityClauses,
  };

  await feedCache.set(cacheKey, { where: resolvedWhere }, 60);

  return resolvedWhere;
}

export function buildPostAccessWhere(postId: string, options: FeedVisibilityScopeOptions): Prisma.PostWhereInput {
  return {
    AND: [
      { id: postId },
      buildFeedVisibilityWhere(options),
    ],
  };
}
