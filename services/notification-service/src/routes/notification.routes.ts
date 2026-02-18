
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { registerDeviceToken, sendNotification } from '../controllers/notification.controller';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Existing routes
router.post('/device-token', registerDeviceToken);
router.post('/send', sendNotification);

// GET /notifications - Get notifications for authenticated user
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const notifications = await prisma.notification.findMany({
            where: { recipientId: userId },
            include: {
                actor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        profilePictureUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const formatted = notifications.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.message,
            data: { link: n.link, postId: n.postId, commentId: n.commentId },
            isRead: n.isRead,
            actor: n.actor ? {
                id: n.actor.id,
                firstName: n.actor.firstName,
                lastName: n.actor.lastName,
                profilePictureUrl: n.actor.profilePictureUrl,
            } : undefined,
            createdAt: n.createdAt.toISOString(),
        }));

        res.json({ success: true, data: formatted });
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
});

// PATCH /notifications/:id/read - Mark notification as read
router.patch('/:id/read', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        await prisma.notification.updateMany({
            where: { id, recipientId: userId },
            data: { isRead: true, readAt: new Date() },
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
});

// POST /notifications/read-all - Mark all notifications as read
router.post('/read-all', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        await prisma.notification.updateMany({
            where: { recipientId: userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, error: 'Failed to mark all as read' });
    }
});

// DELETE /notifications/:id - Delete a notification
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        await prisma.notification.deleteMany({
            where: { id, recipientId: userId },
        });

        res.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
});

export default router;
