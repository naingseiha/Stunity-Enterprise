import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

// Create award
export const createAward = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const { memberId, title, type, description, criteria } = req.body;

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can create awards' });
    }

    // Verify member exists
    const targetMember = await prisma.clubMember.findFirst({
      where: {
        id: memberId,
        clubId
      }
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in this club' });
    }

    const award = await prisma.clubAward.create({
      data: {
        clubId,
        memberId,
        title,
        type: type || 'CUSTOM',
        description,
        criteria,
        awardedById: req.user!.userId
      },
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePictureUrl: true
              }
            }
          }
        },
        awardedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(award);
  } catch (error: any) {
    console.error('Error creating award:', error);
    res.status(500).json({ error: 'Failed to create award', details: error.message });
  }
};

// Get club awards
export const getClubAwards = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId } = req.params;
    const { type, memberId } = req.query;

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You must be a club member to view awards' });
    }

    const where: any = { clubId };
    if (type) where.type = type as string;
    if (memberId) where.memberId = memberId as string;

    const awards = await prisma.clubAward.findMany({
      where,
      include: {
        member: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePictureUrl: true
              }
            }
          }
        },
        awardedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { awardedAt: 'desc' }
    });

    res.json(awards);
  } catch (error: any) {
    console.error('Error fetching awards:', error);
    res.status(500).json({ error: 'Failed to fetch awards', details: error.message });
  }
};

// Get member awards
export const getMemberAwards = async (req: AuthRequest, res: Response) => {
  try {
    const { clubId, memberId } = req.params;

    // Check if user is authorized
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const targetMember = await prisma.clubMember.findUnique({
      where: { id: memberId }
    });

    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Students can only view own awards unless instructor
    if (membership.role === 'STUDENT' && membership.id !== memberId) {
      return res.status(403).json({ error: 'Students can only view their own awards' });
    }

    const awards = await prisma.clubAward.findMany({
      where: {
        clubId,
        memberId
      },
      include: {
        awardedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { awardedAt: 'desc' }
    });

    res.json(awards);
  } catch (error: any) {
    console.error('Error fetching member awards:', error);
    res.status(500).json({ error: 'Failed to fetch awards', details: error.message });
  }
};

// Get award by ID
export const getAwardById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const award = await prisma.clubAward.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true
          }
        },
        member: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePictureUrl: true
              }
            }
          }
        },
        awardedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!award) {
      return res.status(404).json({ error: 'Award not found' });
    }

    // Check if user is a member
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: award.clubId,
        userId: req.user!.userId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(award);
  } catch (error: any) {
    console.error('Error fetching award:', error);
    res.status(500).json({ error: 'Failed to fetch award', details: error.message });
  }
};

// Delete award
export const deleteAward = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const award = await prisma.clubAward.findUnique({
      where: { id }
    });

    if (!award) {
      return res.status(404).json({ error: 'Award not found' });
    }

    // Check if user is instructor or owner
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: award.clubId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'INSTRUCTOR'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Only instructors can delete awards' });
    }

    await prisma.clubAward.delete({
      where: { id }
    });

    res.json({ message: 'Award revoked successfully' });
  } catch (error: any) {
    console.error('Error deleting award:', error);
    res.status(500).json({ error: 'Failed to revoke award', details: error.message });
  }
};
