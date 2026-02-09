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

import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { normalizeMediaUrls } from '@/utils';
import ImageViewerModal from './ImageViewerModal';

type AspectRatioMode = 'auto' | 'landscape' | 'portrait' | 'square';

interface ImageCarouselProps {
  images: string[];
  onImagePress?: (index: number) => void;
  borderRadius?: number;
  aspectRatio?: number; // Fixed aspect ratio (height/width)
  mode?: AspectRatioMode; // Layout mode: auto detects from image, or use fixed mode
}

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
    
    // Log URL normalization in development
    if (__DEV__ && images.length > 0) {
      const hasChanges = images.some((img, i) => img !== normalized[i]);
      if (hasChanges) {
        console.log('📸 [ImageCarousel] Normalized URLs:');
        images.forEach((original, i) => {
          if (original !== normalized[i]) {
            console.log(`  ${i}: ${original} → ${normalized[i]}`);
          }
        });
      }
    }
    
    return normalized;
  }, [images]);

  // Load first image dimensions for auto mode
  useEffect(() => {
    if (mode === 'auto' && normalizedImages.length > 0) {
      if (__DEV__) {
        console.log('📐 [ImageCarousel] Fetching dimensions for:', normalizedImages[0]);
      }
      
      RNImage.getSize(
        normalizedImages[0],
        (width: number, height: number) => {
          if (__DEV__) {
            console.log(`✅ [ImageCarousel] Got dimensions: ${width}x${height}`);
          }
          setImageDimensions({ width, height });
          
          // Check if image will be cropped (height limited to 1.4x width)
          const imageAspectRatio = height / width;
          const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
          const maxHeight = IMAGE_WIDTH * 1.4;
          setIsCropped(calculatedHeight > maxHeight);
        },
        (error: any) => {
          console.warn('⚠️  [ImageCarousel] Failed to get image size:', normalizedImages[0]);
          console.warn('   Error:', error);
          // Fallback to landscape
          setImageDimensions({ width: 16, height: 9 });
          setIsCropped(false);
        }
      );
    }
  }, [normalizedImages, mode, IMAGE_WIDTH]);

  // Calculate image height based on mode and dimensions
  // Following Facebook/LinkedIn/Instagram approach for scannable feeds
  const IMAGE_HEIGHT = useMemo(() => {
    // If fixed aspectRatio is provided, use it
    if (aspectRatio !== undefined) {
      return IMAGE_WIDTH * aspectRatio;
    }

    // Auto mode - use actual image dimensions with smart limits
    if (mode === 'auto' && imageDimensions) {
      const imageAspectRatio = imageDimensions.height / imageDimensions.width;
      const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
      
      // Facebook/LinkedIn style limits for scannable feed
      // Landscape images: min 240px (very wide panoramas)
      // Portrait images: max 1.4x width (like Facebook) for feed scannability
      // Very tall images get cropped, user clicks to see full
      
      const minHeight = 240;              // Minimum for very wide images
      const maxHeight = IMAGE_WIDTH * 1.4; // Facebook/LinkedIn standard (1.4:1 max)
      
      const finalHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
      
      // Log for debugging
      if (__DEV__) {
        const ratio = imageAspectRatio.toFixed(2);
        const limited = calculatedHeight > maxHeight;
        console.log(`📐 Image ratio: ${ratio} | Calculated: ${calculatedHeight.toFixed(0)}px | Final: ${finalHeight.toFixed(0)}px${limited ? ' (LIMITED)' : ''}`);
      }
      
      return finalHeight;
    }

    // Preset modes
    switch (mode) {
      case 'landscape':
        return IMAGE_WIDTH * 0.5625; // 16:9 (standard landscape)
      case 'portrait':
        return IMAGE_WIDTH * 1.25;   // 4:5 (Instagram portrait standard)
      case 'square':
        return IMAGE_WIDTH;          // 1:1 (Instagram square)
      default:
        return IMAGE_WIDTH * 0.75;   // 4:3 (classic photo ratio)
    }
  }, [IMAGE_WIDTH, aspectRatio, mode, imageDimensions, SCREEN_WIDTH]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / IMAGE_WIDTH);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * IMAGE_WIDTH,
      animated: true,
    });
    setActiveIndex(index);
  };

  const handleImagePress = (index: number) => {
    // Open modal viewer for full image viewing
    setModalInitialIndex(index);
    setModalVisible(true);
    
    // Also call parent's onImagePress if provided (for analytics, etc.)
    onImagePress?.(index);
  };

  if (normalizedImages.length === 0) return null;

  // Show loading state while dimensions are being fetched for auto mode
  if (mode === 'auto' && !imageDimensions && normalizedImages.length > 0) {
    return (
      <View style={[styles.loadingContainer, { width: IMAGE_WIDTH, height: IMAGE_WIDTH * 0.75 }]}>
        <View style={styles.loadingPlaceholder} />
      </View>
    );
  }

  // Single image - no carousel needed
  if (normalizedImages.length === 1) {
    return (
      <>
        <TouchableOpacity 
          activeOpacity={0.95} 
          onPress={() => handleImagePress(0)}
          style={[styles.singleImageContainer, { 
            width: IMAGE_WIDTH,
            height: IMAGE_HEIGHT
          }]}
        >
          <Image
            source={{ uri: normalizedImages[0] }}
            style={[styles.image, { borderRadius }]}
            contentFit="cover"
            transition={300}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
            onError={(error) => {
              if (__DEV__) {
                console.error('❌ [ImageCarousel] Failed to load image:', normalizedImages[0]);
                console.error('   Error:', error);
              }
            }}
            onLoad={() => {
              if (__DEV__) {
                console.log('✅ [ImageCarousel] Image loaded successfully:', normalizedImages[0]);
              }
            }}
          />
        </TouchableOpacity>

        {/* Image Viewer Modal */}
        <ImageViewerModal
          visible={modalVisible}
          images={normalizedImages}
          initialIndex={modalInitialIndex}
          onClose={() => setModalVisible(false)}
        />
      </>
    );
  }

  // Multiple images - show carousel
  return (
    <View style={[styles.container, { height: IMAGE_HEIGHT }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={IMAGE_WIDTH}
        snapToAlignment="start"
        style={styles.scrollView}
      >
        {normalizedImages.map((uri, index) => (
          <TouchableOpacity
            key={`${uri}-${index}`}
            activeOpacity={0.95}
            onPress={() => handleImagePress(index)}
            style={[styles.imageContainer, { 
              width: IMAGE_WIDTH,
              height: IMAGE_HEIGHT
            }]}
          >
            <Image
              source={{ uri }}
              style={[styles.image, { borderRadius }]}
              contentFit="cover"
              transition={300}
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
              placeholderContentFit="cover"
              onError={(error) => {
                if (__DEV__) {
                  console.error(`❌ [ImageCarousel] Failed to load image ${index}:`, uri);
                  console.error('   Error:', error);
                }
              }}
              onLoad={() => {
                if (__DEV__) {
                  console.log(`✅ [ImageCarousel] Image ${index} loaded:`, uri);
                }
              }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dot Indicators - Instagram style */}
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

      {/* Image Counter - Top Right */}
      <View style={styles.counterContainer}>
        <View style={styles.counterBadge}>
          <Ionicons name="images" size={12} color="#fff" />
          <Text style={styles.counterText}>
            {activeIndex + 1}/{images.length}
          </Text>
        </View>
      </View>

      {/* "See Full Image" indicator for cropped images - Facebook style */}
      {isCropped && (
        <View style={styles.expandIndicator}>
          <View style={styles.expandBadge}>
            <Ionicons name="expand-outline" size={14} color="#fff" />
            <Text style={styles.expandText}>Tap to see full</Text>
          </View>
        </View>
      )}

      {/* Navigation Arrows (optional - for desktop/tablet) */}
      {images.length > 1 && activeIndex > 0 && (
        <TouchableOpacity
          style={[styles.arrow, styles.leftArrow]}
          onPress={() => scrollToIndex(activeIndex - 1)}
        >
          <View style={styles.arrowButton}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      )}
      {images.length > 1 && activeIndex < images.length - 1 && (
        <TouchableOpacity
          style={[styles.arrow, styles.rightArrow]}
          onPress={() => scrollToIndex(activeIndex + 1)}
        >
          <View style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Image Viewer Modal */}
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
    // width and height set dynamically inline
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  
  // Dot Indicators
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
  
  // Image Counter
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
  
  // Expand Indicator - Facebook style "See Full Image"
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
  
  // Navigation Arrows
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
