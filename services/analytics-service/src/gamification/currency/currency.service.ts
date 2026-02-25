import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TransactionOptions {
    userId: string;
    amount: number;
    source: string;
    sourceId?: string;
}

export class CurrencyService {
    /**
     * Get user's current balance
     */
    async getBalance(userId: string): Promise<number> {
        const currency = await prisma.virtualCurrency.findUnique({
            where: { userId }
        });

        if (!currency) {
            // If no currency record exists, initialize it
            const newCurrency = await this.initializeAccount(userId);
            return newCurrency.balance;
        }

        return currency.balance;
    }

    /**
     * Initialize a new currency account for a user
     */
    async initializeAccount(userId: string) {
        return await prisma.virtualCurrency.upsert({
            where: { userId },
            update: {},
            create: {
                userId,
                balance: 0
            }
        });
    }

    /**
     * Credit currency to a user (add)
     */
    async credit({ userId, amount, source, sourceId }: TransactionOptions) {
        if (amount <= 0) {
            throw new Error('Credit amount must be positive');
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Update or create balance
            const currency = await tx.virtualCurrency.upsert({
                where: { userId },
                update: {
                    balance: { increment: amount }
                },
                create: {
                    userId,
                    balance: amount
                }
            });

            // 2. Log transaction
            await tx.virtualCurrencyTransaction.create({
                data: {
                    userId,
                    amount,
                    type: 'CREDIT',
                    source,
                    sourceId
                }
            });

            return currency;
        });
    }

    /**
     * Debit currency from a user (subtract)
     */
    async debit({ userId, amount, source, sourceId }: TransactionOptions) {
        if (amount <= 0) {
            throw new Error('Debit amount must be positive');
        }

        return await prisma.$transaction(async (tx) => {
            // 1. Check current balance with row-level lock (if supported by DB, 
            // otherwise Prisma transaction isolation helps)
            const currency = await tx.virtualCurrency.findUnique({
                where: { userId }
            });

            if (!currency || currency.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // 2. Perform debit
            const updatedCurrency = await tx.virtualCurrency.update({
                where: { userId },
                data: {
                    balance: { decrement: amount }
                }
            });

            // 3. Log transaction
            await tx.virtualCurrencyTransaction.create({
                data: {
                    userId,
                    amount: -amount, // Store negative for debits or use type to differentiate
                    type: 'DEBIT',
                    source,
                    sourceId
                }
            });

            return updatedCurrency;
        });
    }

    /**
     * Get paginated transaction history
     */
    async getTransactionHistory(userId: string, limit = 20, offset = 0) {
        return await prisma.virtualCurrencyTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
    }
}

export const currencyService = new CurrencyService();
