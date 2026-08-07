import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import type { RecallCard, RecallGrade } from '@/lib/feed-smart-scroll-types';

export interface RecallReviewResult {
  cardId: string;
  grade: RecallGrade;
  xpEarned: number;
  nextReviewAt: string;
  recallStrength: number;
  interval: number;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = TokenManager.getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchDueCards(options: {
  limit?: number;
  subject?: string;
} = {}): Promise<RecallCard[]> {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.subject) params.set('subject', options.subject);
    const qs = params.toString();
    const res = await fetch(
      `${FEED_SERVICE_URL}/recall/due${qs ? `?${qs}` : ''}`,
      { headers: await authHeaders() },
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success) return [];
    return (data.data ?? []) as RecallCard[];
  } catch {
    return [];
  }
}

export async function submitRecallReview(
  cardId: string,
  grade: RecallGrade,
): Promise<RecallReviewResult | null> {
  try {
    const res = await fetch(`${FEED_SERVICE_URL}/recall/${cardId}/review`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ grade }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    return data.data as RecallReviewResult;
  } catch {
    return null;
  }
}

export interface MasteryTopic {
  label: string;
  mastery: number;
  cardCount: number;
  dueCount: number;
}

export interface MasterySubject {
  subject: string;
  label: string;
  mastery: number;
  cardCount: number;
  dueCount: number;
  topics: MasteryTopic[];
}

/** Subject → topic mastery tree for the signed-in user. */
export async function fetchMasteryTree(): Promise<MasterySubject[]> {
  try {
    const res = await fetch(`${FEED_SERVICE_URL}/recall/mastery`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success) return [];
    return (data.subjects ?? data.data?.subjects ?? []) as MasterySubject[];
  } catch {
    return [];
  }
}
