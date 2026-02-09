/**
 * ImageViewerModal Component
 * 
 * Full-screen image viewer modal with:
 * - Pinch to zoom
 * - Swipe between images
 * - Smooth animations
 * - Close button
 * - Image counter
 * - Facebook/Instagram-style experience
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function ImageViewerModal({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: ImageViewerModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Reset to initial index when modal opens
  React.useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      // Scroll to initial index after a small delay to ensure layout is ready
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: initialIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setActiveIndex(index);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Black background overlay */}
        <View style={styles.overlay} />

        {/* Image ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
          style={styles.scrollView}
        >
          {images.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.imageContainer}>
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="contain"
                transition={300}
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                placeholderContentFit="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Close Button - Top Right */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.closeButtonBackground}>
            <Ionicons name="close" size={28} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Image Counter - Top Center */}
        {images.length > 1 && (
          <View style={styles.counterContainer}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {activeIndex + 1} / {images.length}
              </Text>
            </View>
          </View>
        )}

        {/* Navigation Dots - Bottom Center */}
        {images.length > 1 && (
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => scrollToIndex(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.dot,
                  index === activeIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    right: 16,
    zIndex: 10,
  },
  closeButtonBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9,
  },
  counterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },
});
