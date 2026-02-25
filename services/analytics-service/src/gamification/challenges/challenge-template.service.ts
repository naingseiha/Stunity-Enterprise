import { PrismaClient, ChallengeType, ChallengeDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTemplateInput {
    type: ChallengeType;
    difficulty: ChallengeDifficulty;
    name: string;
    description: string;
    targetValue: number;
    xpReward: number;
    coinReward: number;
    criteria: Record<string, unknown>;
    weight?: number;
}

export interface TemplateFilters {
    type?: ChallengeType;
    difficulty?: ChallengeDifficulty;
    isActive?: boolean;
}

export class ChallengeTemplateService {
    /**
     * Create a new reusable challenge template
     */
    async createTemplate(data: CreateTemplateInput) {
        return await prisma.challengeTemplate.create({
            data: {
                ...data,
                weight: data.weight ?? 1,
                isActive: true,
            },
        });
    }

    /**
     * Retrieve templates by filters
     */
    async getTemplates(filters: TemplateFilters = {}) {
        return await prisma.challengeTemplate.findMany({
            where: {
                type: filters.type,
                difficulty: filters.difficulty,
                isActive: filters.isActive ?? true,
            },
            orderBy: { weight: 'desc' },
        });
    }

    /**
     * Get templates appropriate for a user, excluding types they already
     * have an active challenge for in the current period.
     */
    async getActiveTemplates(userId: string, type: ChallengeType) {
        // Fetch templates matching the type
        const templates = await prisma.challengeTemplate.findMany({
            where: { type, isActive: true },
            orderBy: { weight: 'desc' },
        });

        // Find template IDs already assigned as active challenges for this user
        const activeChallenges = await prisma.challenge.findMany({
            where: {
                userId,
                status: 'ACTIVE',
                template: { type },
            },
            select: { templateId: true },
        });

        const usedTemplateIds = new Set(activeChallenges.map((c) => c.templateId));

        return templates.filter((t) => !usedTemplateIds.has(t.id));
    }

    /**
     * Weighted random selection from a list of templates
     */
    selectWeighted(templates: Array<{ id: string; weight: number }>, count: number) {
        const selected: typeof templates = [];
        const pool = [...templates];

        for (let i = 0; i < count && pool.length > 0; i++) {
            const totalWeight = pool.reduce((sum, t) => sum + t.weight, 0);
            let rand = Math.random() * totalWeight;

            const idx = pool.findIndex((t) => {
                rand -= t.weight;
                return rand <= 0;
            });

            const pick = idx >= 0 ? idx : 0;
            selected.push(pool[pick]);
            pool.splice(pick, 1);
        }

        return selected;
    }
}

export const challengeTemplateService = new ChallengeTemplateService();
