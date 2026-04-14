import { Request, Response } from 'express';
import { prisma } from '../context';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class LessonController {
  /**
   * GET /courses/:courseId/lessons - List lessons for a course
   */
  static async listLessons(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;

      const lessons = await prisma.lesson.findMany({
        where: { courseId, isPublished: true },
        orderBy: { order: 'asc' },
        include: { resources: true },
      });

      let progress: Record<string, boolean> = {};
      let isEnrolled = false;

      if (userId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
        });
        isEnrolled = !!enrollment;

        if (isEnrolled) {
          const lessonProgress = await prisma.lessonProgress.findMany({
            where: { userId, lesson: { courseId } },
          });
          progress = Object.fromEntries(lessonProgress.map(p => [p.lessonId, p.completed]));
        }
      }

      res.json({
        lessons: lessons.map(lesson => ({
          ...lesson,
          videoUrl: isEnrolled || lesson.isFree ? lesson.videoUrl : null,
          isCompleted: progress[lesson.id] || false,
          isLocked: !isEnrolled && !lesson.isFree,
        })),
        isEnrolled,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching lessons', error: error.message });
    }
  }

  /**
   * GET /courses/:courseId/lessons/:lessonId - Get lesson details
   */
  static async getLessonDetail(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const userId = req.user?.id;
      
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { resources: true }
      });

      if (!lesson || lesson.courseId !== courseId) {
        return res.status(404).json({ message: 'Lesson not found' });
      }

      let isEnrolled = false;
      let progress = null;

      if (userId) {
        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } }
        });
        isEnrolled = !!enrollment;

        if (isEnrolled) {
          progress = await prisma.lessonProgress.findUnique({
            where: { userId_lessonId: { userId, lessonId } }
          });
        }
      }

      res.json({
        ...lesson,
        videoUrl: isEnrolled || lesson.isFree ? lesson.videoUrl : null,
        isCompleted: progress?.completed || false,
        watchTime: progress?.watchTime || 0,
        isLocked: !isEnrolled && !lesson.isFree
      });

    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching lesson', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/lessons/:lessonId/progress - Update progress
   */
  static async updateProgress(req: AuthRequest, res: Response) {
    try {
      const { courseId, lessonId } = req.params;
      const { completed, watchTime } = req.body;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      // Ensure enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (!enrollment) return res.status(403).json({ message: 'Not enrolled' });

      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
          completed: completed ?? undefined,
          watchTime: watchTime ?? undefined,
          completedAt: completed ? new Date() : undefined,
        },
        create: {
          userId,
          lessonId,
          completed: completed || false,
          watchTime: watchTime || 0,
          completedAt: completed ? new Date() : undefined,
        },
      });

      // Recalculate course progress
      const [total, completedCount] = await Promise.all([
        prisma.lesson.count({ where: { courseId, isPublished: true } }),
        prisma.lessonProgress.count({ where: { userId, lesson: { courseId }, completed: true } }),
      ]);

      const progress = total > 0 ? (completedCount / total) * 100 : 0;
      await prisma.enrollment.update({
        where: { userId_courseId: { userId, courseId } },
        data: {
          progress,
          lastAccessedAt: new Date(),
          completedAt: progress >= 100 ? new Date() : null,
        },
      });

      res.json({ progress, completedLessons: completedCount, totalLessons: total });
    } catch (error: any) {
      res.status(500).json({ message: 'Error updating progress', error: error.message });
    }
  }
}
