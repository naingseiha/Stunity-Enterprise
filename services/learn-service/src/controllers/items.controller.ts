import { Request, Response } from 'express';
import { prisma } from '../context';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class ItemsController {
  /**
   * POST /sections/:sectionId/items - Create a new course item (Lesson)
   */
  static async createItem(req: AuthRequest, res: Response) {
    try {
      const { sectionId } = req.params;
      const { title, type, content, videoUrl, duration, isFree, order, courseId } = req.body;
      const userId = req.user?.id;

      // Verify section ownership via course
      const section = await prisma.courseSection.findUnique({
        where: { id: sectionId },
        include: { course: true }
      });

      if (!section || section.course.instructorId !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Default order
      let finalOrder = order;
      if (finalOrder === undefined) {
        const lastItem = await prisma.lesson.findFirst({
          where: { sectionId },
          orderBy: { order: 'desc' }
        });
        finalOrder = lastItem ? lastItem.order + 1 : 0;
      }

      const item = await prisma.lesson.create({
        data: {
          courseId: courseId || section.courseId,
          sectionId,
          title,
          type: type || 'VIDEO',
          content: content ?? undefined,
          videoUrl: videoUrl ?? undefined,
          duration: duration ?? 0,
          isFree: isFree ?? false,
          order: finalOrder
        }
      });

      res.status(201).json({ success: true, item });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error creating item', error: error.message });
    }
  }

  /**
   * PUT /items/:id - Update item details or move to another section
   */
  static async updateItem(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, content, videoUrl, duration, isFree, order, sectionId, isPublished } = req.body;
      const userId = req.user?.id;

      const item = await prisma.lesson.findUnique({
        where: { id },
        include: { section: { include: { course: true } } }
      });

      if (!item || (item.section && item.section.course.instructorId !== userId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const updated = await prisma.lesson.update({
        where: { id },
        data: {
          title: title ?? undefined,
          content: content ?? undefined,
          videoUrl: videoUrl ?? undefined,
          duration: duration ?? undefined,
          isFree: isFree ?? undefined,
          order: order ?? undefined,
          sectionId: sectionId ?? undefined,
          isPublished: isPublished ?? undefined
        }
      });

      res.json({ success: true, item: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating item', error: error.message });
    }
  }

  /**
   * DELETE /items/:id - Delete a course item
   */
  static async deleteItem(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const item = await prisma.lesson.findUnique({
        where: { id },
        include: { section: { include: { course: true } } }
      });

      if (!item || (item.section && item.section.course.instructorId !== userId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      await prisma.lesson.delete({
        where: { id }
      });

      res.json({ success: true, message: 'Item deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error deleting item', error: error.message });
    }
  }
}
