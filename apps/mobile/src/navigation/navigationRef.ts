/**
 * Root navigation ref + helpers for out-of-tree navigation
 * (push taps, notification list, deep links).
 */

import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';
import { useAuthStore } from '@/stores';
import { FEATURE_FLAGS } from '@/config/featureFlags';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function extractConversationIdFromNotificationData(
  data: Record<string, unknown> | undefined | null,
): string | undefined {
  if (!data || typeof data !== 'object') return undefined;

  const direct = data.conversationId;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const link = typeof data.link === 'string' ? data.link : '';
  if (!link) return undefined;

  try {
    const path = link.startsWith('http') ? new URL(link).pathname : link;
    const match = path.match(/\/messages\/([^/?#]+)/i);
    return match?.[1] || undefined;
  } catch {
    return undefined;
  }
}

type MessagingNavTarget =
  | { screen: 'Conversations' }
  | { screen: 'NewMessage'; params?: { prefillSearch?: string } }
  | { screen: 'Chat'; params: { conversationId: string; userId?: string } };

/** Open messaging stack (conversations, compose, or a specific chat). */
export function navigateToMessaging(
  conversationIdOrTarget?: string | MessagingNavTarget,
): boolean {
  if (!FEATURE_FLAGS.MESSAGING_ENABLED) return false;
  if (!navigationRef.isReady()) return false;

  const role = useAuthStore.getState().user?.role;
  let nestedParams: MessagingNavTarget;
  if (!conversationIdOrTarget) {
    nestedParams = { screen: 'Conversations' };
  } else if (typeof conversationIdOrTarget === 'string') {
    nestedParams = {
      screen: 'Chat',
      params: { conversationId: conversationIdOrTarget },
    };
  } else {
    nestedParams = conversationIdOrTarget;
  }

  try {
    if (role === 'PARENT') {
      (navigationRef as any).navigate('Parent', {
        screen: 'ParentMessages',
        params: nestedParams,
      });
      return true;
    }

    (navigationRef as any).navigate('Main', {
      screen: 'Messages',
      params: nestedParams,
    });
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Navigation] Failed to open messaging:', error);
    }
    return false;
  }
}

export function navigateFromNotificationData(
  data: Record<string, unknown> | undefined | null,
): boolean {
  if (!data || typeof data !== 'object') return false;

  const type = typeof data.type === 'string' ? data.type : '';
  const conversationId = extractConversationIdFromNotificationData(data);
  const link = typeof data.link === 'string' ? data.link : '';

  if (
    type === 'MESSAGE' ||
    conversationId ||
    /\/messages(\/|$)/i.test(link) ||
    link.includes('/dashboard/messages') ||
    link.includes('/parent/messages')
  ) {
    return navigateToMessaging(conversationId);
  }

  return false;
}
