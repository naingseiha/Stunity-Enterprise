/**
 * Bounty API client — talks to /bounties/* on the feed-service.
 *
 *   fetchActiveBounties(opts) → active bounties for feed injection
 *   createBounty(input)       → stake XP, create bounty
 *
 * Graceful degradation: callers (FeedScreen) catch errors and fall back
 * to mock bounties from utils/mockFeynmanBounties so the UI keeps
 * working even before the backend deploys.
 */

import { feedApi } from './client';
import type { FeynmanBounty, MasterExplainerTier } from '@/types';

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
  hasAha: boolean;       // viewer-specific: did the current user Aha this?
  isWinner: boolean;
  createdAt: string;
}

export interface FetchActiveBountiesOptions {
  limit?: number;
  subject?: string;
}

export async function fetchActiveBounties(
  options: FetchActiveBountiesOptions = {},
): Promise<FeynmanBounty[]> {
  const params: Record<string, string | number> = {};
  if (options.limit) params.limit = options.limit;
  if (options.subject) params.subject = options.subject;

  const response = await feedApi.get<{
    success: boolean;
    data: FeynmanBounty[];
  }>('/bounties/active', { params });

  if (!response.data?.success) return [];
  return response.data.data ?? [];
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
  const response = await feedApi.post<{
    success: boolean;
    data: CreateBountyResult;
  }>('/bounties', input);

  if (!response.data?.success) {
    throw new Error('Failed to create bounty');
  }
  return response.data.data;
}

// ─────────────────────────────────────────────────────────
// Replies — list / submit / Aha! toggle
// ─────────────────────────────────────────────────────────

export interface FetchBountyRepliesOptions {
  limit?: number;
}

export async function fetchBountyReplies(
  bountyId: string,
  options: FetchBountyRepliesOptions = {},
): Promise<BountyReply[]> {
  const params: Record<string, number> = {};
  if (options.limit) params.limit = options.limit;

  const response = await feedApi.get<{
    success: boolean;
    data: BountyReply[];
  }>(`/bounties/${bountyId}/replies`, { params });
  if (!response.data?.success) return [];
  return response.data.data ?? [];
}

export interface SubmitBountyReplyInput {
  content: string;
  format?: BountyReplyFormat;
  mediaUrl?: string;
}

export interface SubmitBountyReplyResult {
  id: string;
  format: BountyReplyFormat;
  createdAt: string;
}

export async function submitBountyReply(
  bountyId: string,
  input: SubmitBountyReplyInput,
): Promise<SubmitBountyReplyResult> {
  const response = await feedApi.post<{
    success: boolean;
    data: SubmitBountyReplyResult;
  }>(`/bounties/${bountyId}/replies`, input);
  if (!response.data?.success) {
    throw new Error('Failed to submit reply');
  }
  return response.data.data;
}

export interface ToggleAhaResult {
  added: boolean;
  ahaCount: number;
}

export async function toggleBountyAha(
  bountyId: string,
  replyId: string,
): Promise<ToggleAhaResult> {
  const response = await feedApi.post<{
    success: boolean;
    data: ToggleAhaResult;
  }>(`/bounties/${bountyId}/replies/${replyId}/aha`, {});
  if (!response.data?.success) {
    throw new Error('Failed to toggle Aha');
  }
  return response.data.data;
}

// ─────────────────────────────────────────────────────────
// Award — asker picks the winning reply (atomic XP transfer)
// ─────────────────────────────────────────────────────────

export interface AwardBountyResult {
  bountyId: string;
  winnerReplyId: string;
  winnerTutorId: string;
  xpAwarded: number;
  awardedAt: string;
}

export async function awardBounty(
  bountyId: string,
  replyId: string,
): Promise<AwardBountyResult> {
  const response = await feedApi.post<{
    success: boolean;
    data: AwardBountyResult;
  }>(`/bounties/${bountyId}/award`, { replyId });
  if (!response.data?.success) {
    throw new Error('Failed to award bounty');
  }
  return response.data.data;
}
