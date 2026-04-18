import { Request, Response } from 'express';
import { prisma } from '../context';
import { buildLocalizedTextInput } from '../utils/localization';
import { normalizeCourseItemType, normalizeLessonResources, normalizeLessonTextTracks } from '../utils/course-items';

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
      const {
        title,
        titleTranslations,
        titleEn,
        titleKm,
        titleKh,
        type,
        description,
        descriptionTranslations,
        descriptionEn,
        descriptionKm,
        descriptionKh,
        content,
        contentTranslations,
        contentEn,
        contentKm,
        contentKh,
        videoUrl,
        duration,
        isFree,
        order,
        quiz,
        assignment,
        exercise,
        textTracks,
        resources,
      } = req.body ?? {};
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

      const localizedTitle = buildLocalizedTextInput(title, titleTranslations, {
        en: titleEn,
        km: titleKm ?? titleKh,
      });
      const localizedDescription = buildLocalizedTextInput(description, descriptionTranslations, {
        en: descriptionEn,
        km: descriptionKm ?? descriptionKh,
      });
      const localizedContent = buildLocalizedTextInput(content, contentTranslations, {
        en: contentEn,
        km: contentKm ?? contentKh,
      });
      const assignmentInstructions = buildLocalizedTextInput(assignment?.instructions, assignment?.instructionsTranslations, {
        en: assignment?.instructionsEn,
        km: assignment?.instructionsKm ?? assignment?.instructionsKh,
      });
      const assignmentRubric = buildLocalizedTextInput(assignment?.rubric, assignment?.rubricTranslations, {
        en: assignment?.rubricEn,
        km: assignment?.rubricKm ?? assignment?.rubricKh,
      });
      const itemType = normalizeCourseItemType(type, 'VIDEO');
      const normalizedTextTracks = normalizeLessonTextTracks(textTracks);
      const normalizedResources = normalizeLessonResources(resources);

      const item = await (prisma.lesson as any).create({
        data: {
          courseId: section.courseId,
          sectionId,
          title: localizedTitle.value,
          type: itemType as any,
          description: localizedDescription.value || undefined,
          content: localizedContent.value || undefined,
          titleTranslations: localizedTitle.translations,
          descriptionTranslations: localizedDescription.translations,
          contentTranslations: localizedContent.translations,
          videoUrl: videoUrl ?? undefined,
          duration: duration ?? 0,
          isFree: isFree ?? false,
          order: finalOrder,
          textTracks: normalizedTextTracks !== undefined ? {
            create: normalizedTextTracks as any,
          } : undefined,
          resources: normalizedResources !== undefined ? {
            create: normalizedResources as any,
          } : undefined,
          quiz: (itemType === 'QUIZ' && quiz) ? {
            create: {
              passingScore: quiz.passingScore || 80,
              questions: {
                create: quiz.questions?.map((q: any) => ({
                  question: q.question,
                  explanation: q.explanation,
                  order: q.order || 0,
                  options: {
                    create: q.options?.map((opt: any) => ({
                      text: opt.text,
                      isCorrect: opt.isCorrect
                    })) || []
                  }
                })) || []
              }
            }
          } : undefined,
          assignment: (itemType === 'ASSIGNMENT' && assignment) ? {
            create: {
              maxScore: assignment.maxScore || 100,
              passingScore: assignment.passingScore || 80,
              instructions: assignmentInstructions.value || '',
              instructionsTranslations: assignmentInstructions.translations,
              rubric: assignmentRubric.value || null,
              rubricTranslations: assignmentRubric.translations,
            }
          } : undefined,
          exercise: (itemType === 'EXERCISE' && exercise) ? {
            create: {
              language: exercise.language || 'javascript',
              initialCode: exercise.initialCode || '',
              solution: exercise.solutionCode || '',
              testCases: exercise.testCases || '' // Note: JSON field might require specific handling
            }
          } : undefined
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
      const {
        title,
        titleTranslations,
        titleEn,
        titleKm,
        titleKh,
        description,
        descriptionTranslations,
        descriptionEn,
        descriptionKm,
        descriptionKh,
        content,
        contentTranslations,
        contentEn,
        contentKm,
        contentKh,
        videoUrl,
        duration,
        isFree,
        order,
        type,
        sectionId,
        isPublished,
        textTracks,
        resources,
      } = req.body ?? {};
      const userId = req.user?.id;

      const item = await prisma.lesson.findUnique({
        where: { id },
        include: {
          course: { select: { instructorId: true } },
          section: { include: { course: true } },
        }
      });

      if (!item || item.course.instructorId !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      if (sectionId !== undefined && sectionId !== item.sectionId) {
        if (typeof sectionId !== 'string' || !sectionId.trim()) {
          return res.status(400).json({ success: false, message: 'sectionId must be a valid section id' });
        }

        const targetSection = await prisma.courseSection.findUnique({
          where: { id: sectionId },
          include: { course: { select: { id: true, instructorId: true } } },
        });

        if (!targetSection || targetSection.course.instructorId !== userId) {
          return res.status(403).json({ success: false, message: 'Unauthorized target section' });
        }

        if (targetSection.courseId !== item.courseId) {
          return res.status(400).json({ success: false, message: 'Cannot move an item to a different course' });
        }
      }

      const localizedTitle = buildLocalizedTextInput(title, titleTranslations, {
        en: titleEn,
        km: titleKm ?? titleKh,
      });
      const localizedDescription = buildLocalizedTextInput(description, descriptionTranslations, {
        en: descriptionEn,
        km: descriptionKm ?? descriptionKh,
      });
      const localizedContent = buildLocalizedTextInput(content, contentTranslations, {
        en: contentEn,
        km: contentKm ?? contentKh,
      });
      const normalizedTextTracks = normalizeLessonTextTracks(textTracks);
      const normalizedResources = normalizeLessonResources(resources);

      const updated = await (prisma.lesson as any).update({
        where: { id },
        data: {
          title: localizedTitle.value || undefined,
          description: localizedDescription.value || undefined,
          content: localizedContent.value || undefined,
          titleTranslations: localizedTitle.translations ?? undefined,
          descriptionTranslations: localizedDescription.translations ?? undefined,
          contentTranslations: localizedContent.translations ?? undefined,
          videoUrl: videoUrl ?? undefined,
          duration: duration ?? undefined,
          isFree: isFree ?? undefined,
          order: order ?? undefined,
          type: type !== undefined ? normalizeCourseItemType(type, item.type) as any : undefined,
          sectionId: sectionId ?? undefined,
          isPublished: isPublished ?? undefined,
          textTracks: normalizedTextTracks !== undefined ? {
            deleteMany: {},
            create: normalizedTextTracks as any,
          } : undefined,
          resources: normalizedResources !== undefined ? {
            deleteMany: {},
            create: normalizedResources as any,
          } : undefined,
        }
      });

      res.json({ success: true, item: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating item', error: error.message });
    }
  }

  /**
   * PUT /courses/:courseId/items/reorder - Batch update item order/section
   */
  static async reorderItems(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const input = Array.isArray(req.body?.items)
        ? req.body.items
        : Array.isArray(req.body?.itemIds)
          ? req.body.itemIds.map((id: unknown, index: number) => ({ id, order: index }))
          : [];

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true },
      });

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ success: false, message: 'Only the instructor can reorder items' });
      }

      const items = input
        .map((item: any, index: number) => ({
          id: typeof item?.id === 'string' ? item.id.trim() : '',
          sectionId: typeof item?.sectionId === 'string' && item.sectionId.trim() ? item.sectionId.trim() : undefined,
          order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
        }))
        .filter((item: { id: string }) => item.id);

      if (items.length === 0) {
        return res.status(400).json({ success: false, message: 'items or itemIds are required' });
      }

      const existingItems = await prisma.lesson.findMany({
        where: {
          courseId,
          id: { in: items.map((item: { id: string }) => item.id) },
        },
        select: { id: true },
      });

      if (existingItems.length !== items.length) {
        return res.status(400).json({ success: false, message: 'All items must belong to this course' });
      }

      const targetSectionIds = Array.from(new Set(items.map((item: { sectionId?: string }) => item.sectionId).filter(Boolean))) as string[];
      if (targetSectionIds.length > 0) {
        const validSections = await prisma.courseSection.count({
          where: {
            courseId,
            id: { in: targetSectionIds },
          },
        });

        if (validSections !== targetSectionIds.length) {
          return res.status(400).json({ success: false, message: 'All target sections must belong to this course' });
        }
      }

      await prisma.$transaction(
        items.map((item: { id: string; order: number; sectionId?: string }) => prisma.lesson.update({
          where: { id: item.id },
          data: {
            order: item.order,
            sectionId: item.sectionId,
          },
        }))
      );

      res.json({ success: true, items });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error reordering items', error: error.message });
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
        include: { course: { select: { instructorId: true } } }
      });

      if (!item || item.course.instructorId !== userId) {
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
