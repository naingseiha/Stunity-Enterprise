import { PrismaClient, TeamChallengeStatus } from '@prisma/client';
import { currencyService } from '../currency/currency.service';

const prisma = new PrismaClient();

const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 50;

export interface CreateTeamChallengeInput {
    creatorId: string;
    name: string;
    description: string;
    targetValue: number;
    deadline: Date;
    participantIds: string[];
    xpReward: number;
    coinReward: number;
}

export class TeamChallengeService {
    /**
     * Create a new team challenge.
     * Validates participant count (2-50) and creates participation records.
     */
    async createTeamChallenge(input: CreateTeamChallengeInput) {
        const { creatorId, participantIds, ...rest } = input;

        // Always include the creator
        const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]));
        const count = allParticipantIds.length;

        if (count < MIN_PARTICIPANTS) {
            throw new Error(`Team challenge requires at least ${MIN_PARTICIPANTS} participants`);
        }
        if (count > MAX_PARTICIPANTS) {
            throw new Error(`Team challenge cannot have more than ${MAX_PARTICIPANTS} participants`);
        }

        return await prisma.$transaction(async (tx) => {
            const challenge = await tx.teamChallenge.create({
                data: {
                    ...rest,
                    status: 'PENDING',
                    currentValue: 0,
                    participants: {
                        create: allParticipantIds.map((userId) => ({ userId, contribution: 0 })),
                    },
                },
                include: { participants: true },
            });

            return challenge;
        });
    }

    /**
     * Add a contribution from a participant.
     * Automatically completes the challenge if target is reached.
     */
    async contribute(challengeId: string, userId: string, amount: number) {
        if (amount <= 0) throw new Error('Contribution must be positive');

        return await prisma.$transaction(async (tx) => {
            // Verify participant belongs to this challenge
            const participant = await tx.teamChallengeParticipant.findUnique({
                where: { teamChallengeId_userId: { teamChallengeId: challengeId, userId } },
            });

            if (!participant) throw new Error('Not a participant in this challenge');

            const challenge = await tx.teamChallenge.findUnique({
                where: { id: challengeId },
                include: { participants: true },
            });

            if (!challenge || challenge.status === 'EXPIRED') {
                throw new Error('Challenge is not active');
            }

            if (new Date() > challenge.deadline) {
                await tx.teamChallenge.update({ where: { id: challengeId }, data: { status: 'EXPIRED' } });
                throw new Error('Challenge deadline has passed');
            }

            // Update participant contribution
            await tx.teamChallengeParticipant.update({
                where: { teamChallengeId_userId: { teamChallengeId: challengeId, userId } },
                data: { contribution: { increment: amount } },
            });

            // Update team total
            const newTotal = challenge.currentValue + amount;
            const isComplete = newTotal >= challenge.targetValue;

            const updatedChallenge = await tx.teamChallenge.update({
                where: { id: challengeId },
                data: {
                    currentValue: newTotal,
                    status: isComplete ? 'COMPLETED' : 'ACTIVE',
                    ...(isComplete ? { completedAt: new Date() } : {}),
                },
                include: { participants: true },
            });

            if (isComplete) {
                await this._distributeRewards(updatedChallenge, tx);
            }

            return updatedChallenge;
        });
    }

    /**
     * Distribute proportional rewards to all participants based on their contribution.
     */
    private async _distributeRewards(challenge: any, tx: any) {
        const totalContribution = challenge.participants.reduce(
            (sum: number, p: any) => sum + p.contribution,
            0
        );

        if (totalContribution === 0) return;

        for (const participant of challenge.participants) {
            const percentage = participant.contribution / totalContribution;
            const coinShare = Math.floor(challenge.coinReward * percentage);
            const xpShare = Math.floor(challenge.xpReward * percentage);

            if (coinShare > 0) {
                await currencyService.credit({
                    userId: participant.userId,
                    amount: coinShare,
                    source: 'team_challenge',
                    sourceId: challenge.id,
                });
            }

            if (xpShare > 0) {
                await tx.userStats.upsert({
                    where: { userId: participant.userId },
                    update: { xp: { increment: xpShare } },
                    create: { userId: participant.userId, xp: xpShare, level: 1 },
                });
            }
        }
    }

    /**
     * Get a team challenge with full participant breakdown.
     */
    async getTeamChallenge(challengeId: string) {
        const challenge = await prisma.teamChallenge.findUnique({
            where: { id: challengeId },
            include: { participants: true },
        });

        if (!challenge) throw new Error('Team challenge not found');

        const totalContribution = challenge.participants.reduce(
            (sum, p) => sum + p.contribution,
            0
        );

        return {
            ...challenge,
            percentageComplete:
                challenge.targetValue > 0
                    ? Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
                    : 0,
            participants: challenge.participants.map((p) => ({
                ...p,
                contributionPercentage:
                    totalContribution > 0
                        ? Math.round((p.contribution / totalContribution) * 100)
                        : 0,
            })),
        };
    }

    /**
   * Get a user's team challenges, optionally filtered by status.
   */
    async getUserTeamChallenges(userId: string, status?: TeamChallengeStatus) {
        const participations = await prisma.teamChallengeParticipant.findMany({
            where: { userId },
            include: {
                teamChallenge: {
                    include: { participants: true },
                },
            },
        });

        const challenges = participations.map((p) => p.teamChallenge);
        return status ? challenges.filter((c) => c.status === status) : challenges;
    }

    /**
     * Reconcile team progress: sum all participant contributions and check for completions.
     * Designed to run every 15 minutes as a background job.
     */
    async reconcileTeamProgress() {
        const activeChallenges = await prisma.teamChallenge.findMany({
            where: { status: 'ACTIVE' },
            include: { participants: true },
        });

        let completed = 0;
        let expired = 0;

        for (const challenge of activeChallenges) {
            // Check deadline
            if (new Date() > challenge.deadline) {
                await prisma.teamChallenge.update({
                    where: { id: challenge.id },
                    data: { status: 'EXPIRED' },
                });
                expired++;
                continue;
            }

            // Recalculate total from participants
            const total = challenge.participants.reduce((sum, p) => sum + p.contribution, 0);

            if (total !== challenge.currentValue) {
                const isComplete = total >= challenge.targetValue;
                const updated = await prisma.teamChallenge.update({
                    where: { id: challenge.id },
                    data: {
                        currentValue: total,
                        status: isComplete ? 'COMPLETED' : 'ACTIVE',
                        ...(isComplete ? { completedAt: new Date() } : {}),
                    },
                    include: { participants: true },
                });

                if (isComplete) {
                    await this._distributeRewards(updated, prisma);
                    completed++;
                }
            }
        }

        console.log(`🔄 [TeamChallengeSync] Reconciled: ${completed} completed, ${expired} expired`);
        return { completed, expired };
    }
}

export const teamChallengeService = new TeamChallengeService();
