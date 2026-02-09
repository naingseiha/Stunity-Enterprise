/**
 * ImageCarousel Component
 * 
 * Instagram-style image slider with:
 * - Swipeable horizontal scroll
 * - Dot indicators
 * - Image counter
 * - Smooth animations
 * - Adaptive sizing for feed vs detail views
 */

import React, { useState, useRef, useMemo } from 'react';
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
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface ImageCarouselProps {
  images: string[];
  onImagePress?: (index: number) => void;
  borderRadius?: number;
  aspectRatio?: number; // width/height ratio (default: 4/3)
}

export default function ImageCarousel({ 
  images, 
  onImagePress,
  borderRadius = 12,
  aspectRatio = 0.75, // height = width * aspectRatio (default 4:3)
}: ImageCarouselProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const IMAGE_WIDTH = useMemo(() => {
    // If borderRadius is 0, it's full screen (detail view)
    return borderRadius === 0 ? SCREEN_WIDTH : SCREEN_WIDTH - 32;
  }, [SCREEN_WIDTH, borderRadius]);
  
  const IMAGE_HEIGHT = useMemo(() => IMAGE_WIDTH * aspectRatio, [IMAGE_WIDTH, aspectRatio]);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

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

  if (images.length === 0) return null;

  // Single image - no carousel needed
  if (images.length === 1) {
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
          source={{ uri: images[0] }}
          style={[styles.image, { borderRadius }]}
          contentFit="cover"
          transition={200}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
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
        snapToInterval={IMAGE_WIDTH}
        snapToAlignment="center"
        style={styles.scrollView}
      >
        {images.map((uri, index) => (
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
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Dot Indicators - Instagram style */}
      <View style={styles.indicatorContainer}>
        {images.map((_, index) => (
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
  singleImageContainer: {
    width: '100%',
  },
  scrollView: {
    width: '100%',
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
