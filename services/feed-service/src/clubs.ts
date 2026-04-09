import express, { Request, Response } from 'express';
import { PrismaClient, StudyClubType, ClubMode, ClubMemberRole } from '@prisma/client';
import { EventPublisher } from './redis';

const router = express.Router();
let prisma: PrismaClient;

export function initClubsRoutes(prismaClient: PrismaClient) {
  prisma = prismaClient;
}

// Extended request with user
interface AuthRequest extends Request {
  user?: {
    id: string;
    schoolId?: string;
    role?: string;
  };
}

// Club type labels for feed posts
const CLUB_TYPE_LABELS: Record<string, string> = {
  CASUAL_STUDY_GROUP: 'Study Group',
  STRUCTURED_CLASS: 'Classroom Club',
  PROJECT_GROUP: 'Project Team',
  EXAM_PREP: 'Exam Preparation Group',
};

const LEGACY_CLUB_TYPE_MAP: Record<string, StudyClubType> = {
  SUBJECT: StudyClubType.CASUAL_STUDY_GROUP,
  SKILL: StudyClubType.STRUCTURED_CLASS,
  RESEARCH: StudyClubType.PROJECT_GROUP,
  PROJECT: StudyClubType.PROJECT_GROUP,
  EXAM_PREP: StudyClubType.EXAM_PREP,
  LANGUAGE: StudyClubType.CASUAL_STUDY_GROUP,
  COMPETITION: StudyClubType.EXAM_PREP,
  TUTORING: StudyClubType.STRUCTURED_CLASS,
};

const LEGACY_MODE_MAP: Record<string, ClubMode> = {
  PUBLIC: ClubMode.PUBLIC,
  SCHOOL: ClubMode.PUBLIC,
  PRIVATE: ClubMode.INVITE_ONLY,
  SECRET: ClubMode.APPROVAL_REQUIRED,
  INVITE_ONLY: ClubMode.INVITE_ONLY,
  APPROVAL_REQUIRED: ClubMode.APPROVAL_REQUIRED,
};

const normalizeEnumInput = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

const resolveClubType = (value: unknown): StudyClubType | null => {
  const normalized = normalizeEnumInput(value);
  if (!normalized) return null;

  if (Object.values(StudyClubType).includes(normalized as StudyClubType)) {
    return normalized as StudyClubType;
  }

  return LEGACY_CLUB_TYPE_MAP[normalized] || null;
};

const resolveClubMode = (value: unknown): ClubMode | null => {
  const normalized = normalizeEnumInput(value);
  if (!normalized) return null;

  if (Object.values(ClubMode).includes(normalized as ClubMode)) {
    return normalized as ClubMode;
  }

  return LEGACY_MODE_MAP[normalized] || null;
};

const withLegacyAliases = <T extends Record<string, any>>(club: T) => ({
  ...club,
  type: club.clubType ?? club.type,
  privacy: club.mode ?? club.privacy,
});

// ============================================
// Study Club CRUD
// ============================================

// Create a new study club
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      clubType,
      type,
      category,
      privacy,
      mode,
      coverImage,
      maxMembers,
    } = req.body;
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Club name must be at least 3 characters' });
    }

    const requestedClubType = type ?? clubType;
    const normalizedClubType = requestedClubType
      ? resolveClubType(requestedClubType)
      : StudyClubType.CASUAL_STUDY_GROUP;

    if (requestedClubType && !normalizedClubType) {
      return res.status(400).json({
        error: `Invalid club type. Allowed values: ${Object.values(StudyClubType).join(', ')}`,
      });
    }
    const requestedMode = mode ?? privacy;
    const normalizedMode = requestedMode ? resolveClubMode(requestedMode) : ClubMode.PUBLIC;

    if (!normalizedMode) {
      return res.status(400).json({
        error: `Invalid club mode. Allowed values: ${Object.values(ClubMode).join(', ')}`,
      });
    }

    const club = await prisma.studyClub.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        clubType: normalizedClubType!,
        category: category?.trim(),
        mode: normalizedMode,
        coverImage,
        maxMembers,
        creatorId: userId,
        schoolId,
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
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    // Create a feed post announcing the new club (only for PUBLIC clubs)
    if (normalizedMode !== ClubMode.INVITE_ONLY) {
      try {
        const clubTypeLabel = CLUB_TYPE_LABELS[normalizedClubType!] || 'Study Club';
        const feedPost = await prisma.post.create({
          data: {
            schoolId: req.user?.schoolId || null,
            content: `🎉 Just created a new ${clubTypeLabel}: **${name.trim()}**!\n\n${description?.trim() || 'Join us to learn and grow together!'}\n\n${category ? `📚 Category: ${category}` : ''}`,
            postType: 'CLUB_CREATED',
            visibility: normalizedMode === ClubMode.PUBLIC ? 'SCHOOL' : 'PUBLIC',
            authorId: userId,
            studyClubId: club.id,
            mediaUrls: coverImage ? [coverImage] : [],
          },
        });

        // Notify followers via SSE
        const followers = await prisma.follow.findMany({
          where: { followingId: userId },
          select: { followerId: true },
        });
        
        const followerIds = followers.map(f => f.followerId);
        if (followerIds.length > 0) {
          await EventPublisher.newPost(
            userId,
            followerIds,
            feedPost.id,
            `Created a new study club: ${name}`
          );
        }
      } catch (postError) {
        // Don't fail club creation if post creation fails
        console.error('Failed to create club announcement post:', postError);
      }
    }

    res.status(201).json(withLegacyAliases(club));
  } catch (error) {
    console.error('Error creating study club:', error);
    res.status(500).json({ error: 'Failed to create study club' });
  }
});

// Get user's study clubs
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = '1', limit = '20' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [clubs, total] = await Promise.all([
      prisma.studyClub.findMany({
        where: {
          members: {
            some: { userId },
          },
          isActive: true,
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
            where: { userId },
            select: { role: true, joinedAt: true },
          },
          _count: {
            select: { members: true, posts: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      prisma.studyClub.count({
        where: {
          members: { some: { userId } },
          isActive: true,
        },
      }),
    ]);

    // Transform to include user's role
    const clubsWithRole = clubs.map((club) => ({
      ...withLegacyAliases(club),
      myRole: club.members[0]?.role,
      myJoinedAt: club.members[0]?.joinedAt,
      memberCount: club._count.members,
      members: undefined, // Remove the raw members array
    }));

    res.json({
      clubs: clubsWithRole,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error fetching user clubs:', error);
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

// Discover public clubs
router.get('/discover', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    const { 
      page = '1', 
      limit = '20', 
      search, 
      clubType, 
      category 
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build where clause
    const where: any = {
      isActive: true,
      mode: ClubMode.PUBLIC,
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { description: { contains: search as string, mode: 'insensitive' } },
            { category: { contains: search as string, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (clubType) {
      const normalizedClubType = resolveClubType(clubType);
      if (!normalizedClubType) {
        return res.status(400).json({
          error: `Invalid club type. Allowed values: ${Object.values(StudyClubType).join(', ')}`,
        });
      }
      where.clubType = normalizedClubType;
    }

    if (category) {
      where.category = { contains: category as string, mode: 'insensitive' };
    }

    const [clubs, total] = await Promise.all([
      prisma.studyClub.findMany({
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
          members: userId ? {
            where: { userId },
            select: { role: true },
          } : false,
          _count: {
            select: { members: true, posts: true },
          },
        },
        orderBy: [
          { members: { _count: 'desc' } }, // Popular first
          { createdAt: 'desc' },
        ],
        skip,
        take,
      }),
      prisma.studyClub.count({ where }),
    ]);

    // Transform to include membership status
    const clubsWithStatus = clubs.map((club: any) => ({
      ...withLegacyAliases(club),
      isMember: club.members?.length > 0,
      myRole: club.members?.[0]?.role,
      memberCount: club._count?.members ?? 0,
      members: undefined,
    }));

    res.json({
      clubs: clubsWithStatus,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error discovering clubs:', error);
    res.status(500).json({ error: 'Failed to discover clubs' });
  }
});

// Get club types for filtering
router.get('/types', async (_req: Request, res: Response) => {
  const types = [
    { value: 'CASUAL_STUDY_GROUP', label: 'Study Group', description: 'Collaborative peer learning sessions' },
    { value: 'STRUCTURED_CLASS', label: 'Structured Class', description: 'Guided class with structured lessons' },
    { value: 'PROJECT_GROUP', label: 'Project Group', description: 'Hands-on team project collaboration' },
    { value: 'EXAM_PREP', label: 'Exam Preparation', description: 'Focused preparation for tests and exams' },
  ];
  res.json(types);
});

// Get club details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const club = await prisma.studyClub.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureUrl: true,
            headline: true,
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
                headline: true,
              },
            },
          },
          orderBy: [
            { role: 'asc' }, // OWNER first, then ADMIN, etc.
            { joinedAt: 'asc' },
          ],
          take: 10, // First 10 members
        },
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    // Check if user can view this club
    if (club.mode === 'INVITE_ONLY' || club.mode === 'APPROVAL_REQUIRED') {
      const isMember = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: id, userId: userId || '' } },
      });
      if (!isMember) {
        return res.status(403).json({ error: 'This club is private' });
      }
    }

    // Get user's membership status
    let myMembership: any = null;
    if (userId) {
      myMembership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: id, userId } },
      });
    }

    res.json(withLegacyAliases({
      ...club,
      isMember: !!myMembership,
      myRole: myMembership?.role,
      myJoinedAt: myMembership?.joinedAt,
      memberCount: club._count.members,
    }));
  } catch (error) {
    console.error('Error fetching club:', error);
    res.status(500).json({ error: 'Failed to fetch club' });
  }
});

// Update club (admin only)
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const {
      name,
      description,
      clubType,
      type,
      category,
      privacy,
      mode,
      coverImage,
      maxMembers,
      isActive,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!membership || !['OWNER', 'INSTRUCTOR'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins can update the club' });
    }

    const requestedClubType = type ?? clubType;
    const normalizedClubType = requestedClubType ? resolveClubType(requestedClubType) : null;
    if (requestedClubType && !normalizedClubType) {
      return res.status(400).json({
        error: `Invalid club type. Allowed values: ${Object.values(StudyClubType).join(', ')}`,
      });
    }

    const requestedMode = mode ?? privacy;
    const normalizedMode = requestedMode ? resolveClubMode(requestedMode) : null;
    if (requestedMode && !normalizedMode) {
      return res.status(400).json({
        error: `Invalid club mode. Allowed values: ${Object.values(ClubMode).join(', ')}`,
      });
    }

    const club = await prisma.studyClub.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(normalizedClubType && { clubType: normalizedClubType }),
        ...(category !== undefined && { category: category?.trim() }),
        ...(normalizedMode && { mode: normalizedMode }),
        ...(coverImage !== undefined && { coverImage }),
        ...(maxMembers !== undefined && { maxMembers }),
        ...(isActive !== undefined && { isActive }),
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
        _count: {
          select: { members: true, posts: true },
        },
      },
    });

    res.json(withLegacyAliases(club));
  } catch (error) {
    console.error('Error updating club:', error);
    res.status(500).json({ error: 'Failed to update club' });
  }
});

// Delete club (owner only)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is owner
    const club = await prisma.studyClub.findUnique({
      where: { id },
      select: { creatorId: true },
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the owner can delete the club' });
    }

    await prisma.studyClub.delete({ where: { id } });

    res.json({ message: 'Club deleted successfully' });
  } catch (error) {
    console.error('Error deleting club:', error);
    res.status(500).json({ error: 'Failed to delete club' });
  }
});

// ============================================
// Membership Management
// ============================================

// Join a club
router.post('/:id/join', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if club exists and is joinable
    const club = await prisma.studyClub.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!club || !club.isActive) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.mode === 'INVITE_ONLY' || club.mode === 'APPROVAL_REQUIRED') {
      return res.status(403).json({ error: 'This club requires an invitation' });
    }

    if (club.maxMembers && club._count.members >= club.maxMembers) {
      return res.status(400).json({ error: 'Club has reached maximum members' });
    }

    // Check if already a member
    const existing = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this club' });
    }

    const membership = await prisma.clubMember.create({
      data: {
        clubId: id,
        userId,
        role: 'STUDENT',
      },
      include: {
        club: {
          select: { name: true },
        },
      },
    });

    res.status(201).json({
      message: `Joined ${membership.club.name}`,
      membership,
    });
  } catch (error) {
    console.error('Error joining club:', error);
    res.status(500).json({ error: 'Failed to join club' });
  }
});

// Leave a club
router.post('/:id/leave', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this club' });
    }

    if (membership.role === 'OWNER') {
      // Count other owners/instructors
      const adminCount = await prisma.clubMember.count({
        where: { clubId: id, role: { in: ['OWNER', 'INSTRUCTOR'] }, userId: { not: userId } },
      });

      if (adminCount === 0) {
        return res.status(400).json({ 
          error: 'Owner cannot leave without transferring ownership or promoting an admin' 
        });
      }
    }

    await prisma.clubMember.delete({
      where: { clubId_userId: { clubId: id, userId } },
    });

    res.json({ message: 'Left the club successfully' });
  } catch (error) {
    console.error('Error leaving club:', error);
    res.status(500).json({ error: 'Failed to leave club' });
  }
});

// Get club members
router.get('/:id/members', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', role } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { clubId: id };
    if (role) {
      where.role = role;
    }

    const [members, total] = await Promise.all([
      prisma.clubMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              headline: true,
              role: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' },
          { joinedAt: 'asc' },
        ],
        skip,
        take,
      }),
      prisma.clubMember.count({ where }),
    ]);

    res.json({
      members,
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Update member role (admin only)
router.put('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const { role: newRole } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if requester is admin/owner
    const requesterMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!requesterMembership || !['OWNER', 'INSTRUCTOR'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Only admins can update member roles' });
    }

    // Cannot change owner role unless you're the owner
    const targetMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: targetUserId } },
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (targetMembership.role === 'OWNER' && requesterMembership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    // Only owner can promote to OWNER (transfer ownership)
    if (newRole === 'OWNER' && requesterMembership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only owner can transfer ownership' });
    }

    // Transfer ownership
    if (newRole === 'OWNER') {
      await prisma.$transaction([
        // Demote current owner to instructor
        prisma.clubMember.update({
          where: { clubId_userId: { clubId: id, userId } },
          data: { role: 'INSTRUCTOR' },
        }),
        // Promote target to owner
        prisma.clubMember.update({
          where: { clubId_userId: { clubId: id, userId: targetUserId } },
          data: { role: 'OWNER' },
        }),
        // Update club creator
        prisma.studyClub.update({
          where: { id },
          data: { creatorId: targetUserId },
        }),
      ]);
    } else {
      await prisma.clubMember.update({
        where: { clubId_userId: { clubId: id, userId: targetUserId } },
        data: { role: newRole },
      });
    }

    res.json({ message: 'Member role updated' });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// Remove member (admin only)
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if requester is admin/owner
    const requesterMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!requesterMembership || !['OWNER', 'INSTRUCTOR', 'TEACHING_ASSISTANT'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Only moderators and above can remove members' });
    }

    const targetMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: targetUserId } },
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Cannot remove owner
    if (targetMembership.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot remove the owner' });
    }

    // Instructors can only be removed by owner
    if (targetMembership.role === 'INSTRUCTOR' && requesterMembership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only owner can remove instructors' });
    }

    await prisma.clubMember.delete({
      where: { clubId_userId: { clubId: id, userId: targetUserId } },
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// ============================================
// Club Posts
// ============================================

// Get club posts
router.get('/:id/posts', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { page = '1', limit = '20', postType } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Check if user can view club posts
    const club = await prisma.studyClub.findUnique({ where: { id } });
    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    if (club.mode === 'INVITE_ONLY' || club.mode === 'APPROVAL_REQUIRED') {
      const isMember = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: id, userId: userId || '' } },
      });
      if (!isMember) {
        return res.status(403).json({ error: 'Only members can view club posts' });
      }
    }

    const where: any = { studyClubId: id };
    if (postType) {
      where.postType = postType;
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              role: true,
            },
          },
          _count: {
            select: { comments: true, likes: true },
          },
          likes: userId ? { where: { userId }, take: 1 } : false,
          bookmarks: userId ? { where: { userId }, take: 1 } : false,
          pollOptions: {
            include: {
              _count: { select: { votes: true } },
              votes: userId ? { where: { userId }, take: 1 } : false,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.post.count({ where }),
    ]);

    // Transform posts
    const transformedPosts = posts.map((post: any) => ({
      ...post,
      isLiked: post.likes?.length > 0,
      isBookmarked: post.bookmarks?.length > 0,
      likesCount: post._count?.likes || 0,
      commentsCount: post._count?.comments || 0,
      userVotedOptionId: post.pollOptions?.find((opt: any) => opt.votes?.length > 0)?.id,
      pollOptions: post.pollOptions?.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        votes: opt._count?.votes || 0,
      })),
      likes: undefined,
      bookmarks: undefined,
      _count: undefined,
    }));

    res.json({
      posts: transformedPosts,
      club: { id: club.id, name: club.name },
      pagination: {
        page: parseInt(page as string),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Error fetching club posts:', error);
    res.status(500).json({ error: 'Failed to fetch club posts' });
  }
});

// Invite member (admin only)
router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // Array of user IDs to invite
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if requester is admin/owner
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!membership || !['OWNER', 'INSTRUCTOR'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins can invite members' });
    }

    const club = await prisma.studyClub.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!club) {
      return res.status(404).json({ error: 'Club not found' });
    }

    // Check max members
    if (club.maxMembers && club._count.members + userIds.length > club.maxMembers) {
      return res.status(400).json({ error: 'Would exceed maximum members' });
    }

    // Filter out existing members
    const existingMembers = await prisma.clubMember.findMany({
      where: { clubId: id, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existingMembers.map((m) => m.userId));
    const newUserIds = userIds.filter((uid: string) => !existingIds.has(uid));

    if (newUserIds.length === 0) {
      return res.status(400).json({ error: 'All users are already members' });
    }

    // Create memberships
    await prisma.clubMember.createMany({
      data: newUserIds.map((uid: string) => ({
        clubId: id,
        userId: uid,
        role: 'STUDENT',
        invitedBy: userId,
      })),
    });

    res.json({
      message: `Invited ${newUserIds.length} member(s)`,
      invited: newUserIds.length,
      alreadyMembers: existingIds.size,
    });
  } catch (error) {
    console.error('Error inviting members:', error);
    res.status(500).json({ error: 'Failed to invite members' });
  }
});

export default router;
