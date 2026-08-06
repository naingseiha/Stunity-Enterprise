/**
 * Shared Reanimated transition tag for feed post media → PostDetail hero.
 */
export function postMediaTransitionTag(postId: string): string {
  return `post-media-${postId}`;
}
