/**
 * Profile Routes
 *
 * Extracted from index.ts monolith for maintainability.
 */

import { Router, Response } from "express";
import { prisma, prismaRead, feedRanker, upload } from "../context";
import { authenticateToken, AuthRequest } from "../middleware/auth";
import { uploadMultipleToR2, isR2Configured, deleteFromR2 } from "../utils/r2";
import { feedCache, EventPublisher } from "../redis";
import {
  profileUpdateSchema,
  getProfileValidationMessage,
} from "../validators/profile.validator";

const router = Router();

const PROFILE_VIEW_DEDUPE_MS = 60 * 60 * 1000;

function calculateProfilePerformanceScore(input: {
  profileViews30d: number;
  uniqueProfileViewers30d: number;
  followers: number;
  totalLikes: number;
  postsThisMonth: number;
  profileCompleteness?: number | null;
}) {
  const discoveryScore = Math.min(
    40,
    Math.log10(input.profileViews30d + 1) * 22,
  );
  const audienceScore = Math.min(25, input.uniqueProfileViewers30d * 2.5);
  const engagementScore = Math.min(
    20,
    input.followers * 0.35 + input.totalLikes * 0.03,
  );
  const learningContentScore = Math.min(
    15,
    input.postsThisMonth * 3 + (input.profileCompleteness ?? 0) * 0.05,
  );

  return Math.round(
    discoveryScore + audienceScore + engagementScore + learningContentScore,
  );
}

function calculateTrendingProfileScore(input: {
  profileViews7d: number;
  uniqueProfileViewers7d: number;
  postsThisMonth: number;
  totalViews: number;
}) {
  return Math.round(
    input.profileViews7d * 2.2 +
      input.uniqueProfileViewers7d * 4 +
      input.postsThisMonth * 2 +
      Math.log10(input.totalViews + 1) * 8,
  );
}

async function getRecentProfileVisitors(
  profileUserId: string,
  options: {
    limit?: number;
    cursor?: Date | null;
    excludeIds?: string[];
    windowDays?: number;
  } = {},
) {
  const limit = Math.min(Math.max(options.limit || 3, 1), 50);
  const scanLimit = Math.min(Math.max(limit * 8, limit), 200);
  const since = new Date(
    Date.now() - (options.windowDays || 90) * 24 * 60 * 60 * 1000,
  );
  const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const excludeIds = options.excludeIds || [];

  const viewerFilter: any = { not: null };
  if (excludeIds.length > 0) {
    viewerFilter.notIn = excludeIds;
  }

  const recentViews = await prismaRead.profileView.findMany({
    where: {
      profileUserId,
      viewerId: viewerFilter,
      viewedAt: {
        gte: since,
        ...(options.cursor ? { lt: options.cursor } : {}),
      },
    },
    orderBy: { viewedAt: "desc" },
    take: scanLimit,
    select: {
      viewerId: true,
      viewedAt: true,
      source: true,
      dwellMs: true,
    },
  });

  const seenViewerIds = new Set<string>();
  const latestViews: NonNullable<(typeof recentViews)[number]>[] = [];
  for (const view of recentViews) {
    if (!view.viewerId || seenViewerIds.has(view.viewerId)) continue;
    seenViewerIds.add(view.viewerId);
    latestViews.push(view);
    if (latestViews.length >= limit) break;
  }

  const viewerIds = latestViews
    .map((view) => view.viewerId)
    .filter(Boolean) as string[];

  if (viewerIds.length === 0) {
    return { visitors: [], nextCursor: null as string | null };
  }

  const [users, viewCounts] = await Promise.all([
    prismaRead.user.findMany({
      where: { id: { in: viewerIds }, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        role: true,
        headline: true,
        professionalTitle: true,
      },
    }),
    prismaRead.profileView.groupBy({
      by: ["viewerId"],
      where: {
        profileUserId,
        viewerId: { in: viewerIds },
        viewedAt: { gte: last30d },
      },
      _count: { _all: true },
    }),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const countsByViewerId = new Map(
    viewCounts.map((count) => [count.viewerId, count._count._all]),
  );

  const visitors = latestViews
    .map((view) => {
      if (!view.viewerId) return null;
      const user = usersById.get(view.viewerId);
      if (!user) return null;

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
        role: user.role,
        headline: user.headline,
        professionalTitle: user.professionalTitle,
        viewedAt: view.viewedAt,
        source: view.source || "profile",
        dwellMs: view.dwellMs || 0,
        views30d: countsByViewerId.get(user.id) || 0,
      };
    })
    .filter(Boolean);

  return {
    visitors,
    nextCursor:
      recentViews.length >= scanLimit && latestViews.length > 0
        ? latestViews[latestViews.length - 1].viewedAt.toISOString()
        : null,
  };
}

// ========================================
// PROFILE ENDPOINTS
// ========================================

// GET /users/suggested - Suggested users for feed carousel (no query required)
router.get(
  "/users/suggested",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const { limit = 10 } = req.query;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get IDs the user is already following or has blocked/been blocked by.
      const [following, blockedRelationships] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        }),
        prisma.userBlock.findMany({
          where: {
            OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
          },
          select: { blockerId: true, blockedId: true },
        }),
      ]);
      const followingIds = following.map((f) => f.followingId);
      const blockedIds = blockedRelationships.map((block) =>
        block.blockerId === currentUserId ? block.blockedId : block.blockerId,
      );
      const excludeIds = [currentUserId!, ...followingIds, ...blockedIds];

      const selectFields = {
        id: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        role: true,
        headline: true,
        isEmailVerified: true,
      };

      // Primary: educators/staff with recent profile interest and content performance.
      let users: any[] = await prisma.user.findMany({
        where: {
          id: { notIn: excludeIds },
          ...(req.user?.schoolId ? { schoolId: req.user.schoolId } : {}),
          role: { in: ["TEACHER", "ADMIN", "SUPER_ADMIN", "STAFF"] as any[] },
        },
        select: {
          ...selectFields,
          _count: {
            select: {
              profileViewsReceived: {
                where: { viewedAt: { gte: sevenDaysAgo } },
              },
              followers: true,
              posts: true,
            },
          },
        },
        orderBy: [
          { profileViewsReceived: { _count: "desc" } },
          { followers: { _count: "desc" } },
          { posts: { _count: "desc" } },
          { createdAt: "desc" },
        ],
        take: Number(limit),
      });

      users = users.map(({ _count, ...user }) => ({
        ...user,
        profileViews7d: _count?.profileViewsReceived ?? 0,
        followersCount: _count?.followers ?? 0,
        postsCount: _count?.posts ?? 0,
      }));

      // Fallback: any other users if not enough teachers/admins
      if (users.length < 3) {
        users = await prisma.user.findMany({
          where: {
            id: { notIn: excludeIds },
            ...(req.user?.schoolId ? { schoolId: req.user.schoolId } : {}),
          },
          select: selectFields,
          orderBy: { createdAt: "desc" },
          take: Number(limit),
        });
      }

      if (users.length < 3) {
        users = await prisma.user.findMany({
          where: { id: { notIn: excludeIds } },
          select: selectFields,
          orderBy: { createdAt: "desc" },
          take: Number(limit),
        });
      }

      res.json({ success: true, users });
    } catch (error: any) {
      console.error("Suggested users error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get suggested users" });
    }
  },
);

// GET /users/search - Search users for DM
router.get(
  "/users/search",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { q, limit = 20 } = req.query;
      const currentUserId = req.user?.id;

      if (!q || typeof q !== "string") {
        return res.json({ success: true, users: [] });
      }

      const users = await prisma.user.findMany({
        where: {
          id: { not: currentUserId },
          isActive: true,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
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
      console.error("User search error:", error);
      res.status(500).json({ success: false, error: "Failed to search users" });
    }
  },
);

// GET /users/leaderboard - Get top 50 users by totalPoints (Reputation Leaderboard)
router.get(
  "/users/leaderboard",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 50;

      // In a real app we might cache this in Redis, but we'll query DB for now
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ["STUDENT", "TEACHER"] as any[] }, // Exclude admins if appropriate, or keep them
        },
        orderBy: { totalPoints: "desc" },
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePictureUrl: true,
          totalPoints: true,
          level: true,
          isVerified: true,
        },
      });

      res.json({ success: true, leaderboard: users });
    } catch (error: any) {
      console.error("Leaderboard fetch error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch leaderboard" });
    }
  },
);

// POST /users/:id/profile/view - Track profile visit with hourly de-dupe.
router.post(
  "/users/:id/profile/view",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const targetUserId =
        req.params.id === "me" ? currentUserId : req.params.id;
      const { source = "profile", dwellMs } = req.body || {};

      if (!targetUserId) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid profile user" });
      }

      if (targetUserId === currentUserId) {
        return res.json({
          success: true,
          tracked: false,
          reason: "own_profile",
        });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, profileVisibility: true },
      });

      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      if (targetUser.profileVisibility === "PRIVATE") {
        return res
          .status(403)
          .json({ success: false, error: "This profile is private" });
      }

      const recentView = await prisma.profileView.findFirst({
        where: {
          profileUserId: targetUserId,
          viewerId: currentUserId,
          viewedAt: { gte: new Date(Date.now() - PROFILE_VIEW_DEDUPE_MS) },
        },
        orderBy: { viewedAt: "desc" },
      });

      if (!recentView) {
        await prisma.profileView.create({
          data: {
            profileUserId: targetUserId,
            viewerId: currentUserId,
            source: String(source).slice(0, 40),
            dwellMs:
              typeof dwellMs === "number"
                ? Math.max(0, Math.round(dwellMs))
                : null,
          },
        });

        return res.json({ success: true, tracked: true });
      }

      if (typeof dwellMs === "number" && dwellMs > 0) {
        await prisma.profileView.update({
          where: { id: recentView.id },
          data: { dwellMs: (recentView.dwellMs || 0) + Math.round(dwellMs) },
        });
      }

      res.json({ success: true, tracked: false, reason: "recent_view" });
    } catch (error: any) {
      console.error("Profile view tracking error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to track profile view" });
    }
  },
);

// GET /users/:id/profile - Get user profile
router.get(
  "/users/:id/profile",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      // Handle 'me' alias
      const userId = id === "me" ? currentUserId : id;
      const isOwnProfile = userId === currentUserId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          englishFirstName: true,
          englishLastName: true,
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
              firstName: true,
              lastName: true,
              englishFirstName: true,
              englishLastName: true,
              gender: true,
              dateOfBirth: true,
              email: true,
              phone: true,
              address: true,
              isProfileLocked: true,
              customFields: true,
              hireDate: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              englishFirstName: true,
              englishLastName: true,
              gender: true,
              dateOfBirth: true,
              email: true,
              phoneNumber: true,
              isProfileLocked: true,
              customFields: true,
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
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Check visibility
      if (!isOwnProfile && user.profileVisibility === "PRIVATE") {
        return res
          .status(403)
          .json({ success: false, error: "This profile is private" });
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

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [
        postsThisMonth,
        postCounterTotals,
        profileViews7d,
        profileViews30d,
        uniqueProfileViewers7d,
        uniqueProfileViewers30d,
      ] = await Promise.all([
        prisma.post.count({
          where: { authorId: userId, createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.post.aggregate({
          where: { authorId: userId },
          _sum: { likesCount: true, viewsCount: true },
        }),
        prisma.profileView.count({
          where: { profileUserId: userId!, viewedAt: { gte: sevenDaysAgo } },
        }),
        prisma.profileView.count({
          where: { profileUserId: userId!, viewedAt: { gte: thirtyDaysAgo } },
        }),
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT "viewerId")::int as count
          FROM profile_views
          WHERE "profileUserId" = ${userId!}
            AND "viewerId" IS NOT NULL
            AND "viewedAt" >= ${sevenDaysAgo}
        `.then((rows) => Number(rows[0]?.count || 0)),
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT "viewerId")::int as count
          FROM profile_views
          WHERE "profileUserId" = ${userId!}
            AND "viewerId" IS NOT NULL
            AND "viewedAt" >= ${thirtyDaysAgo}
        `.then((rows) => Number(rows[0]?.count || 0)),
      ]);

      const totalLikes = postCounterTotals._sum.likesCount || 0;
      const totalViews = postCounterTotals._sum.viewsCount || 0;
      const followers = (user as any)._count?.followers || 0;
      const profilePerformanceScore = calculateProfilePerformanceScore({
        profileViews30d,
        uniqueProfileViewers30d,
        followers,
        totalLikes,
        postsThisMonth,
        profileCompleteness: user.profileCompleteness,
      });
      const trendingProfileScore = calculateTrendingProfileScore({
        profileViews7d,
        uniqueProfileViewers7d,
        postsThisMonth,
        totalViews,
      });

      res.json({
        success: true,
        profile: {
          ...user,
          isOwnProfile,
          isFollowing,
          stats: {
            posts: (user as any)._count?.posts || 0,
            followers: (user as any)._count?.followers || 0,
            following: (user as any)._count?.following || 0,
            skills: (user as any)._count?.userSkills || 0,
            experiences: (user as any)._count?.experiences || 0,
            certifications: (user as any)._count?.certifications || 0,
            projects: (user as any)._count?.projects || 0,
            achievements: (user as any)._count?.achievements || 0,
            recommendations: (user as any)._count?.recommendations || 0,
            postsThisMonth,
            totalLikes,
            totalViews,
            profileViews: profileViews30d,
            profileViews7d,
            profileViews30d,
            uniqueProfileViewers7d,
            uniqueProfileViewers30d,
            profilePerformanceScore,
            trendingProfileScore,
          },
        },
      });
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json({ success: false, error: "Failed to get profile" });
    }
  },
);

// GET /users/:id/profile/insights - Profile discovery and career/learning performance.
router.get(
  "/users/:id/profile/insights",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const targetUserId =
        req.params.id === "me" ? currentUserId : req.params.id;
      const isOwnProfile = targetUserId === currentUserId;
      const isAdmin =
        req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN";

      if (!targetUserId) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid profile user" });
      }

      if (!isOwnProfile && !isAdmin) {
        return res
          .status(403)
          .json({ success: false, error: "Not authorized" });
      }

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          profileCompleteness: true,
          _count: { select: { followers: true } },
        },
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const [
        totalProfileViews,
        profileViews24h,
        profileViews7d,
        profileViews30d,
        uniqueProfileViewers30d,
        uniqueProfileViewers7d,
        postsThisMonth,
        totalLikes,
        totalPostViews,
        sourceRows,
        dailyRows,
        roleRows,
        recentVisitorRows,
      ] = await Promise.all([
        prisma.profileView.count({ where: { profileUserId: targetUserId } }),
        prisma.profileView.count({
          where: { profileUserId: targetUserId, viewedAt: { gte: last24h } },
        }),
        prisma.profileView.count({
          where: { profileUserId: targetUserId, viewedAt: { gte: last7d } },
        }),
        prisma.profileView.count({
          where: { profileUserId: targetUserId, viewedAt: { gte: last30d } },
        }),
        prisma.profileView
          .findMany({
            where: {
              profileUserId: targetUserId,
              viewerId: { not: null },
              viewedAt: { gte: last30d },
            },
            select: { viewerId: true },
            distinct: ["viewerId"],
          })
          .then((rows) => rows.length),
        prisma.profileView
          .findMany({
            where: {
              profileUserId: targetUserId,
              viewerId: { not: null },
              viewedAt: { gte: last7d },
            },
            select: { viewerId: true },
            distinct: ["viewerId"],
          })
          .then((rows) => rows.length),
        prisma.post.count({
          where: { authorId: targetUserId, createdAt: { gte: last30d } },
        }),
        prisma.like.count({ where: { post: { authorId: targetUserId } } }),
        prisma.postView.count({ where: { post: { authorId: targetUserId } } }),
        prisma.$queryRaw<{ source: string; count: bigint }[]>`
        SELECT COALESCE(source, 'profile') as source, COUNT(*)::int as count
        FROM profile_views
        WHERE "profileUserId" = ${targetUserId} AND "viewedAt" >= ${last30d}
        GROUP BY COALESCE(source, 'profile')
      `,
        prisma.$queryRaw<{ date: string; views: bigint }[]>`
        SELECT TO_CHAR("viewedAt"::date, 'YYYY-MM-DD') as date, COUNT(*)::int as views
        FROM profile_views
        WHERE "profileUserId" = ${targetUserId} AND "viewedAt" >= ${last7d}
        GROUP BY "viewedAt"::date
        ORDER BY "viewedAt"::date ASC
      `,
        prisma.$queryRaw<{ role: string; count: bigint }[]>`
        SELECT COALESCE(u.role::text, 'UNKNOWN') as role, COUNT(DISTINCT pv."viewerId")::int as count
        FROM profile_views pv
        LEFT JOIN users u ON u.id = pv."viewerId"
        WHERE pv."profileUserId" = ${targetUserId}
          AND pv."viewedAt" >= ${last30d}
          AND pv."viewerId" IS NOT NULL
        GROUP BY COALESCE(u.role::text, 'UNKNOWN')
        ORDER BY count DESC
      `,
        prisma.$queryRaw<
          {
            viewerId: string;
            firstName: string;
            lastName: string;
            profilePictureUrl: string | null;
            role: string;
            headline: string | null;
            professionalTitle: string | null;
            viewedAt: Date;
            source: string | null;
            dwellMs: number | null;
            views30d: bigint;
          }[]
        >`
        WITH latest AS (
          SELECT DISTINCT ON (pv."viewerId")
            pv."viewerId",
            pv."viewedAt",
            pv.source,
            pv."dwellMs"
          FROM profile_views pv
          WHERE pv."profileUserId" = ${targetUserId}
            AND pv."viewerId" IS NOT NULL
            AND pv."viewedAt" >= ${last30d}
          ORDER BY pv."viewerId", pv."viewedAt" DESC
        ),
        counts AS (
          SELECT pv."viewerId", COUNT(*)::int as "views30d"
          FROM profile_views pv
          WHERE pv."profileUserId" = ${targetUserId}
            AND pv."viewerId" IS NOT NULL
            AND pv."viewedAt" >= ${last30d}
          GROUP BY pv."viewerId"
        )
        SELECT
          latest."viewerId",
          u."firstName",
          u."lastName",
          u."profilePictureUrl",
          u.role::text as role,
          u.headline,
          u."professionalTitle",
          latest."viewedAt",
          latest.source,
          latest."dwellMs",
          counts."views30d"
        FROM latest
        JOIN users u ON u.id = latest."viewerId"
        JOIN counts ON counts."viewerId" = latest."viewerId"
        WHERE u."isActive" = true
        ORDER BY latest."viewedAt" DESC
        LIMIT 3
      `,
      ]);

      const profilePerformanceScore = calculateProfilePerformanceScore({
        profileViews30d,
        uniqueProfileViewers30d,
        followers: user._count.followers,
        totalLikes,
        postsThisMonth,
        profileCompleteness: user.profileCompleteness,
      });

      const trendingProfileScore = calculateTrendingProfileScore({
        profileViews7d,
        uniqueProfileViewers7d,
        postsThisMonth,
        totalViews: totalPostViews,
      });

      const dailyMap = new Map(
        dailyRows.map((row) => [row.date, Number(row.views)]),
      );
      const dailyProfileViews = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const date = day.toISOString().split("T")[0];
        return { date, views: dailyMap.get(date) || 0 };
      });

      const viewsBySource = sourceRows.reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.source] = Number(row.count);
          return acc;
        },
        {},
      );

      const viewerRoles = roleRows.map((row) => ({
        role: row.role,
        viewers: Number(row.count),
      }));

      const recentVisitors = recentVisitorRows.map((row) => ({
        id: row.viewerId,
        firstName: row.firstName,
        lastName: row.lastName,
        profilePictureUrl: row.profilePictureUrl,
        role: row.role,
        headline: row.headline,
        professionalTitle: row.professionalTitle,
        viewedAt: row.viewedAt,
        source: row.source || "profile",
        dwellMs: row.dwellMs || 0,
        views30d: Number(row.views30d),
      }));

      res.json({
        success: true,
        insights: {
          totalProfileViews,
          profileViews24h,
          profileViews7d,
          profileViews30d,
          uniqueProfileViewers7d,
          uniqueProfileViewers30d,
          profilePerformanceScore,
          trendingProfileScore,
          totalPostViews,
          totalLikes,
          followers: user._count.followers,
          postsThisMonth,
          dailyProfileViews,
          viewsBySource,
          viewerRoles,
          recentVisitors,
        },
      });
    } catch (error: any) {
      console.error("Get profile insights error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get profile insights" });
    }
  },
);

// GET /users/:id/profile/visitors/preview - Fast 3-person visitor preview.
router.get(
  "/users/:id/profile/visitors/preview",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const targetUserId =
        req.params.id === "me" ? currentUserId : req.params.id;
      const isOwnProfile = targetUserId === currentUserId;
      const isAdmin =
        req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN";

      if (!targetUserId) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid profile user" });
      }

      if (!isOwnProfile && !isAdmin) {
        return res
          .status(403)
          .json({ success: false, error: "Not authorized" });
      }

      const { visitors } = await getRecentProfileVisitors(targetUserId, {
        limit: 3,
        windowDays: 30,
      });

      res.json({ success: true, visitors });
    } catch (error: any) {
      console.error("Get profile visitors preview error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get profile visitors preview",
      });
    }
  },
);

// GET /users/:id/profile/visitors - Paginated profile visitor list for owner/admin.
router.get(
  "/users/:id/profile/visitors",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const currentUserId = req.user?.id;
      const targetUserId =
        req.params.id === "me" ? currentUserId : req.params.id;
      const isOwnProfile = targetUserId === currentUserId;
      const isAdmin =
        req.user?.role === "ADMIN" || req.user?.role === "SUPER_ADMIN";

      if (!targetUserId) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid profile user" });
      }

      if (!isOwnProfile && !isAdmin) {
        return res
          .status(403)
          .json({ success: false, error: "Not authorized" });
      }

      const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 50);
      const cursor =
        typeof req.query.cursor === "string" && req.query.cursor
          ? new Date(req.query.cursor)
          : null;
      const excludeIds =
        typeof req.query.excludeIds === "string" && req.query.excludeIds
          ? req.query.excludeIds.split(",").filter(Boolean).slice(0, 200)
          : [];

      const { visitors, nextCursor } = await getRecentProfileVisitors(
        targetUserId,
        {
          limit,
          cursor: cursor && !Number.isNaN(cursor.getTime()) ? cursor : null,
          excludeIds,
          windowDays: 90,
        },
      );

      res.json({
        success: true,
        visitors,
        nextCursor,
      });
    } catch (error: any) {
      console.error("Get profile visitors error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get profile visitors" });
    }
  },
);

// GET /users/me/blocks - List users blocked by the current user
router.get(
  "/users/me/blocks",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const blocks = await prisma.userBlock.findMany({
        where: { blockerId: userId },
        orderBy: { createdAt: "desc" },
      });
      const blockedUsers = await prisma.user.findMany({
        where: { id: { in: blocks.map((block) => block.blockedId) } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          profilePictureUrl: true,
          headline: true,
        },
      });
      const usersById = new Map(blockedUsers.map((user) => [user.id, user]));

      res.json({
        success: true,
        blockedUsers: blocks
          .map((block) => {
            const blocked = usersById.get(block.blockedId);
            if (!blocked) return null;
            return {
              id: block.id,
              blockedUserId: block.blockedId,
              createdAt: block.createdAt,
              user: blocked,
            };
          })
          .filter(Boolean),
      });
    } catch (error: any) {
      console.error("List blocked users error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to load blocked users" });
    }
  },
);

// POST /users/:id/block - Block a user
router.post(
  "/users/:id/block",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const blockerId = req.user?.id;
      const blockedId = req.params.id;

      if (!blockerId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      if (!blockedId || blockedId === blockerId) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid blocked user" });
      }

      const blockedUser = await prisma.user.findUnique({
        where: { id: blockedId },
        select: { id: true },
      });

      if (!blockedUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const block = await prisma.userBlock.upsert({
        where: {
          blockerId_blockedId: {
            blockerId,
            blockedId,
          },
        },
        update: {},
        create: {
          blockerId,
          blockedId,
        },
      });

      Promise.all([
        feedCache.invalidateUser(blockerId),
        feedCache.invalidateUser(blockedId),
        feedCache.invalidateVisibilityScope(blockerId),
        feedCache.invalidateVisibilityScope(blockedId),
      ]).catch(() => {});

      res.json({ success: true, block });
    } catch (error: any) {
      console.error("Block user error:", error);
      res.status(500).json({ success: false, error: "Failed to block user" });
    }
  },
);

// DELETE /users/:id/block - Unblock a user
router.delete(
  "/users/:id/block",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const blockerId = req.user?.id;
      const blockedId = req.params.id;

      if (!blockerId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      await prisma.userBlock.deleteMany({
        where: {
          blockerId,
          blockedId,
        },
      });

      Promise.all([
        feedCache.invalidateUser(blockerId),
        feedCache.invalidateUser(blockedId),
        feedCache.invalidateVisibilityScope(blockerId),
        feedCache.invalidateVisibilityScope(blockedId),
      ]).catch(() => {});

      res.json({ success: true });
    } catch (error: any) {
      console.error("Unblock user error:", error);
      res.status(500).json({ success: false, error: "Failed to unblock user" });
    }
  },
);

// GET /users/:id/academic-profile - Get user's academic profile (Gamification Phase 4 API)
router.get(
  "/users/:id/academic-profile",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;
      const userId = id === "me" ? currentUserId : id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const profile = await prisma.userAcademicProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        // Return a default profile if not yet scored
        return res.json({
          success: true,
          academicProfile: {
            userId,
            currentLevel: 2.5,
            weakTopics: [],
            strongTopics: [],
            lastUpdated: new Date(),
          },
        });
      }

      res.json({ success: true, academicProfile: profile });
    } catch (error: any) {
      console.error("Get academic profile error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get academic profile" });
    }
  },
);

// PUT /users/:id/academic-profile - Admin/System endpoint to manually override
router.put(
  "/users/:id/academic-profile",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;
      const userId = id === "me" ? currentUserId : id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      // Usually restricted to admin or internal system overrides
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
      });
      if (
        !currentUser ||
        (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN")
      ) {
        return res
          .status(403)
          .json({ success: false, error: "Forbidden: Admins only" });
      }

      const { currentLevel, weakTopics, strongTopics } = req.body;

      const data: any = { lastUpdated: new Date() };
      if (currentLevel !== undefined) data.currentLevel = currentLevel;
      if (weakTopics !== undefined) data.weakTopics = weakTopics;
      if (strongTopics !== undefined) data.strongTopics = strongTopics;

      const updated = await prisma.userAcademicProfile.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          currentLevel: currentLevel ?? 2.5,
          weakTopics: weakTopics ?? [],
          strongTopics: strongTopics ?? [],
          lastUpdated: new Date(),
        },
      });

      res.json({ success: true, academicProfile: updated });
    } catch (error: any) {
      console.error("Update academic profile error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update academic profile" });
    }
  },
);

// GET /users/:id/deadlines - Get user deadlines (Gamification Phase 4 API)
router.get(
  "/users/:id/deadlines",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;
      const userId = id === "me" ? currentUserId : id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const deadlines = await prisma.userDeadline.findMany({
        where: { userId },
        orderBy: { deadlineDate: "asc" },
      });

      res.json({ success: true, deadlines });
    } catch (error: any) {
      console.error("Get user deadlines error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get user deadlines" });
    }
  },
);

// POST /users/me/deadlines - Create a new deadline (Gamification Phase 4 API)
router.post(
  "/users/me/deadlines",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { title, deadlineDate, relatedTopics, courseId, priority } =
        req.body;

      if (!title || !deadlineDate) {
        return res.status(400).json({
          success: false,
          error: "Title and deadlineDate are required",
        });
      }

      const deadline = await prisma.userDeadline.create({
        data: {
          userId,
          title,
          deadlineDate: new Date(deadlineDate),
          relatedTopics: relatedTopics ?? [],
          courseId,
          priority: priority ?? "MEDIUM",
        },
      });

      res.json({ success: true, deadline });
    } catch (error: any) {
      console.error("Create user deadline error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create user deadline" });
    }
  },
);

// DELETE /users/me/deadlines/:deadlineId - Delete a deadline (Gamification Phase 4 API)
router.delete(
  "/users/me/deadlines/:deadlineId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { deadlineId } = req.params;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const existing = await prisma.userDeadline.findUnique({
        where: { id: deadlineId },
      });
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({
          success: false,
          error: "Deadline not found or unauthorized",
        });
      }

      await prisma.userDeadline.delete({
        where: { id: deadlineId },
      });

      res.json({ success: true, message: "Deadline deleted successfully" });
    } catch (error: any) {
      console.error("Delete user deadline error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete user deadline" });
    }
  },
);

// PUT /users/me/profile - Update own profile
router.put(
  "/users/me/profile",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const validationResult = profileUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: getProfileValidationMessage(validationResult.error),
        });
      }

      const {
        firstName,
        lastName,
        englishFirstName,
        englishLastName,
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
        profilePictureUrl,
        coverPhotoUrl,
        customFields,
      } = validationResult.data;

      // Build update data
      const updateData: any = { profileUpdatedAt: new Date() };
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (englishFirstName !== undefined)
        updateData.englishFirstName = englishFirstName;
      if (englishLastName !== undefined)
        updateData.englishLastName = englishLastName;
      if (bio !== undefined) updateData.bio = bio;
      if (headline !== undefined) updateData.headline = headline;
      if (professionalTitle !== undefined)
        updateData.professionalTitle = professionalTitle;
      if (location !== undefined) updateData.location = location;
      if (languages !== undefined) updateData.languages = languages;
      if (interests !== undefined) updateData.interests = interests;
      if (careerGoals !== undefined) updateData.careerGoals = careerGoals;
      if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
      if (profileVisibility !== undefined)
        updateData.profileVisibility = profileVisibility;
      if (isOpenToOpportunities !== undefined)
        updateData.isOpenToOpportunities = isOpenToOpportunities;
      if (profilePictureUrl !== undefined)
        updateData.profilePictureUrl = profilePictureUrl;
      if (coverPhotoUrl !== undefined) updateData.coverPhotoUrl = coverPhotoUrl;

      // Calculate profile completeness
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { teacher: true, student: true },
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const officialFieldsRequested =
        firstName !== undefined ||
        lastName !== undefined ||
        englishFirstName !== undefined ||
        englishLastName !== undefined ||
        customFields !== undefined;
      const schoolControlledProfile =
        Boolean(user.schoolId) && Boolean(user.teacherId || user.studentId);
      if (schoolControlledProfile && officialFieldsRequested) {
        return res.status(409).json({
          success: false,
          error:
            "School-linked student and teacher profile changes require admin approval",
        });
      }

      const fields = [
        user?.firstName,
        user?.lastName,
        bio || user?.bio,
        headline || user?.headline,
        professionalTitle || user?.professionalTitle,
        location || user?.location,
        user?.profilePictureUrl,
        careerGoals || user?.careerGoals,
      ];
      const filledFields = fields.filter(
        (f) => f && String(f).trim().length > 0,
      ).length;
      updateData.profileCompleteness = Math.round(
        (filledFields / fields.length) * 100,
      );

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          englishFirstName: true,
          englishLastName: true,
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
          profilePictureUrl: true,
          coverPhotoUrl: true,
        },
      });

      // Handle role-specific custom fields
      try {
        if (officialFieldsRequested && schoolControlledProfile) {
          throw new Error(
            "Official school profile fields require admin approval",
          );
        }

        const roleProfileUpdateData: Record<string, any> = {};
        if (firstName !== undefined)
          roleProfileUpdateData.firstName = firstName;
        if (lastName !== undefined) roleProfileUpdateData.lastName = lastName;
        if (englishFirstName !== undefined)
          roleProfileUpdateData.englishFirstName =
            englishFirstName?.trim() === "" ? null : englishFirstName;
        if (englishLastName !== undefined)
          roleProfileUpdateData.englishLastName =
            englishLastName?.trim() === "" ? null : englishLastName;

        if (user.role === "TEACHER" && user.teacher) {
          const teacherUpdateData = { ...roleProfileUpdateData };
          if (customFields !== undefined && typeof customFields === "object") {
            const currentCustomFields = user.teacher.customFields
              ? (user.teacher.customFields as Record<string, any>)
              : {};
            const incomingFields = customFields as Record<string, any>;
            const mergedFields = {
              ...currentCustomFields,
              ...incomingFields,
              regional: {
                ...(currentCustomFields.regional || {}),
                ...(incomingFields.regional || {}),
              },
            };
            teacherUpdateData.customFields = mergedFields as any;
          }

          if (Object.keys(teacherUpdateData).length > 0) {
            await prisma.teacher.update({
              where: { id: user.teacher.id },
              data: teacherUpdateData,
            });
          }
        } else if (user.role === "STUDENT" && user.student) {
          const studentUpdateData = { ...roleProfileUpdateData };
          if (customFields !== undefined && typeof customFields === "object") {
            const currentCustomFields = user.student.customFields
              ? (user.student.customFields as Record<string, any>)
              : {};
            const incomingFields = customFields as Record<string, any>;
            const mergedFields = {
              ...currentCustomFields,
              ...incomingFields,
              regional: {
                ...(currentCustomFields.regional || {}),
                ...(incomingFields.regional || {}),
              },
            };
            studentUpdateData.customFields = mergedFields as any;
          }

          if (Object.keys(studentUpdateData).length > 0) {
            await prisma.student.update({
              where: { id: user.student.id },
              data: studentUpdateData,
            });
          }
        }
      } catch (roleError) {
        console.error(
          "Failed to update role-specific profile fields:",
          roleError,
        );
        // We log, but do not fail the overall profile update if this part fails
      }

      // Since we updated related tables, fetching fresh data is safer
      const finalUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          englishFirstName: true,
          englishLastName: true,
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
          profilePictureUrl: true,
          coverPhotoUrl: true,
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              englishFirstName: true,
              englishLastName: true,
              gender: true,
              dateOfBirth: true,
              email: true,
              phone: true,
              address: true,
              hireDate: true,
              isProfileLocked: true,
              customFields: true,
            },
          },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              englishFirstName: true,
              englishLastName: true,
              gender: true,
              dateOfBirth: true,
              email: true,
              phoneNumber: true,
              isProfileLocked: true,
              customFields: true,
              class: { select: { id: true, name: true, grade: true } },
            },
          },
        },
      });

      res.json({ success: true, profile: finalUser || updatedUser });
    } catch (error: any) {
      console.error("Update profile error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update profile" });
    }
  },
);

// POST /users/me/profile-photo - Upload profile photo
router.post(
  "/users/me/profile-photo",
  authenticateToken,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });

      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No file provided" });

      const oldUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          profilePictureKey: true,
          schoolId: true,
          studentId: true,
          teacherId: true,
        },
      });
      const schoolControlledProfile =
        Boolean(oldUser?.schoolId) &&
        Boolean(oldUser?.teacherId || oldUser?.studentId);

      let photoUrl = "";
      let photoKey = "";

      if (isR2Configured()) {
        const result = await uploadMultipleToR2(
          [
            {
              buffer: file.buffer,
              originalname: file.originalname,
              mimetype: file.mimetype,
            },
          ],
          "profiles",
        );
        photoUrl = result[0].url;
        photoKey = result[0].key;

        // Delete old photo from R2 only when the profile is updated immediately.
        if (!schoolControlledProfile && oldUser?.profilePictureKey) {
          await deleteFromR2(oldUser.profilePictureKey).catch(() => {});
        }
      } else {
        photoUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        photoKey = file.originalname;
      }

      if (schoolControlledProfile) {
        return res.json({
          success: true,
          pendingReviewRequired: true,
          profilePictureUrl: photoUrl,
          profilePictureKey: photoKey,
        });
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
      console.error("Upload profile photo error:", error);
      res.status(500).json({ success: false, error: "Failed to upload photo" });
    }
  },
);

// POST /users/me/cover-photo - Upload cover photo
router.post(
  "/users/me/cover-photo",
  authenticateToken,
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });

      const file = req.file;
      if (!file)
        return res
          .status(400)
          .json({ success: false, error: "No file provided" });

      const oldUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          coverPhotoKey: true,
          schoolId: true,
          studentId: true,
          teacherId: true,
        },
      });
      const schoolControlledProfile =
        Boolean(oldUser?.schoolId) &&
        Boolean(oldUser?.teacherId || oldUser?.studentId);

      let coverUrl = "";
      let coverKey = "";

      if (isR2Configured()) {
        const result = await uploadMultipleToR2(
          [
            {
              buffer: file.buffer,
              originalname: file.originalname,
              mimetype: file.mimetype,
            },
          ],
          "covers",
        );
        coverUrl = result[0].url;
        coverKey = result[0].key;

        // Delete old cover from R2 only when the profile is updated immediately.
        if (!schoolControlledProfile && oldUser?.coverPhotoKey) {
          await deleteFromR2(oldUser.coverPhotoKey).catch(() => {});
        }
      } else {
        coverUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        coverKey = file.originalname;
      }

      if (schoolControlledProfile) {
        return res.json({
          success: true,
          pendingReviewRequired: true,
          coverPhotoUrl: coverUrl,
          coverPhotoKey: coverKey,
        });
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
      console.error("Upload cover photo error:", error);
      res.status(500).json({ success: false, error: "Failed to upload cover" });
    }
  },
);

// DELETE /users/me/cover-photo - Remove cover photo
router.delete(
  "/users/me/cover-photo",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          coverPhotoKey: true,
          schoolId: true,
          studentId: true,
          teacherId: true,
        },
      });
      const schoolControlledProfile =
        Boolean(user?.schoolId) && Boolean(user?.teacherId || user?.studentId);

      if (schoolControlledProfile) {
        return res.status(409).json({
          success: false,
          error:
            "School-linked student and teacher profile changes require admin approval",
        });
      }

      if (user?.coverPhotoKey && isR2Configured()) {
        await deleteFromR2(user.coverPhotoKey).catch(() => {});
      }

      await prisma.user.update({
        where: { id: userId },
        data: { coverPhotoUrl: null, coverPhotoKey: null },
      });

      res.json({ success: true, message: "Cover photo removed" });
    } catch (error: any) {
      console.error("Delete cover photo error:", error);
      res.status(500).json({ success: false, error: "Failed to delete cover" });
    }
  },
);

// POST /users/:id/follow - Follow/unfollow a user (toggle)
router.post(
  "/users/:id/follow",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const followingId = req.params.id;
      const followerId = req.user!.id;

      if (followerId === followingId) {
        return res
          .status(400)
          .json({ success: false, error: "Cannot follow yourself" });
      }

      // Check if already following
      const existing = await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId, followingId },
        },
      });

      if (existing) {
        // Unfollow
        await prisma.follow.delete({
          where: { followerId_followingId: { followerId, followingId } },
        });

        const followerCount = await prisma.follow.count({
          where: { followingId },
        });
        Promise.all([
          feedCache.invalidateUser(followerId),
          feedCache.invalidateUser(followingId),
        ]).catch(() => {});
        return res.json({ success: true, isFollowing: false, followerCount });
      } else {
        // Follow
        await prisma.follow.create({
          data: { followerId, followingId },
        });

        const followerCount = await prisma.follow.count({
          where: { followingId },
        });
        Promise.all([
          feedCache.invalidateUser(followerId),
          feedCache.invalidateUser(followingId),
        ]).catch(() => {});
        return res.json({ success: true, isFollowing: true, followerCount });
      }
    } catch (error: any) {
      console.error("Follow toggle error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to toggle follow" });
    }
  },
);

export default router;
