import { Request, Response } from 'express';
import { prisma } from '../context';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const mapAnnouncementsWithAuthors = async (announcements: Array<{
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  sentAt: Date;
}>) => {
  const authorIds = Array.from(new Set(announcements.map((announcement) => announcement.authorId)));
  const authors = authorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
          professionalTitle: true,
        },
      })
    : [];
  const authorMap = new Map(authors.map((author) => [author.id, author]));

  return announcements.map((announcement) => ({
    ...announcement,
    author: authorMap.has(announcement.authorId)
      ? {
          id: authorMap.get(announcement.authorId)!.id,
          name: `${authorMap.get(announcement.authorId)!.firstName} ${authorMap.get(announcement.authorId)!.lastName}`.trim(),
          avatar: authorMap.get(announcement.authorId)!.profilePictureUrl,
          title: authorMap.get(announcement.authorId)!.professionalTitle,
        }
      : null,
  }));
};

export class AnnouncementsController {
  static async listAnnouncements(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          id: true,
          isPublished: true,
          instructorId: true,
        },
      });

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      const isInstructor = Boolean(userId && (course.instructorId === userId || userRole === 'ADMIN'));

      if (!isInstructor) {
        if (!userId) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId, courseId } },
          select: { id: true },
        });

        if (!enrollment) {
          return res.status(403).json({ message: 'Enroll to view course announcements' });
        }
      }

      const announcements = await prisma.courseAnnouncement.findMany({
        where: { courseId },
        orderBy: { sentAt: 'desc' },
      });

      res.json({
        announcements: await mapAnnouncementsWithAuthors(announcements),
        isInstructor,
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching announcements', error: error.message });
    }
  }

  static async createAnnouncement(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true },
      });

      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      if (course.instructorId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Only the instructor can post announcements' });
      }

      if (!title || !body) {
        return res.status(400).json({ message: 'title and body are required' });
      }

      const announcement = await prisma.courseAnnouncement.create({
        data: {
          courseId,
          authorId: userId,
          title,
          body,
        },
      });

      const [mappedAnnouncement] = await mapAnnouncementsWithAuthors([announcement]);

      res.status(201).json({ announcement: mappedAnnouncement });
    } catch (error: any) {
      res.status(500).json({ message: 'Error creating announcement', error: error.message });
    }
  }
}
