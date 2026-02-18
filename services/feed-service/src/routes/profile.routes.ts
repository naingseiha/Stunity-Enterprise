/**
 * Profile Routes
 * 
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from 'express';
import { prisma, prismaRead, feedRanker, upload } from '../context';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from '../utils/r2';
import { feedCache, EventPublisher } from '../redis';

const router = Router();

// ========================================
// PROFILE ENDPOINTS
// ========================================

// GET /users/search - Search users for DM
router.get('/users/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;
    const currentUserId = req.user?.id;

    if (!q || typeof q !== 'string') {
      return res.json({ success: true, users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        headline: true,
        professionalTitle: true,
      },
      take: Number(limit),
    });

    res.json({ success: true, users });
  } catch (error: any) {
    console.error('User search error:', error);
    res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

// GET /users/:id/profile - Get user profile
router.get('/users/:id/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    // Handle 'me' alias
    const userId = id === 'me' ? currentUserId : id;
    const isOwnProfile = userId === currentUserId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        profilePictureUrl: true,
        coverPhotoUrl: true,
        bio: true,
        headline: true,
        professionalTitle: true,
        location: true,
        languages: true,
        interests: true,
        skills: true,
        careerGoals: true,
        socialLinks: true,
        profileCompleteness: true,
        profileVisibility: true,
        isVerified: true,
        verifiedAt: true,
        totalLearningHours: true,
        currentStreak: true,
        longestStreak: true,
        totalPoints: true,
        level: true,
        isOpenToOpportunities: true,
        resumeUrl: true,
        createdAt: true,
        school: {
          select: { id: true, name: true, logo: true },
        },
        teacher: {
          select: {
            id: true,
            position: true,
            degree: true,
            hireDate: true,
            major1: true,
            major2: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { id: true, name: true, grade: true } },
          },
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            userSkills: true,
            experiences: true,
            certifications: true,
            projects: true,
            achievements: true,
            recommendations: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Check visibility
    if (!isOwnProfile && user.profileVisibility === 'PRIVATE') {
      return res.status(403).json({ success: false, error: 'This profile is private' });
    }

    // Get follower status
    let isFollowing = false;
    if (!isOwnProfile && currentUserId) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId!,
          },
        },
      });
      isFollowing = !!follow;
    }

    // Get recent activity stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [postsThisMonth, totalLikes, totalViews] = await Promise.all([
      prisma.post.count({
        where: { authorId: userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.like.count({
        where: { post: { authorId: userId } },
      }),
      prisma.postView.count({
        where: { post: { authorId: userId } },
      }),
    ]);

    res.json({
      success: true,
      profile: {
        ...user,
        isOwnProfile,
        isFollowing,
        stats: {
          posts: user._count.posts,
          followers: user._count.followers,
          following: user._count.following,
          skills: user._count.userSkills,
          experiences: user._count.experiences,
          certifications: user._count.certifications,
          projects: user._count.projects,
          achievements: user._count.achievements,
          recommendations: user._count.recommendations,
          postsThisMonth,
          totalLikes,
          totalViews,
        },
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// PUT /users/me/profile - Update own profile
router.put('/users/me/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      firstName,
      lastName,
      bio,
      headline,
      professionalTitle,
      location,
      languages,
      interests,
      careerGoals,
      socialLinks,
      profileVisibility,
      isOpenToOpportunities,
    } = req.body;

    // Build update data
    const updateData: any = { profileUpdatedAt: new Date() };
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (headline !== undefined) updateData.headline = headline;
    if (professionalTitle !== undefined) updateData.professionalTitle = professionalTitle;
    if (location !== undefined) updateData.location = location;
    if (languages !== undefined) updateData.languages = languages;
    if (interests !== undefined) updateData.interests = interests;
    if (careerGoals !== undefined) updateData.careerGoals = careerGoals;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
    if (profileVisibility !== undefined) updateData.profileVisibility = profileVisibility;
    if (isOpenToOpportunities !== undefined) updateData.isOpenToOpportunities = isOpenToOpportunities;

    // Calculate profile completeness
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const fields = [
      user?.firstName, user?.lastName, bio || user?.bio, headline || user?.headline,
      professionalTitle || user?.professionalTitle, location || user?.location,
      user?.profilePictureUrl, careerGoals || user?.careerGoals,
    ];
    const filledFields = fields.filter(f => f && String(f).trim().length > 0).length;
    updateData.profileCompleteness = Math.round((filledFields / fields.length) * 100);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bio: true,
        headline: true,
        professionalTitle: true,
        location: true,
        languages: true,
        interests: true,
        careerGoals: true,
        socialLinks: true,
        profileVisibility: true,
        profileCompleteness: true,
        isOpenToOpportunities: true,
      },
    });

    res.json({ success: true, profile: updatedUser });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// POST /users/me/profile-photo - Upload profile photo
router.post('/users/me/profile-photo', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });

    // Get old key to delete
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePictureKey: true },
    });

    let photoUrl = '';
    let photoKey = '';

    if (isR2Configured()) {
      const result = await uploadMultipleToR2([{
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      }], 'profiles');
      photoUrl = result[0].url;
      photoKey = result[0].key;

      // Delete old photo from R2
      if (oldUser?.profilePictureKey) {
        await deleteFromR2(oldUser.profilePictureKey).catch(() => { });
      }
    } else {
      photoUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      photoKey = file.originalname;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePictureUrl: photoUrl,
        profilePictureKey: photoKey,
        profileUpdatedAt: new Date(),
      },
      select: { id: true, profilePictureUrl: true },
    });

    res.json({ success: true, profilePictureUrl: updated.profilePictureUrl });
  } catch (error: any) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload photo' });
  }
});

// POST /users/me/cover-photo - Upload cover photo
router.post('/users/me/cover-photo', authenticateToken, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });

    // Get old key to delete
    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverPhotoKey: true },
    });

    let coverUrl = '';
    let coverKey = '';

    if (isR2Configured()) {
      const result = await uploadMultipleToR2([{
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      }], 'covers');
      coverUrl = result[0].url;
      coverKey = result[0].key;

      // Delete old cover from R2
      if (oldUser?.coverPhotoKey) {
        await deleteFromR2(oldUser.coverPhotoKey).catch(() => { });
      }
    } else {
      coverUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      coverKey = file.originalname;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        coverPhotoUrl: coverUrl,
        coverPhotoKey: coverKey,
        profileUpdatedAt: new Date(),
      },
      select: { id: true, coverPhotoUrl: true },
    });

    res.json({ success: true, coverPhotoUrl: updated.coverPhotoUrl });
  } catch (error: any) {
    console.error('Upload cover photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload cover' });
  }
});

// DELETE /users/me/cover-photo - Remove cover photo
router.delete('/users/me/cover-photo', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverPhotoKey: true },
    });

    if (user?.coverPhotoKey && isR2Configured()) {
      await deleteFromR2(user.coverPhotoKey).catch(() => { });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { coverPhotoUrl: null, coverPhotoKey: null },
    });

    res.json({ success: true, message: 'Cover photo removed' });
  } catch (error: any) {
    console.error('Delete cover photo error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cover' });
  }
});

export default router;
