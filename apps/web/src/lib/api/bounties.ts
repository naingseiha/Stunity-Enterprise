import { TokenManager } from '@/lib/api/auth';
import { FEED_SERVICE_URL } from '@/lib/api/config';
import type { FeynmanBounty, MasterExplainerTier } from '@/lib/feed-smart-scroll-types';

export type BountyReplyFormat = 'TEXT' | 'VIDEO' | 'SKETCH';

export interface BountyReply {
  id: string;
  tutor: {
    id: string;
    name: string;
    avatarUrl?: string;
    tier: MasterExplainerTier | null;
  };
  format: BountyReplyFormat;
  content: string;
  mediaUrl?: string;
  ahaCount: number;
  hasAha: boolean;
  isWinner: boolean;
  createdAt: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = TokenManager.getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchActiveBounties(options: {
  limit?: number;
  subject?: string;
} = {}): Promise<FeynmanBounty[]> {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.subject) params.set('subject', options.subject);
    const qs = params.toString();
    const res = await fetch(
      `${FEED_SERVICE_URL}/bounties/active${qs ? `?${qs}` : ''}`,
      { headers: await authHeaders() },
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success) return [];
    return (data.data ?? []) as FeynmanBounty[];
  } catch {
    return [];
  }
}

export async function fetchBountyReplies(bountyId: string): Promise<BountyReply[]> {
  try {
    const res = await fetch(`${FEED_SERVICE_URL}/bounties/${bountyId}/replies`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success) return [];
    return (data.data ?? []) as BountyReply[];
  } catch {
    return [];
  }
}

export async function submitBountyReply(
  bountyId: string,
  content: string,
): Promise<BountyReply | null> {
  try {
    const res = await fetch(`${FEED_SERVICE_URL}/bounties/${bountyId}/replies`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ content, format: 'TEXT' }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success) return null;
    return data.data as BountyReply;
  } catch {
    return null;
  }
}

export interface CreateBountyInput {
  subject: string;
  subjectColor?: string;
  questionText: string;
  attachmentName?: string;
  bountyXp: number;
  durationHours?: number;
}

export interface CreateBountyResult {
  id: string;
  status: string;
  bountyXp: number;
  expiresAt: string;
}

export async function createBounty(
  input: CreateBountyInput,
): Promise<CreateBountyResult> {
  const res = await fetch(`${FEED_SERVICE_URL}/bounties`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    const msg = data?.error || data?.message || 'Failed to create bounty';
    throw new Error(msg);
  }
  return data.data as CreateBountyResult;
}
