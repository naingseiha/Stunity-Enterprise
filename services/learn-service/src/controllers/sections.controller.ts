import { Request, Response } from 'express';
import { prisma } from '../context';
import { buildLocalizedTextInput, getRequestedLocale, resolveLocalizedText } from '../utils/localization';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; };
}

export class SectionsController {
  /**
   * GET /courses/:courseId/sections - List sections for a course
   */
  static async listSections(req: AuthRequest, res: Response) {
    try {
      const locale = getRequestedLocale(req.query.locale);
      const { courseId } = req.params;
      
      const sections = await prisma.courseSection.findMany({
        where: { courseId },
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            orderBy: { order: 'asc' }
          }
        }
      });

      res.json({
        success: true,
        sections: sections.map((section) => ({
          ...section,
          title: resolveLocalizedText(section.title, section.titleTranslations, locale),
          description: resolveLocalizedText(section.description, section.descriptionTranslations, locale) || null,
          lessons: section.lessons.map((lesson) => ({
            ...lesson,
            title: resolveLocalizedText(lesson.title, lesson.titleTranslations, locale),
            description: resolveLocalizedText(lesson.description, lesson.descriptionTranslations, locale) || null,
            content: resolveLocalizedText(lesson.content, lesson.contentTranslations, locale) || null,
          })),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error fetching sections', error: error.message });
    }
  }

  /**
   * POST /courses/:courseId/sections - Create a new section
   */
  static async createSection(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const { title, description, order, titleTranslations, descriptionTranslations, titleEn, titleKm, titleKh, descriptionEn, descriptionKm, descriptionKh } = req.body ?? {};
      const userId = req.user?.id;

      // Verify course ownership
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true }
      });

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ success: false, message: 'Only the instructor can add sections' });
      }

      // If order not provided, put at the end
      let finalOrder = order;
      if (finalOrder === undefined) {
        const lastSection = await prisma.courseSection.findFirst({
          where: { courseId },
          orderBy: { order: 'desc' }
        });
        finalOrder = lastSection ? lastSection.order + 1 : 0;
      }

      const localizedTitle = buildLocalizedTextInput(title, titleTranslations, {
        en: titleEn,
        km: titleKm ?? titleKh,
      });
      const localizedDescription = buildLocalizedTextInput(description, descriptionTranslations, {
        en: descriptionEn,
        km: descriptionKm ?? descriptionKh,
      });

      const section = await prisma.courseSection.create({
        data: {
          courseId,
          title: localizedTitle.value,
          description: localizedDescription.value || null,
          titleTranslations: localizedTitle.translations,
          descriptionTranslations: localizedDescription.translations,
          order: finalOrder
        }
      });

      res.status(201).json({ success: true, section });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error creating section', error: error.message });
    }
  }

  /**
   * PUT /courses/:courseId/sections/reorder - Batch update section order
   */
  static async reorderSections(req: AuthRequest, res: Response) {
    try {
      const { courseId } = req.params;
      const userId = req.user?.id;
      const input = Array.isArray(req.body?.sections)
        ? req.body.sections
        : Array.isArray(req.body?.sectionIds)
          ? req.body.sectionIds.map((id: unknown, index: number) => ({ id, order: index }))
          : [];

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { instructorId: true },
      });

      if (!course || course.instructorId !== userId) {
        return res.status(403).json({ success: false, message: 'Only the instructor can reorder sections' });
      }

      const sections = input
        .map((section: any, index: number) => ({
          id: typeof section?.id === 'string' ? section.id.trim() : '',
          order: Number.isFinite(Number(section?.order)) ? Number(section.order) : index,
        }))
        .filter((section: { id: string }) => section.id);

      if (sections.length === 0) {
        return res.status(400).json({ success: false, message: 'sections or sectionIds are required' });
      }

      const existingCount = await prisma.courseSection.count({
        where: {
          courseId,
          id: { in: sections.map((section: { id: string }) => section.id) },
        },
      });

      if (existingCount !== sections.length) {
        return res.status(400).json({ success: false, message: 'All sections must belong to this course' });
      }

      await prisma.$transaction(
        sections.map((section: { id: string; order: number }) => prisma.courseSection.update({
          where: { id: section.id },
          data: { order: section.order },
        }))
      );

      res.json({ success: true, sections });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error reordering sections', error: error.message });
    }
  }

  /**
   * PUT /sections/:id - Update section details or order
   */
  static async updateSection(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, order, titleTranslations, descriptionTranslations, titleEn, titleKm, titleKh, descriptionEn, descriptionKm, descriptionKh } = req.body ?? {};
      const userId = req.user?.id;

      const section = await prisma.courseSection.findUnique({
        where: { id },
        include: { course: true }
      });

      if (!section || section.course.instructorId !== userId) {
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

      const updated = await prisma.courseSection.update({
        where: { id },
        data: {
          title: localizedTitle.value || undefined,
          description: localizedDescription.value || undefined,
          titleTranslations: localizedTitle.translations ?? undefined,
          descriptionTranslations: localizedDescription.translations ?? undefined,
          order: order ?? undefined
        }
      });

      res.json({ success: true, section: updated });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error updating section', error: error.message });
    }
  }

  /**
   * DELETE /sections/:id - Delete a section
   */
  static async deleteSection(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const section = await prisma.courseSection.findUnique({
        where: { id },
        include: { course: true }
      });

      if (!section || section.course.instructorId !== userId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      await prisma.courseSection.delete({
        where: { id }
      });

      res.json({ success: true, message: 'Section deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error deleting section', error: error.message });
    }
  }
}
