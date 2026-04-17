import { Request, Response } from 'express';
import { prisma } from '../context';
import { getRequestedLocale, resolveLocalizedText } from '../utils/localization';
import { buildCourseResumeSnapshots } from '../utils/course-resume';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class EnrollmentController {
  /**
   * POST /courses/:id/enroll - Enroll in a course
   */
  static async enroll(req: AuthRequest, res: Response) {
    try {
      const courseId = req.params.courseId || req.params.id;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      if (!courseId) return res.status(400).json({ message: 'Course ID is required' });

      // Check course
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || !course.isPublished) return res.status(404).json({ message: 'Course not found' });

      // Check existing
      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (existing) return res.status(400).json({ message: 'Already enrolled' });

      const enrollment = await prisma.$transaction(async (tx) => {
        const e = await tx.enrollment.create({ data: { userId, courseId } });
        await tx.course.update({ where: { id: courseId }, data: { enrolledCount: { increment: 1 } } });
        return e;
      });

      res.status(201).json({ message: 'Successfully enrolled', enrollment });
    } catch (error: any) {
      res.status(500).json({ message: 'Error enrolling', error: error.message });
    }
  }

  /**
   * POST /paths/:pathId/enroll - Enroll in a learning path
   */
  static async enrollPath(req: AuthRequest, res: Response) {
    try {
      const { pathId } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const path = await prisma.learningPath.findUnique({
        where: { id: pathId },
        include: { courses: { include: { course: true } } },
      });

      if (!path || !path.isPublished) return res.status(404).json({ message: 'Path not found' });

      const publishCourseIds = path.courses
        .filter(pc => pc.course.isPublished)
        .map(pc => pc.courseId);

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.pathEnrollment.findUnique({ where: { userId_pathId: { userId, pathId } } });
        if (!existing) {
          await tx.pathEnrollment.create({ data: { userId, pathId } });
          await tx.learningPath.update({ where: { id: pathId }, data: { enrolledCount: { increment: 1 } } });
        }

        const newCourseIds = [];
        for (const courseId of publishCourseIds) {
          const e = await tx.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
          if (!e) newCourseIds.push(courseId);
        }

        if (newCourseIds.length > 0) {
          await tx.enrollment.createMany({ data: newCourseIds.map(courseId => ({ userId, courseId })), skipDuplicates: true });
          await Promise.all(newCourseIds.map(courseId => tx.course.update({ where: { id: courseId }, data: { enrolledCount: { increment: 1 } } })));
        }
        return { newlyEnrolled: newCourseIds.length };
      });

      res.json({ message: 'Enrolled in path', ...result });
    } catch (error: any) {
      res.status(500).json({ message: 'Error enrolling in path', error: error.message });
    }
  }

  /**
   * GET /courses/my-courses
   */
  static async getMyEnrolled(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
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
                  reviews: true,
                },
              },
            },
          },
        },
        orderBy: { lastAccessedAt: 'desc' },
      });

      const courseIds = enrollments.map(e => e.courseId);
      const completedMap = new Map<string, number>();
      const resumeSnapshots = await buildCourseResumeSnapshots({ prismaClient: prisma, userId, courseIds });
      if (courseIds.length > 0) {
        const completedProgress = await prisma.lessonProgress.findMany({
          where: {
            userId,
            completed: true,
            lesson: {
              courseId: { in: courseIds },
            },
          },
          select: {
            lesson: {
              select: {
                courseId: true,
              },
            },
          },
        });

        for (const progress of completedProgress) {
          const cId = progress.lesson.courseId;
          completedMap.set(cId, (completedMap.get(cId) ?? 0) + 1);
        }
      }

      const courses = enrollments.map(enrollment => {
        const course: any = enrollment.course;
        const isNew = new Date(course.createdAt).getTime() > (Date.now() - 14 * 24 * 60 * 60 * 1000);

        return {
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
          isNew,
          tags: course.tags,
          isPublished: course.isPublished,
          titleTranslations: course.titleTranslations,
          descriptionTranslations: course.descriptionTranslations,
          createdAt: course.createdAt,
          updatedAt: course.updatedAt,
          instructor: {
            id: course.instructor.id,
            name: `${course.instructor.firstName} ${course.instructor.lastName}`.trim(),
            avatar: course.instructor.profilePictureUrl,
            title: course.instructor.professionalTitle,
          },
          progress: enrollment.progress,
          completedLessons: completedMap.get(enrollment.courseId) ?? 0,
          resumeLessonId: resumeSnapshots.get(enrollment.courseId)?.resumeLessonId || null,
          resumeLessonTitle: resolveLocalizedText(
            resumeSnapshots.get(enrollment.courseId)?.resumeLessonTitle || '',
            resumeSnapshots.get(enrollment.courseId)?.resumeLessonTitleTranslations,
            locale
          ) || null,
          resumeUpdatedAt: resumeSnapshots.get(enrollment.courseId)?.resumeUpdatedAt || null,
          lastAccessedAt: enrollment.lastAccessedAt,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          certificateUrl: enrollment.certificateUrl,
        };
      });

      // Keep backward compatibility by returning both keys.
      res.json({ courses, enrollments });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching enrollments', error: error.message });
    }
  }

  /**
   * GET /courses/stats/my-learning
   */
  static async getMyLearningStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const [enrolledCourses, completedCourses, completedLessons, userStats] = await Promise.all([
        prisma.enrollment.count({ where: { userId } }),
        prisma.enrollment.count({ where: { userId, completedAt: { not: null } } }),
        prisma.lessonProgress.count({ where: { userId, completed: true } }),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            totalLearningHours: true,
            currentStreak: true,
            totalPoints: true,
            level: true,
          },
        }),
      ]);

      res.json({
        enrolledCourses,
        completedCourses,
        completedLessons,
        hoursLearned: userStats?.totalLearningHours ?? 0,
        currentStreak: userStats?.currentStreak ?? 0,
        totalPoints: userStats?.totalPoints ?? 0,
        level: userStats?.level ?? 1,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching learning stats', error: error.message });
    }
  }

  /**
   * GET /courses/my-created
   */
  static async getMyCreated(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const courses = await prisma.course.findMany({
        where: { instructorId: userId }
      });
      res.json({
        courses: courses.map((course) => ({
          ...course,
          title: resolveLocalizedText(course.title, course.titleTranslations, locale),
          description: resolveLocalizedText(course.description, course.descriptionTranslations, locale),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching created courses', error: error.message });
    }
  }
}
