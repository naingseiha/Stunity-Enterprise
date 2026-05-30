/**
 * Post Verification API — teacher-only post endorsement.
 *
 * Mirrors POST /posts/:postId/verify + /unverify on the feed-service.
 * Auth comes from the existing feedApi axios interceptor. Backend
 * enforces role gate (TEACHER + SCHOOL_ADMIN + ADMIN + SUPER_ADMIN)
 * and same-school check for TEACHER; client only checks role for
 * the optimistic UX (gating the menu action).
 */

import { feedApi } from './client';

export interface VerifyPostResult {
  id: string;
  teacherVerified: boolean;
  verifiedAt?: string;
  verifiedByTeacherId?: string;
}

export async function verifyPost(postId: string): Promise<VerifyPostResult> {
  const response = await feedApi.post<{ success: boolean; data: VerifyPostResult }>(
    `/posts/${postId}/verify`,
    {},
  );
  if (!response.data?.success) {
    throw new Error('Failed to verify post');
  }
  return response.data.data;
}

export async function unverifyPost(postId: string): Promise<VerifyPostResult> {
  const response = await feedApi.post<{ success: boolean; data: VerifyPostResult }>(
    `/posts/${postId}/unverify`,
    {},
  );
  if (!response.data?.success) {
    throw new Error('Failed to remove verification');
  }
  return response.data.data;
}

// Role gate matches the backend's POST_VERIFICATION_ROLES set
const VERIFICATION_ROLES = new Set([
  'TEACHER',
  'SCHOOL_ADMIN',
  'ADMIN',
  'SUPER_ADMIN',
]);

export function canVerifyPosts(role: string | undefined | null): boolean {
  return !!role && VERIFICATION_ROLES.has(role);
}
