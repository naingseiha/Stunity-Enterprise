import { Request, Response } from 'express';
import { prisma } from '../context';
import { buildLocalizedTextInput } from '../utils/localization';

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
        courseId,
        quiz,
        assignment,
        exercise,
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

      const item = await prisma.lesson.create({
        data: {
          courseId: courseId || section.courseId,
          sectionId,
          title: localizedTitle.value,
          type: type || 'VIDEO',
          description: localizedDescription.value || undefined,
          content: localizedContent.value || undefined,
          titleTranslations: localizedTitle.translations,
          descriptionTranslations: localizedDescription.translations,
          contentTranslations: localizedContent.translations,
          videoUrl: videoUrl ?? undefined,
          duration: duration ?? 0,
          isFree: isFree ?? false,
          order: finalOrder,
          quiz: (type === 'QUIZ' && quiz) ? {
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
          assignment: (type === 'ASSIGNMENT' && assignment) ? {
            create: {
              maxScore: assignment.maxScore || 100,
              passingScore: assignment.passingScore || 80,
              instructions: assignmentInstructions.value || '',
              instructionsTranslations: assignmentInstructions.translations,
              rubric: assignmentRubric.value || null,
              rubricTranslations: assignmentRubric.translations,
            }
          } : undefined,
          exercise: (type === 'EXERCISE' && exercise) ? {
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
        sectionId,
        isPublished,
      } = req.body ?? {};
      const userId = req.user?.id;

      const item = await prisma.lesson.findUnique({
        where: { id },
        include: { section: { include: { course: true } } }
      });

      if (!item || (item.section && item.section.course.instructorId !== userId)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
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

      const updated = await prisma.lesson.update({
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
