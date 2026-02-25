import { teamChallengeService } from './team-challenge.service';
import { PrismaClient } from '@prisma/client';
import { currencyService } from '../currency/currency.service';

jest.mock('@prisma/client', () => {
    const mPrisma: any = {
        teamChallenge: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
        teamChallengeParticipant: {
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
        userStats: { upsert: jest.fn() },
    };
    mPrisma.$transaction = jest.fn((cb) => cb(mPrisma));
    return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../currency/currency.service', () => ({
    currencyService: { credit: jest.fn() },
}));

const prisma = new PrismaClient() as any;

describe('TeamChallengeService', () => {
    const creatorId = 'user-creator';

    beforeEach(() => jest.clearAllMocks());

    describe('createTeamChallenge', () => {
        it('should create a challenge with 2-50 participants', async () => {
            prisma.teamChallenge.create.mockResolvedValue({ id: 'tc-1', participants: [] });

            const result = await teamChallengeService.createTeamChallenge({
                creatorId,
                name: 'Team Sprint',
                description: 'Complete 100 tasks together',
                targetValue: 100,
                deadline: new Date(Date.now() + 86400000),
                participantIds: ['user-2', 'user-3'],
                xpReward: 500,
                coinReward: 300,
            });

            expect(result.id).toBe('tc-1');
            expect(prisma.teamChallenge.create).toHaveBeenCalled();
        });

        it('should reject if only 1 total participant (creator only)', async () => {
            await expect(teamChallengeService.createTeamChallenge({
                creatorId,
                name: 'Solo',
                description: 'A solo attempt',
                targetValue: 10,
                deadline: new Date(),
                participantIds: [], // only creator => 1 total
                xpReward: 0,
                coinReward: 0,
            })).rejects.toThrow('at least 2 participants');
        });

        it('should reject if more than 50 participants', async () => {
            const ids = Array.from({ length: 50 }, (_, i) => `user-${i}`); // 50 + creator = 51

            await expect(teamChallengeService.createTeamChallenge({
                creatorId,
                name: 'Mega Team',
                description: 'A very large team challenge',
                targetValue: 1000,
                deadline: new Date(Date.now() + 86400000),
                participantIds: ids,
                xpReward: 0,
                coinReward: 0,
            })).rejects.toThrow('more than 50 participants');
        });
    });

    describe('contribute', () => {
        it('should update participant contribution and team total', async () => {
            const mockParticipant = { teamChallengeId: 'tc-1', userId: 'user-1', contribution: 10 };
            const mockChallenge = {
                id: 'tc-1',
                status: 'ACTIVE',
                currentValue: 10,
                targetValue: 100,
                deadline: new Date(Date.now() + 86400000),
                participants: [{ userId: 'user-1', contribution: 10 }],
                coinReward: 300,
                xpReward: 500,
            };

            prisma.teamChallengeParticipant.findUnique.mockResolvedValue(mockParticipant);
            prisma.teamChallenge.findUnique.mockResolvedValue(mockChallenge);
            prisma.teamChallengeParticipant.update.mockResolvedValue({});
            prisma.teamChallenge.update.mockResolvedValue({ ...mockChallenge, currentValue: 60, status: 'ACTIVE' });

            const result = await teamChallengeService.contribute('tc-1', 'user-1', 50);

            expect(prisma.teamChallengeParticipant.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { contribution: { increment: 50 } } })
            );
            expect(result.currentValue).toBe(60);
        });

        it('should distribute proportional rewards when challenge is completed', async () => {
            const mockParticipant = { teamChallengeId: 'tc-1', userId: 'user-1', contribution: 90 };
            const mockChallenge = {
                id: 'tc-1',
                status: 'ACTIVE',
                currentValue: 90,
                targetValue: 100,
                deadline: new Date(Date.now() + 86400000),
                participants: [
                    { userId: 'user-1', contribution: 90 },
                    { userId: 'user-2', contribution: 0 },
                ],
                coinReward: 300,
                xpReward: 500,
            };

            prisma.teamChallengeParticipant.findUnique.mockResolvedValue(mockParticipant);
            prisma.teamChallenge.findUnique.mockResolvedValue(mockChallenge);
            prisma.teamChallengeParticipant.update.mockResolvedValue({});
            prisma.teamChallenge.update.mockResolvedValue({
                ...mockChallenge,
                currentValue: 100,
                status: 'COMPLETED',
                participants: [
                    { userId: 'user-1', contribution: 90 },
                    { userId: 'user-2', contribution: 10 },
                ],
            });

            await teamChallengeService.contribute('tc-1', 'user-1', 10);

            expect(currencyService.credit).toHaveBeenCalled();
        });

        it('should reject non-participants', async () => {
            prisma.teamChallengeParticipant.findUnique.mockResolvedValue(null);

            await expect(teamChallengeService.contribute('tc-1', 'outsider', 10))
                .rejects.toThrow('Not a participant');
        });

        it('should reject negative contributions', async () => {
            await expect(teamChallengeService.contribute('tc-1', 'user-1', -5))
                .rejects.toThrow('Contribution must be positive');
        });
    });
});
