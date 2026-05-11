export const FEED_MEDIA_RATIOS = {
  landscape: 9 / 16,
  standard: 3 / 4,
  square: 1,
  portrait: 5 / 4,
} as const;

export type FeedMediaBucket = keyof typeof FEED_MEDIA_RATIOS;

export const isVideoUri = (uri?: string) => {
  if (!uri) return false;
  const cleanUri = uri.split('?')[0].toLowerCase();
  return ['.mp4', '.mov', '.m4v', '.webm'].some(ext => cleanUri.endsWith(ext));
};

export const inferAspectRatioFromUrl = (uri?: string): number | undefined => {
  if (!uri) return undefined;

  const decoded = decodeURIComponent(uri);
  const patterns = [
    /picsum\.photos\/(\d+)\/(\d+)/i,
    /(?:^|[?&,/])width[=/](\d+).*?(?:height[=/](\d+))/i,
    /(?:^|[?&,/])w[=/](\d+).*?(?:h[=/](\d+))/i,
    /(\d{2,5})x(\d{2,5})/i,
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width > 0 && height > 0) return height / width;
  }

  return undefined;
};

export const normalizeHeightWidthRatio = (ratio?: number): number | undefined => {
  if (!ratio || !Number.isFinite(ratio)) return undefined;
  // The mobile app stores height / width. Keep tall portrait ratios intact so
  // screenshots, posters, and phone photos render as portrait instead of being
  // mistaken for landscape width / height values.
  return ratio;
};

export const getMediaItemAspectRatio = (
  metadata?: { width?: number; height?: number; aspectRatio?: number },
  uri?: string
): number | undefined => {
  const width = Number(metadata?.width) || 0;
  const height = Number(metadata?.height) || 0;

  if (width > 0 && height > 0) {
    return height / width;
  }

  return normalizeHeightWidthRatio(
    typeof metadata?.aspectRatio === 'number'
      ? metadata.aspectRatio
      : inferAspectRatioFromUrl(uri)
  );
};

export const bucketFeedAspectRatio = (
  rawRatio?: number,
  fallback: FeedMediaBucket = 'standard'
): FeedMediaBucket => {
  if (!rawRatio || !Number.isFinite(rawRatio)) return fallback;
  if (rawRatio <= 0.68) return 'landscape';
  if (rawRatio <= 0.9) return 'standard';
  if (rawRatio <= 1.12) return 'square';
  return 'portrait';
};

export const getFeedMediaBucket = (post: any): FeedMediaBucket => {
  const mediaCount = post?.mediaUrls?.length || 0;
  const displayMode = String(post?.mediaDisplayMode || '').toUpperCase();
  const firstMeta = post?.mediaMetadata?.[0];
  const firstUrl = post?.mediaUrls?.[0];

  if (displayMode === 'GRID') return 'square';
  if (displayMode === 'LANDSCAPE') return 'landscape';
  if (displayMode === 'SQUARE') return 'square';
  if (displayMode === 'PORTRAIT') return 'portrait';

  if (post?.mediaType === 'VIDEO' || firstMeta?.type === 'VIDEO' || isVideoUri(firstUrl)) {
    return 'landscape';
  }

  const postRatio = typeof post?.mediaAspectRatio === 'number'
    ? normalizeHeightWidthRatio(post.mediaAspectRatio)
    : undefined;

  return bucketFeedAspectRatio(
    getMediaItemAspectRatio(firstMeta, firstUrl) ??
    postRatio ??
    inferAspectRatioFromUrl(firstUrl),
    mediaCount > 1 ? 'square' : 'standard'
  );
};

export const getFeedMediaAspectRatio = (post: any) => FEED_MEDIA_RATIOS[getFeedMediaBucket(post)];

export const getPostDetailMediaBucket = (post: any): FeedMediaBucket => {
  const displayMode = String(post?.mediaDisplayMode || '').toUpperCase();
  const firstMeta = post?.mediaMetadata?.[0];
  const firstUrl = post?.mediaUrls?.[0];

  if (displayMode === 'LANDSCAPE') return 'landscape';
  if (displayMode === 'SQUARE' || displayMode === 'GRID') return 'square';
  if (displayMode === 'PORTRAIT') return 'portrait';

  if (post?.mediaType === 'VIDEO' || firstMeta?.type === 'VIDEO' || isVideoUri(firstUrl)) {
    return 'landscape';
  }

  const postRatio = typeof post?.mediaAspectRatio === 'number'
    ? normalizeHeightWidthRatio(post.mediaAspectRatio)
    : undefined;

  return bucketFeedAspectRatio(
    getMediaItemAspectRatio(firstMeta, firstUrl) ??
    postRatio ??
    inferAspectRatioFromUrl(firstUrl)
  );
};

export const getPostDetailMediaAspectRatio = (post: any) => FEED_MEDIA_RATIOS[getPostDetailMediaBucket(post)];
