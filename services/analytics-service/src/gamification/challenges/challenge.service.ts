import { PrismaClient, ChallengeType, ChallengeStatus, ChallengeDifficulty } from '@prisma/client';
import { currencyService } from '../currency/currency.service';
import { challengeTemplateService } from './challenge-template.service';

const prisma = new PrismaClient();

// Reward amounts by difficulty
export const DIFFICULTY_COIN_REWARD: Record<ChallengeDifficulty, number> = {
    EASY: 100,
    MEDIUM: 250,
    HARD: 500,
};

// Streak bonuses
const DAILY_STREAK_BONUS = 50;
const WEEKLY_STREAK_BONUS = 1000;

// How many challenges to generate per period
const DAILY_CHALLENGE_COUNT = 3;
const WEEKLY_CHALLENGE_COUNT = 5;

export class ChallengeService {
    /**
     * Generate 3 daily challenges for a user (idempotent within same day)
     */
    async generateDailyChallenges(userId: string) {
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setUTCHours(24, 0, 0, 0); // midnight UTC next day

        // Check how many active daily challenges already exist
        const existing = await prisma.challenge.count({
            where: { userId, status: 'ACTIVE', template: { type: 'DAILY' } },
        });

        if (existing >= DAILY_CHALLENGE_COUNT) return [];

        const needed = DAILY_CHALLENGE_COUNT - existing;
        const availableTemplates = await challengeTemplateService.getActiveTemplates(userId, 'DAILY');
        const selected = challengeTemplateService.selectWeighted(availableTemplates, needed);

        if (selected.length === 0) return [];

        const created = await Promise.all(
            selected.map((t) =>
                prisma.challenge.create({
                    data: { userId, templateId: t.id, status: 'ACTIVE', expiresAt },
                })
            )
        );

        return created;
    }

    /**
     * Generate 5 weekly challenges for a user (idempotent within same week)
     */
    async generateWeeklyChallenges(userId: string) {
        const now = new Date();
        const expiresAt = new Date(now);
        // Next Monday 00:00 UTC
        const dayOfWeek = now.getUTCDay(); // 0=Sun..6=Sat
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        expiresAt.setUTCDate(now.getUTCDate() + daysUntilMonday);
        expiresAt.setUTCHours(0, 0, 0, 0);

        const existing = await prisma.challenge.count({
            where: { userId, status: 'ACTIVE', template: { type: 'WEEKLY' } },
        });

        if (existing >= WEEKLY_CHALLENGE_COUNT) return [];

        const needed = WEEKLY_CHALLENGE_COUNT - existing;
        const availableTemplates = await challengeTemplateService.getActiveTemplates(userId, 'WEEKLY');
        const selected = challengeTemplateService.selectWeighted(availableTemplates, needed);

        if (selected.length === 0) return [];

        const created = await Promise.all(
            selected.map((t) =>
                prisma.challenge.create({
                    data: { userId, templateId: t.id, status: 'ACTIVE', expiresAt },
                })
            )
        );

        return created;
    }

    /**
     * Monotonically update progress for a challenge.
     * Auto-completes when progress reaches template targetValue.
     */
    async updateProgress(challengeId: string, userId: string, increment: number) {
        if (increment <= 0) throw new Error('Increment must be positive');

        const challenge = await prisma.challenge.findFirst({
            where: { id: challengeId, userId, status: 'ACTIVE' },
            include: { template: true },
        });

        if (!challenge) throw new Error('Active challenge not found');
        if (new Date() > challenge.expiresAt) throw new Error('Challenge has expired');

        const newProgress = challenge.progress + increment;

        if (newProgress >= challenge.template.targetValue) {
            return await this.completeChallenge(challenge, userId);
        }

        return await prisma.challenge.update({
            where: { id: challengeId },
            data: { progress: newProgress },
        });
    }

    /**
     * Mark challenge complete and award rewards. Check for streak bonuses.
     */
    private async completeChallenge(challenge: any, userId: string) {
        return await prisma.$transaction(async (tx) => {
            // Mark complete
            const completed = await tx.challenge.update({
                where: { id: challenge.id },
                data: {
                    progress: challenge.template.targetValue,
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });

            // Award tiered coin reward
            const coinReward =
                challenge.template.coinReward ||
                DIFFICULTY_COIN_REWARD[challenge.template.difficulty as ChallengeDifficulty];

            await currencyService.credit({
                userId,
                amount: coinReward,
                source: 'challenge',
                sourceId: challenge.id,
            });

            // Award XP
            if (challenge.template.xpReward > 0) {
                await tx.userStats.upsert({
                    where: { userId },
                    update: { xp: { increment: challenge.template.xpReward } },
                    create: { userId, xp: challenge.template.xpReward, level: 1 },
                });
            }

            // Check for streak bonus
            await this._checkAndAwardStreakBonus(userId, challenge.template.type, tx);

            return completed;
        });
    }

    /**
     * Check if all challenges of a type are completed and award streak bonus.
     */
    private async _checkAndAwardStreakBonus(userId: string, type: string, tx: any) {
        const total = type === 'DAILY' ? DAILY_CHALLENGE_COUNT : WEEKLY_CHALLENGE_COUNT;
        const bonus = type === 'DAILY' ? DAILY_STREAK_BONUS : WEEKLY_STREAK_BONUS;

        const completedCount = await tx.challenge.count({
            where: { userId, status: 'COMPLETED', template: { type } },
        });

        if (completedCount === total) {
            await currencyService.credit({
                userId,
                amount: bonus,
                source: `${type.toLowerCase()}_streak_bonus`,
            });
        }
    }

    /**
     * Get user's challenges with optional filters
     */
    async getUserChallenges(
        userId: string,
        type?: ChallengeType,
        status?: ChallengeStatus
    ) {
        return await prisma.challenge.findMany({
            where: {
                userId,
                status: status ?? undefined,
                template: type ? { type } : undefined,
            },
            include: { template: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Batch expire all challenges past their deadline.
     * Designed to run hourly.
     */
    async expireChallenges() {
        const result = await prisma.challenge.updateMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lte: new Date() },
            },
            data: { status: 'EXPIRED' },
        });

        return result.count;
    }
}

export const challengeService = new ChallengeService();
