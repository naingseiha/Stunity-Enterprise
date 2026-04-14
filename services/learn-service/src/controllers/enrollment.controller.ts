import { Request, Response } from 'express';
import { prisma } from '../context';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class EnrollmentController {
  /**
   * POST /courses/:id/enroll - Enroll in a course
   */
  static async enroll(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      // Check course
      const course = await prisma.course.findUnique({ where: { id } });
      if (!course || !course.isPublished) return res.status(404).json({ message: 'Course not found' });

      // Check existing
      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId: id } },
      });
      if (existing) return res.status(400).json({ message: 'Already enrolled' });

      const enrollment = await prisma.$transaction(async (tx) => {
        const e = await tx.enrollment.create({ data: { userId, courseId: id } });
        await tx.course.update({ where: { id }, data: { enrolledCount: { increment: 1 } } });
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
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        include: { course: true }
      });
      res.json({ enrollments });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching enrollments', error: error.message });
    }
  }

  /**
   * GET /courses/my-created
   */
  static async getMyCreated(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const courses = await prisma.course.findMany({
        where: { instructorId: userId }
      });
      res.json({ courses });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching created courses', error: error.message });
    }
  }
}
