import { Request, Response } from 'express';
import { prisma, prismaRead } from '../context';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class PathController {
  /**
   * GET /courses/paths - List learning paths
   */
  static async listPaths(req: AuthRequest, res: Response) {
    try {
      const { featured, limit = '10' } = req.query;
      const userId = req.user?.id;

      const where: any = { isPublished: true };
      if (featured === 'true') where.isFeatured = true;

      const paths = await prismaRead.learningPath.findMany({
        where,
        include: {
          creator: { select: { id: true, firstName: true, lastName: true, profilePictureUrl: true } },
          courses: {
            include: { course: { select: { id: true, title: true, thumbnail: true, duration: true } } },
            orderBy: { order: 'asc' },
          },
          _count: { select: { enrollments: true } },
        },
        orderBy: [{ isFeatured: 'desc' }, { enrolledCount: 'desc' }],
        take: parseInt(limit as string),
      });

      const enrolledPathSet = new Set<string>();
      if (userId && paths.length > 0) {
        const enrolled = await prismaRead.pathEnrollment.findMany({
          where: { userId, pathId: { in: paths.map(p => p.id) } },
          select: { pathId: true },
        });
        enrolled.forEach(e => enrolledPathSet.add(e.pathId));
      }

      res.json({
        paths: paths.map(path => ({
          ...path,
          isEnrolled: enrolledPathSet.has(path.id),
          courses: path.courses.map(pc => ({ ...pc.course, order: pc.order })),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching paths', error: error.message });
    }
  }
}
