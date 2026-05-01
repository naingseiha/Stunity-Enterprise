import type { MediaMetadata } from '@/types';

const isVideoMime = (mimeType?: string) => !!mimeType && mimeType.startsWith('video/');

const inferType = (asset: any): MediaMetadata['type'] => {
  const type = String(asset?.type || '').toLowerCase();
  const mimeType = String(asset?.mimeType || '').toLowerCase();
  const uri = String(asset?.uri || '').split('?')[0].toLowerCase();

  if (type.includes('video') || isVideoMime(mimeType) || ['.mp4', '.mov', '.m4v', '.webm'].some(ext => uri.endsWith(ext))) {
    return 'VIDEO';
  }

  return 'IMAGE';
};

export const metadataFromPickerAsset = (asset: any): MediaMetadata => {
  const width = Number(asset?.width) || undefined;
  const height = Number(asset?.height) || undefined;

  return {
    uri: asset?.uri,
    width,
    height,
    aspectRatio: width && height ? height / width : undefined,
    type: inferType(asset),
    mimeType: asset?.mimeType,
  };
};

export const metadataForUris = (
  uris: string[],
  metadata: MediaMetadata[] = []
): MediaMetadata[] => uris.map((uri, index) => ({
  ...(metadata[index] || {}),
  uri,
}));

export const primaryMediaAspectRatio = (metadata: MediaMetadata[] = []) => {
  const first = metadata[0];
  if (!first) return undefined;
  if (typeof first.aspectRatio === 'number') return first.aspectRatio;
  if (first.width && first.height) return first.height / first.width;
  return undefined;
};
