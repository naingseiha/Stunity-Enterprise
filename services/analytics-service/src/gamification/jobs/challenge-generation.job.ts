import { PrismaClient } from '@prisma/client';
import { challengeService } from '../challenges/challenge.service';

const prisma = new PrismaClient();

const BATCH_SIZE = 1000;

/**
 * Runs daily at 00:00 UTC.
 * Generates 3 daily challenges for every active user in batches.
 */
export async function runDailyChallengeGeneration() {
    console.log('🎯 [JOB] Starting daily challenge generation...');
    let skip = 0;
    let totalGenerated = 0;

    while (true) {
        const users = await prisma.userStats.findMany({
            select: { userId: true },
            take: BATCH_SIZE,
            skip,
        });

        if (users.length === 0) break;

        const results = await Promise.allSettled(
            users.map((u) => challengeService.generateDailyChallenges(u.userId))
        );

        const generated = results.filter((r) => r.status === 'fulfilled').length;
        totalGenerated += generated;
        skip += BATCH_SIZE;

        console.log(`🎯 [JOB] Processed batch of ${users.length} users, generated: ${generated}`);
    }

    console.log(`✅ [JOB] Daily challenge generation complete. Total: ${totalGenerated}`);
    return totalGenerated;
}

/**
 * Runs every Monday at 00:00 UTC.
 * Generates 5 weekly challenges for every active user in batches.
 */
export async function runWeeklyChallengeGeneration() {
    console.log('📅 [JOB] Starting weekly challenge generation...');
    let skip = 0;
    let totalGenerated = 0;

    while (true) {
        const users = await prisma.userStats.findMany({
            select: { userId: true },
            take: BATCH_SIZE,
            skip,
        });

        if (users.length === 0) break;

        const results = await Promise.allSettled(
            users.map((u) => challengeService.generateWeeklyChallenges(u.userId))
        );

        const generated = results.filter((r) => r.status === 'fulfilled').length;
        totalGenerated += generated;
        skip += BATCH_SIZE;

        console.log(`📅 [JOB] Processed batch of ${users.length} users, generated: ${generated}`);
    }

    console.log(`✅ [JOB] Weekly challenge generation complete. Total: ${totalGenerated}`);
    return totalGenerated;
}
