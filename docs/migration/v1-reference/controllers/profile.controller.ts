import { Request, Response } from "express";
import { prisma } from "../config/database";
import { storageService } from "../services/storage.service";

// Helper to calculate profile completeness
const calculateProfileCompleteness = (user: any): number => {
  let score = 0;
  const totalFields = 10;

  if (user.profilePictureUrl) score++;
  if (user.coverPhotoUrl) score++;
  if (user.bio && user.bio.length > 10) score++;
  if (user.headline) score++;
  if (user.interests && user.interests.length > 0) score++;
  if (user.skills && user.skills.length > 0) score++;
  if (user.email) score++;
  if (user.phone) score++;
  if (user.firstName && user.lastName) score++;
  if (user.socialLinks) score++;

  return Math.round((score / totalFields) * 100);
};

/**
 * Upload profile picture
 * POST /api/profile/picture
 */
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Get current user to delete old picture if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePictureKey: true },
    });

    // Delete old profile picture from R2 if exists
    if (currentUser?.profilePictureKey) {
      await storageService.deleteFile(currentUser.profilePictureKey);
    }

    // Upload new profile picture
    const result = await storageService.uploadProfilePicture(
      req.file.buffer,
      userId!,
      req.file.originalname,
      req.file.mimetype
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to upload profile picture",
      });
    }

    // Update user with new profile picture URL and key
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePictureUrl: result.url,
        profilePictureKey: result.key,
        profileUpdatedAt: new Date(),
      },
      select: {
        id: true,
        profilePictureUrl: true,
        profileCompleteness: true,
      },
    });

    // Recalculate profile completeness
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    const completeness = calculateProfileCompleteness(user);

    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleteness: completeness },
    });

    res.json({
      success: true,
      message: "Profile picture uploaded successfully",
      data: {
        profilePictureUrl: result.url,
        profileCompleteness: completeness,
      },
    });
  } catch (error: any) {
    console.error("Upload profile picture error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload profile picture",
    });
  }
};

/**
 * Delete profile picture
 * DELETE /api/profile/picture
 */
export const deleteProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePictureKey: true },
    });

    if (user?.profilePictureKey) {
      await storageService.deleteFile(user.profilePictureKey);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        profilePictureUrl: null,
        profilePictureKey: null,
        profileUpdatedAt: new Date(),
      },
    });

    // Recalculate profile completeness
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    const completeness = calculateProfileCompleteness(updatedUser);

    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleteness: completeness },
    });

    res.json({
      success: true,
      message: "Profile picture deleted successfully",
      data: { profileCompleteness: completeness },
    });
  } catch (error: any) {
    console.error("Delete profile picture error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete profile picture",
    });
  }
};

/**
 * Upload cover photo
 * POST /api/profile/cover
 */
export const uploadCoverPhoto = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Get current user to delete old cover if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverPhotoKey: true },
    });

    if (currentUser?.coverPhotoKey) {
      await storageService.deleteFile(currentUser.coverPhotoKey);
    }

    // Upload new cover photo
    const result = await storageService.uploadCoverPhoto(
      req.file.buffer,
      userId!,
      req.file.originalname,
      req.file.mimetype
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to upload cover photo",
      });
    }

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        coverPhotoUrl: result.url,
        coverPhotoKey: result.key,
        profileUpdatedAt: new Date(),
      },
    });

    // Recalculate completeness
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const completeness = calculateProfileCompleteness(user);
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleteness: completeness },
    });

    res.json({
      success: true,
      message: "Cover photo uploaded successfully",
      data: {
        coverPhotoUrl: result.url,
        profileCompleteness: completeness,
      },
    });
  } catch (error: any) {
    console.error("Upload cover photo error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload cover photo",
    });
  }
};

/**
 * Delete cover photo
 * DELETE /api/profile/cover
 */
export const deleteCoverPhoto = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverPhotoKey: true },
    });

    if (user?.coverPhotoKey) {
      await storageService.deleteFile(user.coverPhotoKey);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        coverPhotoUrl: null,
        coverPhotoKey: null,
        profileUpdatedAt: new Date(),
      },
    });

    // Recalculate completeness
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    const completeness = calculateProfileCompleteness(updatedUser);
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleteness: completeness },
    });

    res.json({
      success: true,
      message: "Cover photo deleted successfully",
      data: { profileCompleteness: completeness },
    });
  } catch (error: any) {
    console.error("Delete cover photo error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete cover photo",
    });
  }
};

/**
 * Update bio and profile details
 * PUT /api/profile/bio
 */
export const updateBio = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { bio, headline, interests, skills, socialLinks, profileVisibility } =
      req.body;

    // Validate bio length
    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Bio must be 500 characters or less",
      });
    }

    // Validate headline length
    if (headline && headline.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Headline must be 100 characters or less",
      });
    }

    // Validate interests and skills arrays
    if (interests && (!Array.isArray(interests) || interests.length > 10)) {
      return res.status(400).json({
        success: false,
        message: "Interests must be an array with maximum 10 items",
      });
    }

    if (skills && (!Array.isArray(skills) || skills.length > 10)) {
      return res.status(400).json({
        success: false,
        message: "Skills must be an array with maximum 10 items",
      });
    }

    const updateData: any = {
      profileUpdatedAt: new Date(),
    };

    if (bio !== undefined) updateData.bio = bio;
    if (headline !== undefined) updateData.headline = headline;
    if (interests !== undefined) updateData.interests = interests;
    if (skills !== undefined) updateData.skills = skills;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
    if (profileVisibility !== undefined)
      updateData.profileVisibility = profileVisibility;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Recalculate completeness
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const completeness = calculateProfileCompleteness(user);
    await prisma.user.update({
      where: { id: userId },
      data: { profileCompleteness: completeness },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        bio: user?.bio,
        headline: user?.headline,
        interests: user?.interests,
        skills: user?.skills,
        socialLinks: user?.socialLinks,
        profileVisibility: user?.profileVisibility,
        profileCompleteness: completeness,
      },
    });
  } catch (error: any) {
    console.error("Update bio error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

/**
 * Get user profile by ID (public view)
 * GET /api/profile/:userId
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        profilePictureUrl: true,
        coverPhotoUrl: true,
        bio: true,
        headline: true,
        interests: true,
        skills: true,
        socialLinks: true,
        profileVisibility: true,
        profileCompleteness: true,
        createdAt: true,
        // Career fields
        careerGoals: true,
        totalPoints: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        totalLearningHours: true,
        location: true,
        languages: true,
        professionalTitle: true,
        isVerified: true,
        isOpenToOpportunities: true,
        resumeUrl: true,
        student: {
          select: {
            khmerName: true,
            englishName: true,
            class: {
              select: {
                name: true,
                grade: true,
              },
            },
          },
        },
        teacher: {
          select: {
            khmerName: true,
            englishName: true,
            position: true,
          },
        },
        parent: {
          select: {
            khmerName: true,
            englishName: true,
          },
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
        // Combine follow check into main query
        followers: currentUserId && currentUserId !== targetUserId ? {
          where: {
            followerId: currentUserId,
          },
          select: {
            followerId: true,
          },
        } : false,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check visibility permissions
    const isOwnProfile = currentUserId === targetUserId;
    if (!isOwnProfile && user.profileVisibility === "PRIVATE") {
      return res.status(403).json({
        success: false,
        message: "This profile is private",
      });
    }

    // Check if current user is following (from included data)
    const isFollowing = user.followers && user.followers.length > 0;
    
    // Remove followers array from response (we only needed it for the check)
    const { followers, ...userData } = user;

    res.json({
      success: true,
      data: {
        ...userData,
        isOwnProfile,
        isFollowing: !!isFollowing,
        postsCount: user._count.posts,
        followersCount: user._count.followers,
        followingCount: user._count.following,
      },
    });
  } catch (error: any) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get user profile",
    });
  }
};

/**
 * Get my profile details (extended)
 * GET /api/profile/me
 */
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        profilePictureUrl: true,
        coverPhotoUrl: true,
        bio: true,
        headline: true,
        interests: true,
        skills: true,
        socialLinks: true,
        profileVisibility: true,
        profileCompleteness: true,
        profileUpdatedAt: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            studentId: true,
            khmerName: true,
            englishName: true,
            gender: true,
            dateOfBirth: true,
            class: {
              select: {
                id: true,
                name: true,
                grade: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            teacherId: true,
            khmerName: true,
            englishName: true,
            position: true,
            gender: true,
          },
        },
        parent: {
          select: {
            id: true,
            parentId: true,
            khmerName: true,
            englishName: true,
            relationship: true,
          },
        },
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...user,
        postsCount: user._count.posts,
        followersCount: user._count.followers,
        followingCount: user._count.following,
      },
    });
  } catch (error: any) {
    console.error("Get my profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get profile",
    });
  }
};

/**
 * Get profile completeness score
 * GET /api/profile/completeness
 */
export const getProfileCompleteness = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profilePictureUrl: true,
        coverPhotoUrl: true,
        bio: true,
        headline: true,
        interests: true,
        skills: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        socialLinks: true,
        profileCompleteness: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const completeness = calculateProfileCompleteness(user);

    // Build suggestions for incomplete fields
    const suggestions: string[] = [];
    if (!user.profilePictureUrl) suggestions.push("Add a profile picture");
    if (!user.coverPhotoUrl) suggestions.push("Add a cover photo");
    if (!user.bio || user.bio.length < 10) suggestions.push("Write a bio");
    if (!user.headline) suggestions.push("Add a headline");
    if (!user.interests || user.interests.length === 0)
      suggestions.push("Add your interests");
    if (!user.skills || user.skills.length === 0)
      suggestions.push("List your skills");
    if (!user.socialLinks) suggestions.push("Add social media links");

    res.json({
      success: true,
      data: {
        completeness,
        suggestions,
      },
    });
  } catch (error: any) {
    console.error("Get profile completeness error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get profile completeness",
    });
  }
};
