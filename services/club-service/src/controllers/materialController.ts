import { Request, Response } from 'express';
import { ClubMemberRole, MaterialType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

const MANAGER_ROLES: ClubMemberRole[] = ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'];
const ALLOWED_TYPES = new Set<MaterialType>([
  'DOCUMENT',
  'VIDEO',
  'LINK',
  'IMAGE',
  'AUDIO',
  'PRESENTATION',
  'CODE',
  'QUIZ',
]);

const normalizeMaterialType = (rawType?: string): MaterialType => {
  const value = String(rawType || '').toUpperCase() as MaterialType;
  if (ALLOWED_TYPES.has(value)) return value;
  return 'DOCUMENT';
};

export const getMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const userId = req.user!.userId;
    const { type, category, search } = req.query;

    const membership = await prisma.clubMember.findFirst({
      where: { clubId, userId, isActive: true },
      select: { id: true },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view materials' });
    }

    const where: any = { clubId };

    if (typeof type === 'string' && type.trim().length > 0) {
      where.type = normalizeMaterialType(type);
    }

    if (typeof category === 'string' && category.trim().length > 0) {
      where.category = category.trim();
    }

    if (typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const materials = await prisma.clubMaterial.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(materials);
  } catch (error: any) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials', details: error.message });
  }
};

export const createMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const userId = req.user!.userId;
    const {
      title,
      description,
      type,
      url,
      fileUrl,
      linkUrl,
      fileName,
      fileSize,
      mimeType,
      category,
      tags,
      isPublic,
      requiresEnrollment,
    } = req.body || {};

    const normalizedTitle = String(title || '').trim();
    if (!normalizedTitle) {
      return res.status(400).json({ error: 'Material title is required' });
    }

    const normalizedUrl = String(url || fileUrl || linkUrl || '').trim();
    if (!normalizedUrl) {
      return res.status(400).json({ error: 'Material URL is required' });
    }

    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId,
        isActive: true,
        role: { in: MANAGER_ROLES },
      },
      select: { id: true },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only owners/instructors can upload materials' });
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.map((tag: unknown) => String(tag).trim()).filter((tag: string) => tag.length > 0)
      : [];

    const material = await prisma.clubMaterial.create({
      data: {
        clubId,
        title: normalizedTitle,
        description: description ? String(description).trim() : null,
        type: normalizeMaterialType(type),
        url: normalizedUrl,
        fileName: fileName ? String(fileName).trim() : null,
        fileSize: Number.isFinite(Number(fileSize)) ? Number(fileSize) : null,
        mimeType: mimeType ? String(mimeType).trim() : null,
        category: category ? String(category).trim() : null,
        tags: normalizedTags,
        isPublic: Boolean(isPublic),
        requiresEnrollment: requiresEnrollment !== undefined ? Boolean(requiresEnrollment) : true,
        uploadedById: userId,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json(material);
  } catch (error: any) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material', details: error.message });
  }
};

export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const material = await prisma.clubMaterial.findUnique({
      where: { id },
      select: { id: true, clubId: true, uploadedById: true },
    });

    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: material.clubId,
        userId,
        isActive: true,
      },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const canDelete =
      membership.role === 'OWNER' ||
      membership.role === 'INSTRUCTOR' ||
      material.uploadedById === userId;

    if (!canDelete) {
      return res.status(403).json({ error: 'Only uploader/owners/instructors can delete materials' });
    }

    await prisma.clubMaterial.delete({ where: { id } });
    res.json({ message: 'Material deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material', details: error.message });
  }
};
