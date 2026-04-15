import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export class QAController {
  /**
   * GET /courses/:courseId/qa - List QA threads
   */
  static async listThreads(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const { itemId } = req.query;

      const threads = await prisma.courseQAThread.findMany({
        where: {
          courseId,
          ...(itemId ? { itemId: String(itemId) } : {}),
        },
        include: {
          _count: {
            select: { answers: true }
          },
        },
        orderBy: { createdAt: 'desc' }
      });

      const userIds = Array.from(new Set(threads.map(thread => thread.userId)));
      const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : [];
      const userMap = new Map(users.map(user => [user.id, user]));

      res.json({
        threads: threads.map(thread => ({
          ...thread,
          user: userMap.get(thread.userId) || null,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching QA threads', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/qa - Create QA thread
   */
  static async createThread(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const { title, body, itemId } = req.body;

      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const thread = await prisma.courseQAThread.create({
        data: {
          courseId,
          userId,
          title,
          body,
          itemId: itemId || null,
        }
      });

      res.status(201).json({ thread });
    } catch (error: any) {
      res.status(500).json({ message: 'Error creating QA thread', error: error.message });
    }
  }

  /**
   * GET /qa/:threadId - Thread details with answers
   */
  static async getThreadDetail(req: AuthRequest, res: Response) {
    try {
      const { threadId } = req.params;

      const thread = await prisma.courseQAThread.findUnique({
        where: { id: threadId },
        include: {
          answers: {
            orderBy: { createdAt: 'asc' },
          }
        }
      });

      if (!thread) return res.status(404).json({ message: 'Thread not found' });

      const answerUserIds = thread.answers.map(answer => answer.userId);
      const userIds = Array.from(new Set([thread.userId, ...answerUserIds]));
      const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : [];
      const userMap = new Map(users.map(user => [user.id, user]));

      res.json({
        thread: {
          ...thread,
          user: userMap.get(thread.userId) || null,
          answers: thread.answers.map(answer => ({
            ...answer,
            user: userMap.get(answer.userId) || null,
          })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: 'Error fetching thread detail', error: error.message });
    }
  }

  /**
   * POST /qa/:threadId/answers - Post an answer
   */
  static async postAnswer(req: AuthRequest, res: Response) {
    try {
      const { threadId } = req.params;
      const userId = req.user?.id;
      const { body, isInstructor } = req.body;

      if (!userId) return res.status(401).json({ message: 'Unauthorized' });

      const answer = await prisma.courseQAAnswer.create({
        data: {
          threadId,
          userId,
          body,
          isInstructor: !!isInstructor
        },
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, role: true },
      });

      res.status(201).json({ answer: { ...answer, user } });
    } catch (error: any) {
      res.status(500).json({ message: 'Error posting answer', error: error.message });
    }
  }
}
