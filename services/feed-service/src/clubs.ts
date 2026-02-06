import express, { Request, Response } from 'express';
import { PrismaClient, StudyClubType, ClubPrivacy, ClubMemberRole } from '@prisma/client';
import { publishEvent, createEvent } from './sse';

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
  SUBJECT: 'Subject Study Club',
  SKILL: 'Skill Development Club',
  RESEARCH: 'Research Group',
  PROJECT: 'Project Team',
  EXAM_PREP: 'Exam Preparation Group',
  LANGUAGE: 'Language Learning Club',
  COMPETITION: 'Competition Team',
  TUTORING: 'Tutoring & Mentoring Group',
};

// ============================================
// Study Club CRUD
// ============================================

// Create a new study club
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, clubType, category, privacy, coverImage, maxMembers } = req.body;
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Club name must be at least 3 characters' });
    }

    const club = await prisma.studyClub.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        clubType: clubType || 'SUBJECT',
        category: category?.trim(),
        privacy: privacy || 'PUBLIC',
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
    if (privacy !== 'SECRET') {
      try {
        const clubTypeLabel = CLUB_TYPE_LABELS[clubType] || 'Study Club';
        const feedPost = await prisma.post.create({
          data: {
            content: `🎉 Just created a new ${clubTypeLabel}: **${name.trim()}**!\n\n${description?.trim() || 'Join us to learn and grow together!'}\n\n${category ? `📚 Category: ${category}` : ''}`,
            postType: 'CLUB_CREATED',
            visibility: privacy === 'SCHOOL' ? 'SCHOOL' : 'PUBLIC',
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
        
        followers.forEach(f => {
          publishEvent(f.followerId, createEvent('NEW_POST', {
            postId: feedPost.id,
            authorId: userId,
            authorName: `${club.creator.firstName} ${club.creator.lastName}`,
            postPreview: `Created a new study club: ${name}`,
          }));
        });
      } catch (postError) {
        // Don't fail club creation if post creation fails
        console.error('Failed to create club announcement post:', postError);
      }
    }

    res.status(201).json(club);
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
      ...club,
      myRole: club.members[0]?.role,
      myJoinedAt: club.members[0]?.joinedAt,
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
      OR: [
        { privacy: 'PUBLIC' },
        { privacy: 'SCHOOL', schoolId },
      ],
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
      where.clubType = clubType;
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
      ...club,
      isMember: club.members?.length > 0,
      myRole: club.members?.[0]?.role,
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
    { value: 'SUBJECT', label: 'Subject Club', description: 'Math, Science, Literature, etc.' },
    { value: 'SKILL', label: 'Skill Development', description: 'Coding, Debate, Public Speaking' },
    { value: 'RESEARCH', label: 'Research Group', description: 'Research and exploration' },
    { value: 'PROJECT', label: 'Project Team', description: 'Collaborative projects' },
    { value: 'EXAM_PREP', label: 'Exam Preparation', description: 'Study groups for exams' },
    { value: 'LANGUAGE', label: 'Language Club', description: 'Language learning' },
    { value: 'COMPETITION', label: 'Competition Prep', description: 'Olympiads and competitions' },
    { value: 'TUTORING', label: 'Tutoring Circle', description: 'Peer tutoring and mentoring' },
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
    if (club.privacy === 'SECRET' || club.privacy === 'PRIVATE') {
      const isMember = await prisma.studyClubMember.findUnique({
        where: { clubId_userId: { clubId: id, userId: userId || '' } },
      });
      if (!isMember) {
        return res.status(403).json({ error: 'This club is private' });
      }
    }

    // Get user's membership status
    let myMembership: any = null;
    if (userId) {
      myMembership = await prisma.studyClubMember.findUnique({
        where: { clubId_userId: { clubId: id, userId } },
      });
    }

    res.json({
      ...club,
      isMember: !!myMembership,
      myRole: myMembership?.role,
      myJoinedAt: myMembership?.joinedAt,
    });
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
    const { name, description, clubType, category, privacy, coverImage, maxMembers, isActive } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const membership = await prisma.studyClubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return res.status(403).json({ error: 'Only admins can update the club' });
    }

    const club = await prisma.studyClub.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(clubType && { clubType }),
        ...(category !== undefined && { category: category?.trim() }),
        ...(privacy && { privacy }),
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

    res.json(club);
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

    if (club.privacy === 'SECRET' || club.privacy === 'PRIVATE') {
      return res.status(403).json({ error: 'This club requires an invitation' });
    }

    if (club.maxMembers && club._count.members >= club.maxMembers) {
      return res.status(400).json({ error: 'Club has reached maximum members' });
    }

    // Check if already a member
    const existing = await prisma.studyClubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already a member of this club' });
    }

    const membership = await prisma.studyClubMember.create({
      data: {
        clubId: id,
        userId,
        role: 'MEMBER',
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

    const membership = await prisma.studyClubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this club' });
    }

    if (membership.role === 'OWNER') {
      // Count other admins
      const adminCount = await prisma.studyClubMember.count({
        where: { clubId: id, role: { in: ['OWNER', 'ADMIN'] }, userId: { not: userId } },
      });

      if (adminCount === 0) {
        return res.status(400).json({ 
          error: 'Owner cannot leave without transferring ownership or promoting an admin' 
        });
      }
    }

    await prisma.studyClubMember.delete({
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
      prisma.studyClubMember.findMany({
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
      prisma.studyClubMember.count({ where }),
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
    const requesterMembership = await prisma.studyClubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Only admins can update member roles' });
    }

    // Cannot change owner role unless you're the owner
    const targetMembership = await prisma.studyClubMember.findUnique({
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
        // Demote current owner to admin
        prisma.studyClubMember.update({
          where: { clubId_userId: { clubId: id, userId } },
          data: { role: 'ADMIN' },
        }),
        // Promote target to owner
        prisma.studyClubMember.update({
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
      await prisma.studyClubMember.update({
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
    const requesterMembership = await prisma.studyClubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!requesterMembership || !['OWNER', 'ADMIN', 'MODERATOR'].includes(requesterMembership.role)) {
      return res.status(403).json({ error: 'Only moderators and above can remove members' });
    }

    const targetMembership = await prisma.studyClubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId: targetUserId } },
    });

    if (!targetMembership) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Cannot remove owner
    if (targetMembership.role === 'OWNER') {
      return res.status(403).json({ error: 'Cannot remove the owner' });
    }

    // Admins can only be removed by owner
    if (targetMembership.role === 'ADMIN' && requesterMembership.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only owner can remove admins' });
    }

    await prisma.studyClubMember.delete({
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

    if (club.privacy === 'SECRET' || club.privacy === 'PRIVATE') {
      const isMember = await prisma.studyClubMember.findUnique({
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
    const membership = await prisma.studyClubMember.findUnique({
      where: { clubId_userId: { clubId: id, userId } },
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
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
    const existingMembers = await prisma.studyClubMember.findMany({
      where: { clubId: id, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existingMembers.map((m) => m.userId));
    const newUserIds = userIds.filter((uid: string) => !existingIds.has(uid));

    if (newUserIds.length === 0) {
      return res.status(400).json({ error: 'All users are already members' });
    }

    // Create memberships
    await prisma.studyClubMember.createMany({
      data: newUserIds.map((uid: string) => ({
        clubId: id,
        userId: uid,
        role: 'MEMBER',
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
