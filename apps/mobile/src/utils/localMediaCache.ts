import * as FileSystem from 'expo-file-system';

type PickedMediaAsset = {
  uri?: string;
  fileName?: string | null;
  mimeType?: string | null;
  type?: string | null;
};

const UPLOAD_CACHE_DIR = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}feed-uploads/`;

const sanitizeFilenamePart = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '-');

const extensionFromAsset = (asset: PickedMediaAsset) => {
  const fileName = asset.fileName || asset.uri?.split('/').pop()?.split('?')[0];
  const filenameExt = fileName?.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (filenameExt) return filenameExt.toLowerCase();

  const mimeExt = asset.mimeType?.split('/')[1]?.split(';')[0];
  if (mimeExt) return mimeExt === 'jpeg' ? 'jpg' : sanitizeFilenamePart(mimeExt.toLowerCase());

  return String(asset.type || '').toLowerCase().includes('video') ? 'mp4' : 'jpg';
};

const ensureUploadCacheDir = async () => {
  const info = await FileSystem.getInfoAsync(UPLOAD_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(UPLOAD_CACHE_DIR, { intermediates: true });
  }
};

export const materializePickedMediaAsset = async (
  asset: PickedMediaAsset,
  index: number
): Promise<string> => {
  const sourceUri = asset.uri;
  if (!sourceUri || sourceUri.startsWith('http') || sourceUri.startsWith('data:')) {
    return sourceUri || '';
  }

  if (sourceUri.startsWith(UPLOAD_CACHE_DIR)) {
    return sourceUri;
  }

  await ensureUploadCacheDir();

  const ext = extensionFromAsset(asset);
  const safeName = sanitizeFilenamePart(asset.fileName || `media-${Date.now()}-${index}.${ext}`);
  const destinationUri = `${UPLOAD_CACHE_DIR}${Date.now()}-${index}-${safeName}`;

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
    const copiedInfo = await FileSystem.getInfoAsync(destinationUri);
    if (copiedInfo.exists) {
      return destinationUri;
    }
  } catch (error) {
    console.warn('[localMediaCache] Failed to copy picked media into upload cache:', error);
  }

  return sourceUri;
};
