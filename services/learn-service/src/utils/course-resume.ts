type LessonRow = {
  id: string;
  courseId: string;
  title: string;
  titleTranslations?: unknown;
  order: number;
  createdAt: Date;
  section: {
    order: number;
  } | null;
};

type LessonProgressRow = {
  lessonId: string;
  completed: boolean;
  updatedAt: Date;
  lesson: {
    courseId: string;
  };
};

export type CourseResumeSnapshot = {
  resumeLessonId: string | null;
  resumeLessonTitle: string | null;
  resumeLessonTitleTranslations?: unknown;
  resumeUpdatedAt: Date | null;
};

type BuildCourseResumeSnapshotsInput = {
  prismaClient: any;
  userId: string;
  courseIds: string[];
};

const sortLessons = (left: LessonRow, right: LessonRow) => {
  const leftSectionOrder = left.section?.order ?? Number.MAX_SAFE_INTEGER;
  const rightSectionOrder = right.section?.order ?? Number.MAX_SAFE_INTEGER;
  if (leftSectionOrder !== rightSectionOrder) return leftSectionOrder - rightSectionOrder;
  if (left.order !== right.order) return left.order - right.order;
  if (left.createdAt.getTime() !== right.createdAt.getTime()) {
    return left.createdAt.getTime() - right.createdAt.getTime();
  }
  return left.id.localeCompare(right.id);
};

export const buildCourseResumeSnapshots = async ({
  prismaClient,
  userId,
  courseIds,
}: BuildCourseResumeSnapshotsInput): Promise<Map<string, CourseResumeSnapshot>> => {
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));
  const snapshots = new Map<string, CourseResumeSnapshot>();
  if (!userId || uniqueCourseIds.length === 0) return snapshots;

  const [lessons, progressRows] = (await Promise.all([
    prismaClient.lesson.findMany({
      where: {
        courseId: { in: uniqueCourseIds },
        isPublished: true,
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        titleTranslations: true,
        order: true,
        createdAt: true,
        section: {
          select: {
            order: true,
          },
        },
      },
    }),
    prismaClient.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          courseId: { in: uniqueCourseIds },
          isPublished: true,
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        lessonId: true,
        completed: true,
        updatedAt: true,
        lesson: {
          select: {
            courseId: true,
          },
        },
      },
    }),
  ])) as [LessonRow[], LessonProgressRow[]];

  const lessonsByCourse = new Map<string, LessonRow[]>();
  const lessonById = new Map<string, LessonRow>();
  for (const lesson of lessons) {
    lessonById.set(lesson.id, lesson);
    const courseLessons = lessonsByCourse.get(lesson.courseId) || [];
    courseLessons.push(lesson);
    lessonsByCourse.set(lesson.courseId, courseLessons);
  }
  for (const courseLessons of lessonsByCourse.values()) {
    courseLessons.sort(sortLessons);
  }

  const progressByCourse = new Map<string, LessonProgressRow[]>();
  for (const progress of progressRows) {
    const courseId = progress.lesson.courseId;
    const currentRows = progressByCourse.get(courseId) || [];
    currentRows.push(progress);
    progressByCourse.set(courseId, currentRows);
  }

  for (const courseId of uniqueCourseIds) {
    const courseLessons = lessonsByCourse.get(courseId) || [];
    if (!courseLessons.length) {
      snapshots.set(courseId, {
        resumeLessonId: null,
        resumeLessonTitle: null,
        resumeUpdatedAt: null,
      });
      continue;
    }

    const courseProgress = progressByCourse.get(courseId) || [];
    const completedLessonIds = new Set(
      courseProgress.filter((progress) => progress.completed).map((progress) => progress.lessonId)
    );
    const firstIncompleteLesson = courseLessons.find((lesson) => !completedLessonIds.has(lesson.id));
    const latestIncompleteProgress = courseProgress.find((progress) => !progress.completed && lessonById.has(progress.lessonId));
    const latestProgress = courseProgress[0];

    const resumeLessonId =
      latestIncompleteProgress?.lessonId
      || firstIncompleteLesson?.id
      || courseLessons[0]?.id
      || null;
    const resumeLesson = resumeLessonId ? lessonById.get(resumeLessonId) || null : null;

    snapshots.set(courseId, {
      resumeLessonId,
      resumeLessonTitle: resumeLesson?.title || null,
      resumeLessonTitleTranslations: resumeLesson?.titleTranslations,
      resumeUpdatedAt: latestIncompleteProgress?.updatedAt || latestProgress?.updatedAt || null,
    });
  }

  return snapshots;
};
