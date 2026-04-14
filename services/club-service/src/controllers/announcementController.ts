import { Request, Response } from 'express';
import { ClubMemberRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

const ALL_TARGET_ROLES: ClubMemberRole[] = [
  'OWNER',
  'INSTRUCTOR',
  'TEACHING_ASSISTANT',
  'STUDENT',
  'OBSERVER',
];

const MANAGER_ROLES: ClubMemberRole[] = ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'];

export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const userId = req.user!.userId;

    const membership = await prisma.clubMember.findFirst({
      where: { clubId, userId, isActive: true },
      select: { role: true },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view announcements' });
    }

    const announcements = await prisma.clubAnnouncement.findMany({
      where: { clubId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    const filtered = announcements.filter((item) => {
      if (!Array.isArray(item.targetRoles) || item.targetRoles.length === 0) return true;
      return item.targetRoles.includes(membership.role);
    });

    res.json(filtered);
  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements', details: error.message });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const userId = req.user!.userId;
    const { title, content, isPinned = false, targetRoles } = req.body || {};

    if (!String(content || '').trim()) {
      return res.status(400).json({ error: 'Announcement content is required' });
    }

    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId,
        isActive: true,
        role: { in: MANAGER_ROLES },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only owners/instructors can create announcements' });
    }

    const safeRoles = Array.isArray(targetRoles)
      ? targetRoles.filter((role): role is ClubMemberRole => ALL_TARGET_ROLES.includes(role))
      : [];

    const announcementTitle = String(title || '').trim();
    const normalizedTitle =
      announcementTitle.length > 0
        ? announcementTitle
        : String(content).trim().slice(0, 80);

    const announcement = await prisma.clubAnnouncement.create({
      data: {
        clubId,
        title: normalizedTitle || 'Announcement',
        content: String(content).trim(),
        isPinned: Boolean(isPinned),
        targetRoles: safeRoles.length > 0 ? safeRoles : ALL_TARGET_ROLES,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    res.status(201).json(announcement);
  } catch (error: any) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Failed to create announcement', details: error.message });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const existing = await prisma.clubAnnouncement.findUnique({
      where: { id },
      select: { id: true, clubId: true, createdById: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: existing.clubId,
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
      existing.createdById === userId;

    if (!canDelete) {
      return res.status(403).json({ error: 'Only creator/owners/instructors can delete announcements' });
    }

    await prisma.clubAnnouncement.delete({ where: { id } });
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Failed to delete announcement', details: error.message });
  }
};
