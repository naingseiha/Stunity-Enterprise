/**
 * Native share sheet helpers — only treat an explicit share as success.
 * iOS reports Share.dismissedAction on cancel; Android often resolves with
 * sharedAction even when dismissed, so we still only track when action is shared.
 */

import { Share, Platform } from 'react-native';

export type ShareContent = {
  message: string;
  title?: string;
  url?: string;
};

type ShareResult = Awaited<ReturnType<typeof Share.share>>;

/** Returns true when the user completed a share (not dismiss/cancel). */
export function didShareSucceed(result: ShareResult): boolean {
  if (result.action === Share.sharedAction) return true;
  return (result as { action?: string }).action === 'sharedAction';
}

/**
 * Open the system share sheet. Resolves true only on a completed share.
 * Returns false on cancel or error.
 */
export async function shareContent(content: ShareContent): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  try {
    const result = await Share.share({
      message: content.message,
      title: content.title,
      url: content.url,
    });
    return didShareSucceed(result);
  } catch {
    return false;
  }
}

export function buildPostShareContent(post: {
  id: string;
  content?: string;
  postType?: string;
  author?: { firstName?: string };
}): ShareContent {
  const type = String(post.postType || 'post').toLowerCase();
  const authorFirst = post.author?.firstName || 'a Stunity user';
  return {
    message: `Check out this ${type} on Stunity:\n\n${post.content || ''}\n\n#Stunity #Education`,
    title: `${authorFirst}'s ${post.postType || 'post'}`,
    url: `https://stunity.com/posts/${post.id}`,
  };
}
