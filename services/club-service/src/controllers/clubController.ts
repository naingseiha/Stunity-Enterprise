import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../index';
import axios from 'axios';

const prisma = new PrismaClient();

// Feed service URL
const FEED_SERVICE_URL = process.env.FEED_SERVICE_URL || 'http://localhost:3010';

export const createClub = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      name,
      description,
      type = 'CASUAL_STUDY_GROUP',
      mode = 'PUBLIC',
      schoolId,
      coverImage,
      subject,
      level,
      tags,
      enableSubjects,
      enableGrading,
      enableAttendance,
      enableAssignments,
      enableReports,
      enableAwards,
      startDate,
      endDate,
      capacity,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Club name is required' });
    }

    const club = await prisma.studyClub.create({
      data: {
        name,
        description,
        clubType: type,
        mode,
        creatorId: userId,
        schoolId,
        coverImage,
        subject,
        level,
        tags: tags || [],
        enableSubjects: enableSubjects || false,
        enableGrading: enableGrading || false,
        enableAttendance: enableAttendance || false,
        enableAssignments: enableAssignments || false,
        enableReports: enableReports || false,
        enableAwards: enableAwards || false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        capacity,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
          },
        },
      },
    });

    // 🚀 Create feed post if club is PUBLIC
    if (mode === 'PUBLIC') {
      try {
        const clubTypeLabels: Record<string, string> = {
          CASUAL_STUDY_GROUP: '📚 Study Group',
          STRUCTURED_CLASS: '🎓 Class',
          PROJECT_GROUP: '🚀 Project',
          EXAM_PREP: '📖 Exam Prep',
        };

        const postContent = `${clubTypeLabels[type] || '📚'} New Club Created!\n\n${name}\n\n${description}\n\n${tags && tags.length > 0 ? tags.map((t: string) => `#${t}`).join(' ') : ''}`;

        await axios.post(
          `${FEED_SERVICE_URL}/posts`,
          {
            content: postContent,
            postType: 'ARTICLE',
            visibility: 'SCHOOL',
            mediaUrls: [],
          },
          {
            headers: {
              Authorization: req.headers.authorization,
            },
          }
        );

        console.log(`✅ Created feed post for public club: ${club.name}`);
      } catch (feedError: any) {
        console.error('⚠️ Failed to create feed post (non-blocking):', feedError.message);
        // Don't block club creation if feed post fails
      }
    }

    res.status(201).json({ success: true, message: 'Club created successfully', club });
  } catch (error: any) {
    console.error('Create club error:', error);
    res.status(500).json({ success: false, message: 'Failed to create club', error: error.message });
  }
};

export const getClubs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId; // Optional - may be undefined
    const { type, myClubs, schoolId, search } = req.query;

    const where: any = {};

    if (type) where.clubType = type;
    if (schoolId) where.schoolId = schoolId;

    if (myClubs === 'true' && userId) {
      where.members = { some: { userId } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const clubs = await prisma.studyClub.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform response to match mobile API expectations
    const transformedClubs = clubs.map(club => ({
      ...club,
      type: club.clubType,  // Map clubType to type
      memberCount: club._count.members,  // Map _count.members to memberCount
    }));

    res.json({ success: true, clubs: transformedClubs });
  } catch (error: any) {
    console.error('Get clubs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clubs', error: error.message });
  }
};

export const getClubById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId; // Optional

    const club = await prisma.studyClub.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            role: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
                role: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        subjects: {
          include: {
            instructor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePictureUrl: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            assignments: true,
            sessions: true,
            materials: true,
          },
        },
      },
    });

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    // Check user membership
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: req.user!.userId
      }
    });

    // Transform response to match mobile API expectations
    const transformedClub = {
      ...club,
      type: club.clubType,  // Map clubType to type
      memberCount: club.members.length,  // Count members
    };

    res.json({ success: true, club: transformedClub, membership });
  } catch (error: any) {
    console.error('Get club error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch club', error: error.message });
  }
};

export const updateClub = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const club = await prisma.studyClub.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    const membership = club.members[0];
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'INSTRUCTOR')) {
      return res.status(403).json({ success: false, message: 'Only club owner or instructor can update club settings' });
    }

    const {
      name,
      description,
      coverImage,
      subject,
      level,
      tags,
      mode,
      capacity,
      enableSubjects,
      enableGrading,
      enableAttendance,
      enableAssignments,
      enableReports,
      enableAwards,
    } = req.body;

    const updatedClub = await prisma.studyClub.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(coverImage !== undefined && { coverImage }),
        ...(subject !== undefined && { subject }),
        ...(level !== undefined && { level }),
        ...(tags && { tags }),
        ...(mode && { mode }),
        ...(capacity !== undefined && { capacity }),
        ...(enableSubjects !== undefined && { enableSubjects }),
        ...(enableGrading !== undefined && { enableGrading }),
        ...(enableAttendance !== undefined && { enableAttendance }),
        ...(enableAssignments !== undefined && { enableAssignments }),
        ...(enableReports !== undefined && { enableReports }),
        ...(enableAwards !== undefined && { enableAwards }),
      },
    });

    res.json({ success: true, message: 'Club updated successfully', club: updatedClub });
  } catch (error: any) {
    console.error('Update club error:', error);
    res.status(500).json({ success: false, message: 'Failed to update club', error: error.message });
  }
};

export const deleteClub = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const club = await prisma.studyClub.findUnique({
      where: { id },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    const membership = club.members[0];
    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Only club owner can delete the club' });
    }

    await prisma.studyClub.delete({ where: { id } });

    res.json({ success: true, message: 'Club deleted successfully' });
  } catch (error: any) {
    console.error('Delete club error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete club', error: error.message });
  }
};

export const joinClub = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const club = await prisma.studyClub.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (club.members.some(m => m.userId === userId)) {
      return res.status(400).json({ success: false, message: 'Already a member of this club' });
    }

    if (club.capacity && club.members.length >= club.capacity) {
      return res.status(400).json({ success: false, message: 'Club is at full capacity' });
    }

    if (club.mode === 'INVITE_ONLY' || club.mode === 'APPROVAL_REQUIRED') {
      return res.status(403).json({ success: false, message: 'This club requires an invitation or approval to join' });
    }

    const member = await prisma.clubMember.create({
      data: {
        clubId: id,
        userId,
        role: 'STUDENT',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    res.json({ success: true, message: 'Joined club successfully', member });
  } catch (error: any) {
    console.error('Join club error:', error);
    res.status(500).json({ success: false, message: 'Failed to join club', error: error.message });
  }
};

export const leaveClub = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId,
      },
    });

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Not a member of this club' });
    }

    if (membership.role === 'OWNER') {
      return res.status(400).json({ success: false, message: 'Club owner cannot leave. Transfer ownership or delete the club.' });
    }

    await prisma.clubMember.delete({ where: { id: membership.id } });

    res.json({ success: true, message: 'Left club successfully' });
  } catch (error: any) {
    console.error('Leave club error:', error);
    res.status(500).json({ success: false, message: 'Failed to leave club', error: error.message });
  }
};

export const getClubMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const members = await prisma.clubMember.findMany({
      where: { clubId: id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            email: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    res.json({ success: true, members });
  } catch (error: any) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members', error: error.message });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.user!.userId;
    const { role } = req.body;

    const currentUserMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: currentUserId,
      },
    });

    if (!currentUserMembership || currentUserMembership.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Only club owner can update member roles' });
    }

    if (role === 'OWNER') {
      return res.status(400).json({ success: false, message: 'Use transfer ownership endpoint to change owner' });
    }

    await prisma.clubMember.updateMany({
      where: {
        clubId: id,
        userId: targetUserId,
      },
      data: {
        role,
      },
    });

    res.json({ success: true, message: 'Member role updated successfully' });
  } catch (error: any) {
    console.error('Update member role error:', error);
    res.status(500).json({ success: false, message: 'Failed to update member role', error: error.message });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.user!.userId;

    const currentUserMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: currentUserId,
      },
    });

    if (!currentUserMembership || 
        (currentUserMembership.role !== 'OWNER' && currentUserMembership.role !== 'INSTRUCTOR')) {
      return res.status(403).json({ success: false, message: 'Only club owner or instructor can remove members' });
    }

    const targetMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: targetUserId,
      },
    });

    if (!targetMembership) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    if (targetMembership.role === 'OWNER') {
      return res.status(400).json({ success: false, message: 'Cannot remove club owner' });
    }

    await prisma.clubMember.delete({ where: { id: targetMembership.id } });

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove member', error: error.message });
  }
};
