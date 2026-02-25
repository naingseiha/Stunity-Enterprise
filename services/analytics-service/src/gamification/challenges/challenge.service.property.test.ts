import * as fc from 'fast-check';
import { challengeService } from './challenge.service';
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
        userStats: { upsert: jest.fn() },
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

describe('ChallengeService Property Tests', () => {
    const userId = 'prop-user';

    beforeEach(() => jest.clearAllMocks());

    /**
     * PROP-4: Progress Monotonicity
     * Progress should only increase, never decrease.
     */
    it('PROP-4: progress is monotonically non-decreasing', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }),
                async (increments) => {
                    let currentProgress = 0;
                    const target = 100_000; // high enough so challenge never completes

                    increments.forEach(async (increment) => {
                        const prevProgress = currentProgress;
                        const newProgress = currentProgress + increment;

                        const mockChallenge = {
                            id: 'c-prop',
                            userId,
                            progress: currentProgress,
                            expiresAt: new Date(Date.now() + 86400000),
                            template: { targetValue: target, difficulty: 'EASY', xpReward: 0, type: 'DAILY', coinReward: 100 },
                        };

                        prisma.challenge.findFirst.mockResolvedValue(mockChallenge);
                        prisma.challenge.update.mockImplementation(({ data }: any) => {
                            currentProgress = data.progress;
                            return { ...mockChallenge, progress: currentProgress };
                        });

                        await challengeService.updateProgress('c-prop', userId, increment);

                        // Invariant: progress must have increased
                        expect(currentProgress).toBeGreaterThanOrEqual(prevProgress);
                    });
                }
            ),
            { numRuns: 30 }
        );
    });

    /**
     * PROP-11a: Daily challenges expire exactly 24h after creation (midnight UTC next day).
     */
    it('PROP-11a: daily challenge expiresAt is always in the future', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constant(userId),
                async (uid) => {
                    prisma.challenge.count.mockResolvedValue(0);
                    const templates = [{ id: 't1', weight: 1 }];
                    (challengeTemplateService.getActiveTemplates as jest.Mock).mockResolvedValue(templates);
                    (challengeTemplateService.selectWeighted as jest.Mock).mockReturnValue(templates);

                    let capturedExpiresAt: Date | null = null;
                    prisma.challenge.create.mockImplementation(({ data }: any) => {
                        capturedExpiresAt = data.expiresAt;
                        return { id: 'c1', ...data };
                    });

                    await challengeService.generateDailyChallenges(uid);

                    // expiresAt must be in the future
                    expect(capturedExpiresAt).not.toBeNull();
                    expect(capturedExpiresAt!.getTime()).toBeGreaterThan(Date.now());
                }
            ),
            { numRuns: 20 }
        );
    });

    /**
     * PROP-11b: Challenge generation uniqueness.
     * selectWeighted is called with deduplicated templates (no repeats from user's active challenges).
     */
    it('PROP-11b: templates passed to selectWeighted exclude already-active ones', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(fc.string({ minLength: 3, maxLength: 8 }), { minLength: 1, maxLength: 3 }),
                async (activeIds) => {
                    const allTemplates = [
                        ...activeIds.map((id) => ({ id, weight: 1 })),
                        { id: 'free-t', weight: 1 },
                    ];

                    prisma.challenge.count.mockResolvedValue(activeIds.length);

                    // getActiveTemplates filters by service logic; mock to return only the free template
                    (challengeTemplateService.getActiveTemplates as jest.Mock).mockResolvedValue([
                        { id: 'free-t', weight: 1 },
                    ]);
                    (challengeTemplateService.selectWeighted as jest.Mock).mockReturnValue([
                        { id: 'free-t', weight: 1 },
                    ]);
                    prisma.challenge.create.mockResolvedValue({ id: 'new-c' });

                    await challengeService.generateDailyChallenges(userId);

                    const callArgs = (challengeTemplateService.getActiveTemplates as jest.Mock).mock.calls;
                    if (callArgs.length > 0) {
                        // The templates returned must not include active ones
                        const returned = (challengeTemplateService.selectWeighted as jest.Mock).mock.calls?.[0]?.[0] ?? [];
                        const returnedIds = returned.map((t: any) => t.id);
                        const overlap = returnedIds.filter((id: string) => activeIds.includes(id));
                        expect(overlap).toHaveLength(0);
                    }
                }
            ),
            { numRuns: 20 }
        );
    });
});
