import { challengeService, DIFFICULTY_COIN_REWARD } from './challenge.service';
import { PrismaClient } from '@prisma/client';
import { currencyService } from '../currency/currency.service';
import { challengeTemplateService } from './challenge-template.service';

jest.mock('@prisma/client', () => {
    const mPrisma: any = {
        challenge: {
            count: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
            updateMany: jest.fn(),
        },
        userStats: {
            upsert: jest.fn(),
        },
    };
    mPrisma.$transaction = jest.fn((callback) => callback(mPrisma));
    return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../currency/currency.service', () => ({
    currencyService: { credit: jest.fn() },
}));

jest.mock('./challenge-template.service', () => ({
    challengeTemplateService: {
        getActiveTemplates: jest.fn(),
        selectWeighted: jest.fn(),
    },
}));

const prisma = new PrismaClient() as any;

describe('ChallengeService', () => {
    const userId = 'user-1';

    beforeEach(() => jest.clearAllMocks());

    describe('generateDailyChallenges', () => {
        it('should create exactly 3 daily challenges', async () => {
            prisma.challenge.count.mockResolvedValue(0);
            const templates = [
                { id: 't1', weight: 1 },
                { id: 't2', weight: 1 },
                { id: 't3', weight: 1 },
            ];
            (challengeTemplateService.getActiveTemplates as jest.Mock).mockResolvedValue(templates);
            (challengeTemplateService.selectWeighted as jest.Mock).mockReturnValue(templates);
            prisma.challenge.create.mockResolvedValue({ id: 'c1' });

            const result = await challengeService.generateDailyChallenges(userId);

            expect(prisma.challenge.create).toHaveBeenCalledTimes(3);
            expect(result).toHaveLength(3);
        });

        it('should not create challenges if 3 already exist', async () => {
            prisma.challenge.count.mockResolvedValue(3);

            const result = await challengeService.generateDailyChallenges(userId);

            expect(prisma.challenge.create).not.toHaveBeenCalled();
            expect(result).toHaveLength(0);
        });
    });

    describe('generateWeeklyChallenges', () => {
        it('should create exactly 5 weekly challenges', async () => {
            prisma.challenge.count.mockResolvedValue(0);
            const templates = Array.from({ length: 5 }, (_, i) => ({ id: `t${i}`, weight: 1 }));
            (challengeTemplateService.getActiveTemplates as jest.Mock).mockResolvedValue(templates);
            (challengeTemplateService.selectWeighted as jest.Mock).mockReturnValue(templates);
            prisma.challenge.create.mockResolvedValue({ id: 'c1' });

            const result = await challengeService.generateWeeklyChallenges(userId);

            expect(prisma.challenge.create).toHaveBeenCalledTimes(5);
            expect(result).toHaveLength(5);
        });
    });

    describe('updateProgress', () => {
        it('should increment progress', async () => {
            const mockChallenge = {
                id: 'c1',
                userId,
                progress: 30,
                expiresAt: new Date(Date.now() + 86400000),
                template: { targetValue: 100, difficulty: 'EASY', xpReward: 50, type: 'DAILY', coinReward: 100 },
            };
            prisma.challenge.findFirst.mockResolvedValue(mockChallenge);
            prisma.challenge.update.mockResolvedValue({ ...mockChallenge, progress: 50 });

            const result = await challengeService.updateProgress('c1', userId, 20);

            expect(prisma.challenge.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { progress: 50 } })
            );
        });

        it('should complete challenge when progress >= targetValue', async () => {
            const mockChallenge = {
                id: 'c1',
                userId,
                progress: 90,
                expiresAt: new Date(Date.now() + 86400000),
                template: { targetValue: 100, difficulty: 'MEDIUM', xpReward: 100, type: 'DAILY', coinReward: 250 },
            };
            prisma.challenge.findFirst.mockResolvedValue(mockChallenge);
            prisma.challenge.update.mockResolvedValue({ status: 'COMPLETED' });
            prisma.challenge.count.mockResolvedValue(3);

            await challengeService.updateProgress('c1', userId, 20); // 90 + 20 >= 100

            expect(prisma.challenge.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
            );
            expect(currencyService.credit).toHaveBeenCalledWith(
                expect.objectContaining({ amount: 250, source: 'challenge' })
            );
        });

        it('should throw on non-positive increment', async () => {
            await expect(challengeService.updateProgress('c1', userId, 0)).rejects.toThrow('Increment must be positive');
        });
    });

    describe('expireChallenges', () => {
        it('should batch expire all overdue challenges and return count', async () => {
            prisma.challenge.updateMany.mockResolvedValue({ count: 12 });

            const count = await challengeService.expireChallenges();

            expect(count).toBe(12);
            expect(prisma.challenge.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ data: { status: 'EXPIRED' } })
            );
        });
    });

    describe('DIFFICULTY_COIN_REWARD', () => {
        it('should have correct values by tier', () => {
            expect(DIFFICULTY_COIN_REWARD.EASY).toBe(100);
            expect(DIFFICULTY_COIN_REWARD.MEDIUM).toBe(250);
            expect(DIFFICULTY_COIN_REWARD.HARD).toBe(500);
        });
    });
});
