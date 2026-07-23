import { achievementService } from './achievement.service';
import { PrismaClient } from '@prisma/client';
import { currencyService } from '../currency/currency.service';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
    const mPrisma: any = {
        gamificationAchievement: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        userAchievementProgress: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
        },
        userStats: {
            upsert: jest.fn(),
        }
    };
    mPrisma.$transaction = jest.fn((callback) => callback(mPrisma));
    return {
        PrismaClient: jest.fn(() => mPrisma),
        AchievementCategory: {
            ACADEMIC: 'ACADEMIC',
            SOCIAL: 'SOCIAL'
        }
    };
});

// Mock CurrencyService
jest.mock('../currency/currency.service', () => ({
    currencyService: {
        credit: jest.fn(),
    }
}));

const prisma = new PrismaClient() as any;

describe('AchievementService', () => {
    const userId = 'user-1';
    const achievementId = 'ach-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('unlockAchievement', () => {
        it('should unlock and award coin/XP rewards', async () => {
            const mockAchievement = {
                id: achievementId,
                coinReward: 50,
                xpReward: 100
            };

            prisma.gamificationAchievement.findUnique.mockResolvedValue(mockAchievement);
            prisma.userAchievementProgress.findUnique.mockResolvedValue(null);
            prisma.userAchievementProgress.upsert.mockResolvedValue({ isUnlocked: true });

            await achievementService.unlockAchievement(userId, achievementId);

            expect(prisma.userAchievementProgress.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId_achievementId: { userId, achievementId } },
                update: expect.objectContaining({ isUnlocked: true })
            }));

            // Check coin reward
            expect(currencyService.credit).toHaveBeenCalledWith({
                userId,
                amount: 50,
                source: 'achievement',
                sourceId: achievementId
            });

            // Check XP reward
            expect(prisma.userStats.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId },
                update: { xp: { increment: 100 } }
            }));
        });

        it('should not award rewards again if already unlocked', async () => {
            prisma.gamificationAchievement.findUnique.mockResolvedValue({ id: achievementId });
            prisma.userAchievementProgress.findUnique.mockResolvedValue({ isUnlocked: true });

            await achievementService.unlockAchievement(userId, achievementId);

            expect(currencyService.credit).not.toHaveBeenCalled();
            expect(prisma.userStats.upsert).not.toHaveBeenCalled();
        });
    });
});
