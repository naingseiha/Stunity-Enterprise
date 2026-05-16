import { useTranslation } from 'react-i18next';
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

import React, { useState, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Image, ImageLoadEventData } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { MediaMetadata } from '@/types';
import { normalizeMediaUrls } from '@/utils';
import { cdnUrl } from '@/utils/cdnUrl';
import { FEED_MEDIA_RATIOS, getMediaItemAspectRatio } from '@/utils/feedMediaLayout';
import ImageViewerModal from './ImageViewerModal';
import { VideoPlayer, ResizeMode } from './VideoPlayer';
import { FEED_POST_CARD_MARGIN_H } from '@/constants';

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
  /** Measured inner width from parent `onLayout` (e.g. feed post media row). Overrides feed fallback math when set. */
  contentWidth?: number;
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
const DEFAULT_AUTO_RATIO = FEED_MEDIA_RATIOS.standard;
const MIXED_MULTI_MEDIA_RATIO = FEED_MEDIA_RATIOS.standard;
const LANDSCAPE_RATIO_CUTOFF = 0.68;
const PORTRAIT_RATIO_CUTOFF = 1.12;
const MAX_AUTO_HEIGHT_RATIO = 1.4;
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

const getKnownMediaDimensions = (uri: string | undefined, metadata?: MediaMetadata) => {
  if (!uri) return undefined;

  const cachedDimensions = getCachedImageDimensions(uri);
  if (cachedDimensions) return cachedDimensions;

  if (isVideoMedia(uri, metadata)) {
    const ratio = getMediaItemAspectRatio(metadata, uri) || 9 / 16;
    return { width: 1, height: ratio };
  }

  const ratio = getMediaItemAspectRatio(metadata, uri);
  return ratio ? { width: 1, height: ratio } : undefined;
};

const getMultiMediaFeedFrameRatio = (ratios: Array<number | undefined>) => {
  const knownRatios = ratios.filter((ratio): ratio is number => (
    typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0
  ));

  if (knownRatios.length !== ratios.length || knownRatios.length === 0) {
    return MIXED_MULTI_MEDIA_RATIO;
  }

  const hasLandscape = knownRatios.some(ratio => ratio <= LANDSCAPE_RATIO_CUTOFF);
  const hasPortrait = knownRatios.some(ratio => ratio > PORTRAIT_RATIO_CUTOFF);

  if (hasLandscape && hasPortrait) return MIXED_MULTI_MEDIA_RATIO;
  if (knownRatios.every(ratio => ratio <= LANDSCAPE_RATIO_CUTOFF)) return FEED_MEDIA_RATIOS.landscape;
  if (knownRatios.every(ratio => ratio > PORTRAIT_RATIO_CUTOFF)) return FEED_MEDIA_RATIOS.portrait;
  if (knownRatios.every(ratio => ratio > 0.9 && ratio <= PORTRAIT_RATIO_CUTOFF)) return FEED_MEDIA_RATIOS.square;

  return MIXED_MULTI_MEDIA_RATIO;
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
  contentWidth,
}: ImageCarouselProps) {
  const { t } = useTranslation();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const IMAGE_WIDTH = useMemo(() => {
    // Parent `onLayout` wins (feed row + optional full-bleed detail container)
    if (typeof contentWidth === 'number' && contentWidth > 0) {
      return Math.round(contentWidth);
    }
    if (fullBleed) {
      return Math.round(SCREEN_WIDTH);
    }
    if (optimizeForFeed) {
      return Math.round(SCREEN_WIDTH - FEED_POST_CARD_MARGIN_H * 2);
    }
    return Math.round(SCREEN_WIDTH - 28);
  }, [SCREEN_WIDTH, fullBleed, contentWidth, optimizeForFeed]);
  const safeMediaMetadata = useMemo(
    () => Array.isArray(mediaMetadata) ? mediaMetadata : [],
    [mediaMetadata]
  );

  // Normalize image URLs (handle R2 keys and relative paths)
  const normalizedImages = useMemo(() => {
    const normalized = normalizeMediaUrls(images);
    return optimizeForFeed
      ? normalized.map((uri, index) => isVideoMedia(uri, safeMediaMetadata[index]) ? uri : cdnUrl(uri, 'FEED_FULL'))
      : normalized;
  }, [images, safeMediaMetadata, optimizeForFeed]);

  const [activeIndex, setActiveIndex] = useState(0);
  const usesFixedHeight = aspectRatio !== undefined || mode !== 'auto';
  const usesMultiMediaFeedFrame = optimizeForFeed && normalizedImages.length > 1 && !usesFixedHeight && mode === 'auto';
  const [dimensionRevision, setDimensionRevision] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  // Reset carousel when media set changes (e.g. FlashList recycling)
  useLayoutEffect(() => {
    setActiveIndex(0);
    if (normalizedImages.length > 1) {
      requestAnimationFrame(() => {
        pagerRef.current?.setPageWithoutAnimation(0);
      });
    }
  }, [normalizedImages]);

  const activeDimensions = useMemo(() => {
    if (usesFixedHeight || usesMultiMediaFeedFrame || normalizedImages.length === 0) return undefined;
    return (
      getKnownMediaDimensions(normalizedImages[activeIndex], safeMediaMetadata[activeIndex]) ||
      getKnownMediaDimensions(normalizedImages[0], safeMediaMetadata[0])
    );
  }, [activeIndex, dimensionRevision, safeMediaMetadata, normalizedImages, usesFixedHeight, usesMultiMediaFeedFrame]);

  const getItemRatio = useCallback((index: number) => {
    const dimensions = getKnownMediaDimensions(normalizedImages[index], safeMediaMetadata[index]);
    if (!dimensions?.width || !dimensions?.height) return undefined;
    return dimensions.height / dimensions.width;
  }, [dimensionRevision, safeMediaMetadata, normalizedImages]);

  const multiMediaFeedFrameRatio = useMemo(() => {
    if (!usesMultiMediaFeedFrame) return undefined;
    return getMultiMediaFeedFrameRatio(normalizedImages.map((_, index) => getItemRatio(index)));
  }, [getItemRatio, normalizedImages, usesMultiMediaFeedFrame]);

  const handleImageLoad = useCallback((index: number, event: ImageLoadEventData) => {
    if (usesFixedHeight || usesMultiMediaFeedFrame || mode !== 'auto') return;
    const { width, height } = event.source;
    if (width && height) {
      const uri = normalizedImages[index];
      if (!uri) return;
      const cached = getCachedImageDimensions(uri);
      if (!cached || cached.width !== width || cached.height !== height) {
        cacheImageDimensions(uri, { width, height });
        setDimensionRevision(value => value + 1);
      }
    }
  }, [usesFixedHeight, usesMultiMediaFeedFrame, mode, normalizedImages]);

  // Calculate image height based on mode and dimensions
  const IMAGE_HEIGHT = useMemo(() => {
    if (aspectRatio !== undefined) {
      return IMAGE_WIDTH * aspectRatio;
    }

    if (multiMediaFeedFrameRatio !== undefined) {
      return IMAGE_WIDTH * multiMediaFeedFrameRatio;
    }

    if (mode === 'auto' && activeDimensions) {
      const imageAspectRatio = activeDimensions.height / activeDimensions.width;
      const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
      const minHeight = Math.min(220, Math.max(180, IMAGE_WIDTH * 0.5625));
      const maxHeight = IMAGE_WIDTH * MAX_AUTO_HEIGHT_RATIO;

      const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
      return finalHeight;
    }

    switch (mode) {
      case 'landscape': return IMAGE_WIDTH * 0.5625;
      case 'portrait': return IMAGE_WIDTH * 1.25;
      case 'square': return IMAGE_WIDTH;
      default: return IMAGE_WIDTH * 0.75;
    }
  }, [IMAGE_WIDTH, aspectRatio, mode, activeDimensions, multiMediaFeedFrameRatio]);

  const isActiveMediaCapped = useMemo(() => {
    if (usesFixedHeight || usesMultiMediaFeedFrame || mode !== 'auto' || !activeDimensions?.width || !activeDimensions.height) {
      return false;
    }
    return IMAGE_WIDTH * (activeDimensions.height / activeDimensions.width) > IMAGE_WIDTH * MAX_AUTO_HEIGHT_RATIO;
  }, [IMAGE_WIDTH, activeDimensions, mode, usesFixedHeight, usesMultiMediaFeedFrame]);

  const onPageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    const pos = e.nativeEvent.position;
    if (typeof pos === 'number') {
      setActiveIndex(pos);
    }
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
  }, []);

  const handleImagePress = useCallback((index: number) => {
    if (isVideoMedia(normalizedImages[index], safeMediaMetadata[index])) {
      if (optimizeForFeed) {
        onImagePress?.(index);
      }
      return;
    }
    setModalInitialIndex(index);
    if (enableViewer) setModalVisible(true);
    onImagePress?.(index);
  }, [enableViewer, safeMediaMetadata, normalizedImages, onImagePress, optimizeForFeed]);

  if (normalizedImages.length === 0) return null;

  const renderSlide = useCallback((uri: string, index: number) => {
    const metadata = safeMediaMetadata[index];
    const isVid = isVideoMedia(uri, metadata);
    const posterUrl = getVideoPosterUrl(metadata);
    const playbackUri = isVid && metadata?.hlsUrl
      ? (normalizeMediaUrls([metadata.hlsUrl])[0] || uri)
      : uri;
    const itemRatio = getItemRatio(index) || DEFAULT_AUTO_RATIO;
    const isItemHeightCapped = !optimizeForFeed && !usesMultiMediaFeedFrame && !usesFixedHeight && mode === 'auto' && IMAGE_WIDTH * itemRatio > IMAGE_WIDTH * MAX_AUTO_HEIGHT_RATIO;

    return (
      <TouchableOpacity
        activeOpacity={isVid ? 1 : 0.95}
        onPress={() => handleImagePress(index)}
        style={[styles.imageContainer, {
          width: '100%',
          height: IMAGE_HEIGHT,
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
            contentFit={isItemHeightCapped ? 'contain' : 'cover'}
            transition={120}
            // Critical for 120Hz scroll performance
            cachePolicy="memory-disk" // Cache decoded images in memory
            priority="normal" // Avoid decode spikes while fast-scrolling the feed
            recyclingKey={uri} // Reuse decoded bitmap across instances
            // GPU acceleration hints
            blurRadius={0} // No blur = faster
            allowDownscaling={optimizeForFeed} // Downscale feed bitmaps to reduce decode/upload cost while scrolling
            onLoad={!usesFixedHeight && !usesMultiMediaFeedFrame ? (event) => handleImageLoad(index, event) : undefined}
          />
        )}
      </TouchableOpacity>
    );
  }, [
    activeIndex,
    borderRadius,
    getItemRatio,
    handleImageLoad,
    handleImagePress,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    safeMediaMetadata,
    mode,
    optimizeForFeed,
    usesFixedHeight,
    usesMultiMediaFeedFrame,
  ]);

  // Single item
  if (normalizedImages.length === 1) {
    return (
      <>
        {renderSlide(normalizedImages[0], 0)}
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

  // Carousel — native PagerView for smooth horizontal paging inside vertical feeds
  return (
    <View style={[styles.container, { height: IMAGE_HEIGHT }]}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={onPageSelected}
        {...(Platform.OS === 'android' ? { overScrollMode: 'never' as const } : {})}
      >
        {normalizedImages.map((uri, index) => (
          <View key={`${uri}-${index}`} style={styles.pagerPage} collapsable={false}>
            {renderSlide(uri, index)}
          </View>
        ))}
      </PagerView>

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
          <Ionicons name={isVideoMedia(normalizedImages[activeIndex], safeMediaMetadata[activeIndex]) ? 'videocam' : 'images'} size={12} color="#fff" />
          <Text style={styles.counterText}>
            {activeIndex + 1}/{normalizedImages.length}
          </Text>
        </View>
      </View>

      {/* Expand Indicator (only for very tall images capped in-feed) */}
      {isActiveMediaCapped && !isVideoMedia(normalizedImages[activeIndex], safeMediaMetadata[activeIndex]) && (
        <View style={styles.expandIndicator}>
          <View style={styles.expandBadge}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
            <Text style={styles.expandText}>{t('common.media.viewFull')}</Text>
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
  const prevImages = Array.isArray(prev.images) ? prev.images : [];
  const nextImages = Array.isArray(next.images) ? next.images : [];
  const prevMetadata = Array.isArray(prev.mediaMetadata) ? prev.mediaMetadata : [];
  const nextMetadata = Array.isArray(next.mediaMetadata) ? next.mediaMetadata : [];

  return (
    prev.borderRadius === next.borderRadius &&
    prev.aspectRatio === next.aspectRatio &&
    prev.mode === next.mode &&
    prev.enableViewer === next.enableViewer &&
    prev.optimizeForFeed === next.optimizeForFeed &&
    prev.fullBleed === next.fullBleed &&
    prev.contentWidth === next.contentWidth &&
    prevMetadata.length === nextMetadata.length &&
    prevMetadata.every((meta, i) => {
      const nextMeta = nextMetadata[i];
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
    prevImages.length === nextImages.length &&
    prevImages.every((img, i) => img === nextImages[i])
  );
}

const ImageCarousel = React.memo(ImageCarouselInner, areCarouselPropsEqual);
export default ImageCarousel;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  pager: {
    width: '100%',
    height: '100%',
  },
  pagerPage: {
    flex: 1,
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
