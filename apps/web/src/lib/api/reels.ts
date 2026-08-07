import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import type { ReelType } from '@/lib/reels-cache';

export interface ReelsState {
  combo: number;
  highestCombo: number;
  dueRecallCount: number;
  upcomingRecallCount?: number;
  totalPoints?: number;
}

export interface ReelInteractionResult {
  xpEarned?: number;
  combo?: number;
  highestCombo?: number;
  lootUnlocked?: boolean;
  dueRecallCount?: number;
  upcomingRecallCount?: number;
  correct?: boolean;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = TokenManager.getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchReelsState(): Promise<ReelsState | null> {
  try {
    const res = await fetch(`${FEED_SERVICE_URL}/reels/state`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as ReelsState;
  } catch {
    return null;
  }
}

export async function postReelInteraction(input: {
  itemId: string;
  itemType: ReelType;
  correct?: boolean;
  grade?: 'again' | 'good' | 'easy';
  chosenIndex?: number;
  xpEarned?: number;
}): Promise<ReelInteractionResult | null> {
  try {
    const res = await fetch(`${FEED_SERVICE_URL}/reels/interactions`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Backend may wrap in { success, data } or return flat HUD fields
    return (data?.data ?? data) as ReelInteractionResult;
  } catch {
    return null;
  }
}
