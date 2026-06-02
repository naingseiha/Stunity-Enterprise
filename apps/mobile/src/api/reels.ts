/**
 * EduReels authoring API — video upload + FocusReel creation.
 *
 * Upload reuses the same direct-to-R2 presigned-URL flow the feed uses for
 * post media (see feedStore.createPost): ask the backend for a presigned PUT
 * ticket, upload the file straight to R2 with expo-file-system, then persist
 * the returned publicUrl. createFocusReel posts to the educator-gated
 * POST /reels endpoint (services/feed-service focusReel.routes.ts).
 */

import * as FileSystem from 'expo-file-system';
import { feedApi } from '@/api/client';
import { Config } from '@/config/env';
import { tokenService } from '@/services/token';

export interface ReelPausePoint {
  time: number;
  question: string;
  options: string[];
  correctAnswer: number;
  xp?: number;
}

export interface CreateFocusReelInput {
  title: string;
  description?: string;
  subject: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  pausePoints: ReelPausePoint[];
}

const mimeFromUri = (uri: string): string => {
  const ext = (/\.(\w+)$/.exec(uri)?.[1] || 'mp4').toLowerCase();
  if (ext === 'mov') return 'video/quicktime';
  if (['mp4', 'webm', 'avi'].includes(ext)) return `video/${ext}`;
  return 'video/mp4';
};

/**
 * Upload a locally-picked video to R2 and return its public URL.
 * Throws with a readable message on failure (caller surfaces it).
 */
export async function uploadReelVideo(localUri: string): Promise<string> {
  // Already a remote URL — nothing to upload.
  if (/^https?:\/\//i.test(localUri)) return localUri;

  if (localUri.startsWith('file://')) {
    const info = await FileSystem.getInfoAsync(localUri);
    if (!info.exists) {
      throw new Error('The selected video is no longer available. Please pick it again.');
    }
  }

  const originalName = localUri.split('/').pop() || `reel-${Date.now()}.mp4`;
  const mimeType = mimeFromUri(localUri);
  const token = await tokenService.getAccessToken();

  // 1. Presigned PUT ticket
  const ticketRes = await fetch(`${Config.feedUrl}/presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ requests: [{ originalName, mimeType }] }),
  });
  if (!ticketRes.ok) {
    throw new Error(`Could not start upload (${ticketRes.status}).`);
  }
  const ticketData = await ticketRes.json();
  const ticket = ticketData?.data?.[0];
  if (!ticketData?.success || !ticket?.presignedUrl || !ticket?.publicUrl) {
    throw new Error('Upload service returned an invalid response.');
  }

  // 2. Direct PUT to R2
  const putRes = await FileSystem.uploadAsync(ticket.presignedUrl, localUri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': mimeType },
  });
  if (putRes.status !== 200) {
    throw new Error(`Video upload failed (${putRes.status}).`);
  }

  return ticket.publicUrl as string;
}

/** Create a FocusReel. Resolves to the created reel id. */
export async function createFocusReel(input: CreateFocusReelInput): Promise<string> {
  const res = await feedApi.post<{ success: boolean; data?: { id: string }; error?: string }>(
    '/reels',
    input,
  );
  if (!res.data?.success || !res.data.data?.id) {
    throw new Error(res.data?.error || 'Failed to create reel.');
  }
  return res.data.data.id;
}
