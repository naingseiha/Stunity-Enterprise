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
    AVATAR_SM: { w: 48, h: 48, q: 80, fit: 'cover' },
    AVATAR_MD: { w: 80, h: 80, q: 85, fit: 'cover' },
    AVATAR_LG: { w: 160, h: 160, q: 90, fit: 'cover' },
    FEED_THUMB: { w: 400, h: 400, q: 80, fit: 'cover' },
    FEED_FULL: { w: 900, h: 0, q: 85, fit: 'scale-down' },
    FULL: { w: 0, h: 0, q: 95, fit: 'scale-down' },  // Original size
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

        // Build CDN URL with resize params (Cloudflare Image Resizing format).
        // Feed full images must preserve the source aspect ratio; square cover
        // crops are only for thumbnails and avatars.
        const resizeParts = [
            size.w > 0 ? `width=${size.w}` : null,
            size.h > 0 ? `height=${size.h}` : null,
            `quality=${size.q}`,
            `fit=${size.fit}`,
        ].filter(Boolean);
        const params = size.w > 0
            ? `/cdn-cgi/image/${resizeParts.join(',')}${path}`
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
