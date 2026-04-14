import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../index';
import axios from 'axios';

const prisma = new PrismaClient();

// Feed service URL
const FEED_SERVICE_URL = process.env.FEED_SERVICE_URL || 'http://localhost:3010';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3013';
const NOTIFICATION_SERVICE_AUTH_TOKEN =
  process.env.NOTIFICATION_SERVICE_AUTH_TOKEN || 'stunity-notification-dev-service-token';
const PENDING_JOIN_REASON = 'PENDING_APPROVAL';
const PENDING_INVITE_REASON = 'INVITED_PENDING';
const CLUB_MANAGER_ROLES = ['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'] as const;

const getDisplayName = (user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) => {
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
  return fullName || user?.email || 'A user';
};

const sendUserNotification = async (payload: {
  userId: string;
  title: string;
  body: string;
  actorId?: string | null;
  link?: string;
}) => {
  try {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL}/notifications/send`,
      {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        data: {
          type: 'ANNOUNCEMENT',
          actorId: payload.actorId || undefined,
          link: payload.link || undefined,
        },
      },
      {
        timeout: 5000,
        headers: {
          'x-service-token': NOTIFICATION_SERVICE_AUTH_TOKEN,
        },
      }
    );
  } catch (error: any) {
    console.warn('⚠️ Failed to send club notification (non-blocking):', error?.message || error);
  }
};

const getManagerUserIds = async (clubId: string, excludeUserIds: string[] = []): Promise<string[]> => {
  const managerMemberships = await prisma.clubMember.findMany({
    where: {
      clubId,
      isActive: true,
      role: { in: [...CLUB_MANAGER_ROLES] },
      ...(excludeUserIds.length > 0 ? { userId: { notIn: excludeUserIds } } : {}),
    },
    select: {
      userId: true,
    },
  });

  return Array.from(new Set(managerMemberships.map((m) => m.userId)));
};

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
    const isStructuredClass = type === 'STRUCTURED_CLASS';

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
        // Structured class clubs should behave like full academic groups by default.
        enableSubjects: enableSubjects ?? isStructuredClass,
        enableGrading: enableGrading ?? isStructuredClass,
        enableAttendance: enableAttendance ?? isStructuredClass,
        enableAssignments: enableAssignments ?? isStructuredClass,
        enableReports: enableReports ?? isStructuredClass,
        enableAwards: enableAwards ?? isStructuredClass,
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

        const feedVisibility = schoolId ? 'SCHOOL' : 'PUBLIC';

        await axios.post(
          `${FEED_SERVICE_URL}/posts`,
          {
            content: postContent,
            postType: 'CLUB_ANNOUNCEMENT',
            visibility: feedVisibility,
            mediaUrls: [],
            metadata: {
              clubId: club.id,
              clubName: name,
              clubType: type,
              clubMode: mode,
              schoolId: schoolId || null,
            },
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
    const { type, myClubs, schoolId, search, discover } = req.query;
    const pageParam = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const usePagination = pageParam !== undefined || limitParam !== undefined;

    let page = Number.parseInt(typeof pageParam === 'string' ? pageParam : '1', 10);
    let limit = Number.parseInt(typeof limitParam === 'string' ? limitParam : '20', 10);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 20;
    limit = Math.min(limit, 100);

    const where: any = {};

    if (type) where.clubType = type;
    if (schoolId) where.schoolId = schoolId;

    if (myClubs === 'true' && userId) {
      where.members = { some: { userId, isActive: true } };
    }

    if (discover === 'true' && userId) {
      where.members = { none: { userId } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

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
            members: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(usePagination ? { skip, take: limit + 1 } : {}),
    });

    const hasMore = usePagination ? clubs.length > limit : false;
    const pageItems = usePagination && hasMore ? clubs.slice(0, limit) : clubs;

    let joinedSet = new Set<string>();
    if (userId && pageItems.length > 0) {
      const memberships = await prisma.clubMember.findMany({
        where: {
          userId,
          clubId: { in: pageItems.map((club) => club.id) },
          isActive: true,
        },
        select: {
          clubId: true,
        },
      });
      joinedSet = new Set(memberships.map((membership) => membership.clubId));
    }

    // Transform response to match mobile API expectations
    const transformedClubs = pageItems.map(club => ({
      ...club,
      type: club.clubType,  // Map clubType to type
      memberCount: club._count.members,  // Map _count.members to memberCount
      isJoined: joinedSet.has(club.id),
    }));

    res.json({
      success: true,
      clubs: transformedClubs,
      pagination: {
        page: usePagination ? page : 1,
        limit: usePagination ? limit : transformedClubs.length,
        hasMore,
        nextPage: usePagination && hasMore ? page + 1 : null,
        returned: transformedClubs.length,
      },
    });
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
          where: {
            isActive: true,
          },
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
    const membership = userId
      ? await prisma.clubMember.findFirst({
          where: {
            clubId: id,
            userId,
          },
        })
      : null;

    // Transform response to match mobile API expectations
    const transformedClub = {
      ...club,
      type: club.clubType,  // Map clubType to type
      memberCount: club.members.length,  // Count members
      isJoined: Boolean(membership?.isActive),
      membershipStatus: membership
        ? (membership.isActive ? 'JOINED' : membership.withdrawalReason || 'PENDING')
        : null,
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
      startDate,
      endDate,
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
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
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
      select: {
        id: true,
        name: true,
        mode: true,
        capacity: true,
      },
    });

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    const existingMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: id,
          userId,
        },
      },
    });

    if (existingMembership?.isActive) {
      return res.status(400).json({ success: false, message: 'Already a member of this club' });
    }

    if (existingMembership && existingMembership.withdrawalReason === PENDING_INVITE_REASON) {
      return res.status(409).json({
        success: false,
        message: 'You have a pending invitation. Please accept the invitation to join this club.',
      });
    }

    if (existingMembership && existingMembership.withdrawalReason === PENDING_JOIN_REASON) {
      return res.status(200).json({
        success: true,
        message: 'Your join request is already pending approval.',
        status: 'PENDING_APPROVAL',
      });
    }

    const activeMemberCount = await prisma.clubMember.count({
      where: {
        clubId: id,
        isActive: true,
      },
    });

    if (club.capacity && activeMemberCount >= club.capacity) {
      return res.status(400).json({ success: false, message: 'Club is at full capacity' });
    }

    if (club.mode === 'INVITE_ONLY') {
      return res.status(403).json({ success: false, message: 'This club requires an invitation to join' });
    }

    if (club.mode === 'APPROVAL_REQUIRED') {
      if (existingMembership) {
        await prisma.clubMember.update({
          where: { id: existingMembership.id },
          data: {
            role: 'STUDENT',
            isActive: false,
            invitedBy: null,
            withdrawalReason: PENDING_JOIN_REASON,
            withdrawnAt: null,
          },
        });
      } else {
        await prisma.clubMember.create({
          data: {
            clubId: id,
            userId,
            role: 'STUDENT',
            isActive: false,
            invitedBy: null,
            withdrawalReason: PENDING_JOIN_REASON,
          },
        });
      }

      const [requester, managerUserIds] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, email: true },
        }),
        getManagerUserIds(id, [userId]),
      ]);

      if (managerUserIds.length > 0) {
        const requesterName = getDisplayName(requester);
        await Promise.all(
          managerUserIds.map((managerUserId) =>
            sendUserNotification({
              userId: managerUserId,
              actorId: userId,
              title: 'New club join request',
              body: `${requesterName} requested to join ${club.name}.`,
              link: `/clubs/${id}`,
            })
          )
        );
      }

      return res.status(202).json({
        success: true,
        message: 'Join request submitted and pending approval.',
        status: 'PENDING_APPROVAL',
      });
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

    if (!membership.isActive && membership.withdrawalReason === PENDING_JOIN_REASON) {
      await prisma.clubMember.delete({ where: { id: membership.id } });
      return res.json({ success: true, message: 'Join request canceled successfully' });
    }

    if (!membership.isActive && membership.withdrawalReason === PENDING_INVITE_REASON) {
      await prisma.clubMember.delete({ where: { id: membership.id } });
      return res.json({ success: true, message: 'Invitation declined successfully' });
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
      where: {
        clubId: id,
        isActive: true,
      },
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
        isActive: true,
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
        isActive: true,
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

export const requestJoinClub = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const club = await prisma.studyClub.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        mode: true,
        capacity: true,
      },
    });

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (club.mode !== 'APPROVAL_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Join request is only available for clubs requiring approval.',
      });
    }

    const existingMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: id,
          userId,
        },
      },
    });

    if (existingMembership?.isActive) {
      return res.status(400).json({ success: false, message: 'Already a member of this club' });
    }

    if (existingMembership && existingMembership.withdrawalReason === PENDING_JOIN_REASON) {
      return res.status(200).json({
        success: true,
        message: 'Your join request is already pending approval.',
        status: 'PENDING_APPROVAL',
      });
    }

    if (existingMembership && existingMembership.withdrawalReason === PENDING_INVITE_REASON) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending invitation. Please accept the invitation instead.',
      });
    }

    const activeMemberCount = await prisma.clubMember.count({
      where: {
        clubId: id,
        isActive: true,
      },
    });

    if (club.capacity && activeMemberCount >= club.capacity) {
      return res.status(400).json({ success: false, message: 'Club is at full capacity' });
    }

    if (existingMembership) {
      await prisma.clubMember.update({
        where: { id: existingMembership.id },
        data: {
          role: 'STUDENT',
          isActive: false,
          invitedBy: null,
          withdrawalReason: PENDING_JOIN_REASON,
          withdrawnAt: null,
        },
      });
    } else {
      await prisma.clubMember.create({
        data: {
          clubId: id,
          userId,
          role: 'STUDENT',
          isActive: false,
          invitedBy: null,
          withdrawalReason: PENDING_JOIN_REASON,
        },
      });
    }

    const [requester, managerUserIds] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      }),
      getManagerUserIds(id, [userId]),
    ]);

    if (managerUserIds.length > 0) {
      const requesterName = getDisplayName(requester);
      await Promise.all(
        managerUserIds.map((managerUserId) =>
          sendUserNotification({
            userId: managerUserId,
            actorId: userId,
            title: 'New club join request',
            body: `${requesterName} requested to join ${club.name}.`,
            link: `/clubs/${id}`,
          })
        )
      );
    }

    return res.status(202).json({
      success: true,
      message: 'Join request submitted and pending approval.',
      status: 'PENDING_APPROVAL',
    });
  } catch (error: any) {
    console.error('Request join club error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit join request', error: error.message });
  }
};

export const getClubJoinRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.userId;

    const currentUserMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: currentUserId,
        isActive: true,
        role: { in: [...CLUB_MANAGER_ROLES] },
      },
    });

    if (!currentUserMembership) {
      return res.status(403).json({ success: false, message: 'Only club managers can view join requests' });
    }

    const requests = await prisma.clubMember.findMany({
      where: {
        clubId: id,
        isActive: false,
        invitedBy: null,
        withdrawalReason: PENDING_JOIN_REASON,
      },
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
      orderBy: {
        joinedAt: 'asc',
      },
    });

    res.json({ success: true, requests });
  } catch (error: any) {
    console.error('Get join requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch join requests', error: error.message });
  }
};

export const approveJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.user!.userId;

    const currentUserMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: currentUserId,
        isActive: true,
        role: { in: [...CLUB_MANAGER_ROLES] },
      },
    });

    if (!currentUserMembership) {
      return res.status(403).json({ success: false, message: 'Only club managers can approve join requests' });
    }

    const requestMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: targetUserId,
        isActive: false,
        invitedBy: null,
        withdrawalReason: PENDING_JOIN_REASON,
      },
    });

    if (!requestMembership) {
      return res.status(404).json({ success: false, message: 'Join request not found' });
    }

    const club = await prisma.studyClub.findUnique({
      where: { id },
      select: { capacity: true, name: true },
    });

    const activeMemberCount = await prisma.clubMember.count({
      where: {
        clubId: id,
        isActive: true,
      },
    });

    if (club?.capacity && activeMemberCount >= club.capacity) {
      return res.status(400).json({ success: false, message: 'Club is at full capacity' });
    }

    await prisma.clubMember.update({
      where: { id: requestMembership.id },
      data: {
        isActive: true,
        withdrawalReason: null,
        withdrawnAt: null,
        joinedAt: new Date(),
      },
    });

    const approver = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { firstName: true, lastName: true, email: true },
    });

    await sendUserNotification({
      userId: targetUserId,
      actorId: currentUserId,
      title: 'Join request approved',
      body: `${getDisplayName(approver)} approved your request to join ${club?.name || 'this club'}.`,
      link: `/clubs/${id}`,
    });

    res.json({ success: true, message: 'Join request approved successfully' });
  } catch (error: any) {
    console.error('Approve join request error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve join request', error: error.message });
  }
};

export const rejectJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.user!.userId;

    const currentUserMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: currentUserId,
        isActive: true,
        role: { in: [...CLUB_MANAGER_ROLES] },
      },
    });

    if (!currentUserMembership) {
      return res.status(403).json({ success: false, message: 'Only club managers can reject join requests' });
    }

    const requestMembership = await prisma.clubMember.findFirst({
      where: {
        clubId: id,
        userId: targetUserId,
        isActive: false,
        invitedBy: null,
        withdrawalReason: PENDING_JOIN_REASON,
      },
    });

    if (!requestMembership) {
      return res.status(404).json({ success: false, message: 'Join request not found' });
    }

    const [club, manager] = await Promise.all([
      prisma.studyClub.findUnique({
        where: { id },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: currentUserId },
        select: { firstName: true, lastName: true, email: true },
      }),
    ]);

    await prisma.clubMember.delete({
      where: {
        id: requestMembership.id,
      },
    });

    await sendUserNotification({
      userId: targetUserId,
      actorId: currentUserId,
      title: 'Join request declined',
      body: `${getDisplayName(manager)} declined your request to join ${club?.name || 'this club'}.`,
      link: `/clubs/${id}`,
    });

    res.json({ success: true, message: 'Join request rejected successfully' });
  } catch (error: any) {
    console.error('Reject join request error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject join request', error: error.message });
  }
};

export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user!.userId;
    const { userId: targetUserId, email } = req.body || {};

    if (!targetUserId && !email) {
      return res.status(400).json({ success: false, message: 'Either userId or email is required' });
    }

    const [club, currentUserMembership] = await Promise.all([
      prisma.studyClub.findUnique({
        where: { id },
        select: { id: true, schoolId: true, name: true },
      }),
      prisma.clubMember.findFirst({
        where: {
          clubId: id,
          userId: currentUserId,
          isActive: true,
          role: { in: [...CLUB_MANAGER_ROLES] },
        },
      }),
    ]);

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    if (!currentUserMembership) {
      return res.status(403).json({ success: false, message: 'Only club managers can invite members' });
    }

    const targetUser = await prisma.user.findFirst({
      where: targetUserId
        ? { id: targetUserId }
        : { email: String(email || '').trim().toLowerCase() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        schoolId: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    if (targetUser.id === currentUserId) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself' });
    }

    if (club.schoolId && targetUser.schoolId && club.schoolId !== targetUser.schoolId) {
      return res.status(400).json({ success: false, message: 'Target user belongs to a different school' });
    }

    const existingMembership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: id,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership?.isActive) {
      return res.status(400).json({ success: false, message: 'User is already an active member' });
    }

    if (existingMembership && existingMembership.withdrawalReason === PENDING_INVITE_REASON) {
      return res.status(200).json({
        success: true,
        message: 'Invitation is already pending.',
        invite: existingMembership,
      });
    }

    const invite = existingMembership
      ? await prisma.clubMember.update({
          where: { id: existingMembership.id },
          data: {
            role: 'STUDENT',
            isActive: false,
            invitedBy: currentUserId,
            withdrawalReason: PENDING_INVITE_REASON,
            withdrawnAt: null,
          },
        })
      : await prisma.clubMember.create({
          data: {
            clubId: id,
            userId: targetUser.id,
            role: 'STUDENT',
            isActive: false,
            invitedBy: currentUserId,
            withdrawalReason: PENDING_INVITE_REASON,
          },
        });

    const inviter = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { firstName: true, lastName: true, email: true },
    });

    await sendUserNotification({
      userId: targetUser.id,
      actorId: currentUserId,
      title: 'New club invitation',
      body: `${getDisplayName(inviter)} invited you to join ${club.name}.`,
      link: '/clubs/invites',
    });

    res.json({
      success: true,
      message: `Invitation sent to ${targetUser.firstName} ${targetUser.lastName}`.trim(),
      invite,
      user: targetUser,
    });
  } catch (error: any) {
    console.error('Invite member error:', error);
    res.status(500).json({ success: false, message: 'Failed to invite member', error: error.message });
  }
};

export const getMyInvites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const invites = await prisma.clubMember.findMany({
      where: {
        userId,
        isActive: false,
        withdrawalReason: PENDING_INVITE_REASON,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            description: true,
            clubType: true,
            mode: true,
            coverImage: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    res.json({ success: true, invites });
  } catch (error: any) {
    console.error('Get my invites error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invites', error: error.message });
  }
};

export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const invite = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: id,
          userId,
        },
      },
    });

    if (!invite || invite.isActive || invite.withdrawalReason !== PENDING_INVITE_REASON) {
      return res.status(404).json({ success: false, message: 'Pending invitation not found' });
    }

    const club = await prisma.studyClub.findUnique({
      where: { id },
      select: { capacity: true, name: true },
    });

    const activeMemberCount = await prisma.clubMember.count({
      where: {
        clubId: id,
        isActive: true,
      },
    });

    if (club?.capacity && activeMemberCount >= club.capacity) {
      return res.status(400).json({ success: false, message: 'Club is at full capacity' });
    }

    await prisma.clubMember.update({
      where: { id: invite.id },
      data: {
        isActive: true,
        withdrawalReason: null,
        withdrawnAt: null,
        joinedAt: new Date(),
      },
    });

    if (invite.invitedBy && invite.invitedBy !== userId) {
      const accepter = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      });

      await sendUserNotification({
        userId: invite.invitedBy,
        actorId: userId,
        title: 'Club invitation accepted',
        body: `${getDisplayName(accepter)} accepted your invitation to ${club?.name || 'your club'}.`,
        link: `/clubs/${id}`,
      });
    }

    res.json({ success: true, message: 'Invitation accepted successfully' });
  } catch (error: any) {
    console.error('Accept invite error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept invite', error: error.message });
  }
};

export const declineInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const invite = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: id,
          userId,
        },
      },
    });

    if (!invite || invite.isActive || invite.withdrawalReason !== PENDING_INVITE_REASON) {
      return res.status(404).json({ success: false, message: 'Pending invitation not found' });
    }

    const [club, decliner] = await Promise.all([
      prisma.studyClub.findUnique({
        where: { id },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true },
      }),
    ]);

    await prisma.clubMember.delete({
      where: { id: invite.id },
    });

    if (invite.invitedBy && invite.invitedBy !== userId) {
      await sendUserNotification({
        userId: invite.invitedBy,
        actorId: userId,
        title: 'Club invitation declined',
        body: `${getDisplayName(decliner)} declined your invitation to ${club?.name || 'your club'}.`,
        link: `/clubs/${id}`,
      });
    }

    res.json({ success: true, message: 'Invitation declined successfully' });
  } catch (error: any) {
    console.error('Decline invite error:', error);
    res.status(500).json({ success: false, message: 'Failed to decline invite', error: error.message });
  }
};
