/**
 * Expo Push Notification Utility
 * 
 * Replaces Firebase Admin SDK — uses the Expo Push API to deliver
 * push notifications to devices using Expo Push Tokens.
 * 
 * Expo Push API docs: https://docs.expo.dev/push-notifications/sending-notifications/
 */

interface ExpoPushMessage {
    to: string | string[];
    title?: string;
    body: string;
    data?: Record<string, any>;
    sound?: 'default' | null;
    badge?: number;
    channelId?: string;
    priority?: 'default' | 'normal' | 'high';
}

interface ExpoPushTicket {
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: { error?: string };
}

interface ExpoPushResponse {
    data: ExpoPushTicket[];
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications via the Expo Push API.
 * Handles batching (max 100 per request) and error reporting.
 */
export async function sendExpoPushNotifications(
    messages: ExpoPushMessage[]
): Promise<{ successCount: number; failureCount: number; tickets: ExpoPushTicket[] }> {
    if (messages.length === 0) {
        return { successCount: 0, failureCount: 0, tickets: [] };
    }

    // Filter out non-Expo tokens
    const validMessages = messages.filter(m => {
        const tokens = Array.isArray(m.to) ? m.to : [m.to];
        return tokens.some(t => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken['));
    });

    if (validMessages.length === 0) {
        console.warn('⚠️ [ExpoPush] No valid Expo push tokens found');
        return { successCount: 0, failureCount: 0, tickets: [] };
    }

    // Batch in chunks of 100 (Expo API limit)
    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < validMessages.length; i += 100) {
        chunks.push(validMessages.slice(i, i + 100));
    }

    let successCount = 0;
    let failureCount = 0;
    const allTickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
        try {
            const response = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(chunk),
            });

            if (!response.ok) {
                console.error(`❌ [ExpoPush] API error: ${response.status} ${response.statusText}`);
                failureCount += chunk.length;
                continue;
            }

            const result: ExpoPushResponse = await response.json();

            for (const ticket of result.data) {
                allTickets.push(ticket);
                if (ticket.status === 'ok') {
                    successCount++;
                } else {
                    failureCount++;
                    console.warn(`⚠️ [ExpoPush] Ticket error: ${ticket.message} (${ticket.details?.error})`);
                }
            }
        } catch (error) {
            console.error('❌ [ExpoPush] Request failed:', error);
            failureCount += chunk.length;
        }
    }

    console.log(`📬 [ExpoPush] Sent: ${successCount} success, ${failureCount} failed`);
    return { successCount, failureCount, tickets: allTickets };
}

/**
 * Check if a token is a valid Expo push token.
 */
export function isExpoPushToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
}
