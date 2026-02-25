import { unlockableService } from './unlockable.service';
import { PrismaClient } from '@prisma/client';
import { currencyService } from '../currency/currency.service';

jest.mock('@prisma/client', () => {
    const mPrisma: any = {
        unlockable: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        userUnlockable: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        userAchievementProgress: {
            findUnique: jest.fn(),
        },
    };
    mPrisma.$transaction = jest.fn((cb) => cb(mPrisma));
    return { PrismaClient: jest.fn(() => mPrisma) };
});

jest.mock('../currency/currency.service', () => ({
    currencyService: {
        debit: jest.fn(),
    },
}));

const prisma = new PrismaClient() as any;

describe('UnlockableService', () => {
    const userId = 'user-1';
    const itemId = 'item-1';

    beforeEach(() => jest.clearAllMocks());

    describe('purchaseUnlockable', () => {
        it('should purchase item with sufficient balance and no achievement requirement', async () => {
            prisma.unlockable.findUnique.mockResolvedValue({
                id: itemId, cost: 100, isActive: true, requiredAchievementId: null,
            });
            prisma.userUnlockable.findUnique.mockResolvedValue(null); // not owned
            prisma.userUnlockable.create.mockResolvedValue({ userId, unlockableId: itemId });

            await unlockableService.purchaseUnlockable(userId, itemId);

            expect(currencyService.debit).toHaveBeenCalledWith(
                expect.objectContaining({ userId, amount: 100, source: 'shop_purchase' })
            );
            expect(prisma.userUnlockable.create).toHaveBeenCalled();
        });

        it('should reject if item is already owned', async () => {
            prisma.unlockable.findUnique.mockResolvedValue({
                id: itemId, cost: 100, isActive: true, requiredAchievementId: null,
            });
            prisma.userUnlockable.findUnique.mockResolvedValue({ userId, unlockableId: itemId });

            await expect(unlockableService.purchaseUnlockable(userId, itemId))
                .rejects.toThrow('Item already owned');
        });

        it('should reject if required achievement is not unlocked', async () => {
            prisma.unlockable.findUnique.mockResolvedValue({
                id: itemId, cost: 100, isActive: true, requiredAchievementId: 'ach-1',
            });
            prisma.userUnlockable.findUnique.mockResolvedValue(null);
            prisma.userAchievementProgress.findUnique.mockResolvedValue({ isUnlocked: false });

            await expect(unlockableService.purchaseUnlockable(userId, itemId))
                .rejects.toThrow('Required achievement not unlocked');
        });

        it('should succeed if required achievement is unlocked', async () => {
            prisma.unlockable.findUnique.mockResolvedValue({
                id: itemId, cost: 50, isActive: true, requiredAchievementId: 'ach-1',
            });
            prisma.userUnlockable.findUnique.mockResolvedValue(null);
            prisma.userAchievementProgress.findUnique.mockResolvedValue({ isUnlocked: true });
            prisma.userUnlockable.create.mockResolvedValue({ userId, unlockableId: itemId });

            await unlockableService.purchaseUnlockable(userId, itemId);

            expect(currencyService.debit).toHaveBeenCalled();
        });

        it('should reject if item is not available', async () => {
            prisma.unlockable.findUnique.mockResolvedValue(null);

            await expect(unlockableService.purchaseUnlockable(userId, itemId))
                .rejects.toThrow('Item not available');
        });
    });

    describe('equipUnlockable', () => {
        it('should equip a owned item', async () => {
            prisma.userUnlockable.findUnique.mockResolvedValue({
                userId, unlockableId: itemId, unlockable: { type: 'AVATAR', id: itemId },
            });
            prisma.userUnlockable.updateMany.mockResolvedValue({ count: 1 });
            prisma.userUnlockable.update.mockResolvedValue({
                userId, unlockableId: itemId, isEquipped: true,
            });

            const result = await unlockableService.equipUnlockable(userId, itemId);

            expect(prisma.userUnlockable.updateMany).toHaveBeenCalled(); // unequip others
            expect(prisma.userUnlockable.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { isEquipped: true } })
            );
        });

        it('should reject if item not owned', async () => {
            prisma.userUnlockable.findUnique.mockResolvedValue(null);

            await expect(unlockableService.equipUnlockable(userId, itemId))
                .rejects.toThrow('Item not owned');
        });
    });
});
