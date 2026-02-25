import { Router, Request, Response } from 'express';
import { unlockableService, UnlockableType } from '../unlockables/unlockable.service';

const router = Router();

/**
 * GET /api/v1/gamification/shop
 * Get full catalog with each item's owned/equipped status for the user.
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const type = req.query.type as UnlockableType | undefined;

        const catalog = await unlockableService.getUnlockables(userId, type);
        res.json({ success: true, data: catalog });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/gamification/shop/owned
 * Get the authenticated user's owned items.
 */
router.get('/owned', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const items = await unlockableService.getUserUnlockables(userId);
        res.json({ success: true, data: items });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/gamification/shop/:id/purchase
 * Purchase a catalog item (deducts coins, checks achievement gate).
 */
router.post('/:id/purchase', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const purchased = await unlockableService.purchaseUnlockable(userId, id);
        res.status(201).json({ success: true, data: purchased });
    } catch (error: any) {
        const status =
            error.message === 'Item not available' ? 404 :
                error.message === 'Item already owned' ? 409 :
                    error.message === 'Insufficient balance' ? 402 :
                        error.message === 'Required achievement not unlocked' ? 403 : 500;
        res.status(status).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/gamification/shop/:id/equip
 * Equip an owned item (auto-unequips other items of the same type).
 */
router.post('/:id/equip', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const equipped = await unlockableService.equipUnlockable(userId, id);
        res.json({ success: true, data: equipped });
    } catch (error: any) {
        const status = error.message === 'Item not owned' ? 403 : 500;
        res.status(status).json({ success: false, error: error.message });
    }
});

export default router;
