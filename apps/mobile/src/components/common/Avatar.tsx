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
import { BrandCtaGradient } from '@/config/theme';
import { cdnAvatar } from '@/utils/cdnUrl';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
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
  '3xl': 140,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 42,
  '3xl': 50,
};

const BORDER_WIDTH: Record<AvatarSize, number> = {
  xs: 1.5,
  sm: 2,
  md: 2,
  lg: 2.5,
  xl: 3,
  '2xl': 3.5,
  '3xl': 4,
};

const IMAGE_TRANSITION_MS = 0;
const MAX_AVATAR_URI_CACHE_ENTRIES = 160;
const avatarUriCache = new Map<string, string>();

const getAvatarCacheKey = (name: string, size: AvatarSize, variant: AvatarVariant) =>
  `${variant}:${size}:${name.trim().toLowerCase()}`;

const rememberAvatarUri = (key: string, value: string) => {
  if (avatarUriCache.has(key)) {
    avatarUriCache.delete(key);
  }
  avatarUriCache.set(key, value);
  if (avatarUriCache.size > MAX_AVATAR_URI_CACHE_ENTRIES) {
    const oldestKey = avatarUriCache.keys().next().value;
    if (oldestKey) avatarUriCache.delete(oldestKey);
  }
};

// Beautiful gradient presets - Instagram story style
const GRADIENT_PRESETS: Record<GradientPreset, string[]> = {
  purple: ['#6366F1', '#8B5CF6', '#A855F7'],
  orange: ['#0EA5E9', '#0284C7', '#FF6B35'],
  blue: ['#3B82F6', '#60A5FA', '#93C5FD'],
  green: ['#10B981', '#34D399'],
  pink: ['#EC4899', '#F472B6', '#FBCFE8'],
  gold: ['#38BDF8', '#7DD3FC', '#BAE6FD'],
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

// Light brand tints for small feed avatars (readable initials at xs–md sizes)
const BRAND_AVATAR_TINTS: [string, string][] = [
  ['#E0F2FE', '#BAE6FD'],
  ['#DBEAFE', '#BAE6FD'],
  ['#E0F2FE', '#7DD3FC'],
  ['#BAE6FD', '#7DD3FC'],
];

const getBrandFallbackGradient = (
  name: string,
  variant: AvatarVariant,
): readonly [string, string, ...string[]] => {
  if (variant === 'post') {
    const index = name ? name.charCodeAt(0) % BRAND_AVATAR_TINTS.length : 0;
    return BRAND_AVATAR_TINTS[index];
  }
  return BrandCtaGradient;
};

const getFallbackInitialsColor = (variant: AvatarVariant): string =>
  variant === 'post' ? '#0369A1' : '#FFFFFF';

export const Avatar = React.memo<AvatarProps>(function Avatar({
  uri,
  name = '',
  size = 'md',
  showOnline = false,
  isOnline = false,
  style,
  borderColor = '#0EA5E9',
  showBorder = true,
  gradientBorder = 'orange',
  variant = 'default',
}) {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const borderWidth = BORDER_WIDTH[size];
  const onlineSize = Math.max(8, dimension * 0.25);

  // For 'post' variant, use light gradients and no border
  const isPostVariant = variant === 'post';
  const effectiveShowBorder = isPostVariant ? false : showBorder;
  const backgroundGradient = getBrandFallbackGradient(name, variant);
  const initialsColor = getFallbackInitialsColor(variant);
  const avatarCacheKey = React.useMemo(() => getAvatarCacheKey(name, size, variant), [name, size, variant]);
  const imageUri = React.useMemo(
    () => cdnAvatar(uri, size === 'xs' || size === 'sm' || size === 'md' ? 'sm' : size === 'lg' || size === 'xl' ? 'md' : 'lg'),
    [uri, size]
  );
  const lastImageUriRef = React.useRef<string>('');
  if (imageUri) {
    lastImageUriRef.current = imageUri;
    rememberAvatarUri(avatarCacheKey, imageUri);
  }
  const displayImageUri = imageUri || lastImageUriRef.current || avatarUriCache.get(avatarCacheKey) || '';
  const imageSource = React.useMemo(
    () => (displayImageUri ? { uri: displayImageUri, cacheKey: displayImageUri } : undefined),
    [displayImageUri]
  );
  React.useEffect(() => {
    if (!displayImageUri) return;
    Image.prefetch(displayImageUri, 'memory-disk').catch(() => { });
  }, [displayImageUri]);

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
            {imageSource ? (
              <Image
                source={imageSource}
                style={styles.image}
                contentFit="cover"
                placeholder={imageSource}
                placeholderContentFit="cover"
                allowDownscaling
                transition={IMAGE_TRANSITION_MS}
                cachePolicy="memory-disk" // Cache avatars aggressively
                priority="high"
              />
            ) : (
              <LinearGradient
                colors={backgroundGradient}
                style={styles.fallback}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.initials, { fontSize: fontSize - 2, color: initialsColor }]}>
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
      {imageSource ? (
        <Image
          source={imageSource}
          style={styles.image}
          contentFit="cover"
          placeholder={imageSource}
          placeholderContentFit="cover"
          allowDownscaling
          transition={IMAGE_TRANSITION_MS}
          cachePolicy="memory-disk"
          priority="high"
        />
      ) : (
        <LinearGradient
          colors={backgroundGradient}
          style={styles.fallback}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.initials, { fontSize, color: initialsColor }]}>
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
});

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
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
  },
  initials: {
    fontWeight: Typography.fontWeight.bold,
  },
  onlineIndicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.white,
  },
});

export default Avatar;
