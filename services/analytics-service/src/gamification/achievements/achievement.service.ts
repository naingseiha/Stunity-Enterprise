import { PrismaClient, AchievementCategory } from '@prisma/client';
import { currencyService } from '../currency/currency.service';

const prisma = new PrismaClient();

export interface AchievementCriteria {
    type: 'grade' | 'attendance' | 'social' | 'challenge' | 'composite';
    operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
    value: number;
    subjectId?: string;
    count?: number;
    conditions?: AchievementCriteria[]; // For composite
    logic?: 'AND' | 'OR';
}

export class AchievementService {
    /**
     * Get all achievements with user's current progress
     */
    async getUserAchievements(userId: string, category?: AchievementCategory) {
        const achievements = await prisma.gamificationAchievement.findMany({
            where: {
                isActive: true,
                category: category || undefined
            },
            include: {
                userProgress: {
                    where: { userId }
                }
            }
        });

        return achievements.map(ach => ({
            ...ach,
            progress: ach.userProgress[0]?.progress || 0,
            isUnlocked: ach.userProgress[0]?.isUnlocked || false,
            unlockedAt: ach.userProgress[0]?.unlockedAt || null
        }));
    }

    /**
     * Check if a user meets the criteria for an achievement
     */
    async evaluateCriteria(userId: string, criteria: AchievementCriteria): Promise<boolean> {
        // This is a simplified evaluator. In a full implementation, 
        // it would query relevant services or DB tables based on criteria.type.

        switch (criteria.type) {
            case 'composite':
                if (!criteria.conditions || criteria.conditions.length === 0) return true;

                if (criteria.logic === 'OR') {
                    for (const condition of criteria.conditions) {
                        if (await this.evaluateCriteria(userId, condition)) return true;
                    }
                    return false;
                } else { // AND
                    for (const condition of criteria.conditions) {
                        if (!(await this.evaluateCriteria(userId, condition))) return false;
                    }
                    return true;
                }

            // Placeholder for specific types - these would hit other tables
            case 'grade':
            case 'attendance':
            case 'social':
            case 'challenge':
                // Implementation would involve querying Prisma models added in schema
                // e.g., prisma.grade.aggregate(...)
                return false;

            default:
                return false;
        }
    }

    /**
     * Unlock an achievement for a user (idempotent)
     */
    async unlockAchievement(userId: string, achievementId: string) {
        const achievement = await prisma.gamificationAchievement.findUnique({
            where: { id: achievementId }
        });

        if (!achievement) throw new Error('Achievement not found');

        return await prisma.$transaction(async (tx) => {
            // 1. Check if already unlocked
            const existingProgress = await tx.userAchievementProgress.findUnique({
                where: { userId_achievementId: { userId, achievementId } }
            });

            if (existingProgress?.isUnlocked) {
                return existingProgress;
            }

            // 2. Mark as unlocked
            const updatedProgress = await tx.userAchievementProgress.upsert({
                where: { userId_achievementId: { userId, achievementId } },
                update: {
                    isUnlocked: true,
                    unlockedAt: new Date(),
                    progress: 100 // Mark as complete
                },
                create: {
                    userId,
                    achievementId,
                    isUnlocked: true,
                    unlockedAt: new Date(),
                    progress: 100
                }
            });

            // 3. Award rewards
            if (achievement.coinReward > 0) {
                await currencyService.credit({
                    userId,
                    amount: achievement.coinReward,
                    source: 'achievement',
                    sourceId: achievementId
                });
            }

            // 4. Award XP (via UserStats model also used in analytics-service)
            if (achievement.xpReward > 0) {
                await tx.userStats.upsert({
                    where: { userId },
                    update: {
                        xp: { increment: achievement.xpReward }
                        // Level calculation logic handled in main analytics loop or here
                    },
                    create: {
                        userId,
                        xp: achievement.xpReward,
                        level: 1
                    }
                });
            }

            return updatedProgress;
        });
    }

    /**
     * Update progress toward an achievement
     */
    async updateProgress(userId: string, achievementId: string, progress: number) {
        const achievement = await prisma.gamificationAchievement.findUnique({
            where: { id: achievementId }
        });

        if (!achievement) throw new Error('Achievement not found');

        const result = await prisma.userAchievementProgress.upsert({
            where: { userId_achievementId: { userId, achievementId } },
            update: { progress: { set: progress } },
            create: { userId, achievementId, progress }
        });

        // Check if it should unlock
        if (progress >= 100 && !result.isUnlocked) {
            return await this.unlockAchievement(userId, achievementId);
        }

        return result;
    }
}

export const achievementService = new AchievementService();
