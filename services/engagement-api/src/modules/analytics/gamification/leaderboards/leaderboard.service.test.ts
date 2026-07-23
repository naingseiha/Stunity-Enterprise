import { computeRanks, LeaderboardService } from './leaderboard.service';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
    const mPrisma: any = {
        userStats: { findMany: jest.fn() },
        challenge: { groupBy: jest.fn() },
        attendanceStreak: { findMany: jest.fn() },
        leaderboard: { create: jest.fn() },
    };
    mPrisma.$transaction = jest.fn((cb) => cb(mPrisma));
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as any;

describe('computeRanks (pure function)', () => {
    it('assigns sequential ranks for unique scores', () => {
        const input = [
            { userId: 'a', value: 300 },
            { userId: 'b', value: 200 },
            { userId: 'c', value: 100 },
        ];
        const result = computeRanks(input);
        expect(result[0].rank).toBe(1);
        expect(result[1].rank).toBe(2);
        expect(result[2].rank).toBe(3);
    });

    it('assigns same rank to tied users and skips subsequent (1,2,2,4)', () => {
        const input = [
            { userId: 'a', value: 300 },
            { userId: 'b', value: 200 },
            { userId: 'c', value: 200 },
            { userId: 'd', value: 100 },
        ];
        const result = computeRanks(input);
        expect(result[0].rank).toBe(1);
        expect(result[1].rank).toBe(2);
        expect(result[2].rank).toBe(2);
        expect(result[3].rank).toBe(4); // rank 3 is skipped
    });

    it('handles all tied scores', () => {
        const input = [
            { userId: 'a', value: 100 },
            { userId: 'b', value: 100 },
            { userId: 'c', value: 100 },
        ];
        const result = computeRanks(input);
        result.forEach((r) => expect(r.rank).toBe(1));
    });

    it('returns empty array for empty input', () => {
        expect(computeRanks([])).toEqual([]);
    });
});

describe('LeaderboardService', () => {
    const service = new LeaderboardService();

    beforeEach(() => jest.clearAllMocks());

    describe('getLeaderboardEntries (TOTAL_XP)', () => {
        it('returns entries ranked by XP descending', async () => {
            prisma.userStats.findMany.mockResolvedValue([
                { userId: 'a', xp: 500 },
                { userId: 'b', xp: 300 },
                { userId: 'c', xp: 100 },
            ]);

            const result = await service.getLeaderboardEntries('TOTAL_XP', 'SCHOOL_WIDE', 'ALL_TIME', 10);

            expect(result.entries[0]).toMatchObject({ rank: 1, userId: 'a', value: 500 });
            expect(result.entries[1]).toMatchObject({ rank: 2, userId: 'b', value: 300 });
            expect(result.entries[2]).toMatchObject({ rank: 3, userId: 'c', value: 100 });
        });

        it("returns user's own rank in userEntry", async () => {
            prisma.userStats.findMany.mockResolvedValue([
                { userId: 'a', xp: 500 },
                { userId: 'b', xp: 300 },
                { userId: 'c', xp: 100 },
            ]);

            const result = await service.getLeaderboardEntries(
                'TOTAL_XP', 'SCHOOL_WIDE', 'ALL_TIME', 10, undefined, 'c'
            );

            expect(result.userEntry).toMatchObject({ rank: 3, userId: 'c', value: 100 });
        });
    });

    describe('getLeaderboardEntries (CHALLENGE_COMPLETION)', () => {
        it('ranks users by completed challenge count', async () => {
            prisma.challenge.groupBy.mockResolvedValue([
                { userId: 'a', _count: { id: 10 } },
                { userId: 'b', _count: { id: 5 } },
            ]);

            const result = await service.getLeaderboardEntries('CHALLENGE_COMPLETION', 'SCHOOL_WIDE', 'ALL_TIME', 10);

            expect(result.entries[0]).toMatchObject({ rank: 1, userId: 'a', value: 10 });
        });
    });

    describe('cursor pagination', () => {
        it('applies cursor offset correctly', async () => {
            prisma.userStats.findMany.mockResolvedValue(
                Array.from({ length: 10 }, (_, i) => ({ userId: `user-${i}`, xp: 100 - i * 10 }))
            );

            const first = await service.getLeaderboardEntries('TOTAL_XP', 'SCHOOL_WIDE', 'ALL_TIME', 3);
            expect(first.entries).toHaveLength(3);
            expect(first.nextCursor).toBe('user-2');

            const second = await service.getLeaderboardEntries(
                'TOTAL_XP', 'SCHOOL_WIDE', 'ALL_TIME', 3, 'user-2'
            );
            expect(second.entries[0].userId).toBe('user-3');
        });
    });
});
