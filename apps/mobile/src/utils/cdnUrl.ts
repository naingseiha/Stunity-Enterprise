/**
 * CDN URL Helper — Transform R2 media URLs to CDN-optimized URLs
 * 
 * When CDN_BASE_URL is configured, rewrites media URLs to go through
 * the CDN with image resizing parameters. Falls back to original URL
 * if CDN is not configured.
 */

// CDN base URL — set via env or leave empty to bypass
const CDN_BASE_URL = process.env.EXPO_PUBLIC_CDN_URL || '';

// Preset sizes for different use cases
export const ImageSize = {
    AVATAR_SM: { w: 48, h: 48, q: 80 },
    AVATAR_MD: { w: 80, h: 80, q: 85 },
    AVATAR_LG: { w: 160, h: 160, q: 90 },
    FEED_THUMB: { w: 400, h: 400, q: 80 },
    FEED_FULL: { w: 800, h: 800, q: 85 },
    FULL: { w: 0, h: 0, q: 95 },  // Original size
} as const;

type SizePreset = keyof typeof ImageSize;

/**
 * Transform a media URL to a CDN-optimized URL with resize params.
 * 
 * @param url - Original media URL (R2 or any origin)
 * @param preset - Size preset (default: FEED_THUMB for feed cards)
 * @returns CDN URL with resize params, or original URL if CDN not configured
 */
export function cdnUrl(url: string | undefined | null, preset: SizePreset = 'FEED_THUMB'): string {
    if (!url) return '';

    // If no CDN configured, return original URL
    if (!CDN_BASE_URL) return url;

    // Already a CDN URL — don't double-transform
    if (url.startsWith(CDN_BASE_URL)) return url;

    try {
        const size = ImageSize[preset];
        const parsed = new URL(url);
        const path = parsed.pathname;

        // Build CDN URL with resize params (Cloudflare Image Resizing format)
        const params = size.w > 0
            ? `/cdn-cgi/image/width=${size.w},height=${size.h},quality=${size.q},fit=cover${path}`
            : path;

        return `${CDN_BASE_URL}${params}`;
    } catch {
        // URL parse failed — return original
        return url;
    }
}

/**
 * Transform an array of media URLs to CDN-optimized versions.
 */
export function cdnUrls(urls: string[] | undefined | null, preset: SizePreset = 'FEED_THUMB'): string[] {
    if (!urls || urls.length === 0) return [];
    return urls.map(url => cdnUrl(url, preset));
}

/**
 * Get a CDN-optimized avatar URL.
 */
export function cdnAvatar(url: string | undefined | null, size: 'sm' | 'md' | 'lg' = 'md'): string {
    const preset: SizePreset = size === 'sm' ? 'AVATAR_SM' : size === 'lg' ? 'AVATAR_LG' : 'AVATAR_MD';
    return cdnUrl(url, preset);
}
