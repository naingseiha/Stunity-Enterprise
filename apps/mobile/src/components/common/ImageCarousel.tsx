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
        },
        (error: any) => {
          console.warn('⚠️  [ImageCarousel] Failed to get image size:', normalizedImages[0]);
          console.warn('   Error:', error);
          // Fallback to landscape
          setImageDimensions({ width: 16, height: 9 });
        }
      );
    }
  }, [normalizedImages, mode]);

  // Calculate image height based on mode and dimensions
  const IMAGE_HEIGHT = useMemo(() => {
    // If fixed aspectRatio is provided, use it
    if (aspectRatio !== undefined) {
      return IMAGE_WIDTH * aspectRatio;
    }

    // Auto mode - use actual image dimensions
    if (mode === 'auto' && imageDimensions) {
      const imageAspectRatio = imageDimensions.height / imageDimensions.width;
      const calculatedHeight = IMAGE_WIDTH * imageAspectRatio;
      
      // Constrain height between 200px and screen height - 100px
      const minHeight = 200;
      const maxHeight = SCREEN_WIDTH * 1.5; // Max 1.5x width for very tall images
      
      return Math.max(minHeight, Math.min(maxHeight, calculatedHeight));
    }

    // Preset modes
    switch (mode) {
      case 'landscape':
        return IMAGE_WIDTH * 0.5625; // 16:9
      case 'portrait':
        return IMAGE_WIDTH * 1.5; // 2:3
      case 'square':
        return IMAGE_WIDTH; // 1:1
      default:
        return IMAGE_WIDTH * 0.75; // 4:3 fallback
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
      <TouchableOpacity 
        activeOpacity={0.95} 
        onPress={() => onImagePress?.(0)}
        style={[styles.singleImageContainer, { 
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT
        }]}
      >
        <Image
          source={{ uri: normalizedImages[0] }}
          style={[styles.image, { borderRadius }]}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
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
    );
  }

  // Multiple images - show carousel
  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {normalizedImages.map((uri, index) => (
          <TouchableOpacity
            key={`${uri}-${index}`}
            activeOpacity={0.95}
            onPress={() => onImagePress?.(index)}
            style={[styles.imageContainer, { 
              width: IMAGE_WIDTH,
              height: IMAGE_HEIGHT
            }]}
          >
            <Image
              source={{ uri }}
              style={[styles.image, { borderRadius }]}
              contentFit="cover"
              transition={200}
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
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
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    // width and height set dynamically inline
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
