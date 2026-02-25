import { currencyService } from './currency.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
    const mPrisma: any = {
        virtualCurrency: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
            update: jest.fn(),
        },
        virtualCurrencyTransaction: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    };
    mPrisma.$transaction = jest.fn((callback) => callback(mPrisma));
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as any;

describe('CurrencyService', () => {
    const userId = 'user-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getBalance', () => {
        it('should return existing balance', async () => {
            prisma.virtualCurrency.findUnique.mockResolvedValue({ userId, balance: 100 });

            const balance = await currencyService.getBalance(userId);

            expect(balance).toBe(100);
            expect(prisma.virtualCurrency.findUnique).toHaveBeenCalledWith({ where: { userId } });
        });

        it('should initialize account if it does not exist', async () => {
            prisma.virtualCurrency.findUnique.mockResolvedValue(null);
            prisma.virtualCurrency.upsert.mockResolvedValue({ userId, balance: 0 });

            const balance = await currencyService.getBalance(userId);

            expect(balance).toBe(0);
            expect(prisma.virtualCurrency.upsert).toHaveBeenCalled();
        });
    });

    describe('credit', () => {
        it('should add amount and log transaction', async () => {
            prisma.virtualCurrency.upsert.mockResolvedValue({ userId, balance: 50 });

            await currencyService.credit({
                userId,
                amount: 50,
                source: 'test'
            });

            expect(prisma.virtualCurrency.upsert).toHaveBeenCalledWith(expect.objectContaining({
                update: { balance: { increment: 50 } }
            }));
            expect(prisma.virtualCurrencyTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ amount: 50, type: 'CREDIT' })
            }));
        });

        it('should throw error for negative credit', async () => {
            await expect(currencyService.credit({ userId, amount: -10, source: 'test' }))
                .rejects.toThrow('Credit amount must be positive');
        });
    });

    describe('debit', () => {
        it('should subtract amount and log transaction', async () => {
            prisma.virtualCurrency.findUnique.mockResolvedValue({ userId, balance: 100 });
            prisma.virtualCurrency.update.mockResolvedValue({ userId, balance: 70 });

            await currencyService.debit({
                userId,
                amount: 30,
                source: 'test'
            });

            expect(prisma.virtualCurrency.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { balance: { decrement: 30 } }
            }));
            expect(prisma.virtualCurrencyTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ amount: -30, type: 'DEBIT' })
            }));
        });

        it('should throw error for insufficient balance', async () => {
            prisma.virtualCurrency.findUnique.mockResolvedValue({ userId, balance: 20 });

            await expect(currencyService.debit({ userId, amount: 30, source: 'test' }))
                .rejects.toThrow('Insufficient balance');
        });
    });
});
