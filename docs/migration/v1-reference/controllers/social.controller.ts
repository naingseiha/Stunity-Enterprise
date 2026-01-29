import { Request, Response } from "express";
import { prisma } from "../config/database";
import { socialNotificationService } from "../services/social-notification.service";

/**
 * Follow a user
 * POST /api/social/follow/:userId
 */
export const followUser = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId;
    const { userId: targetUserId } = req.params;

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId!,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        message: "You are already following this user",
      });
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId: currentUserId!,
        followingId: targetUserId,
      },
    });

    // Send real-time notification
    socialNotificationService.notifyFollow(targetUserId, currentUserId!).catch(console.error);

    // Get updated counts
    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    res.json({
      success: true,
      message: "Successfully followed user",
      data: {
        isFollowing: true,
        followersCount,
      },
    });
  } catch (error: any) {
    console.error("Follow user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to follow user",
    });
  }
};

/**
 * Unfollow a user
 * DELETE /api/social/follow/:userId
 */
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId;
    const { userId: targetUserId } = req.params;

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId!,
          followingId: targetUserId,
        },
      },
    });

    if (!existingFollow) {
      return res.status(400).json({
        success: false,
        message: "You are not following this user",
      });
    }

    await prisma.follow.delete({
      where: { id: existingFollow.id },
    });

    // Get updated counts
    const followersCount = await prisma.follow.count({
      where: { followingId: targetUserId },
    });

    res.json({
      success: true,
      message: "Successfully unfollowed user",
      data: {
        isFollowing: false,
        followersCount,
      },
    });
  } catch (error: any) {
    console.error("Unfollow user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to unfollow user",
    });
  }
};

/**
 * Get followers list
 * GET /api/social/followers
 */
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const targetUserId = (req.query.userId as string) || userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: targetUserId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          follower: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              headline: true,
              role: true,
              student: {
                select: {
                  khmerName: true,
                  class: { select: { name: true, grade: true } },
                },
              },
              teacher: {
                select: { khmerName: true, position: true },
              },
              parent: {
                select: { khmerName: true },
              },
            },
          },
        },
      }),
      prisma.follow.count({ where: { followingId: targetUserId } }),
    ]);

    // Check if current user follows each follower
    const followerIds = followers.map((f) => f.followerId);
    const currentUserFollowing = await prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: followerIds },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(currentUserFollowing.map((f) => f.followingId));

    const followersWithStatus = followers.map((f) => ({
      ...f.follower,
      followedAt: f.createdAt,
      isFollowedByMe: followingSet.has(f.followerId),
    }));

    res.json({
      success: true,
      data: followersWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get followers",
    });
  }
};

/**
 * Get following list
 * GET /api/social/following
 */
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const targetUserId = (req.query.userId as string) || userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: targetUserId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          following: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              headline: true,
              role: true,
              student: {
                select: {
                  khmerName: true,
                  class: { select: { name: true, grade: true } },
                },
              },
              teacher: {
                select: { khmerName: true, position: true },
              },
              parent: {
                select: { khmerName: true },
              },
            },
          },
        },
      }),
      prisma.follow.count({ where: { followerId: targetUserId } }),
    ]);

    const followingWithStatus = following.map((f) => ({
      ...f.following,
      followedAt: f.createdAt,
      isFollowedByMe: true, // By definition, these are all followed
    }));

    res.json({
      success: true,
      data: followingWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get following error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get following",
    });
  }
};

/**
 * Get follow suggestions (classmates, teachers)
 * GET /api/social/suggestions
 */
export const getFollowSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get current user's info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          select: { classId: true },
        },
        following: {
          select: { followingId: true },
        },
      },
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get IDs to exclude (self + already following)
    const excludeIds = [
      userId!,
      ...currentUser.following.map((f) => f.followingId),
    ];

    let suggestions: any[] = [];

    // If student, suggest classmates first
    if (currentUser.student?.classId) {
      const classmates = await prisma.user.findMany({
        where: {
          id: { notIn: excludeIds },
          isActive: true,
          student: {
            classId: currentUser.student.classId,
          },
        },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
          headline: true,
          role: true,
          student: {
            select: {
              khmerName: true,
              class: { select: { name: true, grade: true } },
            },
          },
        },
      });

      suggestions = classmates.map((u) => ({
        ...u,
        suggestionReason: "Classmate",
      }));
    }

    // Add teachers if not enough suggestions
    if (suggestions.length < limit) {
      const teachers = await prisma.user.findMany({
        where: {
          id: { notIn: [...excludeIds, ...suggestions.map((s) => s.id)] },
          isActive: true,
          role: "TEACHER",
        },
        take: limit - suggestions.length,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
          headline: true,
          role: true,
          teacher: {
            select: { khmerName: true, position: true },
          },
        },
      });

      suggestions = [
        ...suggestions,
        ...teachers.map((u) => ({
          ...u,
          suggestionReason: "Teacher",
        })),
      ];
    }

    // Add more users if still not enough
    if (suggestions.length < limit) {
      const otherUsers = await prisma.user.findMany({
        where: {
          id: { notIn: [...excludeIds, ...suggestions.map((s) => s.id)] },
          isActive: true,
          profilePictureUrl: { not: null }, // Prefer users with profile pictures
        },
        take: limit - suggestions.length,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
          headline: true,
          role: true,
          student: {
            select: {
              khmerName: true,
              class: { select: { name: true, grade: true } },
            },
          },
          teacher: {
            select: { khmerName: true, position: true },
          },
          parent: {
            select: { khmerName: true },
          },
        },
      });

      suggestions = [
        ...suggestions,
        ...otherUsers.map((u) => ({
          ...u,
          suggestionReason: "Suggested for you",
        })),
      ];
    }

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    console.error("Get follow suggestions error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get suggestions",
    });
  }
};

/**
 * Get notifications
 * GET /api/social/notifications
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === "true";
    const skip = (page - 1) * limit;

    const where: any = { recipientId: userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              student: { select: { khmerName: true } },
              teacher: { select: { khmerName: true } },
              parent: { select: { khmerName: true } },
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get notifications",
    });
  }
};

/**
 * Mark notification as read
 * PUT /api/social/notifications/:notificationId/read
 */
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { notificationId } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error: any) {
    console.error("Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark notification as read",
    });
  }
};

/**
 * Mark all notifications as read
 * PUT /api/social/notifications/read-all
 */
export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error: any) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark notifications as read",
    });
  }
};
