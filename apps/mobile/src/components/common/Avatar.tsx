/**
 * Avatar Component
 * 
 * User avatar with online indicator, fallback initials, and various sizes
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, BorderRadius } from '@/config';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnline?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
  borderColor?: string;
  showBorder?: boolean;
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
  borderColor = Colors.white,
  showBorder = false,
}) => {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const onlineSize = Math.max(8, dimension * 0.25);

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    ...(showBorder && {
      borderWidth: 2,
      borderColor,
    }),
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
