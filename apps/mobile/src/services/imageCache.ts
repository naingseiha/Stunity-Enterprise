/**
 * Image Cache Service
 * 
 * Enterprise-grade image caching with memory management
 * Optimizes image loading for smooth scrolling like LinkedIn/Facebook
 */

import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Image } from 'react-native';

interface CacheEntry {
  uri: string;
  localUri: string;
  size: number;
  timestamp: number;
  accessCount: number;
}

class ImageCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheDir = `${FileSystem.cacheDirectory}images/`;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;
  private prefetchQueue: string[] = [];
  private isPrefetching = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Ensure cache directory exists
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }

    // Load cache metadata
    await this.loadCacheMetadata();

    // Clean expired entries
    await this.cleanExpiredEntries();
  }

  /**
   * Get cached image or download if not cached
   */
  async getCachedImage(uri: string): Promise<string> {
    if (!uri) return uri;

    // Check if already cached
    const cached = this.cache.get(uri);
    if (cached) {
      // Update access info
      cached.accessCount++;
      cached.timestamp = Date.now();
      return cached.localUri;
    }

    // Download and cache
    return await this.downloadAndCache(uri);
  }

  /**
   * Download image and cache it
   */
  private async downloadAndCache(uri: string): Promise<string> {
    try {
      // Generate unique filename
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        uri
      );
      const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const localUri = `${this.cacheDir}${hash}.${extension}`;

      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        // Add to cache map
        this.cache.set(uri, {
          uri,
          localUri,
          size: fileInfo.size || 0,
          timestamp: Date.now(),
          accessCount: 1,
        });
        this.currentCacheSize += fileInfo.size || 0;
        return localUri;
      }

      // Download file
      const downloadResult = await FileSystem.downloadAsync(uri, localUri);

      if (downloadResult.status === 200) {
        const size = (await FileSystem.getInfoAsync(localUri)).size || 0;

        // Check if we need to free space
        if (this.currentCacheSize + size > this.maxCacheSize) {
          await this.freeSpace(size);
        }

        // Add to cache
        this.cache.set(uri, {
          uri,
          localUri: downloadResult.uri,
          size,
          timestamp: Date.now(),
          accessCount: 1,
        });
        this.currentCacheSize += size;

        // Save metadata
        await this.saveCacheMetadata();

        return downloadResult.uri;
      }

      return uri; // Fallback to original URI
    } catch (error) {
      console.warn('Image cache error:', error);
      return uri; // Fallback to original URI
    }
  }

  /**
   * Prefetch images for smooth scrolling
   */
  async prefetchImages(uris: string[]) {
    // Add to prefetch queue
    this.prefetchQueue.push(...uris.filter(uri => !this.cache.has(uri)));

    // Start prefetching if not already running
    if (!this.isPrefetching) {
      this.processPrefetchQueue();
    }
  }

  /**
   * Process prefetch queue in background
   */
  private async processPrefetchQueue() {
    if (this.prefetchQueue.length === 0) {
      this.isPrefetching = false;
      return;
    }

    this.isPrefetching = true;

    // Prefetch in batches of 3
    const batch = this.prefetchQueue.splice(0, 3);

    await Promise.all(
      batch.map(uri => this.getCachedImage(uri).catch(() => {}))
    );

    // Continue with next batch after short delay
    setTimeout(() => this.processPrefetchQueue(), 100);
  }

  /**
   * Preload image into memory (React Native Image cache)
   */
  async preloadImage(uri: string) {
    try {
      const cachedUri = await this.getCachedImage(uri);
      await Image.prefetch(cachedUri);
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Free space by removing least recently used items
   */
  private async freeSpace(requiredSize: number) {
    // Sort by access count and timestamp (LRU)
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      const scoreA = a[1].accessCount * 0.3 + (Date.now() - a[1].timestamp) * 0.7;
      const scoreB = b[1].accessCount * 0.3 + (Date.now() - b[1].timestamp) * 0.7;
      return scoreB - scoreA;
    });

    let freedSize = 0;

    for (const [uri, entry] of entries) {
      if (freedSize >= requiredSize) break;

      try {
        await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        this.cache.delete(uri);
        freedSize += entry.size;
        this.currentCacheSize -= entry.size;
      } catch (error) {
        // Continue if delete fails
      }
    }
  }

  /**
   * Clean expired entries (older than 7 days)
   */
  private async cleanExpiredEntries() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const now = Date.now();

    for (const [uri, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        try {
          await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
          this.cache.delete(uri);
          this.currentCacheSize -= entry.size;
        } catch (error) {
          // Continue if delete fails
        }
      }
    }
  }

  /**
   * Clear entire cache
   */
  async clearCache() {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      this.cache.clear();
      this.currentCacheSize = 0;
      await this.saveCacheMetadata();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.maxCacheSize,
      utilizationPercent: (this.currentCacheSize / this.maxCacheSize) * 100,
    };
  }

  /**
   * Save cache metadata to AsyncStorage
   */
  private async saveCacheMetadata() {
    // Implement if needed for persistence across app restarts
  }

  /**
   * Load cache metadata from AsyncStorage
   */
  private async loadCacheMetadata() {
    // Implement if needed for persistence across app restarts
  }
}

// Export singleton instance
export const imageCacheService = new ImageCacheService();

/**
 * Hook for using cached images in components
 */
export const useCachedImage = (uri: string) => {
  const [cachedUri, setCachedUri] = React.useState<string>(uri);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      setLoading(true);
      const cached = await imageCacheService.getCachedImage(uri);
      if (mounted) {
        setCachedUri(cached);
        setLoading(false);
      }
    };

    if (uri) {
      loadImage();
    }

    return () => {
      mounted = false;
    };
  }, [uri]);

  return { uri: cachedUri, loading };
};

import React from 'react';
