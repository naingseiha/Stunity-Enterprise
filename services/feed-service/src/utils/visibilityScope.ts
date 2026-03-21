import { Prisma } from '@prisma/client';

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
    visibilityClauses.push({ visibility: 'SCHOOL', author: { schoolId } });
  }

  return {
    OR: visibilityClauses,
  };
}

export function buildPostAccessWhere(postId: string, options: FeedVisibilityScopeOptions): Prisma.PostWhereInput {
  return {
    AND: [
      { id: postId },
      buildFeedVisibilityWhere(options),
    ],
  };
}
