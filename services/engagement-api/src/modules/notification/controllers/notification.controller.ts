
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
    'MESSAGE',
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
    'SYSTEM',
]);

type NotificationData = Record<string, unknown>;

interface DeliverNotificationInput {
    userId: string;
    title: string;
    body: string;
    data?: NotificationData;
}

interface NotificationDeliveryResult {
    successCount: number;
    failureCount: number;
    pushSent: boolean;
}

const isMobilePushEnabled = (privacySettings: unknown) => {
    const settings = privacySettings && typeof privacySettings === 'object' && !Array.isArray(privacySettings)
        ? privacySettings as Record<string, unknown>
        : {};
    const mobileApp = settings.mobileApp && typeof settings.mobileApp === 'object' && !Array.isArray(settings.mobileApp)
        ? settings.mobileApp as Record<string, unknown>
        : {};

    return mobileApp.pushNotifications !== false;
};

const stringValue = (value: unknown) => typeof value === 'string' ? value : undefined;

/**
 * Persists an in-app notification first, then best-effort delivers Expo push.
 * Callers in sibling engagement modules can use this without making a
 * service-to-service HTTP request inside the consolidated API.
 */
export const deliverNotification = async ({
    userId,
    title,
    body,
    data = {},
}: DeliverNotificationInput): Promise<NotificationDeliveryResult> => {
    const payloadData: NotificationData =
        data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    const [tokens, user] = await Promise.all([
        prisma.deviceToken.findMany({
            where: { userId },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { privacySettings: true },
        }),
    ]);

    const rawType = stringValue(payloadData.type) as NotificationType | undefined;
    const notificationType: NotificationType =
        rawType && ALLOWED_NOTIFICATION_TYPES.has(rawType) ? rawType : 'ANNOUNCEMENT';

    await prisma.notification.create({
        data: {
            recipientId: userId,
            type: notificationType,
            title,
            message: body,
            link: stringValue(payloadData.link),
            postId: stringValue(payloadData.postId),
            commentId: stringValue(payloadData.commentId),
            actorId: stringValue(payloadData.actorId),
            isRead: false,
        },
    });

    const expoTokens = tokens.filter(t => isExpoPushToken(t.token));
    const pushAllowed = isMobilePushEnabled(user?.privacySettings);
    const shouldSendPush = pushAllowed && expoTokens.length > 0;

    if (!shouldSendPush) {
        if (!pushAllowed) {
            console.log(`ℹ️ [Notifications] Push disabled by user preference for ${userId}; stored in-app only.`);
        } else {
            console.log(`ℹ️ [Notifications] No valid Expo push tokens for user ${userId}; stored in-app only.`);
        }
        return { successCount: 0, failureCount: 0, pushSent: false };
    }

    try {
        const result = await sendExpoPushNotifications(
            expoTokens.map(t => ({
                to: t.token,
                title,
                body,
                data: payloadData,
                sound: 'default' as const,
                priority: 'high' as const,
            }))
        );

        if (result.failureCount > 0) {
            await Promise.all(
                result.tickets.map((ticket, index) => {
                    if (ticket.status !== 'error' || ticket.details?.error !== 'DeviceNotRegistered') {
                        return Promise.resolve();
                    }
                    const failedToken = expoTokens[index]?.token;
                    return failedToken
                        ? prisma.deviceToken.deleteMany({ where: { token: failedToken } }).then(() => undefined)
                        : Promise.resolve();
                })
            );
        }

        return {
            successCount: result.successCount,
            failureCount: result.failureCount,
            pushSent: true,
        };
    } catch (error) {
        // The durable in-app notification already exists. Push failure must not
        // make the originating action (for example, sending a message) fail.
        console.error(`[Notifications] Push delivery failed for user ${userId}:`, error);
        return { successCount: 0, failureCount: expoTokens.length, pushSent: false };
    }
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

        const result = await deliverNotification({ userId, title, body, data });

        res.json({
            message: 'Notification sent',
            successCount: result.successCount,
            failureCount: result.failureCount,
            pushSent: result.pushSent,
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
