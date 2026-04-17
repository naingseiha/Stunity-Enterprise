import { Request, Response } from 'express';
import { prisma, prismaRead } from '../context';
import { buildLocalizedTextInput, getRequestedLocale, resolveLocalizedText } from '../utils/localization';
import { buildCourseResumeSnapshots } from '../utils/course-resume';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    schoolId?: string;
  };
}

const resolveCourseText = <T extends { title: string; description: string; titleTranslations?: unknown; descriptionTranslations?: unknown }>(
  course: T,
  locale: string
) => ({
  ...course,
  title: resolveLocalizedText(course.title, course.titleTranslations, locale),
  description: resolveLocalizedText(course.description, course.descriptionTranslations, locale),
});

const resolveSectionText = <T extends { title: string; description?: string | null; titleTranslations?: unknown; descriptionTranslations?: unknown }>(
  section: T,
  locale: string
) => ({
  ...section,
  title: resolveLocalizedText(section.title, section.titleTranslations, locale),
  description: resolveLocalizedText(section.description, section.descriptionTranslations, locale) || null,
});

const resolveAssignmentText = <T extends { instructions: string; rubric?: string | null; instructionsTranslations?: unknown; rubricTranslations?: unknown }>(
  assignment: T,
  locale: string
) => ({
  ...assignment,
  instructions: resolveLocalizedText(assignment.instructions, assignment.instructionsTranslations, locale),
  rubric: resolveLocalizedText(assignment.rubric, assignment.rubricTranslations, locale) || null,
});

const resolveLessonText = <
  T extends {
    title: string;
    description?: string | null;
    content?: string | null;
    titleTranslations?: unknown;
    descriptionTranslations?: unknown;
    contentTranslations?: unknown;
    assignment?: {
      instructions: string;
      rubric?: string | null;
      instructionsTranslations?: unknown;
      rubricTranslations?: unknown;
    } | null;
  }
>(
  lesson: T,
  locale: string
) => ({
  ...lesson,
  title: resolveLocalizedText(lesson.title, lesson.titleTranslations, locale),
  description: resolveLocalizedText(lesson.description, lesson.descriptionTranslations, locale) || null,
  content: resolveLocalizedText(lesson.content, lesson.contentTranslations, locale) || null,
  assignment: lesson.assignment ? resolveAssignmentText(lesson.assignment, locale) : lesson.assignment,
});

export class CoursesController {
  /**
   * GET /courses - List all published courses
   */
  static async listCourses(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const {
        category,
        level,
        search,
        featured,
        page = '1',
        limit = '12',
      } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where: any = {
        isPublished: true,
      };

      if (category && category !== 'All') {
        where.category = category as string;
      }

      if (level) {
        where.level = level as string;
      }

      if (featured === 'true') {
        where.isFeatured = true;
      }

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { tags: { has: search as string } },
        ];
      }

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          include: {
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                professionalTitle: true,
              },
            },
            _count: {
              select: {
                lessons: true,
                enrollments: true,
                reviews: true,
              },
            },
          },
          orderBy: [
            { isFeatured: 'desc' },
            { enrolledCount: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take,
        }),
        prisma.course.count({ where }),
      ]);

      const transformedCourses = courses.map(course => ({
        id: course.id,
        title: resolveLocalizedText(course.title, course.titleTranslations, locale),
        description: resolveLocalizedText(course.description, course.descriptionTranslations, locale),
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
        status: course.status,
        duration: course.duration,
        lessonsCount: course._count.lessons,
        enrolledCount: course.enrolledCount,
        rating: course.rating,
        reviewsCount: course._count.reviews,
        price: course.price,
        isFree: course.isFree,
        isFeatured: course.isFeatured,
        isNew: new Date(course.createdAt) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        tags: course.tags,
        titleTranslations: course.titleTranslations,
        descriptionTranslations: course.descriptionTranslations,
        instructor: {
          id: course.instructor.id,
          name: `${course.instructor.firstName} ${course.instructor.lastName}`,
          avatar: course.instructor.profilePictureUrl,
          title: course.instructor.professionalTitle,
        },
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      }));

      res.json({
        courses: transformedCourses,
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ message: 'Error fetching courses', error: error.message });
    }
  }

  /**
   * GET /courses/learn-hub - Aggregated data for mobile/web dashboard
   */
  static async getLearnHub(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const userId = req.user?.id;
      let limit = parseInt((req.query.limit as string) || '30');
      let pathLimit = parseInt((req.query.pathLimit as string) || '20');
      
      if (isNaN(limit) || limit < 1) limit = 30;
      if (isNaN(pathLimit) || pathLimit < 1) pathLimit = 20;

      const [
        rawCourses,
        rawEnrollments,
        rawCreated,
        rawPaths,
        userRecord,
        enrolledCount,
        completedCount,
        completedLessonsCount,
        rawSavedLessons,
        rawRecentLessons,
      ] = await Promise.all([
        prismaRead.course.findMany({
          where: { isPublished: true },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true } },
            _count: { select: { lessons: true, enrollments: true, reviews: true } },
          },
          orderBy: [{ isFeatured: 'desc' }, { enrolledCount: 'desc' }, { createdAt: 'desc' }],
          take: limit,
        }),
        userId ? prismaRead.enrollment.findMany({
          where: { userId },
          include: {
            course: {
              include: {
                instructor: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true } },
                _count: { select: { lessons: true } },
              },
            },
          },
          orderBy: { lastAccessedAt: 'desc' },
        }) : Promise.resolve([]),
        userId ? prismaRead.course.findMany({
          where: { instructorId: userId },
          include: {
            instructor: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true, professionalTitle: true } },
            _count: { select: { lessons: true, enrollments: true } },
          },
          orderBy: { createdAt: 'desc' },
        }) : Promise.resolve([]),
        prismaRead.learningPath.findMany({
          where: { isPublished: true },
          include: {
            creator: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
            courses: {
              include: { course: { select: { id: true, title: true, thumbnail: true, duration: true } } },
              orderBy: { order: 'asc' },
            },
            _count: { select: { enrollments: true } },
          },
          orderBy: [{ isFeatured: 'desc' }, { enrolledCount: 'desc' }],
          take: pathLimit,
        }),
        userId ? prismaRead.user.findUnique({
          where: { id: userId },
          select: { totalLearningHours: true, currentStreak: true, totalPoints: true, level: true },
        }) : Promise.resolve(null),
        userId ? prismaRead.enrollment.count({ where: { userId } }) : Promise.resolve(0),
        userId ? prismaRead.enrollment.count({ where: { userId, completedAt: { not: null } } }) : Promise.resolve(0),
        userId ? prismaRead.lessonProgress.count({ where: { userId, completed: true } }) : Promise.resolve(0),
        userId ? prismaRead.lessonBookmark.findMany({
          where: {
            userId,
            lesson: {
              isPublished: true,
              course: {
                isPublished: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
          select: {
            createdAt: true,
            lesson: {
              select: {
                id: true,
                courseId: true,
                title: true,
                titleTranslations: true,
                duration: true,
                type: true,
                isFree: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                    titleTranslations: true,
                    thumbnail: true,
                    category: true,
                    level: true,
                  },
                },
              },
            },
          },
        }) : Promise.resolve([]),
        userId ? prismaRead.lessonProgress.findMany({
          where: {
            userId,
            lesson: {
              isPublished: true,
              course: {
                isPublished: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 6,
          select: {
            updatedAt: true,
            watchTime: true,
            completed: true,
            lesson: {
              select: {
                id: true,
                courseId: true,
                title: true,
                titleTranslations: true,
                duration: true,
                type: true,
                isFree: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                    titleTranslations: true,
                    thumbnail: true,
                    category: true,
                    level: true,
                  },
                },
              },
            },
          },
        }) : Promise.resolve([]),
      ]);

      // Batch-resolve completedLessons for enrolled courses
      let completedMap = new Map<string, number>();
      const enrolledCourseIds = rawEnrollments.map((enrollment) => enrollment.courseId);
      const resumeSnapshots = userId
        ? await buildCourseResumeSnapshots({ prismaClient: prismaRead as any, userId, courseIds: enrolledCourseIds })
        : new Map();
      if (userId && rawEnrollments.length > 0) {
        const allProgress = await prismaRead.lessonProgress.findMany({
          where: { userId, lesson: { courseId: { in: enrolledCourseIds } }, completed: true },
          select: { lesson: { select: { courseId: true } } },
        });
        for (const p of allProgress) {
          const cId = p.lesson.courseId;
          completedMap.set(cId, (completedMap.get(cId) ?? 0) + 1);
        }
      }

      const enrolledPathSet = new Set<string>();
      if (userId && rawPaths.length > 0) {
        const pathIds = rawPaths.map(p => p.id);
        const pathEnrollments = await prismaRead.pathEnrollment.findMany({
          where: { userId, pathId: { in: pathIds } },
          select: { pathId: true },
        });
        for (const pe of pathEnrollments) enrolledPathSet.add(pe.pathId);
      }

      const savedLessonProgress = userId && rawSavedLessons.length > 0
        ? await prismaRead.lessonProgress.findMany({
            where: {
              userId,
              lessonId: { in: rawSavedLessons.map((bookmark) => bookmark.lesson.id) },
            },
            select: {
              lessonId: true,
              completed: true,
            },
          })
        : [];
      const savedLessonCompletedSet = new Set(
        savedLessonProgress.filter((progress) => progress.completed).map((progress) => progress.lessonId)
      );
      const enrolledCourseSet = new Set(rawEnrollments.map((enrollment) => enrollment.courseId));

      const now = Date.now();
      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

      res.json({
        courses: rawCourses.map(course => ({
          ...course,
          title: resolveLocalizedText(course.title, course.titleTranslations, locale),
          description: resolveLocalizedText(course.description, course.descriptionTranslations, locale),
          lessonsCount: course._count.lessons,
          enrolledCount: course.enrolledCount,
          reviewsCount: course._count.reviews,
          isNew: new Date(course.createdAt).getTime() > now - twoWeeksMs,
          instructor: {
            ...course.instructor,
            name: `${course.instructor.firstName} ${course.instructor.lastName}`,
            avatar: course.instructor.profilePictureUrl,
          }
        })),
        myCourses: rawEnrollments.map(e => ({
          ...e.course,
          title: resolveLocalizedText(e.course.title, e.course.titleTranslations, locale),
          description: resolveLocalizedText(e.course.description, e.course.descriptionTranslations, locale),
          progress: e.progress,
          certificateUrl: e.certificateUrl,
          completedLessons: completedMap.get(e.courseId) ?? 0,
          resumeLessonId: resumeSnapshots.get(e.courseId)?.resumeLessonId || null,
          resumeLessonTitle: resolveLocalizedText(
            resumeSnapshots.get(e.courseId)?.resumeLessonTitle || '',
            resumeSnapshots.get(e.courseId)?.resumeLessonTitleTranslations,
            locale
          ) || null,
          resumeUpdatedAt: resumeSnapshots.get(e.courseId)?.resumeUpdatedAt || null,
          lastAccessedAt: e.lastAccessedAt,
          enrolledAt: e.enrolledAt,
          completedAt: e.completedAt,
          instructor: {
            ...e.course.instructor,
            name: `${e.course.instructor.firstName} ${e.course.instructor.lastName}`,
          }
        })),
        myCreated: rawCreated.map(c => ({
          ...c,
          title: resolveLocalizedText(c.title, c.titleTranslations, locale),
          description: resolveLocalizedText(c.description, c.descriptionTranslations, locale),
          lessonsCount: c._count.lessons,
          enrolledCount: c._count.enrollments,
        })),
        paths: rawPaths.map(p => ({
          ...p,
          isEnrolled: enrolledPathSet.has(p.id),
        })),
        savedLessons: rawSavedLessons.map((bookmark) => {
          const lesson = bookmark.lesson;
          const course = lesson.course;
          const isEnrolled = enrolledCourseSet.has(lesson.courseId);

          return {
            lessonId: lesson.id,
            courseId: lesson.courseId,
            title: resolveLocalizedText(lesson.title, lesson.titleTranslations, locale),
            duration: lesson.duration,
            type: lesson.type,
            isFree: lesson.isFree,
            isCompleted: savedLessonCompletedSet.has(lesson.id),
            isEnrolled,
            isLocked: !isEnrolled && !lesson.isFree,
            bookmarkedAt: bookmark.createdAt,
            course: {
              id: course.id,
              title: resolveLocalizedText(course.title, course.titleTranslations, locale),
              thumbnail: course.thumbnail,
              category: course.category,
              level: course.level,
            },
          };
        }),
        recentLessons: rawRecentLessons.map((progress) => {
          const lesson = progress.lesson;
          const course = lesson.course;
          const isEnrolled = enrolledCourseSet.has(lesson.courseId);

          return {
            lessonId: lesson.id,
            courseId: lesson.courseId,
            title: resolveLocalizedText(lesson.title, lesson.titleTranslations, locale),
            duration: lesson.duration,
            watchTime: progress.watchTime,
            type: lesson.type,
            isFree: lesson.isFree,
            isCompleted: progress.completed,
            isEnrolled,
            isLocked: !isEnrolled && !lesson.isFree,
            openedAt: progress.updatedAt,
            course: {
              id: course.id,
              title: resolveLocalizedText(course.title, course.titleTranslations, locale),
              thumbnail: course.thumbnail,
              category: course.category,
              level: course.level,
            },
          };
        }),
        stats: {
          enrolledCourses: enrolledCount,
          completedCourses: completedCount,
          completedLessons: completedLessonsCount,
          hoursLearned: userRecord?.totalLearningHours ?? 0,
          currentStreak: userRecord?.currentStreak ?? 0,
          totalPoints: userRecord?.totalPoints ?? 0,
          level: userRecord?.level ?? 1,
        }
      });
    } catch (error: any) {
      console.error('Error fetching learn hub:', error);
      res.status(500).json({ message: 'Error fetching learn hub', error: error.message });
    }
  }

  /**
   * POST /courses - Create a new course
   */
  static async createCourse(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const {
        title,
        description,
        titleTranslations,
        descriptionTranslations,
        titleEn,
        titleKm,
        titleKh,
        descriptionEn,
        descriptionKm,
        descriptionKh,
        category,
        level,
        thumbnail,
        tags,
        price,
        isFree,
      } = req.body ?? {};

      const localizedTitle = buildLocalizedTextInput(title, titleTranslations, {
        en: titleEn,
        km: titleKm ?? titleKh,
      });
      const localizedDescription = buildLocalizedTextInput(description, descriptionTranslations, {
        en: descriptionEn,
        km: descriptionKm ?? descriptionKh,
      });

      const course = await prisma.course.create({
        data: {
          title: localizedTitle.value,
          description: localizedDescription.value,
          titleTranslations: localizedTitle.translations,
          descriptionTranslations: localizedDescription.translations,
          category,
          level,
          thumbnail,
          tags: tags || [],
          price: price || 0,
          isFree: isFree !== undefined ? isFree : true,
          instructorId: userId,
          status: 'DRAFT',
        },
      });

      res.status(201).json({ course });
    } catch (error: any) {
      res.status(500).json({ message: 'Error creating course', error: error.message });
    }
  }

  /**
   * PUT /courses/:id - Update course metadata
   */
  static async updateCourse(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const { id } = req.params;
      const existingCourse = await prisma.course.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          instructorId: true,
        },
      });

      if (!existingCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }

      if (existingCourse.instructorId !== userId) {
        return res.status(403).json({ message: 'Only the instructor can update this course' });
      }

      const {
        title,
        description,
        titleTranslations,
        descriptionTranslations,
        titleEn,
        titleKm,
        titleKh,
        descriptionEn,
        descriptionKm,
        descriptionKh,
        category,
        level,
        thumbnail,
        tags,
        price,
        isFree,
      } = req.body ?? {};

      const updateData: Record<string, unknown> = {};
      const hasTitleInput = (
        title !== undefined
        || titleTranslations !== undefined
        || titleEn !== undefined
        || titleKm !== undefined
        || titleKh !== undefined
      );
      const hasDescriptionInput = (
        description !== undefined
        || descriptionTranslations !== undefined
        || descriptionEn !== undefined
        || descriptionKm !== undefined
        || descriptionKh !== undefined
      );

      if (hasTitleInput) {
        const localizedTitle = buildLocalizedTextInput(title, titleTranslations, {
          en: titleEn,
          km: titleKm ?? titleKh,
        });
        updateData.title = localizedTitle.value || existingCourse.title;
        updateData.titleTranslations = localizedTitle.translations ?? undefined;
      }

      if (hasDescriptionInput) {
        const localizedDescription = buildLocalizedTextInput(description, descriptionTranslations, {
          en: descriptionEn,
          km: descriptionKm ?? descriptionKh,
        });
        updateData.description = localizedDescription.value || existingCourse.description;
        updateData.descriptionTranslations = localizedDescription.translations ?? undefined;
      }

      if (category !== undefined) {
        const normalizedCategory = String(category ?? '').trim();
        if (!normalizedCategory) {
          return res.status(400).json({ message: 'category cannot be empty' });
        }
        updateData.category = normalizedCategory;
      }

      if (level !== undefined) {
        updateData.level = level;
      }

      if (thumbnail !== undefined) {
        const normalizedThumbnail = String(thumbnail ?? '').trim();
        updateData.thumbnail = normalizedThumbnail || null;
      }

      if (Array.isArray(tags)) {
        updateData.tags = tags.map((tag) => String(tag).trim()).filter(Boolean);
      }

      if (price !== undefined) {
        const normalizedPrice = Number(price);
        if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0) {
          return res.status(400).json({ message: 'price must be a valid non-negative number' });
        }
        updateData.price = normalizedPrice;
        if (isFree === undefined) {
          updateData.isFree = normalizedPrice <= 0;
        }
      }

      if (isFree !== undefined) {
        updateData.isFree = Boolean(isFree);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No updatable fields provided' });
      }

      const updatedCourse = await prisma.course.update({
        where: { id },
        data: updateData,
      });

      res.json({ success: true, course: updatedCourse });
    } catch (error: any) {
      console.error('Error updating course:', error);
      res.status(500).json({ message: 'Error updating course', error: error.message });
    }
  }

  /**
   * POST /courses/bulk - Create course plus flat lessons in one request
   */
  static async bulkCreateCourse(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const {
        title,
        description,
        titleTranslations,
        descriptionTranslations,
        titleEn,
        titleKm,
        titleKh,
        descriptionEn,
        descriptionKm,
        descriptionKh,
        category,
        level,
        thumbnail,
        tags,
        sections = [],
        lessons = [],
        publish = false,
      } = req.body ?? {};

      const localizedTitle = buildLocalizedTextInput(title, titleTranslations, {
        en: titleEn,
        km: titleKm ?? titleKh,
      });
      const localizedDescription = buildLocalizedTextInput(description, descriptionTranslations, {
        en: descriptionEn,
        km: descriptionKm ?? descriptionKh,
      });

      const normalizedTitle = localizedTitle.value;
      const normalizedDescription = localizedDescription.value;
      const normalizedCategory = String(category ?? '').trim();

      if (!normalizedTitle || !normalizedDescription || !normalizedCategory) {
        return res.status(400).json({
          message: 'title, description, and category are required',
        });
      }

      const normalizeLesson = (lesson: any, index: number) => {
        const localizedLessonTitle = buildLocalizedTextInput(lesson?.title, lesson?.titleTranslations, {
          en: lesson?.titleEn,
          km: lesson?.titleKm ?? lesson?.titleKh,
        });
        if (!localizedLessonTitle.value) return null;

        const localizedLessonDescription = buildLocalizedTextInput(lesson?.description, lesson?.descriptionTranslations, {
          en: lesson?.descriptionEn,
          km: lesson?.descriptionKm ?? lesson?.descriptionKh,
        });
        const localizedLessonContent = buildLocalizedTextInput(lesson?.content, lesson?.contentTranslations, {
          en: lesson?.contentEn,
          km: lesson?.contentKm ?? lesson?.contentKh,
        });

        const videoUrl = String(lesson?.videoUrl ?? '').trim();
        const duration = Number(lesson?.duration ?? 0);
        const assignmentInstructions = buildLocalizedTextInput(
          lesson?.assignment?.instructions,
          lesson?.assignment?.instructionsTranslations,
          {
            en: lesson?.assignment?.instructionsEn,
            km: lesson?.assignment?.instructionsKm ?? lesson?.assignment?.instructionsKh,
          }
        );
        const assignmentRubric = buildLocalizedTextInput(
          lesson?.assignment?.rubric,
          lesson?.assignment?.rubricTranslations,
          {
            en: lesson?.assignment?.rubricEn,
            km: lesson?.assignment?.rubricKm ?? lesson?.assignment?.rubricKh,
          }
        );

        return {
          title: localizedLessonTitle.value,
          titleTranslations: localizedLessonTitle.translations,
          description: localizedLessonDescription.value || null,
          descriptionTranslations: localizedLessonDescription.translations,
          content: localizedLessonContent.value || null,
          contentTranslations: localizedLessonContent.translations,
          videoUrl: videoUrl || null,
          duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
          isFree: Boolean(lesson?.isFree),
          order: Number.isFinite(Number(lesson?.order))
            ? Number(lesson.order)
            : index + 1,
          type: lesson?.type
            ? String(lesson.type)
            : (videoUrl ? 'VIDEO' : 'ARTICLE'),
          quiz: lesson?.quiz ?? null,
          assignment: lesson?.assignment
            ? {
                maxScore: Number(lesson.assignment.maxScore ?? 100),
                passingScore: Number(lesson.assignment.passingScore ?? 80),
                instructions: assignmentInstructions.value || '',
                instructionsTranslations: assignmentInstructions.translations,
                rubric: assignmentRubric.value || null,
                rubricTranslations: assignmentRubric.translations,
              }
            : null,
          exercise: lesson?.exercise
            ? {
                language: String(lesson.exercise.language || 'javascript'),
                initialCode: String(lesson.exercise.initialCode || ''),
                solution: String(lesson.exercise.solutionCode || lesson.exercise.solution || ''),
                testCases: lesson.exercise.testCases ?? '',
              }
            : null,
        };
      };

      const normalizedSections = Array.isArray(sections)
        ? sections
            .map((section: any, sectionIndex: number) => {
              const localizedSectionTitle = buildLocalizedTextInput(section?.title, section?.titleTranslations, {
                en: section?.titleEn ?? section?.sectionTitleEn,
                km: section?.titleKm ?? section?.titleKh ?? section?.sectionTitleKm ?? section?.sectionTitleKh,
              });
              if (!localizedSectionTitle.value) return null;

              const localizedSectionDescription = buildLocalizedTextInput(section?.description, section?.descriptionTranslations, {
                en: section?.descriptionEn,
                km: section?.descriptionKm ?? section?.descriptionKh,
              });

              const sectionLessons = Array.isArray(section?.lessons)
                ? section.lessons
                    .map((lesson: any, lessonIndex: number) => normalizeLesson(lesson, lessonIndex))
                    .filter(Boolean)
                : [];

              return {
                title: localizedSectionTitle.value,
                titleTranslations: localizedSectionTitle.translations,
                description: localizedSectionDescription.value || null,
                descriptionTranslations: localizedSectionDescription.translations,
                order: Number.isFinite(Number(section?.order)) ? Number(section.order) : sectionIndex + 1,
                lessons: sectionLessons,
              };
            })
            .filter(Boolean)
        : [];

      const normalizedLooseLessons = Array.isArray(lessons)
        ? lessons
            .map((lesson: any, index: number) => normalizeLesson(lesson, index))
            .filter(Boolean)
        : [];

      const totalDuration = [
        ...normalizedLooseLessons,
        ...normalizedSections.flatMap((section: any) => section.lessons),
      ].reduce((sum: number, lesson: any) => sum + Number(lesson.duration ?? 0), 0);
      const totalLessonsCount =
        normalizedLooseLessons.length
        + normalizedSections.reduce((count: number, section: any) => count + section.lessons.length, 0);

      const course = await prisma.$transaction(async (tx) => {
        const createdCourse = await tx.course.create({
          data: {
            title: normalizedTitle,
            description: normalizedDescription,
            titleTranslations: localizedTitle.translations,
            descriptionTranslations: localizedDescription.translations,
            category: normalizedCategory,
            level,
            thumbnail: thumbnail ? String(thumbnail).trim() : undefined,
            tags: Array.isArray(tags)
              ? tags.map((tag) => String(tag).trim()).filter(Boolean)
              : [],
            instructorId: userId,
            status: publish ? 'PUBLISHED' : 'DRAFT',
            isPublished: Boolean(publish),
            isFree: true,
            duration: totalDuration,
            lessonsCount: totalLessonsCount,
          },
        });

        for (const section of normalizedSections as any[]) {
          const createdSection = await tx.courseSection.create({
            data: {
              courseId: createdCourse.id,
              title: section.title,
              description: section.description,
              titleTranslations: section.titleTranslations,
              descriptionTranslations: section.descriptionTranslations,
              order: section.order,
            },
          });

          for (const lesson of section.lessons) {
            await tx.lesson.create({
              data: {
                courseId: createdCourse.id,
                sectionId: createdSection.id,
                title: lesson.title,
                description: lesson.description,
                content: lesson.content,
                titleTranslations: lesson.titleTranslations,
                descriptionTranslations: lesson.descriptionTranslations,
                contentTranslations: lesson.contentTranslations,
                videoUrl: lesson.videoUrl,
                duration: lesson.duration,
                isFree: lesson.isFree,
                order: lesson.order,
                type: lesson.type,
                isPublished: true,
                quiz: lesson.type === 'QUIZ' && lesson.quiz ? {
                  create: {
                    passingScore: Number(lesson.quiz.passingScore ?? 80),
                    questions: {
                      create: Array.isArray(lesson.quiz.questions)
                        ? lesson.quiz.questions.map((question: any, questionIndex: number) => ({
                            question: String(question.question || ''),
                            explanation: question.explanation ? String(question.explanation) : null,
                            order: Number.isFinite(Number(question.order)) ? Number(question.order) : questionIndex + 1,
                            options: {
                              create: Array.isArray(question.options)
                                ? question.options.map((option: any) => ({
                                    text: String(option.text || ''),
                                    isCorrect: Boolean(option.isCorrect),
                                  }))
                                : [],
                            },
                          }))
                        : [],
                    },
                  },
                } : undefined,
                assignment: lesson.type === 'ASSIGNMENT' && lesson.assignment ? {
                  create: {
                    maxScore: lesson.assignment.maxScore,
                    passingScore: lesson.assignment.passingScore,
                    instructions: lesson.assignment.instructions,
                    instructionsTranslations: lesson.assignment.instructionsTranslations,
                    rubric: lesson.assignment.rubric,
                    rubricTranslations: lesson.assignment.rubricTranslations,
                  },
                } : undefined,
                exercise: lesson.type === 'EXERCISE' && lesson.exercise ? {
                  create: {
                    language: lesson.exercise.language,
                    initialCode: lesson.exercise.initialCode,
                    solution: lesson.exercise.solution,
                    testCases: lesson.exercise.testCases,
                  },
                } : undefined,
              },
            });
          }
        }

        for (const lesson of normalizedLooseLessons as any[]) {
          await tx.lesson.create({
            data: {
              courseId: createdCourse.id,
              title: lesson.title,
              description: lesson.description,
              content: lesson.content,
              titleTranslations: lesson.titleTranslations,
              descriptionTranslations: lesson.descriptionTranslations,
              contentTranslations: lesson.contentTranslations,
              videoUrl: lesson.videoUrl,
              duration: lesson.duration,
              isFree: lesson.isFree,
              order: lesson.order,
              type: lesson.type,
              isPublished: true,
              quiz: lesson.type === 'QUIZ' && lesson.quiz ? {
                create: {
                  passingScore: Number(lesson.quiz.passingScore ?? 80),
                  questions: {
                    create: Array.isArray(lesson.quiz.questions)
                      ? lesson.quiz.questions.map((question: any, questionIndex: number) => ({
                          question: String(question.question || ''),
                          explanation: question.explanation ? String(question.explanation) : null,
                          order: Number.isFinite(Number(question.order)) ? Number(question.order) : questionIndex + 1,
                          options: {
                            create: Array.isArray(question.options)
                              ? question.options.map((option: any) => ({
                                  text: String(option.text || ''),
                                  isCorrect: Boolean(option.isCorrect),
                                }))
                              : [],
                          },
                        }))
                      : [],
                  },
                },
              } : undefined,
              assignment: lesson.type === 'ASSIGNMENT' && lesson.assignment ? {
                create: {
                  maxScore: lesson.assignment.maxScore,
                  passingScore: lesson.assignment.passingScore,
                  instructions: lesson.assignment.instructions,
                  instructionsTranslations: lesson.assignment.instructionsTranslations,
                  rubric: lesson.assignment.rubric,
                  rubricTranslations: lesson.assignment.rubricTranslations,
                },
              } : undefined,
              exercise: lesson.type === 'EXERCISE' && lesson.exercise ? {
                create: {
                  language: lesson.exercise.language,
                  initialCode: lesson.exercise.initialCode,
                  solution: lesson.exercise.solution,
                  testCases: lesson.exercise.testCases,
                },
              } : undefined,
            },
          });
        }

        return createdCourse;
      });

      res.status(201).json({
        id: course.id,
        course: { id: course.id },
      });
    } catch (error: any) {
      console.error('Error bulk creating course:', error);
      res.status(500).json({ message: 'Error bulk creating course', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/publish - Publish a draft course
   */
  static async publishCourse(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          instructorId: true,
          price: true,
        },
      });

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const publishedLessons = await prisma.lesson.findMany({
        where: {
          courseId,
          isPublished: true,
        },
        select: {
          duration: true,
        },
      });

      if (publishedLessons.length === 0) {
        return res.status(400).json({
          message: 'Add at least one published lesson before publishing this course',
        });
      }

      const duration = publishedLessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);

      const updatedCourse = await prisma.course.update({
        where: { id: courseId },
        data: {
          status: 'PUBLISHED',
          isPublished: true,
          isFree: (course.price || 0) <= 0,
          duration,
          lessonsCount: publishedLessons.length,
        },
      });

      res.json({
        success: true,
        course: updatedCourse,
      });
    } catch (error: any) {
      console.error('Error publishing course:', error);
      res.status(500).json({ message: 'Error publishing course', error: error.message });
    }
  }

  /**
   * GET /courses/:id - Course details
   */
  static async getCourseDetail(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const { id } = req.params;
      const userId = req.user?.id;
      const lessonListSelect = {
        id: true,
        title: true,
        description: true,
        titleTranslations: true,
        descriptionTranslations: true,
        duration: true,
        order: true,
        isFree: true,
        type: true,
        assignment: {
          select: {
            id: true,
            maxScore: true,
            passingScore: true,
            instructions: true,
            rubric: true,
            instructionsTranslations: true,
            rubricTranslations: true,
          },
        },
      } as const;

      const course = await prismaRead.course.findUnique({
        where: { id },
        include: {
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              bio: true,
              professionalTitle: true,
            },
          },
          sections: {
            orderBy: { order: 'asc' },
            include: {
              lessons: {
                orderBy: { order: 'asc' },
                select: lessonListSelect,
              },
            },
          },
          lessons: { // Backward compatibility for flat structure (lessons not in a section)
            where: { sectionId: null },
            orderBy: { order: 'asc' },
            select: lessonListSelect,
          },
          _count: {
            select: { enrollments: true, reviews: true },
          },
        },
      });

      if (!course) return res.status(404).json({ message: 'Course not found' });

      // Check enrollment and derive per-lesson completion state for the current learner.
      let enrollment = null;
      const completedLessonIds = new Set<string>();
      if (userId) {
        enrollment = await prismaRead.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId: id } },
        });

        if (enrollment) {
          const lessonProgress = await prismaRead.lessonProgress.findMany({
            where: {
              userId,
              lesson: { courseId: id },
              completed: true,
            },
            select: { lessonId: true },
          });
          for (const progress of lessonProgress) {
            completedLessonIds.add(progress.lessonId);
          }
        }
      }

      const isEnrolled = !!enrollment;
      const decorateLesson = (lesson: any) => resolveLessonText({
        ...lesson,
        isCompleted: completedLessonIds.has(lesson.id),
        isLocked: !isEnrolled && !lesson.isFree,
      }, locale);
      const resumeSnapshot = userId && enrollment
        ? (await buildCourseResumeSnapshots({ prismaClient: prismaRead as any, userId, courseIds: [id] })).get(id)
        : null;

      const decoratedSections = course.sections.map((section) => resolveSectionText({
        ...section,
        lessons: section.lessons.map(decorateLesson),
      }, locale));
      const decoratedFlatLessons = course.lessons.map(decorateLesson);

      res.json({ 
        course: {
          ...resolveCourseText(course, locale),
          sections: decoratedSections,
          lessons: decoratedFlatLessons,
          instructor: {
            ...course.instructor,
            name: `${course.instructor.firstName} ${course.instructor.lastName}`.trim(),
            avatar: course.instructor.profilePictureUrl,
            title: course.instructor.professionalTitle,
          },
          lessonsCount: decoratedSections.reduce((acc, s) => acc + s.lessons.length, 0) + decoratedFlatLessons.length,
        }, 
        enrollment: enrollment
          ? {
              ...enrollment,
              resumeLessonId: resumeSnapshot?.resumeLessonId || null,
              resumeLessonTitle: resolveLocalizedText(
                resumeSnapshot?.resumeLessonTitle || '',
                resumeSnapshot?.resumeLessonTitleTranslations,
                locale
              ) || null,
              resumeUpdatedAt: resumeSnapshot?.resumeUpdatedAt || null,
            }
          : null,
        isEnrolled
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching course detail', error: error.message });
    }
  }

  /**
   * GET /courses/instructor/stats - Instructor analytics
   */
  static async getInstructorStats(req: AuthRequest, res: Response) {
    try {
      const instructorId = req.user?.id;
      if (!instructorId) return res.status(401).json({ message: 'Unauthorized' });

      // 1. Get all courses by this instructor
      const courses = await prisma.course.findMany({
        where: { instructorId },
        include: {
          enrollments: {
            select: { enrolledAt: true }
          },
          _count: {
            select: { enrollments: true, reviews: true }
          }
        }
      });

      // 2. Aggregate basics
      const totalStudents = courses.reduce((acc, c) => acc + c._count.enrollments, 0);
      const totalRevenue = courses.reduce((acc, c) => acc + (c.price * c._count.enrollments), 0);
      const activeCourses = courses.filter(c => c.isPublished).length;
      
      // Calculate avg rating
      const totalRating = courses.reduce((acc, c) => acc + (c.rating || 0), 0);
      const averageRating = courses.length > 0 ? totalRating / courses.length : 0;

      // 3. Performance data (Real monthly growth for visualization based on last 4 months)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const performance = [];
      
      for (let i = 3; i >= 0; i--) {
        const targetDate = new Date(currentYear, currentMonth - i, 1);
        const name = targetDate.toLocaleString('default', { month: 'short' });
        
        // Find enrollments created in this month or earlier (cumulative)
        // Wait, for growth we want the net new students this month, or cumulative?
        // Let's do cumulative total up to the end of that month.
        const endOfMonth = new Date(currentYear, currentMonth - i + 1, 0);

        const enrollmentsUpToMonth = courses.reduce((acc, course) => {
          const enrollmentsCount = course.enrollments.filter(e => new Date(e.enrolledAt) <= endOfMonth).length;
          return acc + enrollmentsCount;
        }, 0);

        const revenueUpToMonth = courses.reduce((acc, course) => {
          const enrollmentsCount = course.enrollments.filter(e => new Date(e.enrolledAt) <= endOfMonth).length;
          return acc + (enrollmentsCount * course.price);
        }, 0);

        performance.push({
          name,
          students: enrollmentsUpToMonth,
          revenue: revenueUpToMonth
        });
      }

      // 4. Course breakdown
      const courseStats = courses.map(c => ({
        id: c.id,
        title: c.title,
        students: c._count.enrollments,
        revenue: c.price * c._count.enrollments,
        rating: c.rating,
      })).sort((a, b) => b.revenue - a.revenue);

      res.json({
        stats: {
          totalRevenue,
          totalStudents,
          activeCourses,
          averageRating
        },
        performance,
        courses: courseStats
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching instructor stats', error: error.message });
    }
  }
}
