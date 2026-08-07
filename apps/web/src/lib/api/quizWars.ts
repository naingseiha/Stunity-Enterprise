import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import { QUIZ_WAR_ENABLED } from '@/lib/feature-flags';
import type { QuizWar } from '@/lib/feed-smart-scroll-types';

async function authHeaders(): Promise<HeadersInit> {
  const token = TokenManager.getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchActiveQuizWar(): Promise<QuizWar | null> {
  if (!QUIZ_WAR_ENABLED) return null;
  try {
    const res = await fetch(`${FEED_SERVICE_URL}/quiz-wars/active`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    return (data.data ?? null) as QuizWar | null;
  } catch {
    return null;
  }
}

export interface JoinQuizWarResult {
  warId: string;
  team: string;
  joinedAt: string;
  isAlreadyJoined: boolean;
}

export async function joinQuizWar(
  warId: string,
  team: 'A' | 'B',
): Promise<JoinQuizWarResult> {
  if (!QUIZ_WAR_ENABLED) {
    throw new Error('Quiz War is disabled');
  }
  const res = await fetch(`${FEED_SERVICE_URL}/quiz-wars/${warId}/join`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ team }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || 'Failed to join quiz war');
  }
  return data.data as JoinQuizWarResult;
}
