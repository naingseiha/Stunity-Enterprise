
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { messaging } from '../utils/firebase';

const prisma = new PrismaClient();

export const registerDeviceToken = async (req: Request, res: Response) => {
    try {
        const { userId, token, platform } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ error: 'userId and token are required' });
        }

        const deviceToken = await prisma.deviceToken.upsert({
            where: { token },
            update: { userId, platform, updatedAt: new Date() },
            create: { userId, token, platform },
        });

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

        const fcmTokens = tokens.map((t) => t.token);

        // Send notifications
        const message = {
            notification: { title, body },
            data: data || {},
            tokens: fcmTokens,
        };

        const response = await messaging.sendEachForMulticast(message);

        // Save notification to database for history
        await prisma.notification.create({
            data: {
                recipientId: userId,
                type: 'ANNOUNCEMENT', // Default or pass in body
                title,
                message: body,
                isRead: false,
                // Add other fields as necessary based on data
            },
        });

        // Handle failed tokens (cleanup)
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                    failedTokens.push(fcmTokens[idx]);
                }
            });

            // Optional: Delete invalid tokens
            if (failedTokens.length > 0) {
                await prisma.deviceToken.deleteMany({
                    where: { token: { in: failedTokens } },
                });
            }
        }

        res.json({
            message: 'Notification sent',
            successCount: response.successCount,
            failureCount: response.failureCount
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
