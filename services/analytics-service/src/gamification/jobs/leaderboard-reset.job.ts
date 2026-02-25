import { PrismaClient } from '@prisma/client';
import { leaderboardService, LeaderboardCategory } from '../leaderboards/leaderboard.service';
import { leaderboardCache } from '../leaderboards/leaderboard.cache';
import { currencyService } from '../currency/currency.service';

const prisma = new PrismaClient();

const CATEGORIES: LeaderboardCategory[] = [
    'TOTAL_XP',
    'ACADEMIC_PERFORMANCE',
    'SOCIAL_ENGAGEMENT',
    'ATTENDANCE_RATE',
    'CHALLENGE_COMPLETION',
];

const TOP_PERFORMER_BONUS = 100; // coins awarded to top-10 finishers

/**
 * Archive the current leaderboard snapshot and award top-10 bonuses.
 * Called before any period reset.
 */
async function archiveAndAward(period: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
    for (const category of CATEGORIES) {
        const snapshot = await leaderboardService.getLeaderboardEntries(
            category,
            'SCHOOL_WIDE',
            period,
            200 // top 200 entries
        );

        // Store snapshot in Leaderboard model
        await prisma.leaderboard.create({
            data: {
                category,
                scope: 'SCHOOL_WIDE',
                period,
                periodStart: new Date(),
                entries: snapshot.entries as any,
            },
        });

        // Award top-10 performers
        const topTen = snapshot.entries.filter((e) => e.rank <= 10);
        await Promise.allSettled(
            topTen.map((e) =>
                currencyService.credit({
                    userId: e.userId,
                    amount: TOP_PERFORMER_BONUS,
                    source: `${period.toLowerCase()}_leaderboard_top10`,
                })
            )
        );

        console.log(`📊 [JOB] Archived ${period} leaderboard for ${category}, awarded ${topTen.length} top performers`);
    }
}

/**
 * Daily leaderboard reset (00:00 UTC).
 * Archives the daily leaderboard and clears the cache.
 */
export async function runDailyLeaderboardReset() {
    console.log('📊 [JOB] Running daily leaderboard reset...');
    await archiveAndAward('DAILY');
    await leaderboardCache.invalidate('leaderboard:');
    console.log('✅ [JOB] Daily leaderboard reset complete.');
}

/**
 * Weekly leaderboard reset (Monday 00:00 UTC).
 * Archives the weekly leaderboard and clears the cache.
 */
export async function runWeeklyLeaderboardReset() {
    console.log('📊 [JOB] Running weekly leaderboard reset...');
    await archiveAndAward('WEEKLY');
    await leaderboardCache.invalidate('leaderboard:');
    console.log('✅ [JOB] Weekly leaderboard reset complete.');
}

/**
 * Monthly leaderboard reset (1st of month 00:00 UTC).
 * Archives the monthly leaderboard and clears the cache.
 */
export async function runMonthlyLeaderboardReset() {
    console.log('📊 [JOB] Running monthly leaderboard reset...');
    await archiveAndAward('MONTHLY');
    await leaderboardCache.invalidate('leaderboard:');
    console.log('✅ [JOB] Monthly leaderboard reset complete.');
}
