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
}

const SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 96,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 36,
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
}) => {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const borderWidth = BORDER_WIDTH[size];
  const onlineSize = Math.max(8, dimension * 0.25);
  
  // Determine gradient colors
  const getGradientBorderColors = (): string[] => {
    if (!showBorder || gradientBorder === 'none') {
      return ['transparent', 'transparent'];
    }
    if (Array.isArray(gradientBorder)) {
      return gradientBorder;
    }
    return GRADIENT_PRESETS[gradientBorder] || GRADIENT_PRESETS.purple;
  };

  const gradientColors = getGradientBorderColors();
  const useGradientBorder = showBorder && gradientBorder !== 'none';
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
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={getGradientColors(name)}
                style={styles.fallback}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.initials, { fontSize: fontSize - 2 }]}>
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

  // Fallback to solid border
  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    borderWidth: showBorder ? borderWidth : 0,
    borderColor: showBorder ? borderColor : 'transparent',
    backgroundColor: '#fff',
  };

  return (
    <View style={[styles.container, containerStyle, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={getGradientColors(name)}
          style={styles.fallback}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.initials, { fontSize }]}>
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
              right: showBorder ? -1 : 0,
              bottom: showBorder ? -1 : 0,
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
