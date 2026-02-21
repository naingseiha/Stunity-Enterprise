/**
 * Media Utilities
 * 
 * Utilities for handling media URLs, especially for CloudFlare R2 storage
 */

import { Config } from '@/config/env';

/**
 * Normalize media URL to handle both full URLs and R2 keys
 * 
 * CloudFlare R2 images can come in different formats:
 * 1. Full URL: https://pub-xxxxx.r2.dev/posts/123-abc.jpg
 * 2. Relative key: posts/123-abc.jpg (when R2_PUBLIC_URL not set on backend)
 * 3. Data URL: data:image/jpeg;base64,... (fallback mode)
 * 4. External URL: https://example.com/image.jpg
 */
export const normalizeMediaUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;

  // Local file:// URIs should NOT be normalized - they indicate upload failed!
  if (url.startsWith('file://')) {
    if (__DEV__) {
      console.error('🚨 [MediaUtils] LOCAL FILE URI DETECTED - Image was not uploaded!', url);
      console.error('   This image only exists on this device and cannot be loaded by others.');
    }
    return null; // Return null to prevent attempting to load local files
  }

  // Already a complete URL (http/https) or data URL
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    // Rewrite localhost URLs to configured media host (mobile can't reach localhost)
    const localhostMatch = url.match(/^http:\/\/localhost:\d+(\/.*)/);
    if (localhostMatch) {
      const mediaBaseUrl = Config.mediaUrl;
      return `${mediaBaseUrl}${localhostMatch[1]}`;
    }
    // Rewrite stale LAN IP URLs to configured media host
    const lanMatch = url.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+(\/uploads\/.*)/);
    if (lanMatch) {
      const mediaBaseUrl = Config.mediaUrl;
      return `${mediaBaseUrl}${lanMatch[1]}`;
    }
    return url;
  }

  // Relative path (e.g. /uploads/images/...) — prepend media base URL
  if (url.startsWith('/uploads/')) {
    const mediaBaseUrl = Config.mediaUrl;
    return `${mediaBaseUrl}${url}`;
  }

  // It's a relative R2 key - construct full URL
  // In development, we need to get it from our feed service which can proxy to R2
  // Format: http://YOUR_API:3010/media/posts/123-abc.jpg
  const mediaBaseUrl = Config.mediaUrl;
  const normalized = `${mediaBaseUrl}/media/${url}`;
  
  if (__DEV__) {
    console.log(`🔗 [MediaUtils] Normalized: ${url} → ${normalized}`);
  }
  
  return normalized;
};

/**
 * Normalize array of media URLs
 */
export const normalizeMediaUrls = (urls: string[] | undefined | null): string[] => {
  if (!urls || urls.length === 0) return [];
  
  return urls
    .map(normalizeMediaUrl)
    .filter((url): url is string => url !== null);
};

/**
 * Check if URL is a valid media URL
 */
export const isValidMediaUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  return url.startsWith('http://') || 
         url.startsWith('https://') || 
         url.startsWith('data:');
};

/**
 * Get media type from URL
 */
export const getMediaType = (url: string): 'image' | 'video' | 'unknown' => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i) || 
      lowerUrl.startsWith('data:image/')) {
    return 'image';
  }
  
  if (lowerUrl.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/i) || 
      lowerUrl.startsWith('data:video/')) {
    return 'video';
  }
  
  return 'unknown';
};

export default {
  normalizeMediaUrl,
  normalizeMediaUrls,
  isValidMediaUrl,
  getMediaType,
};
