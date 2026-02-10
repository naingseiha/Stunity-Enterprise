/**
 * Avatar Component
 * 
 * User avatar with gradient border, online indicator, fallback initials, and various sizes
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius } from '@/config';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type GradientPreset = 'purple' | 'orange' | 'blue' | 'green' | 'pink' | 'gold' | 'rainbow' | 'none';
type AvatarVariant = 'default' | 'post' | 'profile';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnline?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
  borderColor?: string;
  showBorder?: boolean;
  gradientBorder?: GradientPreset | [string, string] | [string, string, string];
  variant?: AvatarVariant;
}

const SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 120,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 42,
};

const BORDER_WIDTH: Record<AvatarSize, number> = {
  xs: 1.5,
  sm: 2,
  md: 2,
  lg: 2.5,
  xl: 3,
  '2xl': 3.5,
};

// Beautiful gradient presets - Instagram story style
const GRADIENT_PRESETS: Record<GradientPreset, string[]> = {
  purple: ['#6366F1', '#8B5CF6', '#A855F7'],
  orange: ['#FFA500', '#FF8C00', '#FF6B35'],
  blue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  green: ['#10B981', '#34D399'],
  pink: ['#EC4899', '#F472B6', '#FBCFE8'],
  gold: ['#FBBF24', '#FCD34D', '#FDE68A'],
  rainbow: ['#F97316', '#FBBF24', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'],
  none: ['transparent', 'transparent'],
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Light grey gradients for fallback avatars - clean and professional
const getGradientColors = (name: string): [string, string] => {
  const gradients: [string, string][] = [
    ['#F3F4F6', '#E5E7EB'], // Light grey gradient
    ['#E5E7EB', '#D1D5DB'], // Medium light grey
    ['#F9FAFB', '#F3F4F6'], // Very light grey
    ['#FAFAFA', '#F5F5F5'], // Off-white grey
    ['#F8F9FA', '#E9ECEF'], // Soft grey
    ['#F5F5F5', '#EEEEEE'], // Neutral grey
  ];
  
  const index = name
    ? name.charCodeAt(0) % gradients.length
    : 0;
  
  return gradients[index];
};

// Beautiful light gradients for post avatars - colorful and vibrant
const getPostGradientColors = (name: string): [string, string] => {
  const gradients: [string, string][] = [
    ['#FEE2E2', '#FECACA'], // Light red/rose
    ['#DBEAFE', '#BFDBFE'], // Light blue
    ['#FEF3C7', '#FDE68A'], // Light yellow
    ['#D1FAE5', '#A7F3D0'], // Light green
    ['#FCE7F3', '#FBCFE8'], // Light pink
    ['#E0E7FF', '#C7D2FE'], // Light indigo
    ['#FFEDD5', '#FED7AA'], // Light orange
    ['#E9D5FF', '#D8B4FE'], // Light purple
    ['#BAE6FD', '#7DD3FC'], // Light sky
    ['#FED7E2', '#FBB6CE'], // Light rose
    ['#D9F99D', '#BEF264'], // Light lime
    ['#FEE4C7', '#FDBA74'], // Light amber
  ];
  
  const index = name
    ? name.charCodeAt(0) % gradients.length
    : 0;
  
  return gradients[index];
};

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 'md',
  showOnline = false,
  isOnline = false,
  style,
  borderColor = '#FFA500',
  showBorder = true,
  gradientBorder = 'orange',
  variant = 'default',
}) => {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const borderWidth = BORDER_WIDTH[size];
  const onlineSize = Math.max(8, dimension * 0.25);
  
  // For 'post' variant, use light gradients and no border
  const isPostVariant = variant === 'post';
  const effectiveShowBorder = isPostVariant ? false : showBorder;
  const backgroundGradient = isPostVariant 
    ? getPostGradientColors(name) 
    : getGradientColors(name);
  
  // Determine gradient colors
  const getGradientBorderColors = (): string[] => {
    if (!effectiveShowBorder || gradientBorder === 'none') {
      return ['transparent', 'transparent'];
    }
    if (Array.isArray(gradientBorder)) {
      return gradientBorder;
    }
    return GRADIENT_PRESETS[gradientBorder] || GRADIENT_PRESETS.purple;
  };

  const gradientColors = getGradientBorderColors();
  const useGradientBorder = effectiveShowBorder && gradientBorder !== 'none';
  const innerDimension = dimension - (borderWidth * 2);

  // If using gradient border, wrap in LinearGradient
  if (useGradientBorder) {
    return (
      <View style={[{ position: 'relative' }, style]}>
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientBorder,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              padding: borderWidth,
            },
          ]}
        >
          <View
            style={[
              styles.innerContainer,
              {
                width: innerDimension,
                height: innerDimension,
                borderRadius: innerDimension / 2,
              },
            ]}
          >
            {uri ? (
              <Image
                source={{ uri }}
                style={styles.image}
                contentFit="cover"
                transition={300}
                placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                placeholderContentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={backgroundGradient}
                style={styles.fallback}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.initials, { fontSize: fontSize - 2, color: isPostVariant ? '#374151' : '#1F2937' }]}>
                  {getInitials(name)}
                </Text>
              </LinearGradient>
            )}
          </View>
        </LinearGradient>

        {showOnline && (
          <View
            style={[
              styles.onlineIndicator,
              {
                width: onlineSize,
                height: onlineSize,
                borderRadius: onlineSize / 2,
                backgroundColor: isOnline ? Colors.success.main : Colors.gray[400],
                right: 0,
                bottom: 0,
              },
            ]}
          />
        )}
      </View>
    );
  }

  // Simple avatar without gradient border
  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    borderWidth: effectiveShowBorder ? borderWidth : 0,
    borderColor: effectiveShowBorder ? borderColor : 'transparent',
    backgroundColor: isPostVariant ? 'transparent' : '#fff',
    overflow: 'hidden',
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          transition={300}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
        />
      ) : (
        <LinearGradient
          colors={backgroundGradient}
          style={styles.fallback}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.initials, { fontSize, color: isPostVariant ? '#374151' : '#1F2937' }]}>
            {getInitials(name)}
          </Text>
        </LinearGradient>
      )}

      {showOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: onlineSize,
              height: onlineSize,
              borderRadius: onlineSize / 2,
              backgroundColor: isOnline ? Colors.success.main : Colors.gray[400],
              right: effectiveShowBorder ? -1 : 0,
              bottom: effectiveShowBorder ? -1 : 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBorder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  initials: {
    color: '#1F2937',
    fontWeight: Typography.fontWeight.bold,
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.white,
  },
});

export default Avatar;
