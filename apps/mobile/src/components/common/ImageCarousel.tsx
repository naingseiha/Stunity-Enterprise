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

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Image, ImageLoadEventData } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { normalizeMediaUrls } from '@/utils';
import ImageViewerModal from './ImageViewerModal';
import { VideoPlayer } from './VideoPlayer';
import { ResizeMode } from 'expo-av';

type AspectRatioMode = 'auto' | 'landscape' | 'portrait' | 'square';

interface ImageCarouselProps {
  images: string[];
  onImagePress?: (index: number) => void;
  borderRadius?: number;
  aspectRatio?: number; // Fixed aspect ratio (height/width)
  mode?: AspectRatioMode; // Layout mode: auto detects from image, or use fixed mode
}

// Helper to check if URI is video
const isVideo = (uri: string) => {
  const ext = uri.split('.').pop()?.toLowerCase();
  return ext === 'mp4' || ext === 'mov' || ext === 'avi' || ext === 'mkv';
};

export default function ImageCarousel({
  images,
  onImagePress,
  borderRadius = 12,
  aspectRatio,
  mode = 'auto', // Default to auto-detect
}: ImageCarouselProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const IMAGE_WIDTH = useMemo(() => {
    // If borderRadius is 0, it's full screen (detail view)
    // Otherwise, account for the 14px margins on each side from PostCard mediaWrapper
    return borderRadius === 0 ? SCREEN_WIDTH : SCREEN_WIDTH - 28;
  }, [SCREEN_WIDTH, borderRadius]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isCropped, setIsCropped] = useState(false); // Track if image is height-limited
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Normalize image URLs (handle R2 keys and relative paths)
  const normalizedImages = useMemo(() => {
    const normalized = normalizeMediaUrls(images);
    return normalized;
  }, [images]);

  // For videos in auto mode, default to 16:9 since we can't use onLoad
  useEffect(() => {
    if (mode === 'auto' && !imageDimensions && normalizedImages.length > 0 && isVideo(normalizedImages[0])) {
      setImageDimensions({ width: 16, height: 9 });
      setIsCropped(false);
    }
  }, [normalizedImages, mode, imageDimensions]);

  // Handle first image load to detect natural dimensions for auto mode
  const handleFirstImageLoad = useCallback((event: ImageLoadEventData) => {
    if (mode !== 'auto' || imageDimensions) return;
    const { width, height } = event.source;
    if (width && height) {
      setImageDimensions({ width, height });
      const imageAspectRatio = height / width;
      const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
      const maxHeight = IMAGE_WIDTH * 1.4;
      setIsCropped(calculatedHeight > maxHeight);
    }
  }, [mode, imageDimensions, IMAGE_WIDTH]);

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

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / IMAGE_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [IMAGE_WIDTH, activeIndex]);

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * IMAGE_WIDTH,
      animated: true,
    });
    setActiveIndex(index);
  };

  const handleImagePress = (index: number) => {
    if (isVideo(normalizedImages[index])) {
      // For video, do nothing (VideoPlayer handles controls)
      // Or maybe toggle fullscreen?
      return;
    }
    setModalInitialIndex(index);
    setModalVisible(true);
    onImagePress?.(index);
  };

  if (normalizedImages.length === 0) return null;

  // Render Item Helper
  const renderItem = (uri: string, index: number) => {
    const isVid = isVideo(uri);

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
        {isVid ? (
          <VideoPlayer
            uri={uri}
            style={{ width: '100%', height: '100%', borderRadius }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={index === activeIndex} // Only play if active slide
            useNativeControls
          />
        ) : (
          <Image
            source={{ uri }}
            style={[styles.image, { borderRadius }]}
            contentFit="cover"
            transition={200}
            // Critical for 120Hz scroll performance
            cachePolicy="memory-disk" // Cache decoded images in memory
            priority="high" // Decode immediately
            recyclingKey={uri} // Reuse decoded bitmap across instances
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
            // GPU acceleration hints
            blurRadius={0} // No blur = faster
            allowDownscaling={true} // Decode at optimal size
            onLoad={index === 0 ? handleFirstImageLoad : undefined}
          />
        )}
      </TouchableOpacity>
    );
  };

  // Single item
  if (normalizedImages.length === 1) {
    return (
      <>
        {renderItem(normalizedImages[0], 0)}
        <ImageViewerModal
          visible={modalVisible}
          images={normalizedImages}
          initialIndex={modalInitialIndex}
          onClose={() => setModalVisible(false)}
        />
      </>
    );
  }

  // Carousel
  return (
    <View style={[styles.container, { height: IMAGE_HEIGHT }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        decelerationRate="fast"
        snapToInterval={IMAGE_WIDTH}
        snapToAlignment="start"
        style={styles.scrollView}
      >
        {normalizedImages.map((uri, index) => renderItem(uri, index))}
      </ScrollView>

      {/* Dot Indicators */}
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

      {/* Counter */}
      <View style={styles.counterContainer}>
        <View style={styles.counterBadge}>
          <Ionicons name={isVideo(normalizedImages[activeIndex]) ? "videocam" : "images"} size={12} color="#fff" />
          <Text style={styles.counterText}>
            {activeIndex + 1}/{images.length}
          </Text>
        </View>
      </View>

      {/* Expand Indicator (only for cropped images) */}
      {isCropped && !isVideo(normalizedImages[activeIndex]) && (
        <View style={styles.expandIndicator}>
          <View style={styles.expandBadge}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
            <Text style={styles.expandText}>Tap to see full</Text>
          </View>
        </View>
      )}

      <ImageViewerModal
        visible={modalVisible}
        images={normalizedImages}
        initialIndex={modalInitialIndex}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

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
