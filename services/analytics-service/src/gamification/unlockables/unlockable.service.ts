import { PrismaClient } from '@prisma/client';
import { currencyService } from '../currency/currency.service';

const prisma = new PrismaClient();

export type UnlockableType = 'AVATAR' | 'THEME' | 'BADGE_FRAME' | 'PROFILE_EFFECT';

export interface CreateUnlockableInput {
    name: string;
    description: string;
    type: UnlockableType;
    cost: number;
    imageUrl?: string;
    requiredAchievementId?: string;
    isActive?: boolean;
}

export class UnlockableService {
    /**
     * Create a new catalog item.
     */
    async createUnlockable(data: CreateUnlockableInput) {
        return await prisma.unlockable.create({
            data: { ...data, isActive: data.isActive ?? true },
        });
    }

    /**
     * Get full catalog with ownership status for a user.
     */
    async getUnlockables(userId: string, type?: UnlockableType) {
        const [unlockables, owned] = await Promise.all([
            prisma.unlockable.findMany({
                where: { isActive: true, ...(type ? { type } : {}) },
                orderBy: { cost: 'asc' },
            }),
            prisma.userUnlockable.findMany({
                where: { userId },
                select: { unlockableId: true, isEquipped: true },
            }),
        ]);

        const ownedMap = new Map(owned.map((o) => [o.unlockableId, o]));

        return unlockables.map((u) => {
            const ownership = ownedMap.get(u.id);
            return {
                ...u,
                isOwned: !!ownership,
                isEquipped: ownership?.isEquipped ?? false,
            };
        });
    }

    /**
     * Get items owned by a user.
     */
    async getUserUnlockables(userId: string) {
        return await prisma.userUnlockable.findMany({
            where: { userId },
            include: { unlockable: true },
        });
    }

    /**
     * Purchase an unlockable item.
     * Validates: sufficient balance, achievement requirement met, no duplicate purchase.
     */
    async purchaseUnlockable(userId: string, unlockableId: string) {
        const item = await prisma.unlockable.findUnique({ where: { id: unlockableId } });
        if (!item || !item.isActive) throw new Error('Item not available');

        // Check for duplicate purchase
        const existing = await prisma.userUnlockable.findUnique({
            where: { userId_unlockableId: { userId, unlockableId } },
        });
        if (existing) throw new Error('Item already owned');

        // Check achievement requirement
        if (item.requiredAchievementId) {
            const progress = await prisma.userAchievementProgress.findUnique({
                where: { userId_achievementId: { userId, achievementId: item.requiredAchievementId } },
            });
            if (!progress?.isUnlocked) {
                throw new Error('Required achievement not unlocked');
            }
        }

        // Debit balance (throws if insufficient)
        await currencyService.debit({
            userId,
            amount: item.cost,
            source: 'shop_purchase',
            sourceId: unlockableId,
        });

        // Grant ownership
        return await prisma.userUnlockable.create({
            data: { userId, unlockableId, isEquipped: false },
            include: { unlockable: true },
        });
    }

    /**
     * Equip an owned unlockable. Unequips other items of the same type.
     */
    async equipUnlockable(userId: string, unlockableId: string) {
        // Verify ownership
        const owned = await prisma.userUnlockable.findUnique({
            where: { userId_unlockableId: { userId, unlockableId } },
            include: { unlockable: true },
        });
        if (!owned) throw new Error('Item not owned');

        const itemType = owned.unlockable.type;

        // Unequip all other items of the same type, then equip this one
        return await prisma.$transaction(async (tx) => {
            await tx.userUnlockable.updateMany({
                where: {
                    userId,
                    isEquipped: true,
                    unlockable: { type: itemType },
                },
                data: { isEquipped: false },
            });

            return await tx.userUnlockable.update({
                where: { userId_unlockableId: { userId, unlockableId } },
                data: { isEquipped: true },
                include: { unlockable: true },
            });
        });
    }
}

export const unlockableService = new UnlockableService();
