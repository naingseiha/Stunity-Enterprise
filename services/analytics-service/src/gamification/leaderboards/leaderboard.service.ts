import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type LeaderboardCategory =
    | 'TOTAL_XP'
    | 'ACADEMIC_PERFORMANCE'
    | 'SOCIAL_ENGAGEMENT'
    | 'ATTENDANCE_RATE'
    | 'CHALLENGE_COMPLETION';

export type LeaderboardScope = 'SCHOOL_WIDE' | 'GRADE_LEVEL' | 'CLASS_SPECIFIC';
export type LeaderboardPeriod = 'ALL_TIME' | 'MONTHLY' | 'WEEKLY' | 'DAILY';

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    value: number;
    tiedWithPrevious?: boolean;
}

export interface PaginatedLeaderboard {
    entries: LeaderboardEntry[];
    nextCursor?: string;
    total: number;
    userEntry?: LeaderboardEntry & { userId: string };
}

/**
 * Compute ranks from an ordered list of {userId, value} with proper tie handling.
 * Tied users get the same rank; subsequent ranks skip accordingly (1,2,2,4 not 1,2,2,3).
 */
export function computeRanks(
    rows: Array<{ userId: string; value: number }>
): LeaderboardEntry[] {
    const ranked: LeaderboardEntry[] = [];
    let currentRank = 1;

    for (let i = 0; i < rows.length; i++) {
        if (i > 0 && rows[i].value < rows[i - 1].value) {
            currentRank = i + 1; // skip ranks equal to tie count
        }
        ranked.push({
            rank: currentRank,
            userId: rows[i].userId,
            value: rows[i].value,
            tiedWithPrevious: i > 0 && rows[i].value === rows[i - 1].value,
        });
    }

    return ranked;
}

/**
 * Helper: get the start timestamp for a given period
 */
function getPeriodStart(period: LeaderboardPeriod): Date | null {
    const now = new Date();
    switch (period) {
        case 'DAILY': {
            const d = new Date(now);
            d.setUTCHours(0, 0, 0, 0);
            return d;
        }
        case 'WEEKLY': {
            const d = new Date(now);
            const day = d.getUTCDay();
            d.setUTCDate(d.getUTCDate() - day);
            d.setUTCHours(0, 0, 0, 0);
            return d;
        }
        case 'MONTHLY': {
            const d = new Date(now);
            d.setUTCDate(1);
            d.setUTCHours(0, 0, 0, 0);
            return d;
        }
        case 'ALL_TIME':
        default:
            return null;
    }
}

export class LeaderboardService {
    /**
     * Calculate and return ranked leaderboard entries.
     * Supports cursor-based pagination.
     */
    async getLeaderboardEntries(
        category: LeaderboardCategory,
        scope: LeaderboardScope,
        period: LeaderboardPeriod,
        limit = 50,
        cursor?: string,
        requestingUserId?: string
    ): Promise<PaginatedLeaderboard> {
        const rows = await this._fetchRawScores(category, scope, period);
        const ranked = computeRanks(rows);

        // Apply cursor (cursor = userId of last seen entry)
        let startIdx = 0;
        if (cursor) {
            const idx = ranked.findIndex((e) => e.userId === cursor);
            if (idx >= 0) startIdx = idx + 1;
        }

        const page = ranked.slice(startIdx, startIdx + limit);
        const nextCursor =
            startIdx + limit < ranked.length
                ? ranked[startIdx + limit - 1].userId
                : undefined;

        // Attach requesting user's own rank if provided
        let userEntry: (LeaderboardEntry & { userId: string }) | undefined;
        if (requestingUserId) {
            const found = ranked.find((e) => e.userId === requestingUserId);
            if (found) userEntry = { ...found, userId: found.userId };
        }

        return { entries: page, nextCursor, total: ranked.length, userEntry };
    }

    /**
     * Get a single user's rank for a category/scope/period combination.
     */
    async getUserRank(
        userId: string,
        category: LeaderboardCategory,
        scope: LeaderboardScope,
        period: LeaderboardPeriod
    ): Promise<LeaderboardEntry | null> {
        const rows = await this._fetchRawScores(category, scope, period);
        const ranked = computeRanks(rows);
        return ranked.find((e) => e.userId === userId) ?? null;
    }

    /**
     * Get a user's rank across all categories for a given scope/period.
     */
    async getUserAllCategoryRanks(
        userId: string,
        scope: LeaderboardScope,
        period: LeaderboardPeriod
    ) {
        const categories: LeaderboardCategory[] = [
            'TOTAL_XP',
            'ACADEMIC_PERFORMANCE',
            'SOCIAL_ENGAGEMENT',
            'ATTENDANCE_RATE',
            'CHALLENGE_COMPLETION',
        ];

        const results = await Promise.all(
            categories.map(async (cat) => {
                const entry = await this.getUserRank(userId, cat, scope, period);
                return { category: cat, rank: entry?.rank ?? null, value: entry?.value ?? 0 };
            })
        );

        return results;
    }

    /**
     * Fetch raw scores from various Prisma models depending on category.
     */
    private async _fetchRawScores(
        category: LeaderboardCategory,
        _scope: LeaderboardScope,
        period: LeaderboardPeriod
    ): Promise<Array<{ userId: string; value: number }>> {
        const periodStart = getPeriodStart(period);

        switch (category) {
            case 'TOTAL_XP': {
                const stats = await prisma.userStats.findMany({
                    select: { userId: true, xp: true },
                    orderBy: { xp: 'desc' },
                });
                return stats.map((s) => ({ userId: s.userId, value: s.xp }));
            }

            case 'CHALLENGE_COMPLETION': {
                // Count completed challenges per user within period
                const groups = await prisma.challenge.groupBy({
                    by: ['userId'],
                    where: {
                        status: 'COMPLETED',
                        ...(periodStart ? { completedAt: { gte: periodStart } } : {}),
                    },
                    _count: { id: true },
                    orderBy: { _count: { id: 'desc' } },
                });
                return groups.map((g) => ({ userId: g.userId, value: g._count.id }));
            }

            case 'ATTENDANCE_RATE': {
                const streaks = await prisma.attendanceStreak.findMany({
                    select: { userId: true, currentStreak: true },
                    orderBy: { currentStreak: 'desc' },
                });
                return streaks.map((s) => ({ userId: s.userId, value: s.currentStreak }));
            }

            // ACADEMIC_PERFORMANCE and SOCIAL_ENGAGEMENT fall back to XP for now
            // (full implementations would query grade/post models)
            case 'ACADEMIC_PERFORMANCE':
            case 'SOCIAL_ENGAGEMENT':
            default: {
                const stats = await prisma.userStats.findMany({
                    select: { userId: true, xp: true },
                    orderBy: { xp: 'desc' },
                });
                return stats.map((s) => ({ userId: s.userId, value: s.xp }));
            }
        }
    }
}

export const leaderboardService = new LeaderboardService();
