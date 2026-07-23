
import { Request, Response } from 'express';
import { NotificationType } from '@prisma/client';
import { sendExpoPushNotifications, isExpoPushToken } from '../utils/expoPush';
import { prisma } from '../lib/prisma';
const ALLOWED_NOTIFICATION_TYPES = new Set<NotificationType>([
    'LIKE',
    'COMMENT',
    'REPLY',
    'FOLLOW',
    'MENTION',
    'SHARE',
    'ANNOUNCEMENT',
    'GRADE_POSTED',
    'ATTENDANCE_MARKED',
    'SKILL_ENDORSED',
    'RECOMMENDATION_RECEIVED',
    'PROJECT_LIKED',
    'ACHIEVEMENT_EARNED',
    'COURSE_ENROLL',
    'ASSIGNMENT_DUE',
    'POLL_RESULT',
]);

const isMobilePushEnabled = (privacySettings: unknown) => {
    const settings = privacySettings && typeof privacySettings === 'object' && !Array.isArray(privacySettings)
        ? privacySettings as Record<string, unknown>
        : {};
    const mobileApp = settings.mobileApp && typeof settings.mobileApp === 'object' && !Array.isArray(settings.mobileApp)
        ? settings.mobileApp as Record<string, unknown>
        : {};

    return mobileApp.pushNotifications !== false;
};

export const registerDeviceToken = async (req: Request, res: Response) => {
    try {
        const authUserId = (req as any).user?.id;
        const { token, platform } = req.body;
        const userId = authUserId || req.body.userId;

        if (!userId || !token) {
            return res.status(400).json({ error: 'userId and token are required' });
        }

        // Validate that it's a valid Expo push token
        if (!isExpoPushToken(token)) {
            console.warn(`⚠️ [Notifications] Non-Expo token received: ${token.substring(0, 20)}...`);
            // Still store it, but log warning
        }

        const deviceToken = await prisma.deviceToken.upsert({
            where: { token },
            update: { userId, platform, updatedAt: new Date() },
            create: { userId, token, platform },
        });

        console.log(`✅ [Notifications] Device token registered for user ${userId} (${platform})`);
        res.json({ message: 'Device token registered', data: deviceToken });
    } catch (error) {
        console.error('Error registering device token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const unregisterDeviceToken = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const { token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ success: false, error: 'token is required' });
        }

        await prisma.deviceToken.deleteMany({
            where: { userId, token },
        });

        res.json({ success: true, message: 'Device token unregistered' });
    } catch (error) {
        console.error('Error unregistering device token:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export const sendNotification = async (req: Request, res: Response) => {
    try {
        const { userId, title, body, data } = req.body;

        if (!userId || !title || !body) {
            return res.status(400).json({ error: 'userId, title, and body are required' });
        }

        const [tokens, user] = await Promise.all([
            prisma.deviceToken.findMany({
                where: { userId },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { privacySettings: true },
            }),
        ]);

        // Filter to only valid Expo push tokens
        const expoTokens = tokens.filter(t => isExpoPushToken(t.token));
        const pushAllowed = isMobilePushEnabled(user?.privacySettings);
        const shouldSendPush = pushAllowed && expoTokens.length > 0;
        const result = shouldSendPush
            ? await sendExpoPushNotifications(
                expoTokens.map(t => ({
                    to: t.token,
                    title,
                    body,
                    data: data || {},
                    sound: 'default' as const,
                    priority: 'high' as const,
                }))
            )
            : { successCount: 0, failureCount: 0, tickets: [] as any[] };

        if (!pushAllowed) {
            console.log(`ℹ️ [Notifications] Push disabled by user preference for ${userId}; storing in-app notification only.`);
        } else if (!shouldSendPush) {
            console.warn(`⚠️ [Notifications] No valid Expo push tokens for user ${userId}; storing in-app notification only.`);
        }

        const rawType = typeof data?.type === 'string' ? (data.type as NotificationType) : 'ANNOUNCEMENT';
        const notificationType: NotificationType = ALLOWED_NOTIFICATION_TYPES.has(rawType) ? rawType : 'ANNOUNCEMENT';

        // Save notification to database for history
        await prisma.notification.create({
            data: {
                recipientId: userId,
                type: notificationType,
                title,
                message: body,
                link: typeof data?.link === 'string' ? data.link : undefined,
                postId: typeof data?.postId === 'string' ? data.postId : undefined,
                commentId: typeof data?.commentId === 'string' ? data.commentId : undefined,
                actorId: typeof data?.actorId === 'string' ? data.actorId : undefined,
                isRead: false,
            },
        });

        // Handle failed tokens (cleanup invalid ones)
        if (shouldSendPush && result.failureCount > 0) {
            const failedTickets = result.tickets.filter(t => t.status === 'error');
            for (let i = 0; i < failedTickets.length; i++) {
                const ticket = failedTickets[i];
                if (ticket.details?.error === 'DeviceNotRegistered') {
                    // Token is no longer valid, remove it
                    const failedToken = expoTokens[i]?.token;
                    if (failedToken) {
                        await prisma.deviceToken.deleteMany({
                            where: { token: failedToken },
                        });
                        console.log(`🗑️ [Notifications] Removed invalid token: ${failedToken.substring(0, 25)}...`);
                    }
                }
            }
        }

        res.json({
            message: 'Notification sent',
            successCount: result.successCount,
            failureCount: result.failureCount,
            pushSent: shouldSendPush,
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
