import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * ImageCarousel Component
 * 
 * Flexible image slider with LinkedIn-style layout:
 * - Swipeable horizontal scroll
 * - Adaptive aspect ratios (landscape, portrait, square)
 * - Dot indicators and counter
 * - Smooth animations
 * - Supports both fixed and auto-sized images
 * - Handles CloudFlare R2 URLs and relative keys
 */

import React, { useState, useRef, useMemo, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { FlashList, ViewToken } from '@shopify/flash-list';
import { Image, ImageLoadEventData } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { MediaMetadata } from '@/types';
import { normalizeMediaUrls } from '@/utils';
import { cdnUrl } from '@/utils/cdnUrl';
import ImageViewerModal from './ImageViewerModal';
import { VideoPlayer, ResizeMode } from './VideoPlayer';

type AspectRatioMode = 'auto' | 'landscape' | 'portrait' | 'square';

interface ImageCarouselProps {
  images: string[];
  mediaMetadata?: MediaMetadata[];
  onImagePress?: (index: number) => void;
  borderRadius?: number;
  aspectRatio?: number; // Fixed aspect ratio (height/width)
  mode?: AspectRatioMode; // Layout mode: auto detects from image, or use fixed mode
  enableViewer?: boolean;
  optimizeForFeed?: boolean;
  fullBleed?: boolean;
}

// Helper to check if URI is video
const isVideo = (uri: string) => {
  const cleanUri = uri.split('?')[0].toLowerCase();
  return ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'].some(ext => cleanUri.endsWith(ext));
};

const isVideoMedia = (uri: string, metadata?: MediaMetadata) => {
  const type = String(metadata?.type || '').toUpperCase();
  const mimeType = String(metadata?.mimeType || '').toLowerCase();
  return type === 'VIDEO' || mimeType.startsWith('video/') || isVideo(uri);
};

const getVideoPosterUrl = (metadata?: MediaMetadata) => {
  const rawPoster = metadata?.thumbnailUrl || metadata?.posterUrl;
  if (!rawPoster) return null;
  const normalizedPoster = normalizeMediaUrls([rawPoster])[0];
  return normalizedPoster ? cdnUrl(normalizedPoster, 'FEED_FULL') : null;
};

// Global cache for image dimensions to prevent layout jumps during fast scrolling
const MAX_DIMENSION_CACHE_ENTRIES = 500;
const MAX_VISIBLE_DOTS = 8;
const globalImageDimensionsCache = new Map<string, { width: number; height: number }>();

const getCachedImageDimensions = (uri?: string) => {
  if (!uri) return undefined;
  return globalImageDimensionsCache.get(uri);
};

const cacheImageDimensions = (uri: string, dimensions: { width: number; height: number }) => {
  if (globalImageDimensionsCache.has(uri)) {
    globalImageDimensionsCache.delete(uri);
  }
  globalImageDimensionsCache.set(uri, dimensions);

  if (globalImageDimensionsCache.size > MAX_DIMENSION_CACHE_ENTRIES) {
    const oldestKey = globalImageDimensionsCache.keys().next().value;
    if (oldestKey) globalImageDimensionsCache.delete(oldestKey);
  }
};

const FeedVideoPreview = React.memo(function FeedVideoPreview({
  borderRadius,
  posterUrl,
}: {
  borderRadius: number;
  posterUrl?: string | null;
}) {
  return (
    <View style={[styles.feedVideoPreview, { borderRadius }]}>
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={[styles.feedVideoPoster, { borderRadius }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="normal"
          recyclingKey={posterUrl}
          allowDownscaling
        />
      ) : null}
      {posterUrl ? <View style={styles.feedVideoScrim} /> : null}
      <View style={styles.feedVideoPlayButton}>
        <Ionicons name="play" size={22} color="#FFFFFF" />
      </View>
    </View>
  );
});

function ImageCarouselInner({
  images,
  mediaMetadata = [],
  onImagePress,
  borderRadius = 12,
  aspectRatio,
  mode = 'auto', // Default to auto-detect
  enableViewer = true,
  optimizeForFeed = false,
  fullBleed = false,
}: ImageCarouselProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const IMAGE_WIDTH = useMemo(() => {
    return fullBleed ? SCREEN_WIDTH : SCREEN_WIDTH - 28;
  }, [SCREEN_WIDTH, fullBleed]);

  // Normalize image URLs (handle R2 keys and relative paths)
  const normalizedImages = useMemo(() => {
    const normalized = normalizeMediaUrls(images);
    return optimizeForFeed
      ? normalized.map((uri, index) => isVideoMedia(uri, mediaMetadata[index]) ? uri : cdnUrl(uri, 'FEED_FULL'))
      : normalized;
  }, [images, mediaMetadata, optimizeForFeed]);

  const [activeIndex, setActiveIndex] = useState(0);
  const usesFixedHeight = aspectRatio !== undefined || mode !== 'auto';

  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(() => {
    const cachedDimensions = getCachedImageDimensions(normalizedImages[0]);
    if (!usesFixedHeight && cachedDimensions) {
      return cachedDimensions;
    }
    return null;
  });
  const [isCropped, setIsCropped] = useState(() => {
    const dims = getCachedImageDimensions(normalizedImages[0]);
    if (!usesFixedHeight && dims) {
      const imageAspectRatio = dims.height / dims.width;
      const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
      const maxHeight = IMAGE_WIDTH * 1.4;
      return calculatedHeight > maxHeight;
    }
    return false;
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);
  const flashListRef = useRef<any>(null);

  // Reset state on cell recycling (when images prop changes)
  useLayoutEffect(() => {
    if (usesFixedHeight) {
      setActiveIndex(0);
      if (!optimizeForFeed && normalizedImages.length > 1) {
        requestAnimationFrame(() => {
          flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
        });
      }
      return;
    }

    if (normalizedImages.length > 0) {
      const firstImg = normalizedImages[0];
      const dims = getCachedImageDimensions(firstImg);
      if (dims) {
        setImageDimensions(dims);
        const imageAspectRatio = dims.height / dims.width;
        const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
        const maxHeight = IMAGE_WIDTH * 1.4;
        setIsCropped(calculatedHeight > maxHeight);
      } else {
        setImageDimensions(null);
        setIsCropped(false);
      }
    } else {
      setImageDimensions(null);
      setIsCropped(false);
    }
    setActiveIndex(0);
    // Skip the current frame and let FlashList mount completely before resetting scroll.
    if (!optimizeForFeed && normalizedImages.length > 1) {
      requestAnimationFrame(() => {
        flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }
  }, [normalizedImages, IMAGE_WIDTH, usesFixedHeight, optimizeForFeed]);


  // For videos in auto mode, default to 16:9 since we can't use onLoad
  useEffect(() => {
    if (mode === 'auto' && !imageDimensions && normalizedImages.length > 0 && isVideo(normalizedImages[0])) {
      setImageDimensions({ width: 16, height: 9 });
      setIsCropped(false);
    }
  }, [normalizedImages, mode, imageDimensions]);

  // Handle first image load to detect natural dimensions for auto mode
  const handleFirstImageLoad = useCallback((event: ImageLoadEventData) => {
    if (usesFixedHeight || mode !== 'auto') return;
    const { width, height } = event.source;
    if (width && height) {
      if (normalizedImages.length > 0) {
        cacheImageDimensions(normalizedImages[0], { width, height });
      }
      // Only set state if we don't already have these dimensions
      if (!imageDimensions || imageDimensions.width !== width || imageDimensions.height !== height) {
        setImageDimensions({ width, height });
        const imageAspectRatio = height / width;
        const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
        const maxHeight = IMAGE_WIDTH * 1.4;
        setIsCropped(calculatedHeight > maxHeight);
      }
    }
  }, [usesFixedHeight, mode, imageDimensions, IMAGE_WIDTH, normalizedImages]);

  // Calculate image height based on mode and dimensions
  const IMAGE_HEIGHT = useMemo(() => {
    if (aspectRatio !== undefined) {
      return IMAGE_WIDTH * aspectRatio;
    }

    if (mode === 'auto' && imageDimensions) {
      const imageAspectRatio = imageDimensions.height / imageDimensions.width;
      const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;

      const minHeight = 240;
      const maxHeight = IMAGE_WIDTH * 1.4;

      const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
      return finalHeight;
    }

    switch (mode) {
      case 'landscape': return IMAGE_WIDTH * 0.5625;
      case 'portrait': return IMAGE_WIDTH * 1.25;
      case 'square': return IMAGE_WIDTH;
      default: return IMAGE_WIDTH * 0.75;
    }
  }, [IMAGE_WIDTH, aspectRatio, mode, imageDimensions, SCREEN_WIDTH]);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  }, [activeIndex]);

  const scrollToIndex = useCallback((index: number) => {
    flashListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setActiveIndex(index);
  }, []);

  const handleImagePress = useCallback((index: number) => {
    if (isVideoMedia(normalizedImages[index], mediaMetadata[index])) {
      if (optimizeForFeed) {
        onImagePress?.(index);
      }
      return;
    }
    setModalInitialIndex(index);
    if (enableViewer) setModalVisible(true);
    onImagePress?.(index);
  }, [enableViewer, mediaMetadata, normalizedImages, onImagePress, optimizeForFeed]);

  if (normalizedImages.length === 0) return null;

  // Render Item Helper
  const renderItem = useCallback(({ item: uri, index }: { item: string, index: number }) => {
    const metadata = mediaMetadata[index];
    const isVid = isVideoMedia(uri, metadata);
    const posterUrl = getVideoPosterUrl(metadata);
    const playbackUri = isVid && metadata?.hlsUrl
      ? (normalizeMediaUrls([metadata.hlsUrl])[0] || uri)
      : uri;

    return (
      <TouchableOpacity
        key={`${uri}-${index}`}
        activeOpacity={isVid ? 1 : 0.95}
        onPress={() => handleImagePress(index)}
        style={[styles.imageContainer, {
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT
        }]}
      >
        {isVid && optimizeForFeed ? (
          <FeedVideoPreview borderRadius={borderRadius} posterUrl={posterUrl} />
        ) : isVid ? (
          <VideoPlayer
            uri={playbackUri}
            style={{ width: '100%', height: '100%', borderRadius }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={!optimizeForFeed && index === activeIndex} // Keep feed previews paused for smooth vertical scroll
            useNativeControls={!optimizeForFeed}
          />
        ) : (
          <Image
            source={{ uri }}
            style={[styles.image, { borderRadius }]}
            contentFit="cover"
            transition={120}
            // Critical for 120Hz scroll performance
            cachePolicy="memory-disk" // Cache decoded images in memory
            priority="normal" // Avoid decode spikes while fast-scrolling the feed
            recyclingKey={uri} // Reuse decoded bitmap across instances
            // GPU acceleration hints
            blurRadius={0} // No blur = faster
            allowDownscaling={optimizeForFeed} // Downscale feed bitmaps to reduce decode/upload cost while scrolling
            onLoad={!usesFixedHeight && index === 0 ? handleFirstImageLoad : undefined}
          />
        )}
      </TouchableOpacity>
    );
  }, [
    activeIndex,
    borderRadius,
    handleFirstImageLoad,
    handleImagePress,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    mediaMetadata,
    optimizeForFeed,
    usesFixedHeight,
  ]);

  // Single item
  if (normalizedImages.length === 1) {
    return (
      <>
        {renderItem({ item: normalizedImages[0], index: 0 })}
        {enableViewer && (
          <ImageViewerModal
            visible={modalVisible}
            images={normalizedImages}
            initialIndex={modalInitialIndex}
            onClose={() => setModalVisible(false)}
          />
        )}
      </>
    );
  }

  // Carousel
  return (
    <View style={[styles.container, { height: IMAGE_HEIGHT }]}>
      <FlashList
        ref={flashListRef}
        data={normalizedImages}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item}-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        decelerationRate="fast"
        snapToInterval={IMAGE_WIDTH}
        snapToAlignment="start"
        // @ts-ignore
        estimatedItemSize={IMAGE_WIDTH}
        drawDistance={IMAGE_WIDTH * 1.5}
        removeClippedSubviews
      />

      {/* Dot Indicators */}
      {normalizedImages.length <= MAX_VISIBLE_DOTS && (
        <View style={styles.indicatorContainer}>
          {normalizedImages.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => scrollToIndex(index)}
              style={[
                styles.dot,
                index === activeIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}

      {/* Counter */}
      <View style={styles.counterContainer}>
        <View style={styles.counterBadge}>
          <Ionicons name={isVideoMedia(normalizedImages[activeIndex], mediaMetadata[activeIndex]) ? "videocam" : "images"} size={12} color="#fff" />
          <Text style={styles.counterText}>
            {activeIndex + 1}/{images.length}
          </Text>
        </View>
      </View>

      {/* Expand Indicator (only for cropped images) */}
      {isCropped && !isVideoMedia(normalizedImages[activeIndex], mediaMetadata[activeIndex]) && (
        <View style={styles.expandIndicator}>
          <View style={styles.expandBadge}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
            <Text style={styles.expandText}><AutoI18nText i18nKey="auto.mobile.components_common_ImageCarousel.k_2739d87c" /></Text>
          </View>
        </View>
      )}

      {enableViewer && (
        <ImageViewerModal
          visible={modalVisible}
          images={normalizedImages}
          initialIndex={modalInitialIndex}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
}

// Memoize to prevent re-renders when parent (PostCard) re-renders with same media
function areCarouselPropsEqual(prev: ImageCarouselProps, next: ImageCarouselProps) {
  return (
    prev.borderRadius === next.borderRadius &&
    prev.aspectRatio === next.aspectRatio &&
    prev.mode === next.mode &&
    prev.enableViewer === next.enableViewer &&
    prev.optimizeForFeed === next.optimizeForFeed &&
    prev.fullBleed === next.fullBleed &&
    (prev.mediaMetadata || []).length === (next.mediaMetadata || []).length &&
    (prev.mediaMetadata || []).every((meta, i) => {
      const nextMeta = next.mediaMetadata?.[i];
      return (
        meta?.uri === nextMeta?.uri &&
        meta?.thumbnailUrl === nextMeta?.thumbnailUrl &&
        meta?.posterUrl === nextMeta?.posterUrl &&
        meta?.hlsUrl === nextMeta?.hlsUrl &&
        meta?.type === nextMeta?.type &&
        meta?.mimeType === nextMeta?.mimeType &&
        meta?.width === nextMeta?.width &&
        meta?.height === nextMeta?.height &&
        meta?.aspectRatio === nextMeta?.aspectRatio
      );
    }) &&
    prev.images.length === next.images.length &&
    prev.images.every((img, i) => img === next.images[i])
  );
}

const ImageCarousel = React.memo(ImageCarouselInner, areCarouselPropsEqual);
export default ImageCarousel;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingContainer: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  singleImageContainer: {
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Black background for video/images
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  feedVideoPreview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedVideoPlayButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  feedVideoPoster: {
    ...StyleSheet.absoluteFillObject,
  },
  feedVideoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#fff',
  },
  counterContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  expandIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  expandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    zIndex: 10,
  },
  leftArrow: {
    left: 8,
  },
  rightArrow: {
    right: 8,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
