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
import type { FeynmanBounty } from '@/types';

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
