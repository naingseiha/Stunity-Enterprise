import * as fc from 'fast-check';
import { currencyService } from './currency.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
    const mPrisma: any = {
        virtualCurrency: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        virtualCurrencyTransaction: {
            create: jest.fn(),
        },
    };
    mPrisma.$transaction = jest.fn((callback) => callback(mPrisma));
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as any;

describe('CurrencyService Property Tests', () => {
    const userId = 'user-prop-test';

    it('balance should equal sum of transactions (Invariant)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(fc.integer({ min: 1, max: 1000 })),
                async (amounts) => {
                    let expectedBalance = 0;
                    let currentBalance = 0;

                    // Reset mocks for each property run
                    jest.clearAllMocks();

                    // Setup mock behaviors
                    prisma.virtualCurrency.findUnique.mockImplementation(() => ({ userId, balance: currentBalance }));
                    prisma.virtualCurrency.upsert.mockImplementation((args: any) => {
                        const inc = args.update.balance.increment || 0;
                        currentBalance += inc;
                        return { userId, balance: currentBalance };
                    });
                    prisma.virtualCurrency.update.mockImplementation((args: any) => {
                        const dec = args.data.balance.decrement || 0;
                        currentBalance -= dec;
                        return { userId, balance: currentBalance };
                    });

                    // Run a sequence of random credits
                    for (const amount of amounts) {
                        await currencyService.credit({ userId, amount, source: 'prop-test' });
                        expectedBalance += amount;
                    }

                    expect(currentBalance).toBe(expectedBalance);
                }
            ),
            { numRuns: 20 }
        );
    });
});
