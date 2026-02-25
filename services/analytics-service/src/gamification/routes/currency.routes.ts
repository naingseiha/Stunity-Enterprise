import { Router, Request, Response } from 'express';
import { currencyService } from '../currency/currency.service';

const router = Router();

/**
 * GET /api/v1/gamification/currency
 * Get current balance and recent transactions
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const balance = await currencyService.getBalance(userId);
        const transactions = await currencyService.getTransactionHistory(userId, 10);

        res.json({
            success: true,
            data: {
                balance,
                recentTransactions: transactions
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/gamification/currency/transactions
 * Get full transaction history (paginated)
 */
router.get('/transactions', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const transactions = await currencyService.getTransactionHistory(userId, limit, offset);

        res.json({
            success: true,
            data: transactions
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
