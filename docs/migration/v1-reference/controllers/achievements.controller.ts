import { Request, Response } from "express";
import { PrismaClient, AchievementType, AchievementRarity } from "@prisma/client";

const prisma = new PrismaClient();

// Get user's achievements
export const getAchievements = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const achievements = await prisma.achievement.findMany({
      where: {
        userId,
        isPublic: true,
      },
      orderBy: [
        { rarity: "desc" },
        { issuedDate: "desc" },
      ],
    });

    // Group by type for better organization
    const grouped = achievements.reduce((acc, achievement) => {
      const type = achievement.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(achievement);
      return acc;
    }, {} as Record<string, typeof achievements>);

    res.json({
      achievements,
      grouped,
      total: achievements.length,
    });
  } catch (error) {
    console.error("Failed to fetch achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
};

// Add achievement
export const addAchievement = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      type,
      title,
      description,
      issuedBy,
      points = 0,
      rarity = "COMMON",
      isPublic = true,
      metadata,
    } = req.body;

    // Validate required fields
    if (!type || !title || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate type
    const validTypes: AchievementType[] = [
      "COURSE_COMPLETION",
      "SKILL_MASTERY",
      "TEACHING_EXCELLENCE",
      "COMMUNITY_CONTRIBUTION",
      "LEADERSHIP",
      "INNOVATION",
      "COLLABORATION",
      "CONSISTENCY_STREAK",
      "TOP_PERFORMER",
      "MILESTONE",
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid achievement type" });
    }

    // Validate rarity
    const validRarities: AchievementRarity[] = [
      "COMMON",
      "UNCOMMON",
      "RARE",
      "EPIC",
      "LEGENDARY",
    ];

    if (!validRarities.includes(rarity)) {
      return res.status(400).json({ error: "Invalid rarity" });
    }

    const achievement = await prisma.achievement.create({
      data: {
        userId,
        type,
        title,
        description,
        issuedBy,
        points: parseInt(points),
        rarity,
        isPublic,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });

    // Update user's total points
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: {
          increment: parseInt(points),
        },
      },
    });

    res.status(201).json({ achievement });
  } catch (error) {
    console.error("Failed to add achievement:", error);
    res.status(500).json({ error: "Failed to add achievement" });
  }
};

// Update achievement
export const updateAchievement = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { achievementId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check ownership
    const existing = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Not authorized to update this achievement" });
    }

    const { title, description, issuedBy, isPublic, metadata } = req.body;

    const achievement = await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(issuedBy !== undefined && { issuedBy }),
        ...(isPublic !== undefined && { isPublic }),
        ...(metadata && { metadata: JSON.parse(JSON.stringify(metadata)) }),
      },
    });

    res.json({ achievement });
  } catch (error) {
    console.error("Failed to update achievement:", error);
    res.status(500).json({ error: "Failed to update achievement" });
  }
};

// Delete achievement
export const deleteAchievement = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { achievementId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check ownership
    const existing = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Not authorized to delete this achievement" });
    }

    // Subtract points before deleting
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: {
          decrement: existing.points,
        },
      },
    });

    await prisma.achievement.delete({
      where: { id: achievementId },
    });

    res.json({ message: "Achievement deleted successfully" });
  } catch (error) {
    console.error("Failed to delete achievement:", error);
    res.status(500).json({ error: "Failed to delete achievement" });
  }
};

// Get achievement statistics
export const getAchievementStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const achievements = await prisma.achievement.findMany({
      where: { userId, isPublic: true },
    });

    const stats = {
      total: achievements.length,
      totalPoints: achievements.reduce((sum, a) => sum + a.points, 0),
      byType: {} as Record<string, number>,
      byRarity: {} as Record<string, number>,
    };

    achievements.forEach((achievement) => {
      // Count by type
      stats.byType[achievement.type] = (stats.byType[achievement.type] || 0) + 1;
      
      // Count by rarity
      stats.byRarity[achievement.rarity] = (stats.byRarity[achievement.rarity] || 0) + 1;
    });

    res.json({ stats });
  } catch (error) {
    console.error("Failed to fetch achievement stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
