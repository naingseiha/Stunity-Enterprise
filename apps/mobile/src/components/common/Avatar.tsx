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

// Beautiful gradient presets
const GRADIENT_PRESETS: Record<GradientPreset, string[]> = {
  purple: ['#667EEA', '#764BA2'],
  orange: ['#F97316', '#FBBF24', '#F59E0B'],
  blue: ['#06B6D4', '#3B82F6', '#8B5CF6'],
  green: ['#10B981', '#34D399', '#06B6D4'],
  pink: ['#EC4899', '#F472B6', '#F97316'],
  gold: ['#F59E0B', '#FBBF24', '#FCD34D'],
  rainbow: ['#EF4444', '#F97316', '#FBBF24', '#10B981', '#3B82F6', '#8B5CF6'],
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

const getGradientColors = (name: string): [string, string] => {
  const gradients: [string, string][] = [
    [Colors.primary[400], Colors.secondary[500]],
    ['#EC4899', '#F97316'],
    ['#8B5CF6', '#EC4899'],
    ['#06B6D4', '#3B82F6'],
    ['#10B981', '#06B6D4'],
    ['#F59E0B', '#EF4444'],
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
  borderColor = '#F59E0B',
  showBorder = true,
  gradientBorder = 'purple',
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
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.white,
  },
});

export default Avatar;
