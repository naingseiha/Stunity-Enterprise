/**
 * Optimized Image Component
 *
 * Thin wrapper over expo-image that preserves the legacy API used in older
 * screens (uri, aspectRatio, borderRadius, showLoader, fallbackColor, priority).
 * expo-image handles caching, decoding, recycling, and transitions natively —
 * no JS-side delays, no userland cache layer.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, DimensionValue, StyleProp, ImageStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';

interface OptimizedImageProps {
  uri: string;
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  borderRadius?: number;
  showLoader?: boolean;
  fallbackColor?: string;
  priority?: 'high' | 'normal' | 'low';
  contentFit?: ImageContentFit;
  style?: StyleProp<ImageStyle>;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  width,
  height,
  aspectRatio,
  borderRadius = 0,
  showLoader = true,
  fallbackColor = '#F3F4F6',
  priority = 'normal',
  contentFit = 'cover',
  style,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const containerStyle = [
    styles.container,
    {
      width,
      height,
      aspectRatio,
      borderRadius,
      backgroundColor: fallbackColor,
    },
  ];

  const imageStyle = [styles.image, { borderRadius }, style];

  if (!uri || error) {
    return (
      <View style={containerStyle}>
        <View style={[styles.fallback, { borderRadius }]}>
          <View style={styles.fallbackIcon} />
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri }}
        style={imageStyle}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        priority={priority}
        transition={150}
        recyclingKey={uri}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
      />
      {loading && showLoader && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="small" color="#9CA3AF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
});
