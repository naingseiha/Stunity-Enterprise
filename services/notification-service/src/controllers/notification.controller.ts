
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendExpoPushNotifications, isExpoPushToken } from '../utils/expoPush';

const prisma = new PrismaClient();

export const registerDeviceToken = async (req: Request, res: Response) => {
    try {
        const { userId, token, platform } = req.body;

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

export const sendNotification = async (req: Request, res: Response) => {
    try {
        const { userId, title, body, data } = req.body;

        if (!userId || !title || !body) {
            return res.status(400).json({ error: 'userId, title, and body are required' });
        }

        // Get user's device tokens
        const tokens = await prisma.deviceToken.findMany({
            where: { userId },
        });

        if (tokens.length === 0) {
            return res.status(404).json({ error: 'User has no registered devices' });
        }

        // Filter to only valid Expo push tokens
        const expoTokens = tokens.filter(t => isExpoPushToken(t.token));

        if (expoTokens.length === 0) {
            console.warn(`⚠️ [Notifications] No Expo push tokens for user ${userId}`);
            return res.status(404).json({ error: 'User has no valid Expo push tokens' });
        }

        // Send via Expo Push API
        const messages = expoTokens.map(t => ({
            to: t.token,
            title,
            body,
            data: data || {},
            sound: 'default' as const,
            priority: 'high' as const,
        }));

        const result = await sendExpoPushNotifications(messages);

        // Save notification to database for history
        await prisma.notification.create({
            data: {
                recipientId: userId,
                type: 'ANNOUNCEMENT',
                title,
                message: body,
                isRead: false,
            },
        });

        // Handle failed tokens (cleanup invalid ones)
        if (result.failureCount > 0) {
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
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
